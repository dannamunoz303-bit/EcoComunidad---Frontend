import { ArrowLeft, CircleAlert, Copy, Eye, EyeOff, KeyRound } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { erroresPorCampo, mensajeDeError } from '../../api/errores.js'
import { crearUsuario } from '../../api/usuarios.js'
import Campo from '../../componentes/Campo.jsx'
import Dialogo from '../../componentes/Dialogo.jsx'
import { useAvisos } from '../../componentes/avisos/useAvisos.js'
import { useEnvio } from '../reportes/acciones/useEnvio.js'
import { generarContrasena } from './contrasena.js'
import { copiarTexto } from './portapapeles.js'
import '../reportes/detalle.css'
import './usuarios.css'

// Largo de cada campo en el backend (sección 4.2).
const MAXIMOS = { nombre: 80, apellido: 80, cedula: 20, correo: 120, telefono: 20 }
const CAMPOS = ['nombre', 'apellido', 'cedula', 'correo', 'telefono', 'password', 'rol']

const VACIO = { rol: 'gestor', nombre: '', apellido: '', cedula: '', correo: '', telefono: '', password: '' }

function DialogoCreado({ usuario, password, alCerrar }) {
  const { mostrarAviso } = useAvisos()
  const nombre = `${usuario.nombre} ${usuario.apellido}`

  async function copiarDatos() {
    const ok = await copiarTexto(`Nombre: ${nombre}\nCorreo: ${usuario.correo}\nContraseña: ${password}`)
    mostrarAviso(ok ? { tipo: 'exito', texto: 'Datos copiados.' } : { tipo: 'error', texto: 'No pudimos copiar los datos.' })
  }

  return (
    <Dialogo
      titulo="Usuario creado"
      alCerrar={alCerrar}
      pie={
        <>
          <button type="button" className="boton-secundario" onClick={copiarDatos}>
            <Copy size={18} aria-hidden="true" />
            Copiar datos
          </button>
          <button type="button" className="boton-principal" onClick={alCerrar} data-autofoco>
            Ver usuario
          </button>
        </>
      }
    >
      <dl className="datos-creados">
        <div>
          <dt>Nombre</dt>
          <dd>{nombre}</dd>
        </div>
        <div>
          <dt>Correo</dt>
          <dd>{usuario.correo}</dd>
        </div>
        <div>
          <dt>Contraseña inicial</dt>
          <dd className="datos-creados__contrasena">{password}</dd>
        </div>
      </dl>
      <p>Deberá cambiar esta contraseña la primera vez que inicie sesión.</p>
      <p>
        Entrégale estos datos a {nombre} de forma segura. La contraseña no se volverá a mostrar.
      </p>
    </Dialogo>
  )
}

