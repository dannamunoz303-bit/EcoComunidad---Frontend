import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ESTADOS_FILTRO } from './filtros.js'

const ESPERA_BUSQUEDA_MS = 300

export default function FiltrosReportes({ filtros, conteo, categorias, alCambiar }) {
  // El texto se escribe en la URL 300 ms después de dejar de teclear.
  const [texto, setTexto] = useState(filtros.q)
  const [qAnterior, setQAnterior] = useState(filtros.q)
  if (filtros.q !== qAnterior) {
    // La URL cambió por fuera (volver atrás, "Quitar filtros"): se sincroniza el campo.
    setQAnterior(filtros.q)
    setTexto(filtros.q)
  }

  useEffect(() => {
    if (texto === filtros.q) return undefined
    const temporizador = setTimeout(() => alCambiar({ q: texto }, { replace: true }), ESPERA_BUSQUEDA_MS)
    return () => clearTimeout(temporizador)
  }, [texto, filtros.q, alCambiar])

  return (
    <div className="filtros-reportes">
      <div className="filtros-reportes__estados" role="group" aria-label="Filtrar por estado">
        {ESTADOS_FILTRO.map(({ valor, nombre }) => (
          <button
            key={valor || 'todos'}
            type="button"
            className="filtro-estado"
            aria-pressed={filtros.estado === valor}
            onClick={() => alCambiar({ estado: valor })}
          >
            {nombre}
            <span className="filtro-estado__cantidad">{conteo[valor] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="filtros-reportes__fila">
        <div className="campo filtros-reportes__buscar">
          <label htmlFor="filtro-texto">Buscar</label>
          <div className="campo__con-icono">
            <Search size={18} aria-hidden="true" />
            <input
              id="filtro-texto"
              type="search"
              placeholder="Título o dirección"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </div>
        </div>

        <div className="campo filtros-reportes__categoria">
          <label htmlFor="filtro-categoria">Categoría</label>
          <select
            id="filtro-categoria"
            value={filtros.categoria}
            onChange={(e) => alCambiar({ categoria: e.target.value })}
          >
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.nombre}
                {c.activa === false ? ' (inactiva)' : ''}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={filtros.verEliminados}
          className="interruptor"
          onClick={() => alCambiar({ eliminados: filtros.verEliminados ? '' : '1' })}
        >
          <span className="interruptor__pista" aria-hidden="true">
            <span className="interruptor__perilla" />
          </span>
          Ver eliminados
        </button>
      </div>
    </div>
  )
}
