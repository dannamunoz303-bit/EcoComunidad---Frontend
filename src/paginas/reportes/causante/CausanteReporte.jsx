import { Gavel, UserX } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { listarSanciones } from '../../../api/sanciones.js'
import { useAvisos } from '../../../componentes/avisos/useAvisos.js'
import { ESTADOS_SANCIONAR_CAUSANTE, razonSugerenciaCausante } from '../../../utilidades/sanciones.js'
import { useCarga } from '../../../utilidades/useCarga.js'
import { nombreCompleto } from '../../../utilidades/usuarios.js'
import TablaSanciones from '../../sanciones/TablaSanciones.jsx'
import DialogoSancionarCausante from './DialogoSancionarCausante.jsx'
import '../../sanciones/sanciones.css'

// Sus sanciones como causante (RN-27): las de la lista del administrador con por_causante.
// Al sancionar, el detalle se recarga y `cuantas` sube, así que se vuelven a pedir.
function SancionesComoCausante({ ciudadanoId, cuantas }) {
  const cargar = useCallback(
    () =>
      cuantas
        ? listarSanciones({ ciudadano: ciudadanoId }).then((todas) => todas.filter((s) => s.por_causante))
        : Promise.resolve([]),
    [ciudadanoId, cuantas],
  )
  const sanciones = useCarga(cargar)

  if (!cuantas) return <p className="texto-suave">{razonSugerenciaCausante(0)}</p>
  return (
    <>
      <p>{razonSugerenciaCausante(cuantas)}</p>
      {sanciones.error ? (
        <p className="texto-suave">No pudimos cargar el detalle de esas sanciones.</p>
      ) : sanciones.datos?.length ? (
        <TablaSanciones sanciones={sanciones.datos} conCiudadano={false} titulo="Sanciones como causante" />
      ) : sanciones.cargando ? (
        <p className="texto-suave">Cargando sus sanciones…</p>
      ) : null}
    </>
  )
}

// Sección "Causante del daño" (RN-27). Solo el administrador recibe la cédula y el objeto causante.
export default function CausanteReporte({ reporte, alCambiar }) {
  const { mostrarAviso } = useAvisos()
  const [abierto, setAbierto] = useState(false)
  const causante = reporte.causante
  const ciudadano = causante?.registrado ? causante.ciudadano : null
  const puedeSancionar = Boolean(ciudadano) && !reporte.eliminado && ESTADOS_SANCIONAR_CAUSANTE.includes(reporte.estado)

  return (
    <div className="causante">
      <dl className="datos-lista">
        <div>
          <dt>Cédula del causante</dt>
          <dd>{reporte.causante_cedula}</dd>
        </div>
        <div>
          <dt>Ciudadano</dt>
          <dd>
            {ciudadano ? (
              <Link to={`/usuarios/${ciudadano.id}`}>{nombreCompleto(ciudadano)}</Link>
            ) : causante && !causante.registrado ? (
              <span className="causante__no-registrado">
                <UserX size={18} aria-hidden="true" />
                No está registrado en EcoComunidad
              </span>
            ) : (
              '—'
            )}
          </dd>
        </div>
      </dl>

      {ciudadano && (
        <>
          <h3 className="detalle__subtitulo">Sanciones previas como causante</h3>
          <SancionesComoCausante ciudadanoId={ciudadano.id} cuantas={causante.sanciones_como_causante} />
        </>
      )}

      {ciudadano && !puedeSancionar && !reporte.eliminado && (
        <p className="causante__ayuda">
          Se puede sancionar al causante cuando el reporte está aprobado, asignado, en proceso o resuelto.
        </p>
      )}
      {puedeSancionar && (
        <button type="button" className="boton-secundario" onClick={() => setAbierto(true)}>
          <Gavel size={18} aria-hidden="true" />
          Sancionar al causante
        </button>
      )}

      {abierto && (
        <DialogoSancionarCausante
          reporte={reporte}
          alCerrar={() => setAbierto(false)}
          alTerminar={() => {
            setAbierto(false)
            mostrarAviso({
              tipo: 'exito',
              texto: `Sanción registrada. ${nombreCompleto(ciudadano)} recibió una notificación.`,
            })
            alCambiar()
          }}
        />
      )}
    </div>
  )
}
