import { RefreshCw } from 'lucide-react'
import { listarZonas } from '../../api/territorio.js'
import Campo from '../../componentes/Campo.jsx'
import { useCarga } from '../../utilidades/useCarga.js'
import { nombreZona } from '../../utilidades/territorio.js'

// Zona que atiende el gestor (RN-24): obligatoria al crearlo o editarlo.
// `valor` es el id de la zona como texto ('' si no tiene).
export default function SelectorZona({ id, valor, error, alCambiar }) {
  const zonas = useCarga(listarZonas)

  if (zonas.error) {
    return (
      <div className="campo">
        <span className="campo__etiqueta-suelta">Zona</span>
        <p className="campo__error" role="alert">
          No pudimos cargar las zonas.
        </p>
        <button type="button" className="boton-secundario" onClick={zonas.reintentar}>
          <RefreshCw size={18} aria-hidden="true" />
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <Campo id={id} etiqueta="Zona" error={error} ayuda="Obligatoria para el gestor: solo se le asignarán reportes de su zona.">
      {(aria) => (
        <select
          id={id}
          value={valor}
          onChange={(e) => alCambiar(e.target.value)}
          disabled={zonas.cargando && !zonas.datos}
          required
          aria-required="true"
          {...aria}
        >
          <option value="" disabled>
            {zonas.cargando && !zonas.datos ? 'Cargando zonas…' : 'Elige una zona'}
          </option>
          {(zonas.datos ?? []).map((z) => (
            <option key={z.id} value={String(z.id)}>
              {nombreZona(z)}
            </option>
          ))}
        </select>
      )}
    </Campo>
  )
}
