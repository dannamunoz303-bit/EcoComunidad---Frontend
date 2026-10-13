import { CircleAlert, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { cambiarContrasena } from '../../api/cuenta.js'
import { erroresPorCampo, mensajeDeError } from '../../api/errores.js'
import Campo from '../../componentes/Campo.jsx'
import { useSesion } from '../../sesion/useSesion.js'
import { useEnvio } from '../reportes/acciones/useEnvio.js'
import './cuenta.css'

const VACIO = { actual: '', nueva: '', confirmar: '' }
const NO_COINCIDEN = 'Las contraseñas no coinciden.'
// Campos que devuelve el backend → campos del formulario
const CAMPOS_BACKEND = { contrasena_actual: 'actual', contrasena_nueva: 'nueva' }

function CampoContrasena({ id, etiqueta, valor, alCambiar, error, ayuda, autoComplete }) {
  const [ver, setVer] = useState(false)
  return (
    <Campo id={id} etiqueta={etiqueta} error={error} ayuda={ayuda}>
      {(aria) => (
        <div className="campo__con-boton">
          <input
            id={id}
            type={ver ? 'text' : 'password'}
            autoComplete={autoComplete}
            value={valor}
            onChange={(e) => alCambiar(e.target.value)}
            {...aria}
          />
          <button
            type="button"
            className="campo__boton"
            aria-label={ver ? `Ocultar ${etiqueta.toLowerCase()}` : `Mostrar ${etiqueta.toLowerCase()}`}
            aria-controls={id}
            onClick={() => setVer((v) => !v)}
          >
            {ver ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
          </button>
        </div>
      )}
    </Campo>
  )
}

// Cambio de la propia contraseña (RN-03, RN-05). Guarda los tokens nuevos y avisa con alTerminar().
export default function FormularioCambiarContrasena({ ayudaActual, alTerminar }) {
  const { contrasenaCambiada } = useSesion()
  const [valores, setValores] = useState(VACIO)
  const [noCoinciden, setNoCoinciden] = useState(false)
  const { enviando, error, enviar } = useEnvio()

  const erroresBackend = erroresPorCampo(error)
  const errores = {}
  for (const [campo, propio] of Object.entries(CAMPOS_BACKEND)) {
    if (erroresBackend[campo]) errores[propio] = erroresBackend[campo]
  }
  const hayOtros = Object.keys(erroresBackend).some((campo) => !(campo in CAMPOS_BACKEND))
  const errorGeneral = error && (Object.keys(errores).length === 0 || hayOtros) ? mensajeDeError(error) : null

  const cambiar = (campo) => (valor) => {
    setValores((v) => ({ ...v, [campo]: valor }))
    if (campo !== 'actual') setNoCoinciden(false)
  }

  async function guardar(evento) {
    evento.preventDefault()
    // Se revisa antes de enviar
    if (valores.nueva !== valores.confirmar) {
      setNoCoinciden(true)
      return
    }
    const { ok, resultado } = await enviar(() => cambiarContrasena(valores.actual, valores.nueva))
    if (!ok) return
    contrasenaCambiada(resultado)
    setValores(VACIO)
    alTerminar?.()
  }

  return (
    <form className="formulario-contrasena" onSubmit={guardar} noValidate>
      {errorGeneral && (
        <p className="error-accion" role="alert">
          <CircleAlert size={18} aria-hidden="true" />
          {errorGeneral}
        </p>
      )}
      <CampoContrasena
        id="contrasena-actual"
        etiqueta="Contraseña actual"
        valor={valores.actual}
        alCambiar={cambiar('actual')}
        error={errores.actual}
        ayuda={ayudaActual}
        autoComplete="current-password"
      />
      <CampoContrasena
        id="contrasena-nueva"
        etiqueta="Contraseña nueva"
        valor={valores.nueva}
        alCambiar={cambiar('nueva')}
        error={errores.nueva}
        autoComplete="new-password"
      />
      <CampoContrasena
        id="contrasena-confirmar"
        etiqueta="Confirmar contraseña nueva"
        valor={valores.confirmar}
        alCambiar={cambiar('confirmar')}
        error={noCoinciden ? NO_COINCIDEN : null}
        autoComplete="new-password"
      />
      <ul className="reglas-contrasena" aria-label="Reglas de la contraseña nueva">
        <li>Mínimo 8 caracteres.</li>
        <li>No puede ser una contraseña común.</li>
        <li>No puede tener solo números.</li>
        <li>No puede parecerse a tu correo, nombre o apellido.</li>
      </ul>
      <button type="submit" className="boton-principal formulario-contrasena__enviar" disabled={enviando}>
        {enviando ? 'Cambiando…' : 'Cambiar contraseña'}
      </button>
    </form>
  )
}
