import { CircleAlert, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import Bienvenida from '../componentes/Bienvenida.jsx'
import { useSesion } from '../sesion/useSesion.js'
import { formatearDiaDeHoy } from '../utilidades/fechas.js'
import EsqueletoResumen from './resumen/EsqueletoResumen.jsx'
import GraficaSemana from './resumen/GraficaSemana.jsx'
import ListaPorRevisar from './resumen/ListaPorRevisar.jsx'
import MedidorAvance from './resumen/MedidorAvance.jsx'
import NecesitaAtencion from './resumen/NecesitaAtencion.jsx'
import TarjetasResumen from './resumen/TarjetasResumen.jsx'
import { useResumen } from './resumen/useResumen.js'
import './resumen/resumen.css'

const MENSAJE_ERROR = 'No pudimos cargar el resumen.'

function Bloque({ id, titulo, className = '', children }) {
  return (
    <section className={`bloque ${className}`.trim()} aria-labelledby={id}>
      <h2 id={id} className="bloque__titulo">
        {titulo}
      </h2>
      {children}
    </section>
  )
}

function ContenidoResumen({ datos }) {
  return (
    <div className="resumen__rejilla">
      <TarjetasResumen porEstado={datos.reportes_por_estado} />
      <Bloque id="titulo-semana" titulo="Reportes de la semana" className="bloque--semana">
        <GraficaSemana dias={datos.reportes_por_dia} />
      </Bloque>
      <Bloque id="titulo-atencion" titulo="Necesita atención" className="bloque--atencion">
        <NecesitaAtencion
          novedades={datos.novedades_abiertas}
          tareasAtrasadas={datos.tareas_atrasadas}
          gestores={datos.gestores_activos}
        />
      </Bloque>
      <Bloque id="titulo-por-revisar" titulo="Por revisar" className="bloque--lista">
        <ListaPorRevisar reportes={datos.ultimos_pendientes} />
      </Bloque>
      <Bloque id="titulo-avance" titulo="Avance" className="bloque--avance">
        <MedidorAvance porcentaje={datos.porcentaje_resuelto} />
      </Bloque>
    </div>
  )
}

export default function PaginaResumen() {
  const { usuario, conBienvenida, marcarBienvenidaComoVista } = useSesion()
  // Se decide al entrar: si aparece, queda vista de inmediato, pero sigue
  // en pantalla hasta cerrarla o salir del Resumen.
  const [mostrarBienvenida, setMostrarBienvenida] = useState(conBienvenida)
  const { datos, error, cargando, cargar } = useResumen()

  useEffect(() => {
    if (mostrarBienvenida) marcarBienvenidaComoVista()
  }, [mostrarBienvenida, marcarBienvenidaComoVista])

  const actualizando = cargando && Boolean(datos)

  let contenido
  if (datos) contenido = <ContenidoResumen datos={datos} />
  else if (cargando) contenido = <EsqueletoResumen />
  else
    contenido = (
      <div className="resumen__error">
        <p role="alert">{MENSAJE_ERROR}</p>
        <button type="button" className="boton-principal" onClick={cargar}>
          <RefreshCw size={18} aria-hidden="true" />
          Reintentar
        </button>
      </div>
    )

  return (
    <div className="resumen">
      {mostrarBienvenida && (
        <Bienvenida nombre={usuario.nombre} alCerrar={() => setMostrarBienvenida(false)} />
      )}

      <div className="resumen__cabecera">
        <p className="resumen__fecha">{formatearDiaDeHoy()}</p>
        <button
          type="button"
          className="boton-secundario"
          onClick={cargar}
          disabled={cargando}
          aria-busy={actualizando}
        >
          <RefreshCw size={18} aria-hidden="true" className={cargando ? 'girando' : undefined} />
          {actualizando ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      {error && datos && (
        <p className="aviso-pequeno" role="alert">
          <CircleAlert size={18} aria-hidden="true" />
          {MENSAJE_ERROR}
        </p>
      )}

      {contenido}
    </div>
  )
}
