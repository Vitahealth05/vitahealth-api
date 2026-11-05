/**
 * @file Cuentas y sesiones (RF01, RF02, RNF04).
 */

'use strict';

const crypto = require('node:crypto');

const { ErrorApi, errorConflicto, errorNoAutenticado } = require('../http/errores');
const { Validador } = require('../http/validador');
const { cifrarContrasena, verificarContrasena } = require('../seguridad/contrasena');
const { emitirToken, verificarToken } = require('../seguridad/token');

const PATRON_CORREO = /^[\w.+-]+@[\w-]+(\.[\w-]+)*\.[A-Za-z]{2,}$/;
const MAX_FALLOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000;

/** Datos públicos del usuario: nunca incluye la contraseña. */
const usuarioPublico = ({ id, nombre, apellido, correo, fechaRegistro }) => ({ id, nombre, apellido, correo, fechaRegistro });

class AuthServicio {
  /** @param {{repositorio: object, reloj: Function, secreto: string, duracionToken: number}} dependencias */
  constructor({ repositorio, reloj, secreto, duracionToken }) {
    this.repositorio = repositorio;
    this.reloj = reloj;
    this.secreto = secreto;
    this.duracionToken = duracionToken;
    this.fallos = new Map();
    // Evita revelar por el tiempo de respuesta si un correo existe.
    this.hashSenuelo = cifrarContrasena(crypto.randomBytes(16).toString('hex'));
  }

  /** HU01: crea una cuenta. */
  async registrar(cuerpo) {
    const validador = new Validador(cuerpo)
      .texto('nombre', { obligatorio: true, max: 80 })
      .texto('apellido', { obligatorio: true, max: 80 })
      .texto('correo', { obligatorio: true, max: 120 });
    const { contrasena, confirmacion, aceptaTerminos } = cuerpo;

    if (validador.valores.correo && !PATRON_CORREO.test(validador.valores.correo)) {
      validador.agregarError('El correo no tiene un formato válido.');
    }
    const segura =
      typeof contrasena === 'string' &&
      contrasena.length >= 8 &&
      contrasena.length <= 128 &&
      /\p{L}/u.test(contrasena) &&
      /\d/.test(contrasena);
    if (!segura) validador.agregarError('La contraseña debe tener de 8 a 128 caracteres, con letras y números.');
    if (contrasena !== confirmacion) validador.agregarError('La confirmación no coincide con la contraseña.');
    if (aceptaTerminos !== true) validador.agregarError('Debe aceptar los términos y condiciones.');

    const { nombre, apellido, correo } = validador.resultado();
    const correoNormalizado = correo.toLowerCase();
    const yaExiste = () => this.repositorio.buscar('usuarios', (usuario) => usuario.correo === correoNormalizado);
    if (yaExiste()) throw errorConflicto('Ya existe una cuenta con ese correo');

    const hash = await cifrarContrasena(contrasena);
    // Se repite la consulta: otra petición pudo registrar el correo durante el cifrado.
    if (yaExiste()) throw errorConflicto('Ya existe una cuenta con ese correo');

    const usuario = this.repositorio.insertar('usuarios', {
      id: crypto.randomUUID(),
      nombre,
      apellido,
      correo: correoNormalizado,
      contrasena: hash,
      fechaRegistro: this.reloj().toISOString(),
    });
    return usuarioPublico(usuario);
  }

  /** HU02: valida credenciales y emite un token. El error es genérico a propósito. */
  async iniciarSesion(cuerpo, ip) {
    const { correo, contrasena } = cuerpo;
    if (typeof correo !== 'string' || typeof contrasena !== 'string' || contrasena.length > 128) {
      throw errorNoAutenticado('Correo o contraseña incorrectos');
    }
    const correoNormalizado = correo.trim().toLowerCase();
    const clave = `${ip}|${correoNormalizado}`;
    const ahora = this.reloj().getTime();
    const registroFallos = this.fallos.get(clave);
    if (registroFallos && registroFallos.cantidad >= MAX_FALLOS && registroFallos.hasta > ahora) {
      throw new ErrorApi(429, 'Demasiados intentos fallidos. Intente de nuevo en 15 minutos');
    }

    const usuario = this.repositorio.buscar('usuarios', (candidato) => candidato.correo === correoNormalizado);
    const correcta = await verificarContrasena(contrasena, usuario ? usuario.contrasena : await this.hashSenuelo);
    if (!usuario || !correcta) {
      this.#registrarFallo(clave, ahora);
      throw errorNoAutenticado('Correo o contraseña incorrectos');
    }

    this.fallos.delete(clave);
    const sesion = emitirToken(usuario.id, { secreto: this.secreto, duracion: this.duracionToken, ahora: this.reloj() });
    return { ...sesion, tipo: 'Bearer', usuario: usuarioPublico(usuario) };
  }

  /** Cuenta un intento fallido y limpia los bloqueos vencidos. */
  #registrarFallo(clave, ahora) {
    for (const [otraClave, registro] of this.fallos) {
      if (registro.hasta <= ahora) this.fallos.delete(otraClave);
    }
    const cantidad = (this.fallos.get(clave)?.cantidad || 0) + 1;
    this.fallos.set(clave, { cantidad, hasta: ahora + BLOQUEO_MS });
  }

  /**
   * Comprueba el token de una petición.
   * @returns {{usuario: object, sesion: object}}
   * @throws Error 401 si el token falta, no es válido o fue revocado.
   */
  autenticar(cabecera) {
    const [esquema, token] = String(cabecera || '').split(' ');
    if (esquema !== 'Bearer' || !token) throw errorNoAutenticado();
    const sesion = verificarToken(token, { secreto: this.secreto, ahora: this.reloj() });
    if (!sesion || this.repositorio.buscar('tokensRevocados', (revocado) => revocado.jti === sesion.jti)) {
      throw errorNoAutenticado('La sesión no es válida o ya venció');
    }
    const usuario = this.repositorio.buscar('usuarios', (candidato) => candidato.id === sesion.sub);
    if (!usuario) throw errorNoAutenticado('La sesión no es válida o ya venció');
    return { usuario, sesion };
  }

  /** HU07: revoca el token actual y olvida los que ya vencieron. */
  cerrarSesion({ jti, exp }) {
    const ahora = Math.floor(this.reloj().getTime() / 1000);
    this.repositorio.datos.tokensRevocados = this.repositorio.filtrar('tokensRevocados', (revocado) => revocado.exp > ahora);
    this.repositorio.insertar('tokensRevocados', { jti, exp });
  }
}

module.exports = { AuthServicio, usuarioPublico };
