// Campo de formulario con etiqueta, ayuda y error ligados al control (aria-describedby).
// children recibe los atributos aria que debe llevar el control.
export default function Campo({ id, etiqueta, error, ayuda, children }) {
  const idError = `${id}-error`
  const idAyuda = `${id}-ayuda`
  const describe = [ayuda && idAyuda, error && idError].filter(Boolean).join(' ') || undefined
  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>
      {children({ 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': describe })}
      {ayuda && (
        <span id={idAyuda} className="campo__ayuda">
          {ayuda}
        </span>
      )}
      {error && (
        <p id={idError} className="campo__error">
          {error}
        </p>
      )}
    </div>
  )
}
