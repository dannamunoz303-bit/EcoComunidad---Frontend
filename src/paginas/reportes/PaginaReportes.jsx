import { RefreshCw, X } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { listarCategorias } from '../../api/categorias.js'
import { listarReportes } from '../../api/reportes.js'
import { obtenerUsuario } from '../../api/usuarios.js'
import Brotico from '../../marca/Brotico.jsx'
import { useCarga } from '../../utilidades/useCarga.js'
import FiltrosReportes from './FiltrosReportes.jsx'
import { contarPorEstado, filtrarBase, hayFiltros, leerFiltros, ordenarRecientes } from './filtros.js'
import TablaReportes from './TablaReportes.jsx'
import './reportes.css'

const PARAMETROS = { estado: 'estado', categoria: 'categoria', q: 'q', eliminados: 'eliminados', ciudadano: 'ciudadano' }

function SiluetasFilas() {
  return (
    <div className="siluetas-filas" aria-busy="true" data-testid="siluetas-reportes">
      {Array.from({ length: 6 }, (_, i) => (
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
}

export default function PaginaReportes() {
  const [params, setParams] = useSearchParams()
  const { search } = useLocation()
  const filtros = leerFiltros(params)

  // La categoría se filtra en el backend; el estado, el texto y los eliminados, aquí,
  // para poder mostrar la cantidad de cada estado.
  const cargarReportes = useCallback(() => listarReportes({ categoria: filtros.categoria }), [filtros.categoria])
  const reportes = useCarga(cargarReportes)
  const categorias = useCarga(listarCategorias)

  const alCambiar = useCallback(
    (cambios, opciones) => {
      setParams((anteriores) => {
        const nuevos = new URLSearchParams(anteriores)
        for (const [clave, valor] of Object.entries(cambios)) {
          if (valor) nuevos.set(PARAMETROS[clave], valor)
          else nuevos.delete(PARAMETROS[clave])
        }
        return nuevos
      }, opciones)
    },
    [setParams],
  )

  const quitarFiltros = () => setParams(new URLSearchParams())

  // Nombre del ciudadano para el chip: de sus reportes o, si no tiene, de /usuarios/<id>/.
  const deLosReportes = filtros.ciudadano
    ? reportes.datos?.find((r) => String(r.ciudadano?.id) === filtros.ciudadano)?.ciudadano
    : null
  const cargarCiudadano = useCallback(
    () => (filtros.ciudadano ? obtenerUsuario(filtros.ciudadano) : Promise.resolve(null)),
    [filtros.ciudadano],
  )
  const ciudadano = useCarga(cargarCiudadano)
  const personaFiltro = deLosReportes ?? ciudadano.datos
  const nombreFiltro = personaFiltro
    ? `${personaFiltro.nombre} ${personaFiltro.apellido}`
    : `el ciudadano #${filtros.ciudadano}`

  const { visibles, conteo } = useMemo(() => {
    if (!reportes.datos) return { visibles: [], conteo: {} }
    const base = filtrarBase(reportes.datos, filtros)
    const porEstado = filtros.estado ? base.filter((r) => r.estado === filtros.estado) : base
    return { visibles: ordenarRecientes(porEstado), conteo: contarPorEstado(base) }
  }, [reportes.datos, filtros])

  const categoriasOrdenadas = useMemo(
    () => [...(categorias.datos ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [categorias.datos],
  )

  let contenido
  if (reportes.cargando) {
    contenido = <SiluetasFilas />
  } else if (reportes.error) {
    contenido = (
      <div className="reportes__error">
        <p role="alert">No pudimos cargar los reportes.</p>
        <button type="button" className="boton-principal" onClick={reportes.reintentar}>
          <RefreshCw size={18} aria-hidden="true" />
          Reintentar
        </button>
      </div>
    )
  } else if (visibles.length === 0) {
    contenido = (
      <div className="reportes__vacio">
        <Brotico estado="triste" tamano={112} />
        <p>No encontramos reportes con esos filtros. Prueba con otros.</p>
        {hayFiltros(filtros) && (
          <button type="button" className="boton-principal" onClick={quitarFiltros}>
            Quitar filtros
          </button>
        )}
      </div>
    )
  } else {
    contenido = <TablaReportes reportes={visibles} desde={search} />
  }

  return (
    <div className="reportes">
      <p className="reportes__total" aria-live="polite">
        {reportes.cargando
          ? 'Cargando reportes…'
          : `${visibles.length} ${visibles.length === 1 ? 'reporte' : 'reportes'}`}
      </p>

      {filtros.ciudadano && (
        <p className="chip-filtro">
          Reportes de {nombreFiltro}
          <button
            type="button"
            className="chip-filtro__quitar"
            aria-label={`Quitar el filtro: reportes de ${nombreFiltro}`}
            onClick={() => alCambiar({ ciudadano: '' })}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </p>
      )}

      <FiltrosReportes
        filtros={filtros}
        conteo={conteo}
        categorias={categoriasOrdenadas}
        alCambiar={alCambiar}
      />

      {contenido}
    </div>
  )
}
