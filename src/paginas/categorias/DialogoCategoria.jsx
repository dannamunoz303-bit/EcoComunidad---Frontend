import { useId, useState } from 'react'
import { crearCategoria, editarCategoria } from '../../api/categorias.js'
import { erroresPorCampo } from '../../api/errores.js'
import Campo from '../../componentes/Campo.jsx'
import Dialogo from '../../componentes/Dialogo.jsx'
import { URGENCIAS } from '../../utilidades/territorio.js'
import ErrorAccion from '../reportes/acciones/ErrorAccion.jsx'
import { useEnvio } from '../reportes/acciones/useEnvio.js'

// Largos de la tabla categoria (sección 4.3).
const MAXIMO_NOMBRE = 80
const MAXIMO_DESCRIPCION = 255
const CAMPOS = ['nombre', 'descripcion', 'urgencia_sugerida']
// RN-25: urgencia con la que nacen los reportes de la categoría; media por defecto.
const URGENCIA_POR_DEFECTO = 'media'

// Crear (sin `categoria`) o editar una categoría. Al editar se envía solo lo que cambió.
export default function DialogoCategoria({ categoria = null, alCerrar, alTerminar }) {
  const editando = Boolean(categoria)
  const [original] = useState(() => ({
    nombre: categoria?.nombre ?? '',
    descripcion: categoria?.descripcion ?? '',
    urgencia_sugerida: categoria?.urgencia_sugerida ?? URGENCIA_POR_DEFECTO,
  }))
  const [valores, setValores] = useState(original)
  const { enviando, error, enviar } = useEnvio()
  const idFormulario = useId()

  const errores = erroresPorCampo(error)
  const hayOtros = error && (Object.keys(errores).length === 0 || Object.keys(errores).some((c) => !CAMPOS.includes(c)))
  const limpios = {
    nombre: valores.nombre.trim(),
    descripcion: valores.descripcion.trim(),
    urgencia_sugerida: valores.urgencia_sugerida,
  }
  const cambios = Object.fromEntries(CAMPOS.filter((c) => limpios[c] !== original[c]).map((c) => [c, limpios[c]]))
  const puedeEnviar = limpios.nombre !== '' && (!editando || Object.keys(cambios).length > 0)

  const cambiar = (campo) => (evento) => setValores((v) => ({ ...v, [campo]: evento.target.value }))

  async function guardar(evento) {
    evento.preventDefault()
    if (!puedeEnviar) return
    const { ok, resultado } = await enviar(() =>
      editando ? editarCategoria(categoria.id, cambios) : crearCategoria(limpios),
    )
    if (ok) alTerminar(resultado)
  }

  return (
    <Dialogo
      titulo={editando ? 'Editar categoría' : 'Nueva categoría'}
      alCerrar={alCerrar}
      bloqueado={enviando}
      pie={
        <>
          <button type="button" className="boton-secundario" onClick={alCerrar} disabled={enviando}>
            Cancelar
          </button>
          <button type="submit" form={idFormulario} className="boton-principal" disabled={!puedeEnviar || enviando}>
            {editando ? (enviando ? 'Guardando…' : 'Guardar cambios') : enviando ? 'Creando…' : 'Crear categoría'}
          </button>
        </>
      }
    >
      <form id={idFormulario} className="formulario-categoria" onSubmit={guardar} noValidate>
        <Campo id={`${idFormulario}-nombre`} etiqueta="Nombre" error={errores.nombre} ayuda={`Máximo ${MAXIMO_NOMBRE} caracteres.`}>
          {(aria) => (
            <input
              id={`${idFormulario}-nombre`}
              type="text"
              autoComplete="off"
              maxLength={MAXIMO_NOMBRE}
              required
              aria-required="true"
              value={valores.nombre}
              onChange={cambiar('nombre')}
              disabled={enviando}
              {...aria}
            />
          )}
        </Campo>
        <Campo
          id={`${idFormulario}-descripcion`}
          etiqueta={
            <>
              Descripción<span className="campo__opcional"> (opcional)</span>
            </>
          }
          error={errores.descripcion}
          ayuda={`${valores.descripcion.length}/${MAXIMO_DESCRIPCION}`}
        >
          {(aria) => (
            <textarea
              id={`${idFormulario}-descripcion`}
              rows={3}
              maxLength={MAXIMO_DESCRIPCION}
              value={valores.descripcion}
              onChange={cambiar('descripcion')}
              disabled={enviando}
              {...aria}
            />
          )}
        </Campo>
        <Campo
          id={`${idFormulario}-urgencia`}
          etiqueta="Urgencia sugerida"
          error={errores.urgencia_sugerida}
          ayuda="Los reportes nuevos de esta categoría nacen con esta urgencia. El administrador la puede cambiar en cada reporte."
        >
          {(aria) => (
            <select
              id={`${idFormulario}-urgencia`}
              value={valores.urgencia_sugerida}
              onChange={cambiar('urgencia_sugerida')}
              disabled={enviando}
              {...aria}
            >
              {URGENCIAS.map((u) => (
                <option key={u.valor} value={u.valor}>
                  {u.nombre}
                </option>
              ))}
            </select>
          )}
        </Campo>
      </form>
      {hayOtros && <ErrorAccion error={error} />}
    </Dialogo>
  )
}
