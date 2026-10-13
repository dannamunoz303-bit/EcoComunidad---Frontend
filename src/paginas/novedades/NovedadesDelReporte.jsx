import { RefreshCw } from 'lucide-react'
import { useCallback } from 'react'
import { listarNovedades } from '../../api/novedades.js'
import { rolDeCreador } from '../../utilidades/novedades.js'
import { useCarga } from '../../utilidades/useCarga.js'
import TarjetaNovedad from './TarjetaNovedad.jsx'
import './novedades.css'

// Sección del detalle del reporte: sus novedades, de la más reciente a la más antigua.
export default function NovedadesDelReporte({ reporteId }) {
  const cargar = useCallback(() => listarNovedades({ reporte: reporteId }), [reporteId])
  const novedades = useCarga(cargar)

  if (novedades.cargando && !novedades.datos) {
    return (
      <div className="tareas-siluetas" aria-busy="true" data-testid="siluetas-novedades-reporte">
        <span className="silueta-fila__bloque silueta-fila__bloque--largo" />
      </div>
    )
  }
  if (novedades.error) {
    return (
      <div className="detalle__error-pequeno">
        <p role="alert">No pudimos cargar las novedades de este reporte.</p>
        <button type="button" className="boton-secundario" onClick={novedades.reintentar}>
          <RefreshCw size={18} aria-hidden="true" />
          Reintentar
        </button>
      </div>
    )
  }
  const lista = [...novedades.datos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha) || b.id - a.id)
  if (lista.length === 0) return <p className="texto-suave">Este reporte no tiene novedades.</p>
  return (
    <div className="lista-novedades">
      {lista.map((n) => (
        <TarjetaNovedad key={n.id} novedad={n} rol={rolDeCreador(n)} conReporte={false} />
      ))}
    </div>
  )
}
