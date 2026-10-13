import { CircleAlert, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import Logo from '../marca/Logo.jsx'
import LogoAnimado from '../marca/LogoAnimado.jsx'
import { mensajeDeErrorLogin } from '../sesion/mensajes.js'
import { useSesion } from '../sesion/useSesion.js'
import './login.css'

export default function PaginaLogin() {
  const { iniciarSesion, motivo } = useSesion()
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  async function alEnviar(evento) {
    evento.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      // Si entra, RutaPublica lleva al Resumen; si no es administrador, llega un motivo.
      await iniciarSesion(correo.trim(), password)
    } catch (err) {
      setError(mensajeDeErrorLogin(err))
    } finally {
      setEnviando(false)
    }
  }

  const aviso = error ?? motivo

  return (
    <div className="login">
      <aside className="login__marca sobre-verde">
        <Logo variante="sobre-verde" conNombre tamano={56} />
        <p className="login__frase">Cada reporte es un barrio que mejora.</p>
      </aside>

      <main className="login__principal">
        <div className="login__contenido">
          <LogoAnimado tamano={72} />

          <form className="login__formulario aparece-formulario" onSubmit={alEnviar}>
            <h1 className="login__titulo">Inicia sesión</h1>

            <div className="login__aviso-zona" aria-live="assertive" aria-atomic="true">
              {aviso && (
                <p className="login__aviso">
                  <CircleAlert size={20} aria-hidden="true" />
                  {aviso}
                </p>
              )}
            </div>

            <div className="campo">
              <label htmlFor="login-correo">Correo</label>
              <input
                id="login-correo"
                type="email"
                name="correo"
                autoComplete="username"
                required
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
              />
            </div>

            <div className="campo">
              <label htmlFor="login-password">Contraseña</label>
              <div className="campo__con-boton">
                <input
                  id="login-password"
                  type={verPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="campo__boton"
                  aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-controls="login-password"
                  onClick={() => setVerPassword((v) => !v)}
                >
                  {verPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <button type="submit" className="boton-principal login__ingresar" disabled={enviando}>
              {enviando ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
