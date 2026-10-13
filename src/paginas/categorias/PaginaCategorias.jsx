import { Pencil, Plus, Power, PowerOff, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { activarCategoria, desactivarCategoria, listarCategorias } from '../../api/categorias.js'
import { listarReportes } from '../../api/reportes.js'
import EstadoCategoria from '../../componentes/EstadoCategoria.jsx'
import { useAvisos } from '../../componentes/avisos/useAvisos.js'
import Brotico from '../../marca/Brotico.jsx'
import { useCarga } from '../../utilidades/useCarga.js'
import DialogoConfirmar from '../reportes/acciones/DialogoConfirmar.jsx'
import DialogoCategoria from './DialogoCategoria.jsx'
import '../reportes/reportes.css'
import './categorias.css'

// Filtro en la URL: ?estado=activa | inactiva
const FILTROS = [
  { valor: '', nombre: 'Todas' },
  { valor: 'activa', nombre: 'Activas' },
  { valor: 'inactiva', nombre: 'Inactivas' },
]

const textoReportes = (n) => (n === 0 ? 'Sin reportes' : `${n} ${n === 1 ? 'reporte' : 'reportes'}`)

// Reportes de cada categoría, sin contar los eliminados.
async function contarReportesPorCategoria() {
  const reportes = await listarReportes()
  const conteo = {}
  for (const r of reportes) {
    if (!r.eliminado) conteo[r.categoria_id] = (conteo[r.categoria_id] ?? 0) + 1
  }
  return conteo
}

function SiluetasTarjetas() {
  return (
    <div className="categorias__rejilla" aria-busy="true" data-testid="siluetas-categorias">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="tarjeta-categoria tarjeta-categoria--silueta" aria-hidden="true">
          <span className="silueta-fila__bloque silueta-fila__bloque--largo" />
          <span className="silueta-fila__bloque" />
        </div>
      ))}
    </div>
  )
}

function TarjetaCategoria({ categoria, reportes, alEditar, alCambiarEstado }) {
  const idTitulo = `categoria-${categoria.id}`
  return (
    <article className={`tarjeta-categoria${categoria.activa ? '' : ' tarjeta-categoria--inactiva'}`} aria-labelledby={idTitulo}>
      <div className="tarjeta-categoria__cabecera">
        <h2 id={idTitulo} className="tarjeta-categoria__nombre">
          {categoria.nombre}
        </h2>
        <EstadoCategoria activa={categoria.activa} />
      </div>
      {categoria.descripcion ? (
        <p className="tarjeta-categoria__descripcion">{categoria.descripcion}</p>
      ) : (
        <p className="tarjeta-categoria__descripcion texto-suave">Sin descripción.</p>
      )}
      <p className="tarjeta-categoria__reportes">{reportes === undefined ? '—' : textoReportes(reportes)}</p>
      <div className="tarjeta-categoria__acciones">
        <button type="button" className="boton-secundario" onClick={alEditar} aria-label={`Editar ${categoria.nombre}`}>
          <Pencil size={16} aria-hidden="true" />
          Editar
        </button>
        <button
          type="button"
          className="boton-secundario"
          onClick={alCambiarEstado}
          aria-label={`${categoria.activa ? 'Desactivar' : 'Activar'} ${categoria.nombre}`}
        >
          {categoria.activa ? <PowerOff size={16} aria-hidden="true" /> : <Power size={16} aria-hidden="true" />}
          {categoria.activa ? 'Desactivar' : 'Activar'}
        </button>
      </div>
    </article>
  )
}

