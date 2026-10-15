import { ArrowDown, ArrowUp, ArrowUpDown, RefreshCw } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listarSeguimientoGestores } from '../../api/seguimiento.js'
import EstadoUsuario from '../../componentes/EstadoUsuario.jsx'
import Brotico from '../../marca/Brotico.jsx'
import { activasDe, textoHoras } from '../../utilidades/seguimiento.js'
import { useCarga } from '../../utilidades/useCarga.js'
import { nombreCompleto } from '../../utilidades/usuarios.js'
import '../reportes/reportes.css'
import Atrasadas from './Atrasadas.jsx'
import './seguimiento.css'

// Filtros y orden en la URL: ?atrasadas=1&inactivos=1&orden=nombre
const ORDENES = {
  // Por defecto: más atrasadas primero y luego más activas
  atrasadas: { direccion: 'descending', comparar: (a, b) => b.atrasadas - a.atrasadas || activasDe(b) - activasDe(a) },
  nombre: { direccion: 'ascending', comparar: (a, b) => nombreCompleto(a).localeCompare(nombreCompleto(b), 'es') },
  terminadas: { direccion: 'descending', comparar: (a, b) => b.terminadas - a.terminadas },
}

function EncabezadoOrdenable({ clave, titulo, orden, alOrdenar }) {
  const activo = orden === clave
  const Icono = activo ? (ORDENES[clave].direccion === 'ascending' ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <th scope="col" aria-sort={activo ? ORDENES[clave].direccion : 'none'}>
      <button type="button" className="encabezado-orden" onClick={() => alOrdenar(clave)}>
        {titulo}
        <Icono size={14} aria-hidden="true" />
      </button>
    </th>
  )
}

