import florece from './brotico-florece.svg'
import piensa from './brotico-piensa.svg'
import saluda from './brotico-saluda.svg'
import triste from './brotico-triste.svg'
import { ESTADOS_BROTICO } from './trazos.js'

const ARCHIVOS = { saluda, triste, florece, piensa }

// Solo para momentos especiales (marca.md); nunca en errores graves.
export default function Brotico({ estado = 'saluda', tamano = 120 }) {
  const archivo = ARCHIVOS[estado] ?? ARCHIVOS.saluda
  const etiqueta = ESTADOS_BROTICO[estado] ?? ESTADOS_BROTICO.saluda
  return <img src={archivo} width={tamano} height={tamano} alt={etiqueta} aria-label={etiqueta} />
}
