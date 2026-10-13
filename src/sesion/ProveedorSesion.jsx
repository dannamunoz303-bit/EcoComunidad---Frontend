import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import cliente, { esSinConexion, EVENTO_SESION_CERRADA } from '../api/cliente.js'
import {
  bienvenidaPendiente,
  borrarSesion,
  guardarSesion,
  haySesion,
  marcarBienvenidaPendiente,
  marcarBienvenidaVista,
} from '../api/sesion.js'
import { ContextoSesion } from './contexto.js'
import { MENSAJES, mensajePorEstado } from './mensajes.js'

const esAdministrador = (usuario) => usuario?.rol === 'administrador'

// Sesión del administrador. Los tokens viven en localStorage (api/sesion.js);
// aquí se guarda el usuario de /auth/yo/, si se está comprobando la sesión
// si el servidor no respondió al comprobarla y el motivo por el que se cerró
// (se muestra en /login).
export default function ProveedorSesion({ children }) {
  const [usuario, setUsuario] = useState(null)
  // Si hay tokens se empieza cargando: así no aparece el login un instante.
  const [cargando, setCargando] = useState(haySesion)
  const [motivo, setMotivo] = useState(null)
  // Hay tokens pero el servidor no respondió a /auth/yo/: no se muestra el login.
  const [sinConexion, setSinConexion] = useState(false)
  const [conBienvenida, setConBienvenida] = useState(bienvenidaPendiente)

  const limpiar = useCallback((nuevoMotivo = null) => {
    borrarSesion()
    setUsuario(null)
    setConBienvenida(false)
    setCargando(false)
    setSinConexion(false)
    setMotivo(nuevoMotivo)
  }, [])

  // Comprueba la sesión guardada con /auth/yo/.
  const comprobarSesion = useCallback(
    (signal) =>
      cliente
        .get('/auth/yo/', { signal })
        .then(({ data }) => {
          if (!esAdministrador(data)) return limpiar(MENSAJES.soloAdministradores)
          setUsuario(data)
          setSinConexion(false)
        })
        .catch((error) => {
          if (axios.isCancel(error)) return
          // 401 sin refresh posible y 403 de estado llegan por "sesion-cerrada".
          if (esSinConexion(error)) setSinConexion(true)
        })
        .finally(() => {
          if (!signal?.aborted) setCargando(false)
        }),
    [limpiar],
  )

  // Al abrir la app: si hay tokens, se comprueba la sesión.
  useEffect(() => {
    if (!haySesion()) return undefined
    const control = new AbortController()
    comprobarSesion(control.signal)
    return () => control.abort()
  }, [comprobarSesion])

  // Botón "Reintentar" de la pantalla sin conexión.
  const reintentar = useCallback(() => {
    setCargando(true)
    return comprobarSesion()
  }, [comprobarSesion])

  // El interceptor avisa cuando la sesión se cierra (refresh fallido o 403 de estado).
  useEffect(() => {
    function alCerrarSesion(evento) {
      const { code, bloqueadoHasta, mensaje } = evento.detail ?? {}
      limpiar(mensajePorEstado(code, bloqueadoHasta, mensaje) ?? MENSAJES.sesionVencida)
    }
    window.addEventListener(EVENTO_SESION_CERRADA, alCerrarSesion)
    return () => window.removeEventListener(EVENTO_SESION_CERRADA, alCerrarSesion)
  }, [limpiar])

  // Lanza el error de axios si falla; la pantalla de login lo traduce.
  const iniciarSesion = useCallback(
    async (correo, password) => {
      setMotivo(null)
      const { data: tokens } = await cliente.post('/auth/login/', { correo, password })
      guardarSesion(tokens)
      let yo
      try {
        yo = (await cliente.get('/auth/yo/')).data
      } catch (error) {
        borrarSesion()
        throw error
      }
      if (!esAdministrador(yo)) {
        limpiar(MENSAJES.soloAdministradores)
        return false
      }
      marcarBienvenidaPendiente()
      setConBienvenida(true)
      setUsuario(yo)
      return true
    },
    [limpiar],
  )

  const cerrarSesion = useCallback(() => limpiar(null), [limpiar])

  // La bienvenida cuenta como vista en cuanto aparece.
  const marcarBienvenidaComoVista = useCallback(() => {
    marcarBienvenidaVista()
    setConBienvenida(false)
  }, [])

  const valor = useMemo(
    () => ({
      usuario,
      cargando,
      sinConexion,
      motivo,
      conBienvenida,
      iniciarSesion,
      cerrarSesion,
      reintentar,
      marcarBienvenidaComoVista,
    }),
    [
      usuario,
      cargando,
      sinConexion,
      motivo,
      conBienvenida,
      iniciarSesion,
      cerrarSesion,
      reintentar,
      marcarBienvenidaComoVista,
    ],
  )

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>
}