export default function PaginaSeguimiento() {
  const [params, setParams] = useSearchParams()
  const soloAtrasadas = params.get('atrasadas') === '1'
  const conInactivos = params.get('inactivos') === '1'
  const orden = params.get('orden') in ORDENES ? params.get('orden') : 'atrasadas'
  const gestores = useCarga(listarSeguimientoGestores)

  const cambiar = (clave, valor) =>
    setParams((anteriores) => {
      const nuevos = new URLSearchParams(anteriores)
      if (valor) nuevos.set(clave, valor)
      else nuevos.delete(clave)
      return nuevos
    })

  const { visibles, cifras, total } = useMemo(() => {
    const todos = gestores.datos ?? []
    const filtrados = todos
      .filter((g) => (conInactivos || g.estado !== 'inactivo') && (!soloAtrasadas || g.atrasadas > 0))
      .sort((a, b) => ORDENES[orden].comparar(a, b) || nombreCompleto(a).localeCompare(nombreCompleto(b), 'es'))
    return {
      visibles: filtrados,
      total: todos.length,
      cifras: {
        activos: todos.filter((g) => g.estado === 'activo').length,
        tareas: todos.reduce((suma, g) => suma + activasDe(g), 0),
        atrasadas: todos.reduce((suma, g) => suma + g.atrasadas, 0),
      },
    }
  }, [gestores.datos, conInactivos, soloAtrasadas, orden])

  let contenido
  if (gestores.cargando && !gestores.datos) {
    contenido = (
      <div className="siluetas-filas" aria-busy="true" data-testid="siluetas-seguimiento">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="silueta-fila" aria-hidden="true">
            <span className="silueta-fila__bloque silueta-fila__bloque--largo" />
            <span className="silueta-fila__bloque" />
            <span className="silueta-fila__bloque" />
            <span className="silueta-fila__bloque" />
            <span className="silueta-fila__bloque" />
          </div>
        ))}
      </div>
    )
  } else if (gestores.error) {
    contenido = (
      <div className="reportes__error">
        <p role="alert">No pudimos cargar el seguimiento.</p>
        <button type="button" className="boton-principal" onClick={gestores.reintentar}>
          <RefreshCw size={18} aria-hidden="true" />
          Reintentar
        </button>
      </div>
    )
  } else if (total === 0) {
    contenido = (
      <div className="reportes__vacio">
        <Brotico estado="triste" tamano={112} />
        <p>Todavía no hay gestores.</p>
        <Link className="boton-principal" to="/usuarios/nuevo">
          Crear un gestor
        </Link>
      </div>
    )
  } else if (visibles.length === 0) {
    contenido = (
      <div className="reportes__vacio">
        <p>{soloAtrasadas ? 'Ningún gestor tiene tareas atrasadas.' : 'No hay gestores con esos filtros.'}</p>
        <button type="button" className="boton-secundario" onClick={() => setParams({})}>
          Quitar filtros
        </button>
      </div>
    )
  } else {
    contenido = (
      <table className="tabla-reportes tabla-seguimiento">
        <caption className="solo-lector">Gestores y su carga de trabajo</caption>
        <thead>
          <tr>
            <EncabezadoOrdenable clave="nombre" titulo="Gestor" orden={orden} alOrdenar={(c) => cambiar('orden', c)} />
            <th scope="col">Estado</th>
            <th scope="col">Activas</th>
            <EncabezadoOrdenable clave="terminadas" titulo="Terminadas" orden={orden} alOrdenar={(c) => cambiar('orden', c)} />
            <th scope="col">Canceladas</th>
            <th scope="col">Horas promedio</th>
            <EncabezadoOrdenable
              clave="atrasadas"
              titulo="Atrasadas"
              orden={orden}
              alOrdenar={(c) => cambiar('orden', c === 'atrasadas' ? '' : c)}
            />
          </tr>
        </thead>
        <tbody>
          {visibles.map((g) => (
            <tr key={g.id}>
              <td className="tabla-reportes__titulo">
                <Link to={`/seguimiento/${g.id}`}>{nombreCompleto(g)}</Link>
              </td>
              <td data-etiqueta="Estado">
                <EstadoUsuario estado={g.estado} />
              </td>
              <td data-etiqueta="Activas" className="cifra-tabla">
                {activasDe(g)}
              </td>
              <td data-etiqueta="Terminadas" className="cifra-tabla">
                {g.terminadas}
              </td>
              <td data-etiqueta="Canceladas" className="cifra-tabla">
                {g.canceladas}
              </td>
              <td data-etiqueta="Horas promedio">{textoHoras(g.horas_promedio)}</td>
              <td data-etiqueta="Atrasadas">
                <Atrasadas cantidad={g.atrasadas} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <div className="reportes">
      {gestores.datos && total > 0 && (
        <dl className="cifras-seguimiento">
          <div className="cifra-seguimiento">
            <dt>Gestores activos</dt>
            <dd>{cifras.activos}</dd>
          </div>
          <div className="cifra-seguimiento">
            <dt>Tareas activas</dt>
            <dd>{cifras.tareas}</dd>
          </div>
          <div className={`cifra-seguimiento${cifras.atrasadas ? ' cifra-seguimiento--alerta' : ''}`}>
            <dt>Tareas atrasadas</dt>
            <dd>{cifras.atrasadas}</dd>
          </div>
        </dl>
      )}

      <div className="filtros-reportes filtros-seguimiento">
        <button
          type="button"
          role="switch"
          aria-checked={soloAtrasadas}
          className="interruptor"
          onClick={() => cambiar('atrasadas', soloAtrasadas ? '' : '1')}
        >
          <span className="interruptor__pista" aria-hidden="true">
            <span className="interruptor__perilla" />
          </span>
          Solo con tareas atrasadas
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={conInactivos}
          className="interruptor"
          onClick={() => cambiar('inactivos', conInactivos ? '' : '1')}
        >
          <span className="interruptor__pista" aria-hidden="true">
            <span className="interruptor__perilla" />
          </span>
          Incluir inactivos
        </button>
      </div>

      {contenido}
    </div>
  )
}
