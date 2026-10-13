// Contraseña inicial segura para un usuario nuevo (RN-03).

export const LARGO_CONTRASENA = 14

// Sin caracteres que se confunden al dictarlos o copiarlos a mano (O/0, l/1/I).
const MAYUSCULAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const MINUSCULAS = 'abcdefghijkmnopqrstuvwxyz'
const NUMEROS = '23456789'
const SIMBOLOS = '!#$%&*+-=?@_'
const TODOS = MAYUSCULAS + MINUSCULAS + NUMEROS + SIMBOLOS

// Número al azar en [0, n) con crypto.getRandomValues, sin sesgo (se descartan los valores del final).
function alAzar(n, aleatorio) {
  const limite = Math.floor(0x100000000 / n) * n
  const caja = new Uint32Array(1)
  do {
    aleatorio(caja)
  } while (caja[0] >= limite)
  return caja[0] % n
}

const elegir = (caracteres, aleatorio) => caracteres[alAzar(caracteres.length, aleatorio)]

function mezclar(lista, aleatorio) {
  for (let i = lista.length - 1; i > 0; i -= 1) {
    const j = alAzar(i + 1, aleatorio)
    ;[lista[i], lista[j]] = [lista[j], lista[i]]
  }
  return lista
}

// Partes de los datos del usuario que no deben aparecer en la contraseña (de 3 letras o más).
function partesPersonales({ nombre = '', apellido = '', correo = '' }) {
  const usuarioCorreo = correo.split('@')[0]
  return [nombre, apellido, usuarioCorreo, correo]
    .flatMap((texto) => texto.toLowerCase().split(/[^\p{L}\p{N}]+/u))
    .filter((parte) => parte.length >= 3)
}

export function contienePersonales(contrasena, datos) {
  const minuscula = contrasena.toLowerCase()
  return partesPersonales(datos).some((parte) => minuscula.includes(parte))
}

// 14 caracteres con mayúsculas, minúsculas, números y al menos un símbolo,
// sin el nombre, el apellido ni el correo del usuario.
export function generarContrasena(datos = {}, aleatorio = (caja) => crypto.getRandomValues(caja)) {
  for (;;) {
    const caracteres = [
      elegir(MAYUSCULAS, aleatorio),
      elegir(MINUSCULAS, aleatorio),
      elegir(NUMEROS, aleatorio),
      elegir(SIMBOLOS, aleatorio),
    ]
    while (caracteres.length < LARGO_CONTRASENA) caracteres.push(elegir(TODOS, aleatorio))
    const contrasena = mezclar(caracteres, aleatorio).join('')
    if (!contienePersonales(contrasena, datos)) return contrasena
  }
}