export default function PaginaCategorias() {
  const [params, setParams] = useSearchParams()
  const filtro = FILTROS.some((f) => f.valor === params.get('estado')) ? params.get('estado') : ''
  const categorias = useCarga(listarCategorias)
  const conteo = useCarga(contarReportesPorCategoria)
  const { mostrarAviso } = useAvisos()
  // { tipo: 'nueva' | 'editar' | 'desactivar' | 'activar', categoria }
  const [dialogo, setDialogo] = useState(null)

  const cambiarFiltro = (valor) => setParams(valor ? { estado: valor } : {})

  const { visibles, cantidades } = useMemo(() => {
    const todas = [...(categorias.datos ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    const activas = todas.filter((c) => c.activa).length
    const porFiltro = {
      '': todas,
      activa: todas.filter((c) => c.activa),
      inactiva: todas.filter((c) => !c.activa),
    }
    return {
      visibles: porFiltro[filtro],
      cantidades: { '': todas.length, activa: activas, inactiva: todas.length - activas },
    }
  }, [categorias.datos, filtro])

  const terminar = (texto) => {
    setDialogo(null)
    mostrarAviso({ tipo: 'exito', texto })
    categorias.reintentar()
  }

  let contenido
  if (categorias.cargando && !categorias.datos) {
    contenido = <SiluetasTarjetas />
  } else if (categorias.error) {
    contenido = (
      <div className="reportes__error">
        <p role="alert">No pudimos cargar las categorías.</p>
        <button type="button" className="boton-principal" onClick={categorias.reintentar}>
          <RefreshCw size={18} aria-hidden="true" />
          Reintentar
        </button>
      </div>
    )
  } else if (cantidades[''] === 0) {
    contenido = (
      <div className="reportes__vacio">
        <Brotico estado="triste" tamano={112} />
        <p>Todavía no hay categorías. Crea la primera para que los ciudadanos puedan reportar.</p>
      </div>
    )
  } else if (visibles.length === 0) {
    contenido = (
      <div className="reportes__vacio">
        <p>No hay categorías con ese filtro.</p>
        <button type="button" className="boton-secundario" onClick={() => cambiarFiltro('')}>
          Ver todas
        </button>
      </div>
    )
  } else {
    contenido = (
      <div className="categorias__rejilla">
        {visibles.map((c) => (
          <TarjetaCategoria
            key={c.id}
            categoria={c}
            reportes={conteo.datos ? (conteo.datos[c.id] ?? 0) : undefined}
            alEditar={() => setDialogo({ tipo: 'editar', categoria: c })}
            alCambiarEstado={() => setDialogo({ tipo: c.activa ? 'desactivar' : 'activar', categoria: c })}
          />
        ))}
      </div>
    )
  }

  const categoria = dialogo?.categoria

  return (
    <div className="reportes">
      <div className="categorias__cabecera">
        <div className="filtros-reportes__estados" role="group" aria-label="Filtrar por estado">
          {FILTROS.map(({ valor, nombre }) => (
            <button
              key={valor || 'todas'}
              type="button"
              className="filtro-estado"
              aria-pressed={filtro === valor}
              onClick={() => cambiarFiltro(valor)}
            >
              {nombre}
              <span className="filtro-estado__cantidad">{cantidades[valor] ?? 0}</span>
            </button>
          ))}
        </div>
        <button type="button" className="boton-principal" onClick={() => setDialogo({ tipo: 'nueva' })}>
          <Plus size={18} aria-hidden="true" />
          Nueva categoría
        </button>
      </div>

      {contenido}

      {dialogo?.tipo === 'nueva' && (
        <DialogoCategoria alCerrar={() => setDialogo(null)} alTerminar={() => terminar('Categoría creada.')} />
      )}
      {dialogo?.tipo === 'editar' && (
        <DialogoCategoria
          categoria={categoria}
          alCerrar={() => setDialogo(null)}
          alTerminar={() => terminar('Cambios guardados.')}
        />
      )}
      {dialogo?.tipo === 'desactivar' && (
        <DialogoConfirmar
          titulo={`¿Desactivar ${categoria.nombre}?`}
          textoBoton="Desactivar"
          textoEnviando="Desactivando…"
          peligro
          accion={() => desactivarCategoria(categoria.id)}
          alCerrar={() => setDialogo(null)}
          alTerminar={() => terminar('Categoría desactivada.')}
        >
          <p>Los ciudadanos ya no podrán elegirla en reportes nuevos. Los reportes que ya la usan no cambian.</p>
        </DialogoConfirmar>
      )}
      {dialogo?.tipo === 'activar' && (
        <DialogoConfirmar
          titulo={`¿Activar ${categoria.nombre}?`}
          textoBoton="Activar"
          textoEnviando="Activando…"
          accion={() => activarCategoria(categoria.id)}
          alCerrar={() => setDialogo(null)}
          alTerminar={() => terminar('Categoría activada.')}
        >
          <p>Volverá a aparecer para los ciudadanos.</p>
        </DialogoConfirmar>
      )}
    </div>
  )
}
