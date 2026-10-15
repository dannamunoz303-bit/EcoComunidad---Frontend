import { levantarBloqueo } from '../../api/usuarios.js'
import { nombreCompleto } from '../../utilidades/usuarios.js'
import DialogoConfirmar from '../reportes/acciones/DialogoConfirmar.jsx'

// RN-21: cierra los bloqueos vigentes. Si está inactivo, su estado no cambia.
export default function DialogoLevantarBloqueo({ usuario, alCerrar, alTerminar }) {
  return (
    <DialogoConfirmar
      titulo={`¿Levantar el bloqueo de ${nombreCompleto(usuario)}?`}
      textoBoton="Levantar bloqueo"
      textoEnviando="Levantando…"
      accion={() => levantarBloqueo(usuario.id)}
      alCerrar={alCerrar}
      alTerminar={alTerminar}
    >
      <p>Se cerrarán sus sanciones de bloqueo vigentes y podrá volver a iniciar sesión.</p>
      {usuario.estado === 'inactivo' && <p>Seguirá inactivo hasta que lo reactiven.</p>}
    </DialogoConfirmar>
  )
}
