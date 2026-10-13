import { useId } from 'react'
import { fechaHoyColombia, letraDelDia, nombreDelDia } from '../../utilidades/fechas.js'

// Medidas del SVG (viewBox); se escala completo al ancho de la tarjeta.
const ANCHO_COLUMNA = 60
const ANCHO_BARRA = 28
const ALTO = 240
const ARRIBA = 40 // espacio para la etiqueta de la barra más alta
const BASE = 200 // línea donde terminan las barras
const ALTO_MAXIMO = BASE - ARRIBA
const ALTO_VACIA = ANCHO_BARRA * 1.6

const textoReportes = (total) => `${total} ${total === 1 ? 'reporte' : 'reportes'}`

function Etiqueta({ x, y, total, fija }) {
  const ancho = Math.max(28, String(total).length * 9 + 18)
  return (
    <g className={`barra__etiqueta${fija ? ' barra__etiqueta--fija' : ''}`} aria-hidden="true">
      <rect x={x - ancho / 2} y={y - 24} width={ancho} height={20} rx={10} />
      <text x={x} y={y - 10} textAnchor="middle">
        {total}
      </text>
    </g>
  )
}

export default function GraficaSemana({ dias }) {
  const idRayas = useId()
  const hoy = fechaHoyColombia()
  const maximo = Math.max(0, ...dias.map((d) => d.total))
  const indiceMaximo = maximo > 0 ? dias.findIndex((d) => d.total === maximo) : -1

  return (
    <>
      <svg
        className="grafica-semana"
        viewBox={`0 0 ${dias.length * ANCHO_COLUMNA} ${ALTO}`}
        role="group"
        aria-label="Reportes creados en los últimos 7 días"
      >
        <defs>
          <pattern id={idRayas} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" className="barra__raya" />
          </pattern>
        </defs>
        <line x1="0" x2={dias.length * ANCHO_COLUMNA} y1={BASE + 0.5} y2={BASE + 0.5} className="grafica-semana__base" />

        {dias.map(({ fecha, total }, i) => {
          const centro = i * ANCHO_COLUMNA + ANCHO_COLUMNA / 2
          const x = centro - ANCHO_BARRA / 2
          const esHoy = fecha === hoy
          const vacia = total === 0
          const alto = vacia ? ALTO_VACIA : Math.max(ANCHO_BARRA, (total / maximo) * ALTO_MAXIMO)
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
                x={i * ANCHO_COLUMNA + 4}
                y={ARRIBA - 32}
                width={ANCHO_COLUMNA - 8}
                height={ALTO - ARRIBA + 30}
                rx={14}
              />
              <rect
                className="barra__capsula"
                x={x}
                y={y}
                width={ANCHO_BARRA}
                height={alto}
                rx={ANCHO_BARRA / 2}
                fill={vacia ? `url(#${idRayas})` : undefined}
              />
              <Etiqueta x={centro} y={y} total={total} fija={i === indiceMaximo} />
              <text className="barra__dia" x={centro} y={BASE + 26} textAnchor="middle" aria-hidden="true">
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
    </>
  )
}
