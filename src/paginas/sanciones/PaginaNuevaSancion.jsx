import { ArrowLeft, Search, TriangleAlert } from 'lucide-react'
import { useCallback, useId, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { listarReportes } from '../../api/reportes.js'
import { crearSancion, obtenerSugerencia } from '../../api/sanciones.js'
import { listarUsuarios } from '../../api/usuarios.js'
import EstadoUsuario from '../../componentes/EstadoUsuario.jsx'
import TipoSancion from '../../componentes/TipoSancion.jsx'
import { useAvisos } from '../../componentes/avisos/useAvisos.js'
import { NOMBRES_TIPO_SANCION, razonSugerencia, tieneBloqueoVigente } from '../../utilidades/sanciones.js'
import { useCarga } from '../../utilidades/useCarga.js'
import { nombreCompleto } from '../../utilidades/usuarios.js'
import DialogoConfirmar from '../reportes/acciones/DialogoConfirmar.jsx'
import TablaSanciones from './TablaSanciones.jsx'
import '../reportes/detalle.css'
import '../reportes/reportes.css'
import './sanciones.css'

// Largo de sancion.motivo (sección 4.9).
const MAXIMO_MOTIVO = 255
const MAXIMO_RESULTADOS = 8

// Tipos con su efecto (RN-21; el bloqueo temporal dura 2 días, RN-20).
const TIPOS = [
  { valor: 'advertencia', efecto: 'No cambia su cuenta. Queda en su historial.' },
  { valor: 'bloqueo_temporal', efecto: 'No podrá iniciar sesión durante 2 días.' },
  { valor: 'bloqueo_permanente', efecto: 'No podrá iniciar sesión hasta que un administrador levante el bloqueo.' },
]

const NOMBRES_ESTADO_REPORTE = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  asignado: 'Asignado',
  en_proceso: 'En proceso',
  resuelto: 'Resuelto',
  rechazado: 'Rechazado',
}

