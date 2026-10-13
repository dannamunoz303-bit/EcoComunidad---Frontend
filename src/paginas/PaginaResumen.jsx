import { useEffect, useState } from 'react'
import Bienvenida from '../componentes/Bienvenida.jsx'
import { useSesion } from '../sesion/useSesion.js'
import PaginaPronto from './PaginaPronto.jsx'

export default function PaginaResumen() {
  const { usuario, conBienvenida, marcarBienvenidaComoVista } = useSesion()
  // Se decide al entrar: si aparece, queda vista de inmediato, pero sigue
  // en pantalla hasta cerrarla o salir del Resumen.
  const [mostrarBienvenida, setMostrarBienvenida] = useState(conBienvenida)

  useEffect(() => {
    if (mostrarBienvenida) marcarBienvenidaComoVista()
  }, [mostrarBienvenida, marcarBienvenidaComoVista])

  return (
    <>
      {mostrarBienvenida && (
        <Bienvenida nombre={usuario.nombre} alCerrar={() => setMostrarBienvenida(false)} />
      )}
      <PaginaPronto />
    </>
  )
}
