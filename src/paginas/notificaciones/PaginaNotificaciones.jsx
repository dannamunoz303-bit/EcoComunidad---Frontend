import { BadgeCheck, CheckCheck, RefreshCw } from 'lucide-react'
import { useCallback, useId, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listarNotificaciones, marcarLeida, marcarTodasLeidas } from '../../api/notificaciones.js'
import Pestanas from '../../componentes/Pestanas.jsx'
import { useAvisos } from '../../componentes/avisos/useAvisos.js'
import IconoNotificacion from '../../componentes/notificaciones/IconoNotificacion.jsx'
import { useNotificaciones } from '../../componentes/notificaciones/useNotificaciones.js'
import { formatearFechaHora, tiempoRelativo } from '../../utilidades/fechas.js'
import { GRUPOS, grupoDe } from '../../utilidades/notificaciones.js'
import { useCarga } from '../../utilidades/useCarga.js'
import '../../componentes/notificaciones/notificaciones.css'
import '../reportes/reportes.css'
import './notificaciones.css'

// Pestañas y filtro en la URL: ?vista=todas&grupo=tareas (por defecto, sin leer)
const VISTAS = [
  { valor: 'sin-leer', nombre: 'Sin leer' },
  { valor: 'todas', nombre: 'Todas' },
]

export default function PaginaNotificaciones() {
  const [params, setParams] = useSearchParams()
  const vista = params.get('vista') === 'todas' ? 'todas' : 'sin-leer'
  const grupo = GRUPOS.some((g) => g.valor === params.get('grupo')) ? params.get('grupo') : ''
  const { total, actualizar } = useNotificaciones()
  const { mostrarAviso } = useAvisos()
  const idPanel = useId()

  const cargar = useCallback(() => listarNotificaciones(vista === 'sin-leer' ? { leida: false } : {}), [vista])
  const notificaciones = useCarga(cargar)

  const cambiar = (clave, valor) =>
    setParams((anteriores) => {
      const nuevos = new URLSearchParams(anteriores)
      if (valor) nuevos.set(clave, valor)
      else nuevos.delete(clave)
      return nuevos
    })

  const visibles = useMemo(
    () =>
      [...(notificaciones.datos ?? [])]
        .filter((n) => !grupo || grupoDe(n.tipo) === grupo)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha) || b.id - a.id),
    [notificaciones.datos, grupo],
  )

  async function leer(notificacion) {
    try {
      await marcarLeida(notificacion.id)
    } catch {
      mostrarAviso({ tipo: 'error', texto: 'No pudimos marcar la notificación como leída.' })
    }
    actualizar()
    notificaciones.reintentar()
  }

  async function leerTodas() {
    try {
      await marcarTodasLeidas()
      mostrarAviso({ tipo: 'exito', texto: 'Todas las notificaciones están leídas.' })
    } catch {
      mostrarAviso({ tipo: 'error', texto: 'No pudimos marcar las notificaciones como leídas.' })
    }
    actualizar()
    notificaciones.reintentar()
  }

  let contenido
  if (notificaciones.cargando && !notificaciones.datos) {
    contenido = (
      <div className="siluetas-filas" aria-busy="true" data-testid="siluetas-notificaciones">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="silueta-fila" aria-hidden="true">
            <span className="silueta-fila__bloque silueta-fila__bloque--largo" />
            <span className="silueta-fila__bloque" />
          </div>
        ))}
      </div>
    )
  } else if (notificaciones.error) {
    contenido = (
      <div className="reportes__error">
        <p role="alert">No pudimos cargar tus notificaciones.</p>
        <button type="button" className="boton-principal" onClick={notificaciones.reintentar}>
          <RefreshCw size={18} aria-hidden="true" />
          Reintentar
        </button>
      </div>
    )
  } else if (visibles.length === 0 && grupo) {
    contenido = <p className="notificaciones__vacio">No hay notificaciones de este tipo.</p>
  } else if (visibles.length === 0 && vista === 'sin-leer') {
    contenido = (
      <p className="notificaciones__vacio">
        <BadgeCheck size={22} aria-hidden="true" />
        Estás al día.
      </p>
    )
  } else if (visibles.length === 0) {
    contenido = <p className="notificaciones__vacio">No tienes notificaciones.</p>
  } else {
    contenido = (
      <ul className="lista-notificaciones">
        {visibles.map((n) => (
          <li key={n.id} className={`notificacion${n.leida ? '' : ' notificacion--sin-leer'}`}>
            <IconoNotificacion tipo={n.tipo} />
            <div className="notificacion__texto">
              <p className="notificacion__mensaje">
                {!n.leida && <span className="solo-lector">Sin leer: </span>}
                {n.mensaje}
              </p>
              <p className="notificacion__fecha">
                <time dateTime={n.fecha}>{formatearFechaHora(n.fecha)}</time> · {tiempoRelativo(n.fecha)}
              </p>
              {(n.reporte || !n.leida) && (
                <div className="notificacion__acciones">
                  {n.reporte && <Link to={`/reportes/${n.reporte}`}>Ver reporte</Link>}
                  {!n.leida && (
                    <button type="button" className="boton-secundario" onClick={() => leer(n)}>
                      Marcar como leída
                    </button>
                  )}
                </div>
              )}
            </div>
            {!n.leida && <span className="punto-sin-leer" aria-hidden="true" />}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="reportes">
      <div className="notificaciones__cabecera">
        <Pestanas
          opciones={VISTAS}
          valor={vista}
          alCambiar={(valor) => cambiar('vista', valor === 'todas' ? 'todas' : '')}
          etiqueta="Notificaciones"
          idPanel={idPanel}
          prefijoId="pestana-notificaciones"
        />
        <button type="button" className="boton-secundario" onClick={leerTodas} disabled={total === 0}>
          <CheckCheck size={18} aria-hidden="true" />
          Marcar todas como leídas
        </button>
      </div>

      <div id={idPanel} role="tabpanel" aria-labelledby={`pestana-notificaciones-${vista}`} className="notificaciones__panel">
        <div className="filtros-reportes notificaciones__filtros">
          <div className="campo">
            <label htmlFor="filtro-grupo">Tipo</label>
            <select id="filtro-grupo" value={grupo} onChange={(e) => cambiar('grupo', e.target.value)}>
              {GRUPOS.map((g) => (
                <option key={g.valor || 'todos'} value={g.valor}>
                  {g.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
        {contenido}
      </div>
    </div>
  )
}
