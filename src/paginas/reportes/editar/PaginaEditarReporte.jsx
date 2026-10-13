import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useCallback } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { listarCategorias } from '../../../api/categorias.js'
import { obtenerReporte } from '../../../api/reportes.js'
import { useAvisos } from '../../../componentes/avisos/useAvisos.js'
import Brotico from '../../../marca/Brotico.jsx'
import { useCarga } from '../../../utilidades/useCarga.js'
import FormularioEditar from './FormularioEditar.jsx'
import '../detalle.css'
import './editar.css'

export default function PaginaEditarReporte() {
  const { id } = useParams()
  const { state } = useLocation()
  const navegar = useNavigate()
  const { mostrarAviso } = useAvisos()
  // Al volver al detalle se conservan los filtros de la lista.
  const volver = { ruta: `/reportes/${id}`, estado: { desde: state?.desde ?? '' } }

  const cargarReporte = useCallback(() => obtenerReporte(id), [id])
  const reporte = useCarga(cargarReporte)
  const categorias = useCarga(listarCategorias)

  const alGuardar = () => {
    mostrarAviso({ tipo: 'exito', texto: 'Cambios guardados.' })
    navegar(volver.ruta, { state: volver.estado })
  }

  let contenido
  if (reporte.cargando || categorias.cargando) {
    contenido = (
      <div className="detalle__siluetas" aria-busy="true" data-testid="siluetas-editar">
        <span className="silueta-fila__bloque silueta-fila__bloque--largo" />
        <span className="silueta-fila__bloque" />
      </div>
    )
  } else if (reporte.error?.response?.status === 404) {
    contenido = (
      <div className="detalle__no-existe">
        <Brotico estado="triste" tamano={112} />
        <p>Este reporte no existe o fue borrado.</p>
        <Link className="boton-principal" to="/reportes">
          Ir a la lista de reportes
        </Link>
      </div>
    )
  } else if (reporte.error || categorias.error) {
    const reintentar = () => {
      if (reporte.error) reporte.reintentar()
      if (categorias.error) categorias.reintentar()
    }
    contenido = (
      <div className="detalle__error">
        <p role="alert">No pudimos cargar el reporte.</p>
        <button type="button" className="boton-principal" onClick={reintentar}>
          <RefreshCw size={18} aria-hidden="true" />
          Reintentar
        </button>
      </div>
    )
  } else if (reporte.datos.eliminado) {
    contenido = <p className="aviso aviso--gris">Este reporte fue eliminado y ya no admite cambios.</p>
  } else {
    contenido = (
      <FormularioEditar reporte={reporte.datos} categorias={categorias.datos} volver={volver} alGuardar={alGuardar} />
    )
  }

  return (
    <div className="detalle editar-reporte">
      <Link className="boton-secundario detalle__volver" to={volver.ruta} state={volver.estado}>
        <ArrowLeft size={18} aria-hidden="true" />
        Volver al reporte
      </Link>
      <h2 className="detalle__titulo">Editar reporte #{id}</h2>
      {contenido}
    </div>
  )
}