export default function PaginaNuevoUsuario() {
  const navegar = useNavigate()
  const { mostrarAviso } = useAvisos()
  const [valores, setValores] = useState(VACIO)
  const [verPassword, setVerPassword] = useState(false)
  const [creado, setCreado] = useState(null)
  const { enviando, error, enviar } = useEnvio()

  const errores = erroresPorCampo(error)
  const erroresSueltos = Object.keys(errores).some((campo) => !CAMPOS.includes(campo))
  const errorGeneral = error && (Object.keys(errores).length === 0 || erroresSueltos) ? mensajeDeError(error) : null
  const esGestor = valores.rol === 'gestor'

  const cambiar = (campo) => (evento) => setValores((v) => ({ ...v, [campo]: evento.target.value }))

  function generar() {
    setValores((v) => ({ ...v, password: generarContrasena(v) }))
    setVerPassword(true)
  }

  async function copiarContrasena() {
    const ok = await copiarTexto(valores.password)
    mostrarAviso(ok ? { tipo: 'exito', texto: 'Contraseña copiada.' } : { tipo: 'error', texto: 'No pudimos copiar la contraseña.' })
  }

  async function guardar(evento) {
    evento.preventDefault()
    const datos = {
      rol: valores.rol,
      nombre: valores.nombre.trim(),
      apellido: valores.apellido.trim(),
      correo: valores.correo.trim(),
      password: valores.password,
    }
    // Cédula (opcional para el administrador) y teléfono solo si se escribieron.
    if (valores.cedula.trim()) datos.cedula = valores.cedula.trim()
    if (valores.telefono.trim()) datos.telefono = valores.telefono.trim()
    const { ok, resultado } = await enviar(() => crearUsuario(datos))
    if (ok) setCreado({ usuario: resultado, password: valores.password })
  }

  return (
    <div className="detalle">
      <Link className="boton-secundario detalle__volver" to="/usuarios">
        <ArrowLeft size={18} aria-hidden="true" />
        Volver a usuarios
      </Link>
      <h2 className="detalle__titulo">Crear usuario</h2>

      <form className="formulario-usuario" onSubmit={guardar} noValidate>
        {errorGeneral && (
          <p className="error-accion" role="alert">
            <CircleAlert size={18} aria-hidden="true" />
            {errorGeneral}
          </p>
        )}

        <section className="detalle__seccion">
          <fieldset className="opciones-rol" aria-describedby="nota-rol">
            <legend>Rol</legend>
            <label className="opcion-rol">
              <input type="radio" name="rol" value="gestor" checked={esGestor} onChange={cambiar('rol')} />
              Gestor ambiental
            </label>
            <label className="opcion-rol">
              <input
                type="radio"
                name="rol"
                value="administrador"
                checked={valores.rol === 'administrador'}
                onChange={cambiar('rol')}
              />
              Administrador
            </label>
          </fieldset>
          <p id="nota-rol" className="campo__ayuda">
            Los ciudadanos se registran solos desde la app.
          </p>
          {errores.rol && <p className="campo__error">{errores.rol}</p>}
        </section>

        <section className="detalle__seccion" aria-labelledby="titulo-datos-usuario">
          <h3 id="titulo-datos-usuario" className="detalle__subtitulo">
            Datos personales
          </h3>
          <div className="formulario-usuario__fila">
            <Campo id="usuario-nombre" etiqueta="Nombre" error={errores.nombre}>
              {(aria) => (
                <input id="usuario-nombre" type="text" autoComplete="off" maxLength={MAXIMOS.nombre} value={valores.nombre} onChange={cambiar('nombre')} {...aria} />
              )}
            </Campo>
            <Campo id="usuario-apellido" etiqueta="Apellido" error={errores.apellido}>
              {(aria) => (
                <input id="usuario-apellido" type="text" autoComplete="off" maxLength={MAXIMOS.apellido} value={valores.apellido} onChange={cambiar('apellido')} {...aria} />
              )}
            </Campo>
          </div>
          <div className="formulario-usuario__fila">
            <Campo
              id="usuario-cedula"
              etiqueta={
                <>
                  Cédula{!esGestor && <span className="campo__opcional"> (opcional)</span>}
                </>
              }
              error={errores.cedula}
              ayuda={esGestor ? 'Obligatoria para el gestor.' : undefined}
            >
              {(aria) => (
                <input id="usuario-cedula" type="text" inputMode="numeric" autoComplete="off" maxLength={MAXIMOS.cedula} value={valores.cedula} onChange={cambiar('cedula')} {...aria} />
              )}
            </Campo>
            <Campo
              id="usuario-telefono"
              etiqueta={
                <>
                  Teléfono<span className="campo__opcional"> (opcional)</span>
                </>
              }
              error={errores.telefono}
            >
              {(aria) => (
                <input id="usuario-telefono" type="tel" autoComplete="off" maxLength={MAXIMOS.telefono} value={valores.telefono} onChange={cambiar('telefono')} {...aria} />
              )}
            </Campo>
          </div>
          <Campo id="usuario-correo" etiqueta="Correo" error={errores.correo} ayuda="Con este correo iniciará sesión.">
            {(aria) => (
              <input id="usuario-correo" type="email" autoComplete="off" maxLength={MAXIMOS.correo} value={valores.correo} onChange={cambiar('correo')} {...aria} />
            )}
          </Campo>
        </section>

        <section className="detalle__seccion" aria-labelledby="titulo-contrasena">
          <h3 id="titulo-contrasena" className="detalle__subtitulo">
            Contraseña
          </h3>
          <Campo id="usuario-password" etiqueta="Contraseña inicial" error={errores.password}>
            {(aria) => (
              <div className="campo__con-boton">
                <input
                  id="usuario-password"
                  className="contrasena__input"
                  type={verPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={valores.password}
                  onChange={cambiar('password')}
                  {...aria}
                  aria-describedby={[aria['aria-describedby'], 'reglas-contrasena'].filter(Boolean).join(' ')}
                />
                <button
                  type="button"
                  className="campo__boton"
                  aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-controls="usuario-password"
                  onClick={() => setVerPassword((v) => !v)}
                >
                  {verPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
                </button>
              </div>
            )}
          </Campo>
          <div className="contrasena__botones">
            <button type="button" className="boton-secundario" onClick={generar}>
              <KeyRound size={18} aria-hidden="true" />
              Generar contraseña segura
            </button>
            <button type="button" className="boton-secundario" onClick={copiarContrasena} disabled={!valores.password}>
              <Copy size={18} aria-hidden="true" />
              Copiar
            </button>
          </div>
          <ul id="reglas-contrasena" className="reglas-contrasena" aria-label="Reglas de la contraseña">
            <li>Mínimo 8 caracteres.</li>
            <li>No puede ser una contraseña común.</li>
            <li>No puede tener solo números.</li>
            <li>No puede parecerse a los datos del usuario (correo, nombre o apellido).</li>
          </ul>
        </section>

        <div className="formulario-usuario__pie">
          <Link className="boton-secundario" to="/usuarios">
            Cancelar
          </Link>
          <button type="submit" className="boton-principal" disabled={enviando}>
            {enviando ? 'Creando…' : 'Crear usuario'}
          </button>
        </div>
      </form>

      {creado && (
        <DialogoCreado
          usuario={creado.usuario}
          password={creado.password}
          // replace: la contraseña no queda en el historial del navegador
          alCerrar={() => navegar(`/usuarios/${creado.usuario.id}`, { replace: true })}
        />
      )}
    </div>
  )
}
