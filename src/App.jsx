import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import PaginaLogin from './paginas/PaginaLogin.jsx'
import PaginaNoEncontrada from './paginas/PaginaNoEncontrada.jsx'

// Solo en desarrollo: en el build de producción esta página no se incluye.
const PaginaMarca = import.meta.env.DEV ? lazy(() => import('./paginas/PaginaMarca.jsx')) : null

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<PaginaLogin />} />
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
  )
}
