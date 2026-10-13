import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Brotico from './Brotico.jsx'
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

describe('<Brotico />', () => {
  it.each([
    ['saluda', 'Brotico saludando'],
    ['triste', 'Brotico desanimado'],
    ['florece', 'Brotico celebrando'],
    ['piensa', 'Brotico pensando'],
  ])('el estado %s tiene el aria-label "%s"', (estado, etiqueta) => {
    render(<Brotico estado={estado} />)
    expect(screen.getByRole('img', { name: etiqueta })).toHaveAttribute('aria-label', etiqueta)
  })
})
