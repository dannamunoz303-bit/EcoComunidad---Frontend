import { useContext } from 'react'
import { ContextoAvisos } from './contexto.js'

// mostrarAviso({ tipo: 'exito' | 'error', texto })
export function useAvisos() {
  const avisos = useContext(ContextoAvisos)
  if (!avisos) throw new Error('useAvisos debe usarse dentro de <ProveedorAvisos>')
  return avisos
}
