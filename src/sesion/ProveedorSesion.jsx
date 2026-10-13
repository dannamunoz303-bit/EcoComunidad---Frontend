import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import cliente, { EVENTO_SESION_CERRADA } from '../api/cliente.js'
import {
  bienvenidaPendiente,
  borrarSesion,
  descartarBienvenida,
  guardarSesion,
  haySesion,
  marcarBienvenidaPendiente,
} from '../api/sesion.js'
import { ContextoSesion } from './contexto.js'
import { MENSAJES, mensajePorEstado } from './mensajes.js'

const esAdministrador = (usuario) => usuario?.rol === 'administrador'

// Sesión del administrador. Los tokens viven en localStorage (api/sesion.js);
// aquí se guarda el usuario de /auth/yo/, si se está comprobando la sesión
// y el motivo por el que se cerró (se muestra en /login).
export default function ProveedorSesion({ children }) {
  const [usuario, setUsuario] = useState(null)
  // Si hay tokens se empieza cargando: así no aparece el login un instante.
  const [cargando, setCargando] = useState(haySesion)
  const [motivo, setMotivo] = useState(null)
  const [conBienvenida, setConBienvenida] = useState(bienvenidaPendiente)

  const limpiar = useCallback((nuevoMotivo = null) => {
    borrarSesion()
    setUsuario(null)
    setConBienvenida(false)
    setCargando(false)
    setMotivo(nuevoMotivo)
  }, [])

  // Al abrir la app: si hay tokens, se comprueba la sesión con /auth/yo/.
  useEffect(() => {
    if (!haySesion()) return undefined
    const control = new AbortController()
    cliente
      .get('/auth/yo/', { signal: control.signal })
      .then(({ data }) => {
        if (esAdministrador(data)) setUsuario(data)
        else limpiar(MENSAJES.soloAdministradores)
      })
      .catch((error) => {
        if (axios.isCancel(error)) return
        // 401 sin refresh posible y 403 de estado ya llegan por "sesion-cerrada".
        if (!error.response) setMotivo(MENSAJES.sinConexion)
      })
      .finally(() => {
        if (!control.signal.aborted) setCargando(false)
      })
    return () => control.abort()
  }, [limpiar])

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

  const cerrarBienvenida = useCallback(() => {
    descartarBienvenida()
    setConBienvenida(false)
  }, [])

  const valor = useMemo(
    () => ({ usuario, cargando, motivo, conBienvenida, iniciarSesion, cerrarSesion, cerrarBienvenida }),
    [usuario, cargando, motivo, conBienvenida, iniciarSesion, cerrarSesion, cerrarBienvenida],
  )

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>
}
