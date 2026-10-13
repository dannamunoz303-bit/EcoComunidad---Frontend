import { reabrirReporte } from '../../../api/reportes.js'
import DialogoConfirmar from './DialogoConfirmar.jsx'

export const AVISO_REABIERTO = 'Reporte reabierto. Ya puedes asignarle una tarea nueva.'

// RN-17: resuelto → aprobado. Si el backend responde 400 (sin queja posterior a la
// última revisión), el motivo se muestra en el diálogo sin cerrarlo.
export default function DialogoReabrir({ reporteId, alCerrar, alTerminar }) {
  return (
    <DialogoConfirmar
      titulo="¿Reabrir este reporte?"
      textoBoton="Reabrir"
      textoEnviando="Reabriendo…"
      accion={() => reabrirReporte(reporteId)}
      alCerrar={alCerrar}
      alTerminar={alTerminar}
    >
      <p>
        Solo se puede reabrir si el ciudadano presentó una queja después de que se resolvió. Las tareas anteriores
        quedan como historial.
      </p>
    </DialogoConfirmar>
  )
}
