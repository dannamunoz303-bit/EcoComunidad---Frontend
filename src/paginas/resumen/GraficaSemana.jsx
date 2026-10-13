import { useEffect, useId, useRef, useState } from 'react'
import { fechaHoyColombia, letraDelDia, nombreDelDia } from '../../utilidades/fechas.js'

// Medidas en píxeles: el SVG usa su ancho real, así las barras no pasan de 200 px.
const ALTO_BARRAS = 200
const ARRIBA = 34 // espacio para la etiqueta de la barra más alta
const BASE = ARRIBA + ALTO_BARRAS // línea donde terminan las barras
const ALTO = BASE + 32 // letras de los días debajo
const ANCHO_INICIAL = 420

const textoReportes = (total) => `${total} ${total === 1 ? 'reporte' : 'reportes'}`

// Ancho disponible del contenedor (en pruebas sin ResizeObserver se usa el inicial).
function useAnchoDe(ref) {
  const [ancho, setAncho] = useState(ANCHO_INICIAL)
  useEffect(() => {
    const elemento = ref.current
    if (!elemento || typeof ResizeObserver === 'undefined') return undefined
    const observador = new ResizeObserver(([entrada]) => {
      const nuevo = Math.floor(entrada.contentRect.width)
      if (nuevo > 0) setAncho(nuevo)
    })
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [ref])
  return ancho
}

function Etiqueta({ x, y, total, fija }) {
  const ancho = Math.max(28, String(total).length * 8 + 18)
  return (
    <g className={`barra__etiqueta${fija ? ' barra__etiqueta--fija' : ''}`} aria-hidden="true">
      <rect x={x - ancho / 2} y={y - 26} width={ancho} height={20} rx={10} />
      <text x={x} y={y - 12} textAnchor="middle">
        {total}
      </text>
    </g>
  )
}

export default function GraficaSemana({ dias }) {
  const contenedor = useRef(null)
  const ancho = useAnchoDe(contenedor)
  // El id de React puede traer caracteres que no sirven dentro de url(#…).
  const idRayas = `rayas-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const hoy = fechaHoyColombia()
  const maximo = Math.max(0, ...dias.map((d) => d.total))
  const indiceMaximo = maximo > 0 ? dias.findIndex((d) => d.total === maximo) : -1
  const anchoColumna = ancho / dias.length
  const anchoBarra = Math.min(36, Math.max(16, anchoColumna * 0.5))

  return (
    <div ref={contenedor} className="grafica-semana__contenedor">
      <svg
        className="grafica-semana"
        width={ancho}
        height={ALTO}
        viewBox={`0 0 ${ancho} ${ALTO}`}
        role="group"
        aria-label="Reportes creados en los últimos 7 días"
      >
        <defs>
          <pattern id={idRayas} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="7" className="barra__raya" />
          </pattern>
        </defs>
        <line x1="0" x2={ancho} y1={BASE + 0.5} y2={BASE + 0.5} className="grafica-semana__base" />

        {dias.map(({ fecha, total }, i) => {
          const centro = i * anchoColumna + anchoColumna / 2
          const esHoy = fecha === hoy
          const vacia = total === 0
          // Día sin reportes: cápsula vacía de altura completa
          const alto = vacia ? ALTO_BARRAS : Math.max(anchoBarra, (total / maximo) * ALTO_BARRAS)
          const y = BASE - alto
          const clases = ['barra', esHoy && 'barra--hoy', vacia && 'barra--vacia'].filter(Boolean).join(' ')

          return (
            <g
              key={fecha}
              className={clases}
              tabIndex={0}
              role="img"
              aria-label={`${nombreDelDia(fecha)}${esHoy ? ' (hoy)' : ''}: ${textoReportes(total)}`}
              aria-current={esHoy ? 'date' : undefined}
              data-fecha={fecha}
            >
              <rect
                className="barra__foco"
                x={i * anchoColumna + 3}
                y={2}
                width={anchoColumna - 6}
                height={ALTO - 4}
                rx={14}
              />
              <rect
                className="barra__capsula"
                x={centro - anchoBarra / 2}
                y={y}
                width={anchoBarra}
                height={alto}
                rx={anchoBarra / 2}
                // En línea para ganarle al relleno verde del CSS
                style={vacia ? { fill: `url(#${idRayas})` } : undefined}
              />
              <Etiqueta x={centro} y={y} total={total} fija={i === indiceMaximo} />
              <text className="barra__dia" x={centro} y={BASE + 24} textAnchor="middle" aria-hidden="true">
                {letraDelDia(fecha)}
              </text>
            </g>
          )
        })}
      </svg>

      <table className="solo-lector">
        <caption>Reportes creados por día</caption>
        <thead>
          <tr>
            <th scope="col">Día</th>
            <th scope="col">Reportes</th>
          </tr>
        </thead>
        <tbody>
          {dias.map(({ fecha, total }) => (
            <tr key={fecha}>
              <th scope="row">
                {nombreDelDia(fecha)}
                {fecha === hoy ? ' (hoy)' : ''}
              </th>
              <td>{total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
