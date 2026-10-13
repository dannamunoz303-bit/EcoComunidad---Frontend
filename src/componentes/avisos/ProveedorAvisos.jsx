import { CircleAlert, CircleCheck, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ContextoAvisos } from './contexto.js'
import './avisos.css'

export const DURACION_AVISO_MS = 5000

// Mensaje breve abajo a la derecha. Se va solo a los 5 s o con su botón de cerrar.
function Aviso({ aviso, alCerrar }) {
  useEffect(() => {
    const temporizador = setTimeout(() => alCerrar(aviso.id), DURACION_AVISO_MS)
    return () => clearTimeout(temporizador)
  }, [aviso.id, alCerrar])

  const Icono = aviso.tipo === 'error' ? CircleAlert : CircleCheck
  return (
    <div className={`aviso-flotante aviso-flotante--${aviso.tipo}`}>
      <Icono className="aviso-flotante__icono" size={20} aria-hidden="true" />
      <p className="aviso-flotante__texto">{aviso.texto}</p>
      <button type="button" className="aviso-flotante__cerrar" aria-label="Cerrar aviso" onClick={() => alCerrar(aviso.id)}>
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  )
}

export default function ProveedorAvisos({ children }) {
  const [avisos, setAvisos] = useState([])
  const siguienteId = useRef(1)

  const cerrarAviso = useCallback((id) => {
    setAvisos((actuales) => actuales.filter((a) => a.id !== id))
  }, [])

  const mostrarAviso = useCallback(({ tipo = 'exito', texto }) => {
    const id = siguienteId.current
    siguienteId.current += 1
    setAvisos((actuales) => [...actuales, { id, tipo, texto }])
    return id
  }, [])

  const valor = useMemo(() => ({ mostrarAviso, cerrarAviso }), [mostrarAviso, cerrarAviso])

  return (
    <ContextoAvisos.Provider value={valor}>
      {children}
      {/* Las regiones existen siempre para que los lectores de pantalla anuncien lo que entra */}
      <div className="avisos-flotantes">
        <div aria-live="polite" aria-atomic="false" className="avisos-flotantes__region">
          {avisos
            .filter((a) => a.tipo !== 'error')
            .map((aviso) => (
              <Aviso key={aviso.id} aviso={aviso} alCerrar={cerrarAviso} />
            ))}
        </div>
        <div aria-live="assertive" aria-atomic="false" className="avisos-flotantes__region">
          {avisos
            .filter((a) => a.tipo === 'error')
            .map((aviso) => (
              <Aviso key={aviso.id} aviso={aviso} alCerrar={cerrarAviso} />
            ))}
        </div>
      </div>
    </ContextoAvisos.Provider>
  )
}
