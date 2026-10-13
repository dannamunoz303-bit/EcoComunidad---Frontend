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
  paginas/      una página por ruta
  componentes/  componentes reutilizables de la interfaz
  pruebas/      configuración de vitest
docs/           documento del proyecto y guía de marca (fuente de verdad del diseño)
```

## Rutas

- `/login`: inicio de sesión (por ahora solo el logo animado).
- `/marca`: muestra de la marca, **solo en desarrollo**.
- Cualquier otra: página 404.

## Sesión

Si el backend responde 401, el cliente intenta un refresh (uno solo aunque fallen varias peticiones a la vez) y repite la petición. Si el refresh falla, o el backend responde 403 porque el usuario está inactivo o bloqueado, se borran los tokens y se lanza el evento `sesion-cerrada` en `window` (con `detail.mensaje`).
