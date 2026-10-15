import { Bell, CheckCheck } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listarNotificaciones, marcarLeida, marcarTodasLeidas } from '../../api/notificaciones.js'
import { tiempoRelativo } from '../../utilidades/fechas.js'
import { textoContador } from '../../utilidades/notificaciones.js'
import IconoNotificacion from './IconoNotificacion.jsx'
import { useNotificaciones } from './useNotificaciones.js'
import './notificaciones.css'

const RECIENTES = 8

// Campana de la barra superior con un panel de las 8 notificaciones más recientes.
// El panel se cierra con Esc (el foco vuelve a la campana) y al hacer clic afuera.
export default function Campana() {
  const { total, actualizar } = useNotificaciones()
  const navegar = useNavigate()
  const [abierto, setAbierto] = useState(false)
  const [lista, setLista] = useState(null) // null: cargando
  const [error, setError] = useState(false)
  const contenedor = useRef(null)
  const boton = useRef(null)
  const panel = useRef(null)
  const idPanel = useId()

  const cargar = useCallback(async () => {
    setError(false)
    try {
      const todas = await listarNotificaciones()
      setLista(todas.slice(0, RECIENTES))
    } catch {
      setError(true)
    }
  }, [])

  const cerrar = useCallback((devolverFoco = false) => {
    setAbierto(false)
    if (devolverFoco) boton.current?.focus()
  }, [])

  function alternar() {
    if (abierto) {
      cerrar()
      return
    }
    setLista(null)
    setAbierto(true)
    cargar()
  }

  useEffect(() => {
    if (!abierto) return undefined
    function alPresionar(evento) {
      if (evento.key === 'Escape') {
        evento.preventDefault()
        cerrar(true)
      }
    }
    function alHacerClic(evento) {
      if (!contenedor.current?.contains(evento.target)) cerrar()
    }
    document.addEventListener('keydown', alPresionar)
    document.addEventListener('mousedown', alHacerClic)
    return () => {
      document.removeEventListener('keydown', alPresionar)
      document.removeEventListener('mousedown', alHacerClic)
    }
  }, [abierto, cerrar])

  // Al abrir, el foco pasa al panel para que el teclado y el lector lo encuentren.
  useEffect(() => {
    if (abierto) panel.current?.focus()
  }, [abierto])

  async function abrirNotificacion(notificacion) {
    if (!notificacion.leida) {
      try {
        await marcarLeida(notificacion.id)
      } catch {
        // Si no se pudo marcar, igual se navega; el número se recalcula abajo.
      }
      actualizar()
    }
    cerrar()
    navegar(notificacion.reporte ? `/reportes/${notificacion.reporte}` : '/notificaciones')
  }

  async function leerTodas() {
    try {
      await marcarTodasLeidas()
    } catch {
      setError(true)
    }
    actualizar()
    cargar()
  }

  return (
    <div className="campana" ref={contenedor}>
      <button
        ref={boton}
        type="button"
        className="campana__boton"
        aria-label={`Notificaciones, ${total} sin leer`}
        aria-expanded={abierto}
        aria-controls={idPanel}
        onClick={alternar}
      >
        <Bell size={20} aria-hidden="true" />
        {total > 0 && (
          <span className="campana__contador" aria-hidden="true">
            {textoContador(total)}
          </span>
        )}
      </button>

      {abierto && (
        <div id={idPanel} ref={panel} className="campana__panel" role="region" aria-label="Notificaciones recientes" tabIndex={-1}>
          <div className="campana__cuerpo">
            {error ? (
              <p className="campana__mensaje" role="alert">
                No pudimos cargar tus notificaciones.
              </p>
            ) : lista === null ? (
              <p className="campana__mensaje">Cargando…</p>
            ) : lista.length === 0 ? (
              <p className="campana__mensaje">No tienes notificaciones.</p>
            ) : (
              <ul className="campana__lista">
                {lista.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={`campana__item${n.leida ? '' : ' campana__item--sin-leer'}`}
                      onClick={() => abrirNotificacion(n)}
                    >
                      <IconoNotificacion tipo={n.tipo} size={18} />
                      <span className="campana__texto">
                        <span className="campana__mensaje-item">{n.mensaje}</span>
                        <time className="campana__fecha" dateTime={n.fecha}>
                          {tiempoRelativo(n.fecha)}
                        </time>
                      </span>
                      {!n.leida && (
                        <span className="punto-sin-leer">
                          <span className="solo-lector">Sin leer</span>
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="campana__pie">
            <button type="button" className="campana__accion" onClick={leerTodas} disabled={total === 0}>
              <CheckCheck size={16} aria-hidden="true" />
              Marcar todas como leídas
            </button>
            <Link className="campana__accion" to="/notificaciones" onClick={() => cerrar()}>
              Ver todas
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
