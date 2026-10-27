import { ArrowLeft, CircleAlert, RefreshCw } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { erroresPorCampo, mensajeDeError } from '../../api/errores.js'
import { editarUsuario, obtenerUsuario } from '../../api/usuarios.js'
import Campo from '../../componentes/Campo.jsx'
import { useAvisos } from '../../componentes/avisos/useAvisos.js'
import IconoEstado from '../../componentes/IconoEstado.jsx'
import { useCarga } from '../../utilidades/useCarga.js'
import { nombreCompleto } from '../../utilidades/usuarios.js'
import { useEnvio } from '../reportes/acciones/useEnvio.js'
import '../reportes/detalle.css'
import './usuarios.css'

// Lo único que el administrador puede cambiar de un usuario (RN-05) y su largo en el backend.
const CAMPOS = ['nombre', 'apellido', 'cedula', 'correo', 'telefono']
const MAXIMOS = { nombre: 80, apellido: 80, cedula: 20, correo: 120, telefono: 20 }
const ROLES_CON_CEDULA = ['ciudadano', 'gestor'] // RN-02

const valoresDe = (usuario) => Object.fromEntries(CAMPOS.map((campo) => [campo, usuario[campo] ?? '']))

function FormularioUsuario({ usuario, alGuardar }) {
  const [original] = useState(() => valoresDe(usuario))
  const [valores, setValores] = useState(original)
  const { enviando, error, enviar } = useEnvio()

  const errores = erroresPorCampo(error)
  const erroresSueltos = Object.keys(errores).some((campo) => !CAMPOS.includes(campo))
  const errorGeneral = error && (Object.keys(errores).length === 0 || erroresSueltos) ? mensajeDeError(error) : null
  const cedulaOpcional = !ROLES_CON_CEDULA.includes(usuario.rol)

  // Solo los campos que cambiaron; nunca rol, estado ni contraseña.
  const cambios = Object.fromEntries(
    CAMPOS.filter((campo) => valores[campo].trim() !== original[campo]).map((campo) => [campo, valores[campo].trim()]),
  )
  const hayCambios = Object.keys(cambios).length > 0

  const cambiar = (campo) => (evento) => setValores((v) => ({ ...v, [campo]: evento.target.value }))

  async function guardar(evento) {
    evento.preventDefault()
    if (!hayCambios) return
    const { ok, resultado } = await enviar(() => editarUsuario(usuario.id, cambios))
    if (ok) alGuardar(resultado)
  }

  const campoTexto = (campo, etiqueta, tipo = 'text', extra = {}) => (
    <Campo id={`editar-usuario-${campo}`} etiqueta={etiqueta} error={errores[campo]}>
      {(aria) => (
        <input
          id={`editar-usuario-${campo}`}
          type={tipo}
          autoComplete="off"
          maxLength={MAXIMOS[campo]}
          value={valores[campo]}
          onChange={cambiar(campo)}
          {...extra}
          {...aria}
        />
      )}
    </Campo>
  )

  return (
    <form className="formulario-usuario" onSubmit={guardar} noValidate>
      {errorGeneral && (
        <p className="error-accion" role="alert">
          <CircleAlert size={18} aria-hidden="true" />
          {errorGeneral}
        </p>
      )}

      <section className="detalle__seccion" aria-label="Datos del usuario">
        <p className="nota-fija">El rol y la contraseña no se pueden cambiar desde el panel.</p>
        <div className="formulario-usuario__fila">
          {campoTexto('nombre', 'Nombre')}
          {campoTexto('apellido', 'Apellido')}
        </div>
        <div className="formulario-usuario__fila">
          {campoTexto(
            'cedula',
            <>
              Cédula{cedulaOpcional && <span className="campo__opcional"> (opcional)</span>}
            </>,
            'text',
            { inputMode: 'numeric' },
          )}
          {campoTexto(
            'telefono',
            <>
              Teléfono<span className="campo__opcional"> (opcional)</span>
            </>,
            'tel',
          )}
        </div>
        {campoTexto('correo', 'Correo', 'email')}
      </section>

      <div className="formulario-usuario__pie">
        <Link className="boton-secundario" to={`/usuarios/${usuario.id}`}>
          Cancelar
        </Link>
        <button type="submit" className="boton-principal" disabled={!hayCambios || enviando}>
          {enviando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}

export default function PaginaEditarUsuario() {
  const { id } = useParams()
  const navegar = useNavigate()
  const { mostrarAviso } = useAvisos()
  const cargar = useCallback(() => obtenerUsuario(id), [id])
  const usuario = useCarga(cargar)

  const alGuardar = () => {
    mostrarAviso({ tipo: 'exito', texto: 'Cambios guardados.' })
    navegar(`/usuarios/${id}`)
  }

  let contenido
  if (usuario.cargando) {
    contenido = (
      <div className="detalle__siluetas" aria-busy="true" data-testid="siluetas-editar-usuario">
        <span className="silueta-fila__bloque silueta-fila__bloque--largo" />
        <span className="silueta-fila__bloque" />
      </div>
    )
  } else if (usuario.error?.response?.status === 404) {
    contenido = (
      <div className="detalle__no-existe">
        <IconoEstado tipo="no-existe" tamano={112} />
        <p>Este usuario no existe.</p>
        <Link className="boton-principal" to="/usuarios">
          Ir a la lista de usuarios
        </Link>
      </div>
    )
  } else if (usuario.error) {
    contenido = (
      <div className="detalle__error">
        <p role="alert">No pudimos cargar el usuario.</p>
        <button type="button" className="boton-principal" onClick={usuario.reintentar}>
          <RefreshCw size={18} aria-hidden="true" />
          Reintentar
        </button>
      </div>
    )
  } else {
    contenido = <FormularioUsuario usuario={usuario.datos} alGuardar={alGuardar} />
  }

  return (
    <div className="detalle">
      <Link className="boton-secundario detalle__volver" to={`/usuarios/${id}`}>
        <ArrowLeft size={18} aria-hidden="true" />
        Volver al usuario
      </Link>
      <h2 className="detalle__titulo">
        Editar {usuario.datos ? nombreCompleto(usuario.datos) : 'usuario'}
      </h2>
      {contenido}
    </div>
  )
}
