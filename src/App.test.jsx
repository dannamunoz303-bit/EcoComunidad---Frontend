import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from './App.jsx'

const enRuta = (ruta) =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <App />
    </MemoryRouter>,
  )

describe('rutas', () => {
  it('/login muestra el logo animado y el aviso del paso 3', () => {
    enRuta('/login')
    expect(screen.getByText('Inicio de sesión (paso 3)')).toBeInTheDocument()
  })

  it('una ruta desconocida muestra el 404 con Brotico triste y enlace a /login', () => {
    enRuta('/no-existe')
    expect(screen.getByRole('img', { name: 'Brotico desanimado' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /inicio de sesión/i })).toHaveAttribute('href', '/login')
  })
})
