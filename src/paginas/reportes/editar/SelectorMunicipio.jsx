import { RefreshCw, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { listarMunicipios } from '../../../api/territorio.js'
import { useCarga } from '../../../utilidades/useCarga.js'
import { nombreZona, normalizar } from '../../../utilidades/territorio.js'

// Municipio del reporte (RN-23): uno de los 42 del Cauca. Se busca sin distinguir tildes
// ni mayúsculas ("popayan" encuentra "Popayán"). No se puede dejar vacío: el backend lo exige.
// `valor` es el id como texto ('' si el reporte es anterior a RN-23 y no tiene).
export default function SelectorMunicipio({ valor, error, alCambiar }) {
  const municipios = useCarga(listarMunicipios)
  const [texto, setTexto] = useState('')

  const todos = useMemo(() => municipios.datos ?? [], [municipios.datos])
  const elegido = todos.find((m) => String(m.id) === valor) ?? null

  // Agrupados por zona; el elegido se conserva aunque no coincida con la búsqueda.
  const { grupos, coincidencias } = useMemo(() => {
    const buscado = normalizar(texto.trim())
    const porZona = new Map()
    let cuenta = 0
    for (const m of todos) {
      const coincide = !buscado || normalizar(m.nombre).includes(buscado)
      if (coincide) cuenta += 1
      if (!coincide && String(m.id) !== valor) continue
      const zona = nombreZona(m.zona) ?? 'Sin zona'
      if (!porZona.has(zona)) porZona.set(zona, [])
      porZona.get(zona).push(m)
    }
    return {
      grupos: [...porZona.entries()].sort(([a], [b]) => a.localeCompare(b, 'es')),
      coincidencias: cuenta,
    }
  }, [todos, texto, valor])
  const idError = 'editar-municipio-error'
  const idAyuda = 'editar-municipio-ayuda'

  if (municipios.error) {
    return (
      <div className="campo">
        <span className="campo__etiqueta-suelta">Municipio</span>
        <p className="campo__error" role="alert">
          No pudimos cargar los municipios.
        </p>
        <button type="button" className="boton-secundario" onClick={municipios.reintentar}>
          <RefreshCw size={18} aria-hidden="true" />
          Reintentar
        </button>
      </div>
    )
  }

  const cargando = municipios.cargando && !municipios.datos

  return (
    <div className="selector-municipio">
      <div className="campo">
        <label htmlFor="buscar-municipio">Buscar municipio</label>
        <div className="campo__con-icono">
          <Search size={18} aria-hidden="true" />
          <input
            id="buscar-municipio"
            type="search"
            placeholder="Escribe el nombre, con o sin tildes"
            autoComplete="off"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            disabled={cargando}
          />
        </div>
        {texto.trim() && coincidencias === 0 && (
          <span className="campo__ayuda" role="status">
            Ningún municipio coincide con «{texto.trim()}».
          </span>
        )}
      </div>

      <div className="campo">
        <label htmlFor="editar-municipio">Municipio</label>
        <select
          id="editar-municipio"
          value={valor}
          onChange={(e) => alCambiar(e.target.value)}
          disabled={cargando}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={[idAyuda, error && idError].filter(Boolean).join(' ')}
        >
          {!elegido && (
            <option value={valor} disabled>
              {cargando ? 'Cargando municipios…' : valor ? `Municipio #${valor}` : 'Sin municipio: elige uno'}
            </option>
          )}
          {grupos.map(([zona, lista]) => (
            <optgroup key={zona} label={`Zona ${zona}`}>
              {lista.map((m) => (
                <option key={m.id} value={String(m.id)}>
                  {m.nombre}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <span id={idAyuda} className="campo__ayuda">
          {elegido
            ? `Zona ${nombreZona(elegido.zona) ?? '—'}. La zona del reporte sale de su municipio.`
            : 'La zona del reporte sale de su municipio.'}
        </span>
        {error && (
          <p id={idError} className="campo__error">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
