import cliente from './cliente.js'

const MAXIMO_PAGINAS = 100

// La API puede responder una lista o una página {count, next, previous, results}.
// Si es paginada, se siguen los enlaces "next" hasta tener todos los resultados.
export async function todosLosResultados(data) {
  if (Array.isArray(data)) return data
  const resultados = [...(data?.results ?? [])]
  let siguiente = data?.next
  for (let pagina = 1; siguiente && pagina < MAXIMO_PAGINAS; pagina += 1) {
    const { data: otra } = await cliente.get(siguiente)
    resultados.push(...(otra?.results ?? []))
    siguiente = otra?.next
  }
  return resultados
}
