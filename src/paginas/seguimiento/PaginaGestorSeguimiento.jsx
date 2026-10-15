import { AlarmClock, ArrowLeft, ListChecks, RefreshCw, UserRound } from 'lucide-react'
import { useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { obtenerSeguimientoGestor } from '../../api/seguimiento.js'
import EstadoTarea from '../../componentes/EstadoTarea.jsx'
import EstadoUsuario from '../../componentes/EstadoUsuario.jsx'
import Brotico from '../../marca/Brotico.jsx'
import { tiempoRelativo } from '../../utilidades/fechas.js'
import { activasDe, textoHoras } from '../../utilidades/seguimiento.js'
import { useCarga } from '../../utilidades/useCarga.js'
import { nombreCompleto } from '../../utilidades/usuarios.js'
import '../reportes/detalle.css'
import './seguimiento.css'

function Detalle({ gestor }) {
  const tareas = gestor.tareas_activas ?? []
  return (
    <div className="seguimiento-detalle">
      <header className="detalle__cabecera">
        <div className="detalle__titulo-fila">
          <h2 className="detalle__titulo">{nombreCompleto(gestor)}</h2>
          <EstadoUsuario estado={gestor.estado} />
        </div>
      </header>

      <dl className="cifras-seguimiento">
        <div className="cifra-seguimiento">
          <dt>Activas</dt>
          <dd>{activasDe(gestor)}</dd>
        </div>
        <div className="cifra-seguimiento">
          <dt>Terminadas</dt>
          <dd>{gestor.terminadas}</dd>
        </div>
        <div className="cifra-seguimiento">
          <dt>Canceladas</dt>
          <dd>{gestor.canceladas}</dd>
        </div>
        <div className="cifra-seguimiento">
          <dt>Horas promedio</dt>
          <dd>{textoHoras(gestor.horas_promedio)}</dd>
        </div>
        <div className={`cifra-seguimiento${gestor.atrasadas ? ' cifra-seguimiento--alerta' : ''}`}>
          <dt>Atrasadas</dt>
          <dd>{gestor.atrasadas}</dd>
        </div>
      </dl>

      <section className="detalle__seccion" aria-labelledby="titulo-tareas-activas">
        <h3 id="titulo-tareas-activas" className="detalle__subtitulo">
          Tareas activas
        </h3>
        <p className="texto-suave">Una tarea está atrasada cuando lleva 1 día o más sin acciones nuevas.</p>
        {tareas.length === 0 ? (
          <p>No tiene tareas activas.</p>
        ) : (
          <ul className="tareas-seguimiento">
            {tareas.map((t) => (
              <li key={t.id} className="tarea-seguimiento">
                <div className="tarea-seguimiento__cabecera">
                  <Link to={`/reportes/${t.reporte.id}`} className="tarea-seguimiento__reporte">
                    {t.reporte.titulo}
                  </Link>
                  <EstadoTarea estado={t.estado} />
                  {t.atrasada && (
                    <span className="etiqueta-atrasada">
                      <AlarmClock size={14} aria-hidden="true" />
                      Atrasada
                    </span>
                  )}
                </div>
                <p className="tarea-seguimiento__fechas">
                  <span>
                    Asignada{' '}
                    <time dateTime={t.fecha_asignacion}>{tiempoRelativo(t.fecha_asignacion)}</time>
                  </span>
                  <span>
                    {t.ultima_accion ? (
                      <>
                        Última acción <time dateTime={t.ultima_accion}>{tiempoRelativo(t.ultima_accion)}</time>
                      </>
                    ) : (
                      'Sin acciones todavía'
                    )}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}
        <div className="seguimiento__enlaces">
          <Link to={`/tareas?gestor=${gestor.id}`}>
            <ListChecks size={18} aria-hidden="true" />
            Ver todas sus tareas
          </Link>
          <Link to={`/usuarios/${gestor.id}`}>
            <UserRound size={18} aria-hidden="true" />
            Ver usuario
          </Link>
        </div>
      </section>
    </div>
  )
}

export default function PaginaGestorSeguimiento() {
  const { id } = useParams()
  const cargar = useCallback(() => obtenerSeguimientoGestor(id), [id])
  const gestor = useCarga(cargar)

  let contenido
  if (gestor.datos) {
    contenido = <Detalle gestor={gestor.datos} />
  } else if (gestor.cargando) {
    contenido = (
      <div className="detalle__siluetas" aria-busy="true" data-testid="siluetas-gestor">
        <span className="silueta-fila__bloque silueta-fila__bloque--largo" />
        <span className="silueta-fila__bloque" />
      </div>
    )
  } else if (gestor.error?.response?.status === 404) {
    contenido = (
      <div className="detalle__no-existe">
        <Brotico estado="triste" tamano={112} />
        <p>Este gestor no existe.</p>
        <Link className="boton-principal" to="/seguimiento">
          Ir al seguimiento
        </Link>
      </div>
    )
  } else {
    contenido = (
      <div className="detalle__error">
        <p role="alert">No pudimos cargar el seguimiento de este gestor.</p>
        <button type="button" className="boton-principal" onClick={gestor.reintentar}>
          <RefreshCw size={18} aria-hidden="true" />
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="detalle">
      <Link className="boton-secundario detalle__volver" to="/seguimiento">
        <ArrowLeft size={18} aria-hidden="true" />
        Volver al seguimiento
      </Link>
      {contenido}
    </div>
  )
}
