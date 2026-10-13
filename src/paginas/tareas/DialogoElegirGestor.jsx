import { RefreshCw, Search } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Dialogo from '../../componentes/Dialogo.jsx'
import { useCarga } from '../../utilidades/useCarga.js'
import ErrorAccion from '../reportes/acciones/ErrorAccion.jsx'
import { useEnvio } from '../reportes/acciones/useEnvio.js'
import { cargarGestoresActivos, ordenarPorCarga } from './gestores.js'
import './tareas.css'

const normalizar = (texto) =>
  (texto ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

const textoActivas = (n) => `${n} ${n === 1 ? 'activa' : 'activas'}`
const textoAtrasadas = (n) => `${n} ${n === 1 ? 'atrasada' : 'atrasadas'}`

// Diálogo para asignar o reasignar. `excluir`: ids de gestores que no se pueden elegir
// (los que ya tienen una tarea activa en el reporte y, al reasignar, el actual).
// accion(gestor) hace la petición; alTerminar(gestor, resultado) se llama si sale bien.
export default function DialogoElegirGestor({
  titulo,
  textoBoton,
  textoEnviando,
  excluir = [],
  accion,
  alCerrar,
  alTerminar,
}) {
  const gestores = useCarga(cargarGestoresActivos)
  const [texto, setTexto] = useState('')
  const [elegidoId, setElegidoId] = useState(null)
  const { enviando, error, enviar } = useEnvio()
  const idBuscar = useId()
  const nombreGrupo = useId()

  const disponibles = useMemo(() => {
    const excluidos = new Set(excluir)
    return ordenarPorCarga((gestores.datos ?? []).filter((g) => !excluidos.has(g.id)))
  }, [gestores.datos, excluir])

  const visibles = useMemo(() => {
    const buscado = normalizar(texto.trim())
    if (!buscado) return disponibles
    return disponibles.filter((g) => normalizar(`${g.nombre} ${g.apellido}`).includes(buscado))
  }, [disponibles, texto])

  const elegido = disponibles.find((g) => g.id === elegidoId) ?? null

  async function confirmar() {
    if (!elegido) return
    const { ok, resultado } = await enviar(() => accion(elegido))
    if (ok) alTerminar(elegido, resultado)
  }

  let contenido
  if (gestores.cargando) {
    contenido = (
      <div className="lista-gestores__siluetas" aria-busy="true" data-testid="siluetas-gestores">
        <span className="silueta-fila__bloque silueta-fila__bloque--largo" />
        <span className="silueta-fila__bloque" />
        <span className="silueta-fila__bloque" />
      </div>
    )
  } else if (gestores.error) {
    contenido = (
      <div className="lista-gestores__error">
        <ErrorAccion error={gestores.error} />
        <button type="button" className="boton-secundario" onClick={gestores.reintentar}>
          <RefreshCw size={18} aria-hidden="true" />
          Reintentar
        </button>
      </div>
    )
  } else if (disponibles.length === 0) {
    contenido = (
      <div className="lista-gestores__vacia">
        <p>No hay gestores activos disponibles para este reporte.</p>
        <Link to="/usuarios">Ir a usuarios</Link>
      </div>
    )
  } else {
    contenido = (
      <>
        <div className="campo">
          <label htmlFor={idBuscar}>Buscar gestor</label>
          <div className="campo__con-icono">
            <Search size={18} aria-hidden="true" />
            <input
              id={idBuscar}
              type="search"
              placeholder="Nombre o apellido"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </div>
        </div>
        <fieldset className="lista-gestores" disabled={enviando}>
          <legend className="solo-lector">Gestores activos, de menos a más tareas activas</legend>
          {visibles.length === 0 ? (
            <p className="texto-suave">Ningún gestor coincide con «{texto.trim()}».</p>
          ) : (
            visibles.map((g) => (
              <label key={g.id} className="opcion-gestor">
                <input
                  type="radio"
                  name={nombreGrupo}
                  value={g.id}
                  checked={elegidoId === g.id}
                  onChange={() => setElegidoId(g.id)}
                />
                <span className="opcion-gestor__nombre">
                  {g.nombre} {g.apellido}
                </span>
                <span className="opcion-gestor__carga">
                  {g.activas !== null && <span className="carga-gestor">{textoActivas(g.activas)}</span>}
                  {g.atrasadas > 0 && (
                    <span className="carga-gestor carga-gestor--atrasada">
                      <span className="carga-gestor__punto" aria-hidden="true" />
                      {textoAtrasadas(g.atrasadas)}
                    </span>
                  )}
                </span>
              </label>
            ))
          )}
        </fieldset>
      </>
    )
  }

  return (
    <Dialogo
      titulo={titulo}
      alCerrar={alCerrar}
      bloqueado={enviando}
      pie={
        <>
          <button type="button" className="boton-secundario" onClick={alCerrar} disabled={enviando}>
            Cancelar
          </button>
          <button type="button" className="boton-principal" onClick={confirmar} disabled={!elegido || enviando}>
            {enviando ? textoEnviando : textoBoton}
          </button>
        </>
      }
    >
      {contenido}
      <ErrorAccion error={error} />
    </Dialogo>
  )
}
