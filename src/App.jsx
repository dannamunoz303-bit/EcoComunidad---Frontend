import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import ProveedorAvisos from './componentes/avisos/ProveedorAvisos.jsx'
import DisenoPanel from './componentes/DisenoPanel.jsx'
import { SECCIONES } from './componentes/secciones.js'
import PaginaLogin from './paginas/PaginaLogin.jsx'
import PaginaNoEncontrada from './paginas/PaginaNoEncontrada.jsx'
import PaginaPronto from './paginas/PaginaPronto.jsx'
import PaginaEditarReporte from './paginas/reportes/editar/PaginaEditarReporte.jsx'
import PaginaReporte from './paginas/reportes/PaginaReporte.jsx'
import PaginaReportes from './paginas/reportes/PaginaReportes.jsx'
import PaginaCambioObligatorio from './paginas/cuenta/PaginaCambioObligatorio.jsx'
import PaginaMiCuenta from './paginas/cuenta/PaginaMiCuenta.jsx'
import PaginaResumen from './paginas/PaginaResumen.jsx'
import PaginaTareas from './paginas/tareas/PaginaTareas.jsx'
import PaginaEditarUsuario from './paginas/usuarios/PaginaEditarUsuario.jsx'
import PaginaNuevoUsuario from './paginas/usuarios/PaginaNuevoUsuario.jsx'
import PaginaUsuario from './paginas/usuarios/PaginaUsuario.jsx'
import PaginaUsuarios from './paginas/usuarios/PaginaUsuarios.jsx'
import { RutaCambioObligatorio, RutaProtegida, RutaPublica } from './sesion/RutasSesion.jsx'

// Solo en desarrollo: en el build de producción esta página no se incluye.
const PaginaMarca = import.meta.env.DEV ? lazy(() => import('./paginas/PaginaMarca.jsx')) : null

// Secciones que ya tienen su página; las demás muestran "Esta sección llega pronto."
const HECHAS = ['/', '/reportes', '/tareas', '/usuarios']

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
            <Route path="/mi-cuenta" element={<PaginaMiCuenta />} />
            <Route path="/usuarios" element={<PaginaUsuarios />} />
            <Route path="/usuarios/nuevo" element={<PaginaNuevoUsuario />} />
            <Route path="/usuarios/:id" element={<PaginaUsuario />} />
            <Route path="/usuarios/:id/editar" element={<PaginaEditarUsuario />} />
            {SECCIONES.filter(({ ruta }) => !HECHAS.includes(ruta)).map(({ ruta }) => (
              <Route key={ruta} path={ruta} element={<PaginaPronto />} />
            ))}
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
