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
import PaginaResumen from './paginas/PaginaResumen.jsx'
import { RutaProtegida, RutaPublica } from './sesion/RutasSesion.jsx'

// Solo en desarrollo: en el build de producción esta página no se incluye.
const PaginaMarca = import.meta.env.DEV ? lazy(() => import('./paginas/PaginaMarca.jsx')) : null

export default function App() {
  return (
    <ProveedorAvisos>
      <Routes>
        <Route element={<RutaPublica />}>
          <Route path="/login" element={<PaginaLogin />} />
        </Route>

        <Route element={<RutaProtegida />}>
          <Route element={<DisenoPanel />}>
            <Route index element={<PaginaResumen />} />
            <Route path="/reportes" element={<PaginaReportes />} />
            <Route path="/reportes/:id" element={<PaginaReporte />} />
            <Route path="/reportes/:id/editar" element={<PaginaEditarReporte />} />
            {SECCIONES.filter(({ ruta }) => ruta !== '/' && ruta !== '/reportes').map(({ ruta }) => (
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
