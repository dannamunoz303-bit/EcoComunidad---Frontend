import { useCallback, useRef, useState } from 'react'
import VisorFotos from '../../componentes/VisorFotos.jsx'

// Miniaturas en cuadrícula; al hacer clic se abren en grande.
// fotos: [{ id, url, alt }]
export default function GaleriaFotos({ fotos, className = '' }) {
  const [abierta, setAbierta] = useState(null)
  const botones = useRef([])
  // Al cerrar, el foco vuelve a la miniatura de la última foto vista.
  const focoAlCerrar = useCallback((indice) => botones.current[indice], [])

  return (
    <>
      <ul className={`galeria ${className}`.trim()}>
        {fotos.map((foto, i) => (
          <li key={foto.id ?? foto.url}>
            <button
              ref={(boton) => {
                botones.current[i] = boton
              }}
              type="button"
              className="galeria__boton"
              aria-label={`Ver en grande: ${foto.alt}`}
              onClick={() => setAbierta(i)}
            >
              <img src={foto.url} alt={foto.alt} loading="lazy" />
            </button>
          </li>
        ))}
      </ul>
      {abierta !== null && (
        <VisorFotos
          fotos={fotos}
          indice={abierta}
          alCambiar={setAbierta}
          alCerrar={() => setAbierta(null)}
          focoAlCerrar={focoAlCerrar}
        />
      )}
    </>
  )
}
