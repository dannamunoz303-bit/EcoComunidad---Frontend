import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from './App.jsx'
import ProveedorSesion from './sesion/ProveedorSesion.jsx'

const enRuta = (ruta) =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <ProveedorSesion>
        <App />
      </ProveedorSesion>
    </MemoryRouter>,
  )

describe('rutas', () => {
  it('/login muestra el logo animado y el formulario', () => {
    enRuta('/login')
    expect(screen.getByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument()
    expect(screen.getByLabelText('Correo')).toBeInTheDocument()
  })

  it('una ruta desconocida muestra el 404 con su ícono y enlace a /login', () => {
    enRuta('/no-existe')
    expect(document.querySelector('.icono-estado.lucide-circle-alert')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /inicio de sesión/i })).toHaveAttribute('href', '/login')
  })
})
