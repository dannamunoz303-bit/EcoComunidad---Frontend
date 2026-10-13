import { useContext } from 'react'
import { ContextoSesion } from './contexto.js'

export function useSesion() {
  const sesion = useContext(ContextoSesion)
  if (!sesion) throw new Error('useSesion debe usarse dentro de <ProveedorSesion>')
  return sesion
}
