import { LogOut } from 'lucide-react'
import { useAvisos } from '../../componentes/avisos/useAvisos.js'
import Logo from '../../marca/Logo.jsx'
import { useSesion } from '../../sesion/useSesion.js'
import FormularioCambiarContrasena from './FormularioCambiarContrasena.jsx'
import './cuenta.css'

// RN-05: con debe_cambiar_contrasena solo se puede cambiar la contraseña (o cerrar sesión).
// Al cambiarla, la ruta lleva sola al Resumen.
export default function PaginaCambioObligatorio() {
  const { cerrarSesion } = useSesion()
  const { mostrarAviso } = useAvisos()

  return (
    <main className="cambio-obligatorio">
      <div className="cambio-obligatorio__caja">
        <div className="cambio-obligatorio__logo">
          <Logo conNombre tamano={44} />
        </div>
        <h1 className="cambio-obligatorio__titulo">Cambia tu contraseña</h1>
        <p className="cambio-obligatorio__texto">Por seguridad, crea una contraseña nueva antes de continuar.</p>
        <FormularioCambiarContrasena
          ayudaActual="Es la contraseña temporal o inicial que te dieron."
          alTerminar={() => mostrarAviso({ tipo: 'exito', texto: 'Contraseña actualizada.' })}
        />
        <button type="button" className="boton-secundario cambio-obligatorio__salir" onClick={cerrarSesion}>
          <LogOut size={18} aria-hidden="true" />
          Cerrar sesión
        </button>
      </div>
    </main>
  )
}
