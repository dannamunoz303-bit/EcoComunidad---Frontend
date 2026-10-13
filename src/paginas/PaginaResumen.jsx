import Bienvenida from '../componentes/Bienvenida.jsx'
import { useSesion } from '../sesion/useSesion.js'
import PaginaPronto from './PaginaPronto.jsx'

export default function PaginaResumen() {
  const { usuario, conBienvenida, cerrarBienvenida } = useSesion()
  return (
    <>
      {conBienvenida && <Bienvenida nombre={usuario.nombre} alCerrar={cerrarBienvenida} />}
      <PaginaPronto />
    </>
  )
}
