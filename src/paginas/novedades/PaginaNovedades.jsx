import { BadgeCheck, RefreshCw } from 'lucide-react'
import { useId, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listarNovedades } from '../../api/novedades.js'
import { listarUsuarios } from '../../api/usuarios.js'
import Pestanas from '../../componentes/Pestanas.jsx'
import Brotico from '../../marca/Brotico.jsx'
import { rolDeCreador } from '../../utilidades/novedades.js'
import { useCarga } from '../../utilidades/useCarga.js'
import TarjetaNovedad from './TarjetaNovedad.jsx'
import '../reportes/reportes.css'
import './novedades.css'

// Filtros en la URL: ?estado=atendida&tipo=queja&creador=ciudadano (por defecto, abiertas)
const ESTADOS = [
  { valor: 'abierta', nombre: 'Abiertas' },
  { valor: 'atendida', nombre: 'Atendidas' },
]
const TIPOS = [
  { valor: '', nombre: 'Todos los tipos' },
  { valor: 'ayuda', nombre: 'Ayuda' },
  { valor: 'queja', nombre: 'Queja' },
  { valor: 'incidente', nombre: 'Incidente' },
]
const CREADORES = [
  { valor: '', nombre: 'Todos' },
  { valor: 'gestor', nombre: 'Gestores' },
  { valor: 'ciudadano', nombre: 'Ciudadanos' },
]

const valido = (lista, valor) => (lista.some((o) => o.valor === valor) ? valor : '')

// Se piden todas una vez: así se cuentan las de cada pestaña.
const todasLasNovedades = () => listarNovedades()
// El rol de quien la creó no viene en la novedad (ver utilidades/novedades.js).
const rolesDeUsuarios = async () =>
  Object.fromEntries((await listarUsuarios()).map((u) => [u.id, u.rol]))

function SiluetasTarjetas() {
  return (
    <div className="lista-novedades" aria-busy="true" data-testid="siluetas-novedades">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="tarjeta-novedad" aria-hidden="true">
          <span className="silueta-fila__bloque silueta-fila__bloque--largo" />
          <span className="silueta-fila__bloque" />
        </div>
      ))}
    </div>
  )
}

export default function PaginaNovedades() {
  const [params, setParams] = useSearchParams()
  const estado = valido(ESTADOS, params.get('estado')) || 'abierta'
  const tipo = valido(TIPOS, params.get('tipo'))
  const creador = valido(CREADORES, params.get('creador'))
  const novedades = useCarga(todasLasNovedades)
  const roles = useCarga(rolesDeUsuarios)
  const idPanel = useId()

  const cambiar = (clave, valor) =>
    setParams((anteriores) => {
      const nuevos = new URLSearchParams(anteriores)
      if (valor) nuevos.set(clave, valor)
      else nuevos.delete(clave)
      return nuevos
    })

  const { visibles, conteo } = useMemo(() => {
    const rolesPorId = roles.datos ?? {}
    const todas = (novedades.datos ?? []).map((n) => ({ ...n, rol: rolDeCreador(n, rolesPorId) }))
    const filtradas = todas.filter((n) => (!tipo || n.tipo === tipo) && (!creador || n.rol === creador))
    const porEstado = { abierta: 0, atendida: 0 }
    for (const n of filtradas) porEstado[n.estado] = (porEstado[n.estado] ?? 0) + 1
    // Abiertas: la más antigua primero (lleva más tiempo esperando). Atendidas: la más reciente primero.
    const signo = estado === 'abierta' ? 1 : -1
    const ordenadas = filtradas
      .filter((n) => n.estado === estado)
      .sort((a, b) => signo * (new Date(a.fecha) - new Date(b.fecha) || a.id - b.id))
    return { visibles: ordenadas, conteo: porEstado }
  }, [novedades.datos, roles.datos, estado, tipo, creador])

  const hayFiltros = Boolean(tipo || creador)
  const quitarFiltros = () => setParams(estado === 'abierta' ? {} : { estado })

  let contenido
  if (novedades.cargando && !novedades.datos) {
    contenido = <SiluetasTarjetas />
  } else if (novedades.error) {
    contenido = (
      <div className="reportes__error">
        <p role="alert">No pudimos cargar las novedades.</p>
        <button type="button" className="boton-principal" onClick={novedades.reintentar}>
          <RefreshCw size={18} aria-hidden="true" />
          Reintentar
        </button>
      </div>
    )
  } else if (visibles.length === 0 && hayFiltros) {
    contenido = (
      <div className="reportes__vacio">
        <Brotico estado="triste" tamano={112} />
        <p>No encontramos novedades con esos filtros.</p>
        <button type="button" className="boton-principal" onClick={quitarFiltros}>
          Quitar filtros
        </button>
      </div>
    )
  } else if (visibles.length === 0 && estado === 'abierta') {
    contenido = (
      <p className="novedades__al-dia">
        <BadgeCheck size={22} aria-hidden="true" />
        Todo al día: no hay novedades por atender.
      </p>
    )
  } else if (visibles.length === 0) {
    contenido = <p className="novedades__al-dia">Todavía no hay novedades atendidas.</p>
  } else {
    contenido = (
      <div className="lista-novedades">
        {visibles.map((n) => (
          <TarjetaNovedad key={n.id} novedad={n} rol={n.rol} />
        ))}
      </div>
    )
  }

  return (
    <div className="reportes">
      <Pestanas
        opciones={ESTADOS.map((e) => ({ ...e, cantidad: conteo[e.valor] }))}
        valor={estado}
        alCambiar={(valor) => cambiar('estado', valor === 'abierta' ? '' : valor)}
        etiqueta="Estado"
        idPanel={idPanel}
        prefijoId="pestana-novedad"
      />

      <div id={idPanel} role="tabpanel" aria-labelledby={`pestana-novedad-${estado}`} className="novedades__panel">
        <div className="filtros-reportes filtros-novedades">
          <div className="campo filtros-novedades__campo">
            <label htmlFor="filtro-tipo">Tipo</label>
            <select id="filtro-tipo" value={tipo} onChange={(e) => cambiar('tipo', e.target.value)}>
              {TIPOS.map((t) => (
                <option key={t.valor || 'todos'} value={t.valor}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="filtros-reportes__estados" role="group" aria-label="Quién la creó">
            {CREADORES.map(({ valor, nombre }) => (
              <button
                key={valor || 'todos'}
                type="button"
                className="filtro-estado filtro-estado--sin-cantidad"
                aria-pressed={creador === valor}
                onClick={() => cambiar('creador', valor)}
              >
                {nombre}
              </button>
            ))}
          </div>
        </div>
        {contenido}
      </div>
    </div>
  )
}
