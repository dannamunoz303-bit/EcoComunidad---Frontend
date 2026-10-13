import { CircleAlert } from 'lucide-react'
import { mensajeDeError } from '../../../api/errores.js'

// Motivo del backend tal cual (detail o errores por campo), dentro del diálogo.
export default function ErrorAccion({ error }) {
  if (!error) return null
  return (
    <p className="error-accion" role="alert">
      <CircleAlert size={18} aria-hidden="true" />
      {mensajeDeError(error)}
    </p>
  )
}
