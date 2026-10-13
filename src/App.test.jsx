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

  it('una ruta desconocida muestra el 404 con Brotico triste y enlace a /login', () => {
    enRuta('/no-existe')
    expect(screen.getByRole('img', { name: 'Brotico desanimado' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /inicio de sesión/i })).toHaveAttribute('href', '/login')
  })
})
