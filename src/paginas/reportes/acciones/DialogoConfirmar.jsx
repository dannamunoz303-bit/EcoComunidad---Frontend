import Dialogo from '../../../componentes/Dialogo.jsx'
import ErrorAccion from './ErrorAccion.jsx'
import { useEnvio } from './useEnvio.js'

// Confirmación de una acción. Si el backend responde con error, se muestra aquí sin cerrar.
export default function DialogoConfirmar({
  titulo,
  children,
  textoBoton,
  textoEnviando,
  peligro = false,
  textoDescartar = 'Cancelar',
  accion,
  alCerrar,
  alTerminar,
}) {
  const { enviando, error, enviar } = useEnvio()

  async function confirmar() {
    const { ok, resultado } = await enviar(accion)
    if (ok) alTerminar(resultado)
  }

  return (
    <Dialogo
      titulo={titulo}
      alCerrar={alCerrar}
      bloqueado={enviando}
      pie={
        <>
          <button type="button" className="boton-secundario" onClick={alCerrar} disabled={enviando}>
            {textoDescartar}
          </button>
          <button
            type="button"
            className={peligro ? 'boton-peligro' : 'boton-principal'}
            onClick={confirmar}
            disabled={enviando}
            data-autofoco
          >
            {enviando ? textoEnviando : textoBoton}
          </button>
        </>
      }
    >
      {children}
      <ErrorAccion error={error} />
    </Dialogo>
  )
}
