import { useRef } from 'react'
import './pestanas.css'

// Pestañas (patrón de WAI-ARIA): flechas, Inicio y Fin mueven entre ellas.
// opciones: [{ valor, nombre, cantidad }]; idPanel: id del role="tabpanel" que controlan.
export default function Pestanas({ opciones, valor, alCambiar, etiqueta, idPanel, prefijoId = 'pestana' }) {
  const botones = useRef([])

  function alPresionar(evento, indice) {
    const destinos = { ArrowRight: indice + 1, ArrowLeft: indice - 1, Home: 0, End: opciones.length - 1 }
    if (!(evento.key in destinos)) return
    evento.preventDefault()
    const siguiente = (destinos[evento.key] + opciones.length) % opciones.length
    alCambiar(opciones[siguiente].valor)
    botones.current[siguiente]?.focus()
  }

  return (
    <div className="pestanas" role="tablist" aria-label={etiqueta}>
      {opciones.map((opcion, i) => (
        <button
          key={opcion.valor}
          ref={(boton) => {
            botones.current[i] = boton
          }}
          type="button"
          role="tab"
          id={`${prefijoId}-${opcion.valor}`}
          aria-selected={valor === opcion.valor}
          aria-controls={idPanel}
          tabIndex={valor === opcion.valor ? 0 : -1}
          className="pestana"
          onClick={() => alCambiar(opcion.valor)}
          onKeyDown={(e) => alPresionar(e, i)}
        >
          {opcion.nombre}
          {opcion.cantidad !== undefined && <span className="filtro-estado__cantidad">{opcion.cantidad}</span>}
        </button>
      ))}
    </div>
  )
}
