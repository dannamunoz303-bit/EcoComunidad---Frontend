// Copia texto al portapapeles. Devuelve true si se pudo.
export async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    return false
  }
}
