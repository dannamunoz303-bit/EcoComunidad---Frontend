import { CircleAlert, MapPinOff, RotateCcw } from 'lucide-react'
import { lazy, Suspense, useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { erroresPorCampo, mensajeDeError } from '../../../api/errores.js'
import { editarReporte } from '../../../api/reportes.js'
import Campo from '../../../componentes/Campo.jsx'
import { useEnvio } from '../acciones/useEnvio.js'
import { conOchoDecimales, leerCoordenada } from './coordenadas.js'

const MapaEditable = lazy(() => import('./MapaEditable.jsx'))

// Campos que el administrador puede editar (RN-09) y su largo en el backend.
const CAMPOS = ['titulo', 'descripcion', 'categoria', 'direccion', 'descripcion_ubicacion', 'latitud', 'longitud']
const MAXIMOS = { titulo: 150, direccion: 255, descripcion_ubicacion: 255 }

// El backend guarda 8 decimales (RN-06).
const ochoDecimales = (valor) => {
  if (valor === null || valor === undefined || valor === '') return ''
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero.toFixed(8) : ''
}

function valoresDe(reporte) {
  return {
    titulo: reporte.titulo ?? '',
    descripcion: reporte.descripcion ?? '',
    categoria: reporte.categoria_id ? String(reporte.categoria_id) : '',
    direccion: reporte.direccion ?? '',
    descripcion_ubicacion: reporte.descripcion_ubicacion ?? '',
    latitud: ochoDecimales(reporte.latitud),
    longitud: ochoDecimales(reporte.longitud),
  }
}

// Solo los campos que cambiaron, con el tipo que espera la API.
function camposCambiados(original, actual) {
  const cambios = {}
  for (const campo of CAMPOS) {
    if (actual[campo] === original[campo]) continue
    cambios[campo] = campo === 'categoria' ? Number(actual[campo]) : actual[campo]
  }
  return cambios
}

const COORDENADAS = ['latitud', 'longitud']

const posicionDe = ({ latitud, longitud }) =>
  latitud !== '' && longitud !== '' ? [Number(latitud), Number(longitud)] : null

// Validación de las dos coordenadas. Si el reporte no tenía y ambas siguen vacías, no hay error.
function validarCoordenadas(original, valores) {
  const sinUbicacion = !posicionDe(original) && valores.latitud.trim() === '' && valores.longitud.trim() === ''
  const resultado = {}
  for (const campo of COORDENADAS) {
    resultado[campo] = sinUbicacion ? { vacia: true } : leerCoordenada(valores[campo], campo)
  }
  return resultado
}

export default function FormularioEditar({ reporte, categorias, volver, alGuardar }) {
  const [original] = useState(() => valoresDe(reporte))
  const [valores, setValores] = useState(original)
  // Última posición válida: el marcador no salta mientras se escribe un número incompleto.
  const [posicion, setPosicion] = useState(() => posicionDe(original))
  // El error de una coordenada se muestra después de salir del campo o al intentar guardar.
  const [revisar, setRevisar] = useState({ latitud: false, longitud: false })
  const { enviando, error, enviar } = useEnvio()

  const coordenadas = validarCoordenadas(original, valores)
  const coordenadasInvalidas = COORDENADAS.some((campo) => coordenadas[campo].error)
  // Con el valor redondeado a 8 decimales, para comparar y enviar.
  const normalizados = { ...valores }
  for (const campo of COORDENADAS) {
    if (coordenadas[campo].valor !== undefined) normalizados[campo] = conOchoDecimales(coordenadas[campo].valor)
  }

  const errores = erroresPorCampo(error)
  // Lo que no es de un campo del formulario se muestra arriba.
  const erroresSueltos = Object.keys(errores).some((campo) => !CAMPOS.includes(campo))
  const errorGeneral = error && (Object.keys(errores).length === 0 || erroresSueltos) ? mensajeDeError(error) : null

  const cambios = camposCambiados(original, normalizados)
  const hayCambios = Object.keys(cambios).length > 0
  const teniaUbicacion = posicionDe(original) !== null
  const ubicacionMovida = valores.latitud !== original.latitud || valores.longitud !== original.longitud
  const errorCoordenada = (campo) => (revisar[campo] ? coordenadas[campo].error : null) ?? errores[campo]

  const cambiar = (campo) => (evento) => setValores((v) => ({ ...v, [campo]: evento.target.value }))

  // Al escribir una coordenada válida, el marcador se mueve.
  const cambiarCoordenada = (campo) => (evento) => {
    const nuevos = { ...valores, [campo]: evento.target.value }
    setValores(nuevos)
    const lat = leerCoordenada(nuevos.latitud, 'latitud')
    const lng = leerCoordenada(nuevos.longitud, 'longitud')
    if (lat.valor !== undefined && lng.valor !== undefined) setPosicion([lat.valor, lng.valor])
  }

  // Al salir del campo se redondea a 8 decimales y se muestra el error, si lo hay.
  const salirDeCoordenada = (campo) => () => {
    setRevisar((r) => ({ ...r, [campo]: true }))
    const { valor } = leerCoordenada(valores[campo], campo)
    if (valor !== undefined) setValores((v) => ({ ...v, [campo]: conOchoDecimales(valor) }))
  }

  // Al arrastrar el marcador, los campos se actualizan.
  const alMover = useCallback((lat, lng) => {
    const latitud = leerCoordenada(lat, 'latitud').valor ?? lat
    const longitud = leerCoordenada(lng, 'longitud').valor ?? lng
    setValores((v) => ({ ...v, latitud: conOchoDecimales(latitud), longitud: conOchoDecimales(longitud) }))
    setPosicion([latitud, longitud])
    setRevisar({ latitud: false, longitud: false })
  }, [])

  const volverAOriginal = () => {
    setValores((v) => ({ ...v, latitud: original.latitud, longitud: original.longitud }))
    setPosicion(posicionDe(original))
    setRevisar({ latitud: false, longitud: false })
  }

  // Solo las categorías activas; si la del reporte está inactiva, se muestra sin poder elegirla.
  const activas = categorias.filter((c) => c.activa !== false)
  const actualInactiva =
    original.categoria && !activas.some((c) => String(c.id) === original.categoria)
      ? categorias.find((c) => String(c.id) === original.categoria)
      : null

  async function guardar(evento) {
    evento.preventDefault()
    if (coordenadasInvalidas) {
      setRevisar({ latitud: true, longitud: true })
      return
    }
    if (!hayCambios) return
    const { ok, resultado } = await enviar(() => editarReporte(reporte.id, cambios))
    if (ok) alGuardar(resultado)
  }

  return (
    <form className="formulario-editar" onSubmit={guardar} noValidate>
      {errorGeneral && (
        <p className="error-accion" role="alert">
          <CircleAlert size={18} aria-hidden="true" />
          {errorGeneral}
        </p>
      )}

      <section className="detalle__seccion" aria-labelledby="titulo-datos-editar">
        <h3 id="titulo-datos-editar" className="detalle__subtitulo">
          Datos del reporte
        </h3>
        <Campo id="editar-titulo" etiqueta="Título" error={errores.titulo} ayuda={`Máximo ${MAXIMOS.titulo} caracteres.`}>
          {(aria) => (
            <input
              id="editar-titulo"
              type="text"
              maxLength={MAXIMOS.titulo}
              value={valores.titulo}
              onChange={cambiar('titulo')}
              {...aria}
            />
          )}
        </Campo>
        <Campo id="editar-descripcion" etiqueta="Descripción del problema" error={errores.descripcion}>
          {(aria) => (
            <textarea
              id="editar-descripcion"
              rows={5}
              value={valores.descripcion}
              onChange={cambiar('descripcion')}
              {...aria}
            />
          )}
        </Campo>
        <Campo id="editar-categoria" etiqueta="Categoría" error={errores.categoria} ayuda="Solo categorías activas.">
          {(aria) => (
            <select id="editar-categoria" value={valores.categoria} onChange={cambiar('categoria')} {...aria}>
              {actualInactiva && (
                <option value={String(actualInactiva.id)} disabled>
                  {actualInactiva.nombre} (inactiva)
                </option>
              )}
              {activas.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.nombre}
                </option>
              ))}
            </select>
          )}
        </Campo>
      </section>

      <section className="detalle__seccion" aria-labelledby="titulo-ubicacion-editar">
        <h3 id="titulo-ubicacion-editar" className="detalle__subtitulo">
          Ubicación
        </h3>
        <Campo id="editar-direccion" etiqueta="Dirección" error={errores.direccion} ayuda={`Máximo ${MAXIMOS.direccion} caracteres.`}>
          {(aria) => (
            <input
              id="editar-direccion"
              type="text"
              maxLength={MAXIMOS.direccion}
              value={valores.direccion}
              onChange={cambiar('direccion')}
              {...aria}
            />
          )}
        </Campo>
        <Campo
          id="editar-referencias"
          etiqueta="Referencias del lugar"
          error={errores.descripcion_ubicacion}
          ayuda={`Máximo ${MAXIMOS.descripcion_ubicacion} caracteres.`}
        >
          {(aria) => (
            <input
              id="editar-referencias"
              type="text"
              maxLength={MAXIMOS.descripcion_ubicacion}
              value={valores.descripcion_ubicacion}
              onChange={cambiar('descripcion_ubicacion')}
              {...aria}
            />
          )}
        </Campo>

        {posicion ? (
          <>
            <p className="campo__ayuda">
              Arrastra el marcador o escribe la latitud y la longitud para cambiar la ubicación.
            </p>
            <Suspense fallback={<div className="mapa-reporte mapa-reporte--cargando" aria-hidden="true" />}>
              <MapaEditable latitud={posicion[0]} longitud={posicion[1]} alMover={alMover} />
            </Suspense>
          </>
        ) : (
          <p className="ubicacion__sin-mapa">
            <MapPinOff size={20} aria-hidden="true" />
            Este reporte no tiene coordenadas, por eso no se puede mostrar el mapa.
          </p>
        )}

        <div className="formulario-editar__coordenadas">
          <Campo
            id="editar-latitud"
            etiqueta="Latitud"
            error={errorCoordenada('latitud')}
            ayuda="Entre -90 y 90. Se redondea a 8 decimales."
          >
            {(aria) => (
              <input
                id="editar-latitud"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={valores.latitud}
                onChange={cambiarCoordenada('latitud')}
                onBlur={salirDeCoordenada('latitud')}
                {...aria}
              />
            )}
          </Campo>
          <Campo
            id="editar-longitud"
            etiqueta="Longitud"
            error={errorCoordenada('longitud')}
            ayuda="Entre -180 y 180. Se redondea a 8 decimales."
          >
            {(aria) => (
              <input
                id="editar-longitud"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={valores.longitud}
                onChange={cambiarCoordenada('longitud')}
                onBlur={salirDeCoordenada('longitud')}
                {...aria}
              />
            )}
          </Campo>
        </div>

        {teniaUbicacion && (
          <button
            type="button"
            className="boton-secundario formulario-editar__original"
            onClick={volverAOriginal}
            disabled={!ubicacionMovida}
          >
            <RotateCcw size={18} aria-hidden="true" />
            Volver a la ubicación original
          </button>
        )}
      </section>

      <div className="formulario-editar__pie">
        <Link className="boton-secundario" to={volver.ruta} state={volver.estado}>
          Cancelar
        </Link>
        <button type="submit" className="boton-principal" disabled={!hayCambios || coordenadasInvalidas || enviando}>
          {enviando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
