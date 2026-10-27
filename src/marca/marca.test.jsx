import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import IconoEstado from '../componentes/IconoEstado.jsx'
import Logo from './Logo.jsx'

describe('<Logo />', () => {
  it('se dibuja con su aria-label', () => {
    render(<Logo />)
    const logo = screen.getByRole('img', { name: 'EcoComunidad' })
    expect(logo).toHaveAttribute('width', '48')
  })

  it.each(['color', 'sobre-verde', 'un-color'])('dibuja la variante %s', (variante) => {
    render(<Logo variante={variante} tamano={24} />)
    expect(screen.getByRole('img', { name: 'EcoComunidad' })).toHaveAttribute('width', '24')
  })

  it('con conNombre muestra "EcoComunidad"', () => {
    const { container } = render(<Logo conNombre />)
    expect(container).toHaveTextContent('EcoComunidad')
    expect(screen.getByText('Eco')).toBeInTheDocument()
    expect(screen.getByText('Comunidad')).toBeInTheDocument()
  })
})

describe('<IconoEstado />', () => {
  it.each([
    ['vacio', 'lucide-inbox'],
    ['sin-resultados', 'lucide-search-x'],
    ['no-existe', 'lucide-circle-alert'],
    ['pronto', 'lucide-hourglass'],
  ])('el tipo %s dibuja el ícono %s, decorativo', (tipo, clase) => {
    const { container } = render(<IconoEstado tipo={tipo} />)
    const icono = container.querySelector('svg')
    expect(icono).toHaveClass('icono-estado', clase)
    expect(icono).toHaveAttribute('aria-hidden', 'true')
    expect(icono).toHaveAttribute('width', '112')
  })
})
