import { ArrowLeft, ClipboardList, ListChecks, Lock, Pencil, RefreshCw, UserCheck, UserX } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { obtenerSeguimientoGestor } from '../../api/seguimiento.js'
import { inactivarUsuario, obtenerUsuario, reactivarUsuario } from '../../api/usuarios.js'
import EstadoUsuario from '../../componentes/EstadoUsuario.jsx'
import { useAvisos } from '../../componentes/avisos/useAvisos.js'
import Brotico from '../../marca/Brotico.jsx'
import { formatearFechaHoraCorta, formatearFechaHora } from '../../utilidades/fechas.js'
import { useCarga } from '../../utilidades/useCarga.js'
import { NOMBRES_ROL, nombreCompleto } from '../../utilidades/usuarios.js'
import DialogoConfirmar from '../reportes/acciones/DialogoConfirmar.jsx'
import '../reportes/detalle.css'
import './usuarios.css'

const INACTIVABLES = ['gestor', 'ciudadano'] // RN-05: nunca administradores

// Cuántas tareas activas se cancelarían al inactivar al gestor (sección 11).
function TareasActivasDelGestor({ id }) {
  const cargar = useCallback(() => obtenerSeguimientoGestor(id), [id])
  const seguimiento = useCarga(cargar)
  if (seguimiento.cargando) return <p className="texto-suave">Consultando sus tareas activas…</p>
  if (seguimiento.error) return <p className="texto-suave">No pudimos consultar sus tareas activas.</p>
  const activas = seguimiento.datos.asignadas + seguimiento.datos.en_proceso
  return (
    <p className="aviso-tareas-activas">
      {activas === 0
        ? 'No tiene tareas activas.'
        : `Tiene ${activas} ${activas === 1 ? 'tarea activa' : 'tareas activas'}.`}
    </p>
  )
}