const normalizar = (texto) =>
  (texto ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

// Solo ciudadanos, en cualquier estado (RN-19).
const todosLosCiudadanos = async () => (await listarUsuarios({ rol: 'ciudadano' })).filter((u) => u.rol === 'ciudadano')

function BuscadorCiudadano({ ciudadanos, alElegir }) {
  const [texto, setTexto] = useState('')
  const id = useId()
  const buscado = normalizar(texto.trim())
  const resultados = buscado
    ? ciudadanos
        .filter((u) =>
          [u.nombre, u.apellido, `${u.nombre} ${u.apellido}`, u.correo, u.cedula].some((c) =>
            normalizar(c).includes(buscado),
          ),
        )
        .slice(0, MAXIMO_RESULTADOS)
    : []

  return (
    <div className="campo">
      <label htmlFor={id}>Buscar ciudadano</label>
      <div className="campo__con-icono">
        <Search size={18} aria-hidden="true" />
        <input
          id={id}
          type="search"
          placeholder="Nombre, apellido, correo o cédula"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          aria-describedby={`${id}-ayuda`}
        />
      </div>
      <span id={`${id}-ayuda`} className="campo__ayuda" aria-live="polite">
        {buscado ? `${resultados.length} ${resultados.length === 1 ? 'resultado' : 'resultados'}` : 'Escribe para buscar.'}
      </span>
      {resultados.length > 0 && (
        <ul className="buscador-ciudadanos__resultados" aria-label="Ciudadanos encontrados">
          {resultados.map((u) => (
            <li key={u.id}>
              <button type="button" className="resultado-ciudadano" onClick={() => alElegir(u.id)}>
                <span>
                  <span className="resultado-ciudadano__nombre">{nombreCompleto(u)}</span>
                  <span className="resultado-ciudadano__datos">
                    {u.correo}
                    {u.cedula ? ` · ${u.cedula}` : ''}
                  </span>
                </span>
                <EstadoUsuario estado={u.estado} bloqueadoHasta={u.bloqueado_hasta} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function PaginaNuevaSancion() {
  const [params] = useSearchParams()
  const navegar = useNavigate()
  const { mostrarAviso } = useAvisos()
  const idMotivo = useId()

  const [ciudadanoId, setCiudadanoId] = useState(() => Number(params.get('ciudadano')) || null)
  const [reporteId, setReporteId] = useState(() => params.get('reporte') ?? '')
  const [tipo, setTipo] = useState('')
  const [motivo, setMotivo] = useState('')
  const [confirmando, setConfirmando] = useState(false)

  const ciudadanos = useCarga(todosLosCiudadanos)
  const reportes = useCarga(listarReportes)
  const cargarSugerencia = useCallback(
    () => (ciudadanoId ? obtenerSugerencia(ciudadanoId) : Promise.resolve(null)),
    [ciudadanoId],
  )
  const sugerencia = useCarga(cargarSugerencia)

  const ciudadano = (ciudadanos.datos ?? []).find((u) => u.id === ciudadanoId) ?? null
  const nombre = ciudadano ? nombreCompleto(ciudadano) : ''

  // Reportes de ese ciudadano: los rechazados primero, luego los demás (del más reciente al más antiguo)
  // y los eliminados al final.
  const reportesDelCiudadano = useMemo(
    () =>
      (reportes.datos ?? [])
        .filter((r) => r.ciudadano?.id === ciudadanoId)
        .sort(
          (a, b) =>
            a.eliminado - b.eliminado ||
            (b.estado === 'rechazado') - (a.estado === 'rechazado') ||
            new Date(b.fecha_creacion) - new Date(a.fecha_creacion),
        ),
    [reportes.datos, ciudadanoId],
  )
  const titulosReportes = useMemo(
    () => Object.fromEntries((reportes.datos ?? []).map((r) => [r.id, r.titulo])),
    [reportes.datos],
  )
  const reporteElegido = reportesDelCiudadano.find((r) => String(r.id) === String(reporteId)) ?? null

  const previas = sugerencia.datos?.sanciones_previas ?? []
  const bloqueoVigente = tieneBloqueoVigente(previas)
  const puedeEnviar = Boolean(ciudadano && tipo && motivo.trim())

  function elegir(id) {
    setCiudadanoId(id)
    setReporteId('')
  }

  function revisar(evento) {
    evento.preventDefault()
    if (puedeEnviar) setConfirmando(true)
  }

  const datos = {
    ciudadano: ciudadanoId,
    tipo,
    motivo: motivo.trim(),
    ...(reporteElegido ? { reporte: reporteElegido.id } : {}),
  }

  return (
    <div className="detalle nueva-sancion">
      <Link className="boton-secundario detalle__volver" to={ciudadanoId ? `/sanciones?ciudadano=${ciudadanoId}` : '/sanciones'}>
        <ArrowLeft size={18} aria-hidden="true" />
        Volver a sanciones
      </Link>
      <h2 className="detalle__titulo">Nueva sanción</h2>

      <form className="nueva-sancion" onSubmit={revisar} noValidate>
        <section className="detalle__seccion" aria-labelledby="titulo-ciudadano-sancion">
          <h3 id="titulo-ciudadano-sancion" className="detalle__subtitulo">
            Ciudadano
          </h3>
          {ciudadanos.cargando && !ciudadanos.datos ? (
            <p className="texto-suave">Cargando ciudadanos…</p>
          ) : ciudadano ? (
            <div className="ciudadano-elegido">
              <div className="ciudadano-elegido__datos">
                <strong>{nombre}</strong>
                <span className="texto-suave">{ciudadano.correo}</span>
                <EstadoUsuario estado={ciudadano.estado} bloqueadoHasta={ciudadano.bloqueado_hasta} />
              </div>
              <button type="button" className="boton-secundario" onClick={() => elegir(null)}>
                Cambiar
              </button>
            </div>
          ) : (
            <BuscadorCiudadano ciudadanos={ciudadanos.datos ?? []} alElegir={elegir} />
          )}
        </section>

        {ciudadano && (
          <section className="detalle__seccion" aria-labelledby="titulo-historial-sancion">
            <h3 id="titulo-historial-sancion" className="detalle__subtitulo">
              Sanciones previas
            </h3>
            {sugerencia.cargando && !sugerencia.datos ? (
              <p className="texto-suave">Consultando su historial…</p>
            ) : sugerencia.error ? (
              <p className="texto-suave">No pudimos consultar su historial.</p>
            ) : (
              <>
                {previas.length ? (
                  <TablaSanciones
                    sanciones={previas}
                    titulosReportes={titulosReportes}
                    conCiudadano={false}
                    titulo="Sanciones previas"
                  />
                ) : (
                  <p className="texto-suave">No tiene sanciones previas.</p>
                )}
                <div className="sugerencia" role="group" aria-labelledby="titulo-sugerencia">
                  <p id="titulo-sugerencia" className="sugerencia__titulo">
                    Sugerencia
                  </p>
                  <div className="sugerencia__fila">
                    <TipoSancion tipo={sugerencia.datos.sugerencia} />
                    <span>{razonSugerencia(sugerencia.datos.sanciones_con_reporte)}</span>
                  </div>
                  <p className="texto-suave">Es solo una sugerencia; tú decides.</p>
                  <button
                    type="button"
                    className="boton-secundario"
                    onClick={() => setTipo(sugerencia.datos.sugerencia)}
                  >
                    Usar sugerencia
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {ciudadano && (
          <section className="detalle__seccion" aria-labelledby="titulo-datos-sancion">
            <h3 id="titulo-datos-sancion" className="detalle__subtitulo">
              Sanción
            </h3>

            {ciudadano.estado === 'inactivo' && (
              <p className="aviso-sancion">
                <TriangleAlert size={18} aria-hidden="true" />
                Está inactivo: la sanción quedará registrada, pero su estado no cambiará hasta que lo reactiven.
              </p>
            )}

            <div className="campo">
              <label htmlFor="sancion-reporte">
                Reporte relacionado<span className="campo__opcional"> (opcional)</span>
              </label>
              <select id="sancion-reporte" value={reporteId} onChange={(e) => setReporteId(e.target.value)}>
                <option value="">Sin reporte relacionado</option>
                {reportesDelCiudadano.map((r) => (
                  <option key={r.id} value={String(r.id)}>
                    {r.titulo} ({NOMBRES_ESTADO_REPORTE[r.estado] ?? r.estado}
                    {r.eliminado ? ', eliminado' : ''})
                  </option>
                ))}
              </select>
            </div>

            <fieldset className="opciones-sancion">
              <legend>Tipo</legend>
              {TIPOS.map((t) => (
                <label key={t.valor} className="opcion-sancion">
                  <input
                    type="radio"
                    name="tipo-sancion"
                    value={t.valor}
                    checked={tipo === t.valor}
                    onChange={() => setTipo(t.valor)}
                    aria-labelledby={`nombre-${t.valor}`}
                    aria-describedby={`efecto-${t.valor}`}
                  />
                  <span id={`nombre-${t.valor}`}>{NOMBRES_TIPO_SANCION[t.valor]}</span>
                  <span id={`efecto-${t.valor}`} className="opcion-sancion__efecto">
                    {t.efecto}
                  </span>
                </label>
              ))}
            </fieldset>

            {bloqueoVigente && tipo === 'bloqueo_temporal' && (
              <p className="aviso-sancion">
                <TriangleAlert size={18} aria-hidden="true" />
                Ya tiene un bloqueo vigente; una sanción nueva nunca lo acorta.
              </p>
            )}

            <div className="campo">
              <label htmlFor={idMotivo}>Motivo</label>
              <textarea
                id={idMotivo}
                rows={4}
                maxLength={MAXIMO_MOTIVO}
                required
                aria-required="true"
                aria-describedby={`${idMotivo}-contador`}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
              <span id={`${idMotivo}-contador`} className="campo__contador">
                {motivo.length}/{MAXIMO_MOTIVO}
              </span>
            </div>
          </section>
        )}

        <div className="formulario-sancion__pie">
          <Link className="boton-secundario" to={ciudadanoId ? `/sanciones?ciudadano=${ciudadanoId}` : '/sanciones'}>
            Cancelar
          </Link>
          <button type="submit" className="boton-principal" disabled={!puedeEnviar}>
            Registrar sanción
          </button>
        </div>
      </form>

      {confirmando && (
        <DialogoConfirmar
          titulo="¿Registrar esta sanción?"
          textoBoton="Registrar sanción"
          textoEnviando="Registrando…"
          peligro={tipo !== 'advertencia'}
          accion={() => crearSancion(datos)}
          alCerrar={() => setConfirmando(false)}
          alTerminar={() => {
            mostrarAviso({ tipo: 'exito', texto: `Sanción registrada. ${nombre} recibió una notificación.` })
            navegar(`/sanciones?ciudadano=${ciudadanoId}`)
          }}
        >
          <dl className="resumen-sancion">
            <div>
              <dt>Ciudadano</dt>
              <dd>{nombre}</dd>
            </div>
            <div>
              <dt>Tipo</dt>
              <dd>{NOMBRES_TIPO_SANCION[tipo]}</dd>
            </div>
            <div>
              <dt>Motivo</dt>
              <dd>{motivo.trim()}</dd>
            </div>
            {reporteElegido && (
              <div>
                <dt>Reporte relacionado</dt>
                <dd>{reporteElegido.titulo}</dd>
              </div>
            )}
          </dl>
        </DialogoConfirmar>
      )}
    </div>
  )
}
