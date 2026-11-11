// Zonas, municipios y urgencia (ecocomunidad.md, RN-23 a RN-25).

// Urgencias en el orden en que el backend ordena los reportes (RN-25).
export const URGENCIAS = [
  { valor: 'alta', nombre: 'Alta' },
  { valor: 'media', nombre: 'Media' },
  { valor: 'baja', nombre: 'Baja' },
]

export const nombreUrgencia = (valor) => URGENCIAS.find((u) => u.valor === valor)?.nombre ?? null

// "norte" → "Norte". Acepta la zona ({ id, nombre }) o su nombre.
export function nombreZona(zona) {
  const nombre = typeof zona === 'string' ? zona : zona?.nombre
  if (!nombre) return null
  return nombre.charAt(0).toUpperCase() + nombre.slice(1)
}

export const SIN_MUNICIPIO = 'Sin municipio'

// Los reportes anteriores a RN-23 pueden no tener municipio (ni zona).
export const nombreMunicipio = (reporte) => reporte?.municipio?.nombre ?? SIN_MUNICIPIO

// "Popayán · vereda La Playa · zona Centro" o "Sin municipio".
export function textoLugar(reporte) {
  if (!reporte?.municipio) return SIN_MUNICIPIO
  const partes = [reporte.municipio.nombre]
  if (reporte.vereda) partes.push(`vereda ${reporte.vereda}`)
  if (reporte.zona) partes.push(`zona ${nombreZona(reporte.zona)}`)
  return partes.join(' · ')
}

// Sin tildes ni mayúsculas, para buscar "popayan" y encontrar "Popayán".
export const normalizar = (texto) =>
  (texto ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