function DetalleUsuario({ usuario, alCambiar }) {
  const { mostrarAviso } = useAvisos()
  const [abierto, setAbierto] = useState(null)
  const nombre = nombreCompleto(usuario)
  const inactivo = usuario.estado === 'inactivo'
  const puedeInactivar = INACTIVABLES.includes(usuario.rol) && !inactivo

  const terminar = (texto) => {
    setAbierto(null)
    mostrarAviso({ tipo: 'exito', texto })
    alCambiar()
  }

  const hasta = usuario.bloqueado_hasta ? `hasta ${formatearFechaHoraCorta(usuario.bloqueado_hasta)}` : null

  return (
    <div className="usuario-detalle">
      <header className="detalle__cabecera">
        <div className="detalle__titulo-fila">
          <h2 className="detalle__titulo">{nombre}</h2>
          <EstadoUsuario estado={usuario.estado} bloqueadoHasta={usuario.bloqueado_hasta} />
        </div>
        <p className="detalle__meta">
          <span>{NOMBRES_ROL[usuario.rol] ?? usuario.rol}</span>
        </p>
      </header>

      {usuario.estado === 'bloqueado' && (
        <div className="aviso aviso--arcilla">
          <Lock size={20} aria-hidden="true" />
          <p>
            {/* La hora termina en "p. m.": no se repite el punto */}
            Este ciudadano está bloqueado {hasta ?? 'de forma permanente.'}
            {hasta && !hasta.endsWith('.') ? '.' : ''} Los bloqueos se manejan en Sanciones.{' '}
            <Link to={`/sanciones?ciudadano=${usuario.id}`}>Ir a Sanciones</Link>
          </p>
        </div>
      )}

      <section className="detalle__seccion" aria-labelledby="titulo-datos-usuario">
        <h3 id="titulo-datos-usuario" className="detalle__subtitulo">
          Datos
        </h3>
        <dl className="datos-lista">
          <div>
            <dt>Correo</dt>
            <dd>{usuario.correo}</dd>
          </div>
          <div>
            <dt>Cédula</dt>
            <dd>{usuario.cedula || '—'}</dd>
          </div>
          <div>
            <dt>Teléfono</dt>
            <dd>{usuario.telefono || '—'}</dd>
          </div>
          <div>
            <dt>Fecha de registro</dt>
            <dd>
              <time dateTime={usuario.fecha_registro}>{formatearFechaHora(usuario.fecha_registro)}</time>
            </dd>
          </div>
        </dl>
        {(usuario.rol === 'gestor' || usuario.rol === 'ciudadano') && (
          <div className="usuario__enlaces">
            {usuario.rol === 'gestor' && (
              <Link to={`/tareas?gestor=${usuario.id}`}>
                <ListChecks size={18} aria-hidden="true" />
                Ver sus tareas
              </Link>
            )}
            {usuario.rol === 'ciudadano' && (
              <Link to={`/reportes?ciudadano=${usuario.id}`}>
                <ClipboardList size={18} aria-hidden="true" />
                Ver sus reportes
              </Link>
            )}
          </div>
        )}
      </section>

      <section className="detalle__seccion" aria-labelledby="titulo-acciones-usuario">
        <h3 id="titulo-acciones-usuario" className="detalle__subtitulo">
          Acciones
        </h3>
        <div className="usuario__acciones">
          <Link className="boton-secundario" to={`/usuarios/${usuario.id}/editar`}>
            <Pencil size={18} aria-hidden="true" />
            Editar
          </Link>
          {inactivo && (
            <button type="button" className="boton-principal" onClick={() => setAbierto('reactivar')}>
              <UserCheck size={18} aria-hidden="true" />
              Reactivar
            </button>
          )}
          {puedeInactivar && (
            <button type="button" className="boton-peligro" onClick={() => setAbierto('inactivar')}>
              <UserX size={18} aria-hidden="true" />
              Inactivar
            </button>
          )}
        </div>
        {usuario.rol === 'administrador' && (
          <p className="texto-suave">Los administradores no se pueden inactivar.</p>
        )}
      </section>

      {abierto === 'inactivar' && (
        <DialogoConfirmar
          titulo={`¿Inactivar a ${nombre}?`}
          textoBoton="Inactivar"
          textoEnviando="Inactivando…"
          peligro
          accion={() => inactivarUsuario(usuario.id)}
          alCerrar={() => setAbierto(null)}
          alTerminar={() => terminar('Usuario inactivado.')}
        >
          {usuario.rol === 'gestor' ? (
            <>
              <p>
                Se cancelarán sus tareas activas, los reportes afectados se recalcularán y los administradores
                recibirán un aviso para reasignar. No podrá iniciar sesión.
              </p>
              <TareasActivasDelGestor id={usuario.id} />
            </>
          ) : (
            <p>No podrá iniciar sesión, pero sus reportes siguen su curso.</p>
          )}
        </DialogoConfirmar>
      )}

      {abierto === 'reactivar' && (
        <DialogoConfirmar
          titulo={`¿Reactivar a ${nombre}?`}
          textoBoton="Reactivar"
          textoEnviando="Reactivando…"
          accion={() => reactivarUsuario(usuario.id)}
          alCerrar={() => setAbierto(null)}
          alTerminar={(resultado) =>
            terminar(
              resultado?.estado === 'bloqueado'
                ? 'Usuario reactivado, pero sigue bloqueado por una sanción vigente.'
                : 'Usuario reactivado.',
            )
          }
        >
          <p>Podrá volver a iniciar sesión.</p>
          {usuario.rol === 'ciudadano' && <p>Si tiene un bloqueo vigente, quedará bloqueado hasta que termine.</p>}
        </DialogoConfirmar>
      )}
    </div>
  )
}

export default function PaginaUsuario() {
  const { id } = useParams()
  const cargar = useCallback(() => obtenerUsuario(id), [id])
  const usuario = useCarga(cargar)

  let contenido
  if (usuario.datos) {
    contenido = <DetalleUsuario usuario={usuario.datos} alCambiar={usuario.reintentar} />
  } else if (usuario.cargando) {
    contenido = (
      <div className="detalle__siluetas" aria-busy="true" data-testid="siluetas-usuario">
        <span className="silueta-fila__bloque silueta-fila__bloque--largo" />
        <span className="silueta-fila__bloque" />
      </div>
    )
  } else if (usuario.error?.response?.status === 404) {
    contenido = (
      <div className="detalle__no-existe">
        <Brotico estado="triste" tamano={112} />
        <p>Este usuario no existe.</p>
        <Link className="boton-principal" to="/usuarios">
          Ir a la lista de usuarios
        </Link>
      </div>
    )
  } else {
    contenido = (
      <div className="detalle__error">
        <p role="alert">No pudimos cargar el usuario.</p>
        <button type="button" className="boton-principal" onClick={usuario.reintentar}>
          <RefreshCw size={18} aria-hidden="true" />
          Reintentar
        </button>
      </div>
    )
  }

  // Vuelve a la pestaña del rol del usuario
  const volver = usuario.datos ? `/usuarios?rol=${usuario.datos.rol}` : '/usuarios'

  return (
    <div className="detalle">
      <Link className="boton-secundario detalle__volver" to={volver}>
        <ArrowLeft size={18} aria-hidden="true" />
        Volver a usuarios
      </Link>
      {contenido}
    </div>
  )
}
