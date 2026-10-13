import { RefreshCw, Search, UserPlus } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listarUsuarios } from '../../api/usuarios.js'
import EstadoUsuario from '../../componentes/EstadoUsuario.jsx'
import Brotico from '../../marca/Brotico.jsx'
import { formatearFechaCorta } from '../../utilidades/fechas.js'
import { useCarga } from '../../utilidades/useCarga.js'
import { nombreCompleto } from '../../utilidades/usuarios.js'
import '../reportes/reportes.css'
import './usuarios.css'

// Filtros en la URL: ?rol=gestor&estado=inactivo&q=perez
const ROLES = [
  { valor: 'gestor', nombre: 'Gestores' },
  { valor: 'ciudadano', nombre: 'Ciudadanos' },
  { valor: 'administrador', nombre: 'Administradores' },
]
const ESTADOS = [
  { valor: '', nombre: 'Todos' },
  { valor: 'activo', nombre: 'Activos' },
  { valor: 'inactivo', nombre: 'Inactivos' },
  { valor: 'bloqueado', nombre: 'Bloqueados' },
]
const ESPERA_BUSQUEDA_MS = 300

const normalizar = (texto) =>
  (texto ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

// Se piden todos una vez: así se cuentan los de cada rol y se filtra sin volver a llamar.
const todosLosUsuarios = () => listarUsuarios()

function SiluetasFilas() {
  return (
    <div className="siluetas-filas" aria-busy="true" data-testid="siluetas-usuarios">
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

function Pestanas({ rol, conteo, alCambiar, idPanel }) {
  const botones = useRef([])

  // Flechas, Inicio y Fin mueven entre pestañas (patrón de pestañas de WAI-ARIA).
  function alPresionar(evento, indice) {
    const destinos = { ArrowRight: indice + 1, ArrowLeft: indice - 1, Home: 0, End: ROLES.length - 1 }
    if (!(evento.key in destinos)) return
    evento.preventDefault()
    const siguiente = (destinos[evento.key] + ROLES.length) % ROLES.length
    alCambiar(ROLES[siguiente].valor)
    botones.current[siguiente]?.focus()
  }

  return (
    <div className="pestanas" role="tablist" aria-label="Rol">
      {ROLES.map(({ valor, nombre }, i) => (
        <button
          key={valor}
          ref={(boton) => {
            botones.current[i] = boton
          }}
          type="button"
          role="tab"
          id={`pestana-${valor}`}
          aria-selected={rol === valor}
          aria-controls={idPanel}
          tabIndex={rol === valor ? 0 : -1}
          className="pestana"
          onClick={() => alCambiar(valor)}
          onKeyDown={(e) => alPresionar(e, i)}
        >
          {nombre}
          <span className="filtro-estado__cantidad">{conteo[valor] ?? 0}</span>
        </button>
      ))}
    </div>
  )
}

export default function PaginaUsuarios() {
  const [params, setParams] = useSearchParams()
  const rol = ROLES.some((r) => r.valor === params.get('rol')) ? params.get('rol') : 'gestor'
  const estado = params.get('estado') ?? ''
  const q = params.get('q') ?? ''
  const usuarios = useCarga(todosLosUsuarios)
  const idPanel = useId()

  const cambiar = (cambios, opciones) =>
    setParams((anteriores) => {
      const nuevos = new URLSearchParams(anteriores)
      for (const [clave, valor] of Object.entries(cambios)) {
        if (valor) nuevos.set(clave, valor)
        else nuevos.delete(clave)
      }
      return nuevos
    }, opciones)

  // Buscador: se escribe en la URL 300 ms después de dejar de teclear.
  const [texto, setTexto] = useState(q)
  const [qAnterior, setQAnterior] = useState(q)
  if (q !== qAnterior) {
    setQAnterior(q)
    setTexto(q)
  }
  const cambiarRef = useRef(cambiar)
  useEffect(() => {
    cambiarRef.current = cambiar
  })
  useEffect(() => {
    if (texto === q) return undefined
    const temporizador = setTimeout(() => cambiarRef.current({ q: texto }, { replace: true }), ESPERA_BUSQUEDA_MS)
    return () => clearTimeout(temporizador)
  }, [texto, q])

  const { visibles, conteo } = useMemo(() => {
    const todos = usuarios.datos ?? []
    const porRol = {}
    for (const u of todos) porRol[u.rol] = (porRol[u.rol] ?? 0) + 1
    const buscado = normalizar(q.trim())
    const filtrados = todos.filter(
      (u) =>
        u.rol === rol &&
        (!estado || u.estado === estado) &&
        (!buscado ||
          [u.nombre, u.apellido, `${u.nombre} ${u.apellido}`, u.correo, u.cedula].some((campo) =>
            normalizar(campo).includes(buscado),
          )),
    )
    return { visibles: filtrados, conteo: porRol }
  }, [usuarios.datos, rol, estado, q])

  const hayFiltros = Boolean(estado || q.trim())
  // "Quitar filtros" conserva la pestaña elegida.
  const quitarFiltros = () => setParams(new URLSearchParams(params.get('rol') ? { rol } : {}))

  let contenido
  if (usuarios.cargando && !usuarios.datos) {
    contenido = <SiluetasFilas />
  } else if (usuarios.error) {
    contenido = (
      <div className="reportes__error">
        <p role="alert">No pudimos cargar los usuarios.</p>
        <button type="button" className="boton-principal" onClick={usuarios.reintentar}>
          <RefreshCw size={18} aria-hidden="true" />
          Reintentar
        </button>
      </div>
    )
  } else if (visibles.length === 0) {
    contenido = (
      <div className="reportes__vacio">
        <Brotico estado="triste" tamano={112} />
        <p>No encontramos usuarios con esos filtros.</p>
        {hayFiltros && (
          <button type="button" className="boton-principal" onClick={quitarFiltros}>
            Quitar filtros
          </button>
        )}
      </div>
    )
  } else {
    contenido = (
      <table className="tabla-reportes">
        <caption className="solo-lector">{ROLES.find((r) => r.valor === rol).nombre}</caption>
        <thead>
          <tr>
            <th scope="col">Nombre</th>
            <th scope="col">Correo</th>
            <th scope="col">Cédula</th>
            <th scope="col">Teléfono</th>
            <th scope="col">Estado</th>
            <th scope="col">Registro</th>
          </tr>
        </thead>
        <tbody>
          {visibles.map((u) => (
            <tr key={u.id}>
              <td className="tabla-reportes__titulo">
                <Link to={`/usuarios/${u.id}`}>{nombreCompleto(u)}</Link>
              </td>
              <td data-etiqueta="Correo" className="tabla-usuarios__correo">
                {u.correo}
              </td>
              <td data-etiqueta="Cédula">{u.cedula || '—'}</td>
              <td data-etiqueta="Teléfono">{u.telefono || '—'}</td>
              <td data-etiqueta="Estado">
                <EstadoUsuario estado={u.estado} bloqueadoHasta={u.bloqueado_hasta} />
              </td>
              <td data-etiqueta="Registro">
                <time dateTime={u.fecha_registro} className="tabla-reportes__fecha">
                  {formatearFechaCorta(u.fecha_registro)}
                </time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <div className="reportes">
      <div className="usuarios__cabecera">
        <p className="reportes__total" aria-live="polite">
          {usuarios.cargando && !usuarios.datos
            ? 'Cargando usuarios…'
            : `${visibles.length} ${visibles.length === 1 ? 'usuario' : 'usuarios'}`}
        </p>
        <Link className="boton-principal" to="/usuarios/nuevo">
          <UserPlus size={18} aria-hidden="true" />
          Crear usuario
        </Link>
      </div>

      <Pestanas rol={rol} conteo={conteo} alCambiar={(valor) => cambiar({ rol: valor })} idPanel={idPanel} />

      <div id={idPanel} role="tabpanel" aria-labelledby={`pestana-${rol}`} className="usuarios__panel">
        <div className="filtros-reportes">
          <div className="filtros-reportes__estados" role="group" aria-label="Filtrar por estado">
            {ESTADOS.map(({ valor, nombre }) => (
              <button
                key={valor || 'todos'}
                type="button"
                className="filtro-estado filtro-estado--sin-cantidad"
                aria-pressed={estado === valor}
                onClick={() => cambiar({ estado: valor })}
              >
                {nombre}
              </button>
            ))}
          </div>
          <div className="filtros-reportes__fila">
            <div className="campo filtros-reportes__buscar">
              <label htmlFor="filtro-usuarios">Buscar</label>
              <div className="campo__con-icono">
                <Search size={18} aria-hidden="true" />
                <input
                  id="filtro-usuarios"
                  type="search"
                  placeholder="Nombre, apellido, correo o cédula"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {contenido}
      </div>
    </div>
  )
}
