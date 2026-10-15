import { Lock, Plus, RefreshCw, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { listarReportes } from '../../api/reportes.js'
import { listarSanciones } from '../../api/sanciones.js'
import { listarUsuarios, obtenerUsuario } from '../../api/usuarios.js'
import EstadoUsuario from '../../componentes/EstadoUsuario.jsx'
import { useAvisos } from '../../componentes/avisos/useAvisos.js'
import Brotico from '../../marca/Brotico.jsx'
import { NOMBRES_TIPO_SANCION, tieneBloqueoVigente } from '../../utilidades/sanciones.js'
import { useCarga } from '../../utilidades/useCarga.js'
import { nombreCompleto } from '../../utilidades/usuarios.js'
import DialogoLevantarBloqueo from './DialogoLevantarBloqueo.jsx'
import TablaSanciones from './TablaSanciones.jsx'
import '../reportes/reportes.css'
import './sanciones.css'

// Filtros en la URL: ?ciudadano=30&tipo=advertencia
const TIPOS = [{ valor: '', nombre: 'Todos los tipos' }, ...Object.entries(NOMBRES_TIPO_SANCION).map(([valor, nombre]) => ({ valor, nombre }))]

const masReciente = (a, b) => new Date(b.fecha_inicio) - new Date(a.fecha_inicio) || b.id - a.id
const todosLosCiudadanos = () => listarUsuarios({ rol: 'ciudadano' })
// Títulos de los reportes para el enlace (la sanción solo trae el id del reporte).
const titulosDeReportes = async () => Object.fromEntries((await listarReportes()).map((r) => [r.id, r.titulo]))

function SiluetasFilas() {
  return (
    <div className="siluetas-filas" aria-busy="true" data-testid="siluetas-sanciones">
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
}

export default function PaginaSanciones() {
  const [params, setParams] = useSearchParams()
  const ciudadanoId = params.get('ciudadano') ?? ''
  const reporteId = params.get('reporte') ?? ''
  const tipo = TIPOS.some((t) => t.valor === params.get('tipo')) ? params.get('tipo') : ''
  const { mostrarAviso } = useAvisos()
  const [levantando, setLevantando] = useState(false)

  // El ciudadano se filtra en el backend; el tipo, aquí.
  const cargarSanciones = useCallback(() => listarSanciones({ ciudadano: ciudadanoId }), [ciudadanoId])
  const sanciones = useCarga(cargarSanciones)
  const cargarCiudadano = useCallback(
    () => (ciudadanoId ? obtenerUsuario(ciudadanoId) : Promise.resolve(null)),
    [ciudadanoId],
  )
  const ciudadano = useCarga(cargarCiudadano)
  const ciudadanos = useCarga(todosLosCiudadanos)
  const titulos = useCarga(titulosDeReportes)

  const cambiar = (clave, valor) =>
    setParams((anteriores) => {
      const nuevos = new URLSearchParams(anteriores)
      if (valor) nuevos.set(clave, valor)
      else nuevos.delete(clave)
      return nuevos
    })

  const visibles = useMemo(
    () => [...(sanciones.datos ?? [])].filter((s) => !tipo || s.tipo === tipo).sort(masReciente),
    [sanciones.datos, tipo],
  )
  const ordenados = useMemo(
    () => [...(ciudadanos.datos ?? [])].filter((u) => u.rol === 'ciudadano').sort((a, b) => nombreCompleto(a).localeCompare(nombreCompleto(b), 'es')),
    [ciudadanos.datos],
  )

  // Desde un reporte rechazado (?ciudadano=&reporte=) se abre directamente el formulario.
  if (ciudadanoId && reporteId) {
    return <Navigate to={`/sanciones/nueva?ciudadano=${ciudadanoId}&reporte=${reporteId}`} replace />
  }

  const persona = ciudadano.datos
  const textoChip = persona ? `Sanciones de ${nombreCompleto(persona)}` : `Sanciones del ciudadano #${ciudadanoId}`
  // Bloqueado, o inactivo con un bloqueo vigente (RN-21): se puede levantar.
  const puedeLevantar =
    persona && (persona.estado === 'bloqueado' || tieneBloqueoVigente(sanciones.datos ?? []))
  const hayFiltros = Boolean(tipo || ciudadanoId)

  let contenido
  if (sanciones.cargando && !sanciones.datos) {
    contenido = <SiluetasFilas />
  } else if (sanciones.error) {
    contenido = (
      <div className="reportes__error">
        <p role="alert">No pudimos cargar las sanciones.</p>
        <button type="button" className="boton-principal" onClick={sanciones.reintentar}>
          <RefreshCw size={18} aria-hidden="true" />
          Reintentar
        </button>
      </div>
    )
  } else if (visibles.length === 0 && hayFiltros) {
    contenido = (
      <div className="reportes__vacio">
        <Brotico estado="triste" tamano={112} />
        <p>No encontramos sanciones con esos filtros.</p>
        <button type="button" className="boton-principal" onClick={() => setParams({})}>
          Quitar filtros
        </button>
      </div>
    )
  } else if (visibles.length === 0) {
    contenido = <p className="sanciones__vacio">Todavía no hay sanciones.</p>
  } else {
    contenido = <TablaSanciones sanciones={visibles} titulosReportes={titulos.datos ?? {}} titulo="Sanciones" />
  }

  return (
    <div className="reportes">
      <div className="sanciones__cabecera">
        <p className="reportes__total" aria-live="polite">
          {sanciones.cargando && !sanciones.datos
            ? 'Cargando sanciones…'
            : `${visibles.length} ${visibles.length === 1 ? 'sanción' : 'sanciones'}`}
        </p>
        <Link
          className="boton-principal"
          to={ciudadanoId ? `/sanciones/nueva?ciudadano=${ciudadanoId}` : '/sanciones/nueva'}
        >
          <Plus size={18} aria-hidden="true" />
          Nueva sanción
        </Link>
      </div>

      {ciudadanoId && (
        <div className="sanciones__ciudadano">
          <p className="chip-filtro">
            {textoChip}
            <button
              type="button"
              className="chip-filtro__quitar"
              aria-label={`Quitar el filtro: ${textoChip}`}
              onClick={() => cambiar('ciudadano', '')}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </p>
          {persona && <EstadoUsuario estado={persona.estado} bloqueadoHasta={persona.bloqueado_hasta} />}
          {puedeLevantar && (
            <button type="button" className="boton-secundario" onClick={() => setLevantando(true)}>
              <Lock size={18} aria-hidden="true" />
              Levantar bloqueo
            </button>
          )}
        </div>
      )}

      <div className="filtros-reportes sanciones__filtros">
        <div className="campo">
          <label htmlFor="filtro-tipo-sancion">Tipo</label>
          <select id="filtro-tipo-sancion" value={tipo} onChange={(e) => cambiar('tipo', e.target.value)}>
            {TIPOS.map((t) => (
              <option key={t.valor || 'todos'} value={t.valor}>
                {t.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="filtro-ciudadano-sancion">Ciudadano</label>
          <select
            id="filtro-ciudadano-sancion"
            value={ciudadanoId}
            onChange={(e) => cambiar('ciudadano', e.target.value)}
          >
            <option value="">Todos</option>
            {ordenados.map((u) => (
              <option key={u.id} value={String(u.id)}>
                {nombreCompleto(u)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {contenido}

      {levantando && persona && (
        <DialogoLevantarBloqueo
          usuario={persona}
          alCerrar={() => setLevantando(false)}
          alTerminar={() => {
            setLevantando(false)
            mostrarAviso({ tipo: 'exito', texto: 'Bloqueo levantado.' })
            ciudadano.reintentar()
            sanciones.reintentar()
          }}
        />
      )}

    </div>
  )
}
