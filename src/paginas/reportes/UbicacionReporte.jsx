import { ExternalLink, MapPinOff } from 'lucide-react'
import { lazy, Suspense } from 'react'

// Leaflet se carga solo cuando se abre un detalle con coordenadas.
const MapaReporte = lazy(() => import('./MapaReporte.jsx'))

// La API manda las coordenadas como texto decimal ("4.71098600").
const coordenada = (valor) => {
  if (valor === null || valor === undefined || valor === '') return null
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : null
}

export default function UbicacionReporte({ reporte }) {
  const latitud = coordenada(reporte.latitud)
  const longitud = coordenada(reporte.longitud)
  const hayCoordenadas = latitud !== null && longitud !== null

  return (
    <div className="ubicacion">
      <dl className="datos-lista">
        <div>
          <dt>Dirección</dt>
          <dd>{reporte.direccion || '—'}</dd>
        </div>
        {reporte.descripcion_ubicacion && (
          <div>
            <dt>Referencias del lugar</dt>
            <dd>{reporte.descripcion_ubicacion}</dd>
          </div>
        )}
      </dl>

      {hayCoordenadas ? (
        <>
          <Suspense fallback={<div className="mapa-reporte mapa-reporte--cargando" aria-hidden="true" />}>
            <MapaReporte latitud={latitud} longitud={longitud} titulo={reporte.titulo} />
          </Suspense>
          <a
            className="enlace-externo"
            href={`https://www.openstreetmap.org/?mlat=${latitud}&mlon=${longitud}#map=18/${latitud}/${longitud}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir en OpenStreetMap
            <ExternalLink size={16} aria-hidden="true" />
            <span className="solo-lector"> (se abre en otra pestaña)</span>
          </a>
        </>
      ) : (
        <p className="ubicacion__sin-mapa">
          <MapPinOff size={20} aria-hidden="true" />
          Este reporte no tiene coordenadas, por eso no se puede mostrar el mapa.
        </p>
      )}
    </div>
  )
}
