import { CircleCheckBig, Inbox, Layers, UserRoundCheck } from 'lucide-react'

function Tarjeta({ titulo, valor, subtitulo, icono: Icono, destacada = false }) {
  return (
    <article className={`tarjeta-cifra${destacada ? ' tarjeta-cifra--destacada' : ''}`}>
      <div className="tarjeta-cifra__cabecera">
        <p className="tarjeta-cifra__titulo">{titulo}</p>
        <span className="tarjeta-cifra__icono" aria-hidden="true">
          <Icono size={20} />
        </span>
      </div>
      <p className="tarjeta-cifra__valor">{valor}</p>
      {subtitulo && <p className="tarjeta-cifra__subtitulo">{subtitulo}</p>}
    </article>
  )
}

export default function TarjetasResumen({ porEstado }) {
  return (
    <div className="tarjetas-resumen">
      <Tarjeta
        destacada
        titulo="Por revisar"
        valor={porEstado.pendiente}
        subtitulo="Reportes esperando tu revisión"
        icono={Inbox}
      />
      <Tarjeta
        titulo="En atención"
        valor={porEstado.asignado + porEstado.en_proceso}
        subtitulo="Con gestores asignados"
        icono={UserRoundCheck}
      />
      <Tarjeta titulo="Resueltos" valor={porEstado.resuelto} icono={CircleCheckBig} />
      <Tarjeta titulo="Total" valor={porEstado.total} subtitulo="Sin contar eliminados" icono={Layers} />
    </div>
  )
}
