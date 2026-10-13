import { useAvisos } from '../../componentes/avisos/useAvisos.js'
import { useSesion } from '../../sesion/useSesion.js'
import { formatearFechaHora } from '../../utilidades/fechas.js'
import { NOMBRES_ROL } from '../../utilidades/usuarios.js'
import FormularioCambiarContrasena from './FormularioCambiarContrasena.jsx'
import '../reportes/detalle.css'
import './cuenta.css'

// Datos del administrador que inició sesión (de /auth/yo/) y cambio de su contraseña.
export default function PaginaMiCuenta() {
  const { usuario } = useSesion()
  const { mostrarAviso } = useAvisos()

  return (
    <div className="mi-cuenta">
      <section className="detalle__seccion" aria-labelledby="titulo-mis-datos">
        <h2 id="titulo-mis-datos" className="detalle__subtitulo">
          Mis datos
        </h2>
        <dl className="datos-lista">
          <div>
            <dt>Nombre</dt>
            <dd>{usuario.nombre}</dd>
          </div>
          <div>
            <dt>Apellido</dt>
            <dd>{usuario.apellido}</dd>
          </div>
          <div>
            <dt>Correo</dt>
            <dd>{usuario.correo}</dd>
          </div>
          <div>
            <dt>Rol</dt>
            <dd>{NOMBRES_ROL[usuario.rol] ?? usuario.rol}</dd>
          </div>
          {usuario.fecha_registro && (
            <div>
              <dt>Fecha de registro</dt>
              <dd>
                <time dateTime={usuario.fecha_registro}>{formatearFechaHora(usuario.fecha_registro)}</time>
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section className="detalle__seccion" aria-labelledby="titulo-cambiar-contrasena">
        <h2 id="titulo-cambiar-contrasena" className="detalle__subtitulo">
          Cambiar contraseña
        </h2>
        <FormularioCambiarContrasena
          alTerminar={() => mostrarAviso({ tipo: 'exito', texto: 'Contraseña actualizada.' })}
        />
      </section>
    </div>
  )
}
