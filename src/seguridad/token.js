/**
 * @file Tokens JWT firmados con HS256, implementados con node:crypto.
 */

'use strict';

const crypto = require('node:crypto');

const EMISOR = 'vitahealth-api';
const CABECERA = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');

const firmar = (contenido, secreto) => crypto.createHmac('sha256', secreto).update(contenido).digest();

/**
 * @param {string} idUsuario
 * @param {{secreto: string, duracion: number, ahora: Date}} opciones
 * @returns {{token: string, expiraEn: number}}
 */
function emitirToken(idUsuario, { secreto, duracion, ahora }) {
  const iat = Math.floor(ahora.getTime() / 1000);
  const carga = { iss: EMISOR, sub: idUsuario, jti: crypto.randomUUID(), iat, exp: iat + duracion };
  const contenido = `${CABECERA}.${Buffer.from(JSON.stringify(carga)).toString('base64url')}`;
  return { token: `${contenido}.${firmar(contenido, secreto).toString('base64url')}`, expiraEn: duracion };
}

/**
 * Comprueba cabecera, firma, emisor y vencimiento.
 * @returns {object|null} La carga del token, o null si no es válido.
 */
function verificarToken(token, { secreto, ahora }) {
  const partes = String(token).split('.');
  if (partes.length !== 3 || partes[0] !== CABECERA) return null;
  const esperado = firmar(`${partes[0]}.${partes[1]}`, secreto);
  const recibido = Buffer.from(partes[2], 'base64url');
  if (recibido.length !== esperado.length || !crypto.timingSafeEqual(recibido, esperado)) return null;
  try {
    const carga = JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf8'));
    if (carga.iss !== EMISOR || carga.exp <= Math.floor(ahora.getTime() / 1000)) return null;
    return carga;
  } catch {
    return null;
  }
}

module.exports = { emitirToken, verificarToken };
