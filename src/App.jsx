import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import ProveedorAvisos from './componentes/avisos/ProveedorAvisos.jsx'
import DisenoPanel from './componentes/DisenoPanel.jsx'
import PaginaCambioObligatorio from './paginas/cuenta/PaginaCambioObligatorio.jsx'
import PaginaLogin from './paginas/PaginaLogin.jsx'
import PaginaNoEncontrada from './paginas/PaginaNoEncontrada.jsx'
import PaginaResumen from './paginas/PaginaResumen.jsx'
import { RutaCambioObligatorio, RutaProtegida, RutaPublica } from './sesion/RutasSesion.jsx'

// En el paquete principal van el login, el diseño general y el Resumen.
// Cada sección se descarga al abrirla; mientras llega, DisenoPanel muestra el logo centrado.
const PaginaReportes = lazy(() => import('./paginas/reportes/PaginaReportes.jsx'))
const PaginaReporte = lazy(() => import('./paginas/reportes/PaginaReporte.jsx'))
const PaginaEditarReporte = lazy(() => import('./paginas/reportes/editar/PaginaEditarReporte.jsx'))
const PaginaTareas = lazy(() => import('./paginas/tareas/PaginaTareas.jsx'))
const PaginaUsuarios = lazy(() => import('./paginas/usuarios/PaginaUsuarios.jsx'))
const PaginaNuevoUsuario = lazy(() => import('./paginas/usuarios/PaginaNuevoUsuario.jsx'))
const PaginaUsuario = lazy(() => import('./paginas/usuarios/PaginaUsuario.jsx'))
const PaginaEditarUsuario = lazy(() => import('./paginas/usuarios/PaginaEditarUsuario.jsx'))
const PaginaCategorias = lazy(() => import('./paginas/categorias/PaginaCategorias.jsx'))
const PaginaNovedades = lazy(() => import('./paginas/novedades/PaginaNovedades.jsx'))
const PaginaNovedad = lazy(() => import('./paginas/novedades/PaginaNovedad.jsx'))
const PaginaSanciones = lazy(() => import('./paginas/sanciones/PaginaSanciones.jsx'))
const PaginaNuevaSancion = lazy(() => import('./paginas/sanciones/PaginaNuevaSancion.jsx'))
const PaginaSeguimiento = lazy(() => import('./paginas/seguimiento/PaginaSeguimiento.jsx'))
const PaginaGestorSeguimiento = lazy(() => import('./paginas/seguimiento/PaginaGestorSeguimiento.jsx'))
const PaginaNotificaciones = lazy(() => import('./paginas/notificaciones/PaginaNotificaciones.jsx'))
const PaginaMiCuenta = lazy(() => import('./paginas/cuenta/PaginaMiCuenta.jsx'))

// Solo en desarrollo: en el build de producción esta página no se incluye.
const PaginaMarca = import.meta.env.DEV ? lazy(() => import('./paginas/PaginaMarca.jsx')) : null

export default function App() {
  return (
    <ProveedorAvisos>
      <Routes>
        <Route element={<RutaPublica />}>
          <Route path="/login" element={<PaginaLogin />} />
        </Route>

        {/* RN-05: contraseña pendiente de cambio */}
        <Route element={<RutaCambioObligatorio />}>
          <Route path="/cambiar-contrasena" element={<PaginaCambioObligatorio />} />
        </Route>

        <Route element={<RutaProtegida />}>
          <Route element={<DisenoPanel />}>
            <Route index element={<PaginaResumen />} />
            <Route path="/reportes" element={<PaginaReportes />} />
            <Route path="/reportes/:id" element={<PaginaReporte />} />
            <Route path="/reportes/:id/editar" element={<PaginaEditarReporte />} />
            <Route path="/tareas" element={<PaginaTareas />} />
            <Route path="/usuarios" element={<PaginaUsuarios />} />
            <Route path="/usuarios/nuevo" element={<PaginaNuevoUsuario />} />
            <Route path="/usuarios/:id" element={<PaginaUsuario />} />
            <Route path="/usuarios/:id/editar" element={<PaginaEditarUsuario />} />
            <Route path="/categorias" element={<PaginaCategorias />} />
            <Route path="/novedades" element={<PaginaNovedades />} />
            <Route path="/novedades/:id" element={<PaginaNovedad />} />
            <Route path="/sanciones" element={<PaginaSanciones />} />
            <Route path="/sanciones/nueva" element={<PaginaNuevaSancion />} />
            <Route path="/seguimiento" element={<PaginaSeguimiento />} />
            <Route path="/seguimiento/:id" element={<PaginaGestorSeguimiento />} />
            <Route path="/notificaciones" element={<PaginaNotificaciones />} />
            <Route path="/mi-cuenta" element={<PaginaMiCuenta />} />
          </Route>
        </Route>

        {PaginaMarca && (
          <Route
            path="/marca"
            element={
              <Suspense fallback={null}>
                <PaginaMarca />
              </Suspense>
            }
          />
        )}
        <Route path="*" element={<PaginaNoEncontrada />} />
      </Routes>
    </ProveedorAvisos>
  )
}
