import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import './visor-fotos.css'

// Diálogo para ver fotos en grande. Esc cierra; las flechas cambian de foto.
// fotos: [{ url, alt }]
// focoAlCerrar(indice): elemento que recibe el foco al cerrar (por defecto, el que lo tenía al abrir).
export default function VisorFotos({ fotos, indice, alCerrar, alCambiar, focoAlCerrar }) {
  const dialogo = useRef(null)
  const botonCerrar = useRef(null)
  const ultimoIndice = useRef(indice)
  const destinoFoco = useRef(focoAlCerrar)
  const foto = fotos[indice]
  const total = fotos.length

  useEffect(() => {
    ultimoIndice.current = indice
    destinoFoco.current = focoAlCerrar
  }, [indice, focoAlCerrar])

  // Foco al abrir, se devuelve al cerrar; sin desplazamiento de fondo.
  useEffect(() => {
    const anterior = document.activeElement
    const desbordeAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    botonCerrar.current?.focus()
    return () => {
      document.body.style.overflow = desbordeAnterior
      const destino = destinoFoco.current?.(ultimoIndice.current) ?? anterior
      if (destino instanceof HTMLElement) destino.focus()
    }
  }, [])

  useEffect(() => {
    function alPresionar(evento) {
      if (evento.key === 'Escape') {
        evento.preventDefault()
        alCerrar()
      } else if (evento.key === 'ArrowRight' && total > 1) {
        evento.preventDefault()
        alCambiar((indice + 1) % total)
      } else if (evento.key === 'ArrowLeft' && total > 1) {
        evento.preventDefault()
        alCambiar((indice - 1 + total) % total)
      } else if (evento.key === 'Tab') {
        // El foco se queda dentro del diálogo
        const enfocables = [...dialogo.current.querySelectorAll('button')]
        const primero = enfocables[0]
        const ultimo = enfocables[enfocables.length - 1]
        if (evento.shiftKey && document.activeElement === primero) {
          evento.preventDefault()
          ultimo.focus()
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
          evento.preventDefault()
          primero.focus()
        }
      }
    }
    document.addEventListener('keydown', alPresionar)
    return () => document.removeEventListener('keydown', alPresionar)
  }, [indice, total, alCerrar, alCambiar])

  if (!foto) return null

  return createPortal(
    <div className="visor" role="dialog" aria-modal="true" aria-label={foto.alt} ref={dialogo}>
      <div className="visor__fondo" aria-hidden="true" onClick={alCerrar} />
      <button ref={botonCerrar} type="button" className="visor__boton visor__cerrar" aria-label="Cerrar" onClick={alCerrar}>
        <X size={24} aria-hidden="true" />
      </button>
      <figure className="visor__figura">
        <img className="visor__imagen" src={foto.url} alt={foto.alt} />
        <figcaption className="visor__pie">
          {foto.alt} · {indice + 1} de {total}
        </figcaption>
      </figure>
      {total > 1 && (
        <>
          <button
            type="button"
            className="visor__boton visor__anterior"
            aria-label="Foto anterior"
            onClick={() => alCambiar((indice - 1 + total) % total)}
          >
            <ChevronLeft size={28} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="visor__boton visor__siguiente"
            aria-label="Foto siguiente"
            onClick={() => alCambiar((indice + 1) % total)}
          >
            <ChevronRight size={28} aria-hidden="true" />
          </button>
        </>
      )}
    </div>,
    document.body,
  )
}
