import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'

const ICONO = L.divIcon({
  className: 'marcador-reporte marcador-reporte--arrastrable',
  html: `<svg viewBox="0 0 32 42" width="32" height="42" aria-hidden="true">
    <path d="M16 1C7.7 1 1 7.6 1 15.8 1 27 16 41 16 41s15-14 15-25.2C31 7.6 24.3 1 16 1Z" fill="#1E5A3A" stroke="#FFFFFF" stroke-width="2"/>
    <circle cx="16" cy="15.5" r="5.5" fill="#FFFFFF"/>
  </svg>`,
  iconSize: [32, 42],
  iconAnchor: [16, 41],
})

const ZOOM_CON_MARCADOR = 17

// Si la posición cambia por fuera (por ejemplo, "Volver a la ubicación original"), centra el mapa.
function Centrar({ latitud, longitud }) {
  const mapa = useMap()
  useEffect(() => {
    mapa.panTo([latitud, longitud])
  }, [mapa, latitud, longitud])
  return null
}

function AlHacerClic({ alHacerClic }) {
  useMapEvents({
    click(evento) {
      alHacerClic(evento.latlng.lat, evento.latlng.lng)
    },
  })
  return null
}

// latitud/longitud: el marcador (puede no haber). centro y zoom: dónde abrir el mapa si no hay marcador.
// alHacerClic: si se pasa, un clic en el mapa pone el marcador ahí.
export default function MapaEditable({ latitud = null, longitud = null, centro, zoom, alMover, alHacerClic }) {
  const hayMarcador = latitud !== null && longitud !== null
  const manejadores = useMemo(
    () => ({
      dragend(evento) {
        const { lat, lng } = evento.target.getLatLng()
        alMover(lat, lng)
      },
    }),
    [alMover],
  )

  return (
    <MapContainer
      className="mapa-reporte mapa-reporte--editable"
      center={hayMarcador ? [latitud, longitud] : centro}
      zoom={hayMarcador ? ZOOM_CON_MARCADOR : zoom}
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      {hayMarcador && (
        <>
          <Marker
            position={[latitud, longitud]}
            icon={ICONO}
            draggable
            eventHandlers={manejadores}
            title="Arrastra el marcador para cambiar la ubicación"
            alt="Ubicación del reporte"
          />
          <Centrar latitud={latitud} longitud={longitud} />
        </>
      )}
      {alHacerClic && <AlHacerClic alHacerClic={alHacerClic} />}
    </MapContainer>
  )
}
