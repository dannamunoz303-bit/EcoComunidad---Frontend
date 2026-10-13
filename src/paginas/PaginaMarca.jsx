import { RotateCcw } from 'lucide-react'
import { useState } from 'react'
import Brotico from '../marca/Brotico.jsx'
import Logo from '../marca/Logo.jsx'
import LogoAnimado from '../marca/LogoAnimado.jsx'
import './paginas.css'

// Página de revisión de la marca. Solo existe en desarrollo (ver App.jsx).

const VARIANTES = [
  { variante: 'color', titulo: 'Color', clase: '' },
  { variante: 'sobre-verde', titulo: 'Sobre verde', clase: 'muestra--verde sobre-verde' },
  { variante: 'un-color', titulo: 'Un color', clase: 'muestra--un-color' },
]

const TAMANOS = [96, 48, 24]

const ESTADOS = [
  { estado: 'saluda', uso: 'Bienvenida tras iniciar sesión', texto: '¡Hola de nuevo! Tu barrio te está esperando.' },
  { estado: 'triste', uso: 'Listas vacías o sin resultados', texto: 'No encontramos reportes con esos filtros. Prueba con otros.' },
  { estado: 'florece', uso: 'Un reporte queda resuelto', texto: '¡Un lugar más limpio! Gracias al trabajo del equipo.' },
  { estado: 'piensa', uso: 'Cargas largas (más de 1 s)', texto: 'Revisando los reportes del barrio…' },
]

const COLORES = [
  ['verde-bosque', '#1E5A3A', 'Verde principal'],
  ['verde-hoja', '#3E9B63', 'Acentos, gráficas'],
  ['verde-musgo', '#3B7A55', 'Texto suave, "Eco"'],
  ['verde-brote', '#A8D9B8', 'Detalles sobre verde oscuro'],
  ['verde-brotico', '#5BB37E', 'Cuerpo de Brotico'],
  ['fondo', '#F3F6F1', 'Fondo de la app'],
  ['superficie', '#FFFFFF', 'Tarjetas'],
  ['borde', '#DCE5DF', 'Bordes'],
  ['tinta', '#14211A', 'Texto principal'],
  ['tinta-suave', '#4F5E55', 'Texto secundario'],
  ['pavimento', '#3A4740', 'Pavimento del logo'],
  ['ambar', '#B7791F', 'Alerta / atrasado'],
  ['arcilla', '#B4432B', 'Error / rechazado'],
]

export default function PaginaMarca() {
  const [repeticion, setRepeticion] = useState(0)

  return (
    <main className="pagina-marca">
      <header>
        <Logo conNombre tamano={48} />
        <h1>Revisión de marca</h1>
        <p className="texto-suave">Solo en desarrollo. Fuente: docs/marca/marca.md</p>
      </header>

      <section aria-labelledby="titulo-logo">
        <h2 id="titulo-logo">Logo</h2>
        <div className="rejilla rejilla--3">
          {VARIANTES.map(({ variante, titulo, clase }) => (
            <article key={variante} className={`muestra ${clase}`}>
              <h3>{titulo}</h3>
              <div className="muestra__fila">
                {TAMANOS.map((tamano) => (
                  <Logo key={tamano} variante={variante} tamano={tamano} />
                ))}
              </div>
              <Logo variante={variante} tamano={40} conNombre />
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="titulo-animado">
        <h2 id="titulo-animado">Logo animado</h2>
        <article className="muestra muestra--animado">
          <LogoAnimado key={repeticion} />
          <p key={`f${repeticion}`} className="aparece-formulario texto-suave">
            Aquí aparecerá el formulario
          </p>
          <button type="button" className="boton-principal" onClick={() => setRepeticion((n) => n + 1)}>
            <RotateCcw size={18} aria-hidden="true" />
            Repetir
          </button>
        </article>
      </section>

      <section aria-labelledby="titulo-brotico">
        <h2 id="titulo-brotico">Brotico</h2>
        <div className="rejilla rejilla--4">
          {ESTADOS.map(({ estado, uso, texto }) => (
            <article key={estado} className="muestra muestra--brotico">
              <Brotico estado={estado} />
              <p className="muestra__texto">{texto}</p>
              <p className="texto-suave muestra__uso">{uso}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="titulo-colores">
        <h2 id="titulo-colores">Colores</h2>
        <ul className="rejilla rejilla--colores">
          {COLORES.map(([nombre, hex, uso]) => (
            <li key={nombre} className="color">
              <span className="color__muestra" style={{ background: `var(--${nombre})` }} />
              <span className="color__nombre">--{nombre}</span>
              <span className="color__hex">{hex}</span>
              <span className="texto-suave color__uso">{uso}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
