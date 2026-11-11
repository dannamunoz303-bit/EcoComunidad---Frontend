import { useId, useState } from 'react'
import { cambiarUrgencia } from '../../../api/reportes.js'
import Dialogo from '../../../componentes/Dialogo.jsx'
import { URGENCIAS, nombreUrgencia } from '../../../utilidades/territorio.js'
import ErrorAccion from './ErrorAccion.jsx'
import { useEnvio } from './useEnvio.js'

// RN-25: el administrador cambia la urgencia mientras el reporte no esté eliminado.
// alTerminar(reporte, urgencia) se llama si el backend la guardó.
export default function DialogoUrgencia({ reporte, alCerrar, alTerminar }) {
  const [urgencia, setUrgencia] = useState(reporte.urgencia ?? '')
  const { enviando, error, enviar } = useEnvio()
  const idSelector = useId()
  const sinCambio = !urgencia || urgencia === reporte.urgencia

  async function confirmar() {
    if (sinCambio) return
    const { ok, resultado } = await enviar(() => cambiarUrgencia(reporte.id, urgencia))
    if (ok) alTerminar(resultado, urgencia)
  }

  return (
    <Dialogo
      titulo="Cambiar urgencia"
      alCerrar={alCerrar}
      bloqueado={enviando}
      pie={
        <>
          <button type="button" className="boton-secundario" onClick={alCerrar} disabled={enviando}>
            Cancelar
          </button>
          <button type="button" className="boton-principal" onClick={confirmar} disabled={sinCambio || enviando}>
            {enviando ? 'Guardando…' : 'Confirmar'}
          </button>
        </>
      }
    >
      <p>
        Urgencia actual: <strong>{nombreUrgencia(reporte.urgencia) ?? 'sin urgencia'}</strong>. La lista de reportes se
        ordena por urgencia, alta primero.
      </p>
      <div className="campo">
        <label htmlFor={idSelector}>Nueva urgencia</label>
        <select
          id={idSelector}
          value={urgencia}
          onChange={(e) => setUrgencia(e.target.value)}
          disabled={enviando}
          data-autofoco
        >
          {!reporte.urgencia && (
            <option value="" disabled>
              Elige una urgencia
            </option>
          )}
          {URGENCIAS.map((u) => (
            <option key={u.valor} value={u.valor}>
              {u.nombre}
            </option>
          ))}
        </select>
      </div>
      <ErrorAccion error={error} />
    </Dialogo>
  )
}
