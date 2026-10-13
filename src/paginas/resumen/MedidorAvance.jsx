// Semicírculo de radio 80 con centro en (100, 100).
const ARCO = 'M 20 100 A 80 80 0 0 1 180 100'

export default function MedidorAvance({ porcentaje }) {
  const valor = Math.min(100, Math.max(0, Number(porcentaje) || 0))
  return (
    <figure className="medidor">
      <svg className="medidor__svg" viewBox="0 0 200 112" aria-hidden="true">
        <path className="medidor__pista" d={ARCO} pathLength="100" />
        {valor > 0 && (
          <path className="medidor__relleno" d={ARCO} pathLength="100" strokeDasharray={`${valor} 100`} />
        )}
      </svg>
      <figcaption className="medidor__texto">
        <span className="medidor__valor">{valor}%</span>
        <span className="medidor__detalle">de los reportes aprobados están resueltos</span>
      </figcaption>
    </figure>
  )
}
