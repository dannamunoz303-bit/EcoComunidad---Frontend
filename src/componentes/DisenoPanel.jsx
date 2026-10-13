import { CircleUserRound, LogOut, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import Logo from '../marca/Logo.jsx'
import { useSesion } from '../sesion/useSesion.js'
import { SECCIONES, tituloDeRuta } from './secciones.js'
import './componentes.css'

// Diseño de las rutas protegidas: barra lateral, barra superior y contenido.
export default function DisenoPanel() {
  const { usuario, cerrarSesion } = useSesion()
  const { pathname } = useLocation()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const titulo = tituloDeRuta(pathname)

  useEffect(() => {
    if (!menuAbierto) return undefined
    const alPresionar = (evento) => {
      if (evento.key === 'Escape') setMenuAbierto(false)
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [menuAbierto])

  const cerrarMenu = () => setMenuAbierto(false)

  return (
    <div className="panel">
      <aside
        id="barra-lateral"
        className={`barra-lateral sobre-verde${menuAbierto ? ' barra-lateral--abierta' : ''}`}
      >
        <div className="barra-lateral__cabecera">
          <Logo variante="sobre-verde" conNombre tamano={40} />
          <button type="button" className="barra-lateral__cerrar" aria-label="Cerrar menú" onClick={cerrarMenu}>
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <nav aria-label="Secciones del panel">
          <ul className="barra-lateral__lista">
            {SECCIONES.map(({ ruta, titulo, icono: Icono }) => (
              <li key={ruta}>
                <NavLink to={ruta} end={ruta === '/'} className="barra-lateral__enlace" onClick={cerrarMenu}>
                  <Icono size={20} aria-hidden="true" />
                  {titulo}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {menuAbierto && <div className="panel__fondo" aria-hidden="true" onClick={cerrarMenu} />}

      <div className="panel__contenido">
        <header className="barra-superior">
          <button
            type="button"
            className="barra-superior__menu"
            aria-label="Abrir menú"
            aria-expanded={menuAbierto}
            aria-controls="barra-lateral"
            onClick={() => setMenuAbierto(true)}
          >
            <Menu size={22} aria-hidden="true" />
          </button>
          <h1 className="barra-superior__titulo">{titulo}</h1>
          <Link
            className="barra-superior__cuenta"
            to="/mi-cuenta"
            aria-label={`Mi cuenta (${usuario.nombre} ${usuario.apellido})`}
            aria-current={pathname === '/mi-cuenta' ? 'page' : undefined}
          >
            <CircleUserRound size={20} aria-hidden="true" />
            <span className="barra-superior__usuario">
              {usuario.nombre} {usuario.apellido}
            </span>
          </Link>
          <button type="button" className="boton-secundario" onClick={cerrarSesion}>
            <LogOut size={18} aria-hidden="true" />
            Cerrar sesión
          </button>
        </header>
        <main className="panel__principal">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
