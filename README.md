# EcoComunidad · Panel del administrador

Panel web del administrador de EcoComunidad. React + Vite (JavaScript), conectado al backend Django REST.

## Instalar y correr

```bash
npm install
cp .env.example .env   # si aún no tienes .env
npm run dev            # http://localhost:5173
```

Otros comandos: `npm run lint`, `npm test`, `npm run build`, `npm run preview`.

## Variable de entorno

| Variable | Qué es | Valor |
| --- | --- | --- |
| `VITE_API_URL` | URL base de la API (sin `/` final) | `https://ecocomunidad-backend-production.up.railway.app/api` |

`.env` no se sube al repositorio; `.env.example` sí.

## Estructura

```
src/
  api/          cliente axios (token, refresh, cierre de sesión) y sesion.js (tokens en localStorage)
  marca/        Logo, LogoAnimado, Brotico, NombreMarca y los SVG de la marca
  styles/       tokens.css (colores, radios, espacios, sombras) y base.css
  sesion/       contexto de sesión (usuario de /auth/yo/), rutas protegidas y mensajes del login
  paginas/      una página por ruta
  componentes/  diseño del panel (barras lateral y superior), secciones y piezas reutilizables
  utilidades/   formato de fechas en hora de Colombia
  pruebas/      configuración de vitest
docs/           documento del proyecto y guía de marca (fuente de verdad del diseño)
```

## Rutas

- `/login`: inicio de sesión. Con sesión de administrador lleva a `/`.
- Protegidas (solo administradores; sin sesión llevan a `/login`): `/` (Resumen), `/reportes`, `/tareas`, `/usuarios`, `/categorias`, `/novedades`, `/sanciones`, `/seguimiento`, `/notificaciones`.
- `/marca`: muestra de la marca, **solo en desarrollo**.
- Cualquier otra: página 404.

## Sesión

Si el backend responde 401, el cliente intenta un refresh (uno solo aunque fallen varias peticiones a la vez) y repite la petición. Si el refresh falla, o el backend responde 403 con `code` de estado (`usuario_inactivo`, `usuario_bloqueado`, `usuario_bloqueado_permanente`), se borran los tokens y se lanza el evento `sesion-cerrada` en `window` (con `detail.mensaje`, `detail.code` y `detail.bloqueadoHasta`). El contexto de sesión lo escucha y lleva a `/login` con el motivo.
