import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ProveedorAvisos from './ProveedorAvisos.jsx'
import { useAvisos } from './useAvisos.js'

function Lanzador({ tipo, texto }) {
  const { mostrarAviso } = useAvisos()
  return (
    <button type="button" onClick={() => mostrarAviso({ tipo, texto })}>
      Lanzar
    </button>
  )
}

const montar = (tipo, texto) =>
  render(
    <ProveedorAvisos>
      <Lanzador tipo={tipo} texto={texto} />
    </ProveedorAvisos>,
  )

describe('<Aviso>', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('un aviso de éxito se anuncia y se va solo a los 5 segundos', () => {
    montar('exito', 'Cambios guardados.')
    fireEvent.click(screen.getByRole('button', { name: 'Lanzar' }))

    const texto = screen.getByText('Cambios guardados.')
    expect(texto.closest('[aria-live]')).toHaveAttribute('aria-live', 'polite')

    act(() => vi.advanceTimersByTime(4900))
    expect(screen.getByText('Cambios guardados.')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(100))
    expect(screen.queryByText('Cambios guardados.')).not.toBeInTheDocument()
  })

  it('un aviso de error usa una región "assertive" y se cierra con su botón', () => {
    montar('error', 'No se pudo guardar.')
    fireEvent.click(screen.getByRole('button', { name: 'Lanzar' }))

    expect(screen.getByText('No se pudo guardar.').closest('[aria-live]')).toHaveAttribute('aria-live', 'assertive')
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }))
    expect(screen.queryByText('No se pudo guardar.')).not.toBeInTheDocument()
  })
})
