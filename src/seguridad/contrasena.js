/**
 * @file Cifrado de contraseñas con PBKDF2-HMAC-SHA256 y sal aleatoria.
 * Usa el formato de PasswordUtil de vitahealth-web: iteraciones:salBase64:hashBase64.
 */

'use strict';

const crypto = require('node:crypto');
const { promisify } = require('node:util');

const pbkdf2 = promisify(crypto.pbkdf2);
const ITERACIONES = 210000;
const BYTES_CLAVE = 32;

/** @returns {Promise<string>} Valor seguro para guardar. */
async function cifrarContrasena(contrasena) {
  const sal = crypto.randomBytes(16);
  const hash = await pbkdf2(contrasena, sal, ITERACIONES, BYTES_CLAVE, 'sha256');
  return `${ITERACIONES}:${sal.toString('base64')}:${hash.toString('base64')}`;
}

/** @returns {Promise<boolean>} true si la contraseña corresponde (comparación en tiempo constante). */
async function verificarContrasena(contrasena, guardado) {
  const [iteraciones, sal, hash] = guardado.split(':');
  const esperado = Buffer.from(hash, 'base64');
  const calculado = await pbkdf2(contrasena, Buffer.from(sal, 'base64'), Number(iteraciones), esperado.length, 'sha256');
  return crypto.timingSafeEqual(esperado, calculado);
}

module.exports = { cifrarContrasena, verificarContrasena };
