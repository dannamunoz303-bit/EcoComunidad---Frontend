import { useLocation } from 'react-router-dom'

// Deja la URL actual en el DOM para revisarla en las pruebas con urlActual().
export default function UbicacionActual() {
  const { pathname, search } = useLocation()
  return (
    <output data-testid="url-actual" hidden>
      {pathname}
      {search}
    </output>
  )
}
