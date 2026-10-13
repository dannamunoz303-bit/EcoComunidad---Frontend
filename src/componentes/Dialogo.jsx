import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import './dialogo.css'

const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Modal accesible: se cierra con Esc y con el botón "Cerrar", mantiene el foco dentro
// y, al cerrarse, lo devuelve al elemento que lo tenía al abrir (el botón que lo abrió).
// Con `bloqueado` (mientras se envía algo) no se puede cerrar.
export default function Dialogo({ titulo, alCerrar, children, pie, bloqueado = false, grande = false }) {
  const idTitulo = useId()
  const caja = useRef(null)
  const estado = useRef({ alCerrar, bloqueado })

  useEffect(() => {
    estado.current = { alCerrar, bloqueado }
  }, [alCerrar, bloqueado])

  // Foco inicial: el elemento marcado con data-autofoco, o el primero enfocable del contenido.
  useEffect(() => {
    const anterior = document.activeElement
    const desbordeAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const inicial =
      caja.current.querySelector('[data-autofoco]') ??
      caja.current.querySelector('.dialogo__cuerpo')?.querySelector(ENFOCABLES) ??
      caja.current.querySelector(ENFOCABLES)
    inicial?.focus()
    return () => {
      document.body.style.overflow = desbordeAnterior
      if (anterior instanceof HTMLElement && anterior.isConnected) anterior.focus()
    }
  }, [])

  useEffect(() => {
    function alPresionar(evento) {
      if (evento.key === 'Escape') {
        evento.preventDefault()
        if (!estado.current.bloqueado) estado.current.alCerrar()
        return
      }
      if (evento.key !== 'Tab') return
      const enfocables = [...caja.current.querySelectorAll(ENFOCABLES)]
      if (enfocables.length === 0) return
      const primero = enfocables[0]
      const ultimo = enfocables[enfocables.length - 1]
      const dentro = caja.current.contains(document.activeElement)
      if (evento.shiftKey && (document.activeElement === primero || !dentro)) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && (document.activeElement === ultimo || !dentro)) {
        evento.preventDefault()
        primero.focus()
      }
    }
    document.addEventListener('keydown', alPresionar)
    return () => document.removeEventListener('keydown', alPresionar)
  }, [])

  return createPortal(
    <div className="dialogo">
      <div className="dialogo__fondo" aria-hidden="true" onClick={() => !bloqueado && alCerrar()} />
      <div
        ref={caja}
        className={`dialogo__caja${grande ? ' dialogo__caja--grande' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
      >
        <div className="dialogo__cabecera">
          <h2 id={idTitulo} className="dialogo__titulo">
            {titulo}
          </h2>
          <button
            type="button"
            className="dialogo__cerrar"
            aria-label="Cerrar"
            onClick={alCerrar}
            disabled={bloqueado}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="dialogo__cuerpo">{children}</div>
        {pie && <div className="dialogo__pie">{pie}</div>}
      </div>
    </div>,
    document.body,
  )
}
