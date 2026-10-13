import { Navigate, Outlet } from 'react-router-dom'
import PantallaCarga from '../componentes/PantallaCarga.jsx'
import { useSesion } from './useSesion.js'

// Solo con sesión de administrador; si no, a /login.
export function RutaProtegida() {
  const { usuario, cargando } = useSesion()
  if (cargando) return <PantallaCarga />
  if (!usuario) return <Navigate to="/login" replace />
  return <Outlet />
}

// /login: si ya hay sesión de administrador, al Resumen.
export function RutaPublica() {
  const { usuario, cargando } = useSesion()
  if (cargando) return <PantallaCarga />
  if (usuario) return <Navigate to="/" replace />
  return <Outlet />
}
