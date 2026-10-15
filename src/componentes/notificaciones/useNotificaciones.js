import { useContext } from 'react'
import { ContextoNotificaciones } from './contexto.js'

// { total, actualizar }: cuántas notificaciones sin leer hay y cómo volver a pedir el número.
export function useNotificaciones() {
  const notificaciones = useContext(ContextoNotificaciones)
  if (!notificaciones) throw new Error('useNotificaciones debe usarse dentro de <ProveedorNotificaciones>')
  return notificaciones
}