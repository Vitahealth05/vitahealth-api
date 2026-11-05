/**
 * @file Configuración de la API a partir de variables de entorno.
 */

'use strict';

const crypto = require('node:crypto');
const path = require('node:path');

/** Prefijo común de todos los servicios (permite versionar la API). */
const PREFIJO_API = '/api/v1';

/**
 * Obtiene el secreto de firma de los tokens.
 * En producción es obligatorio; en desarrollo se genera uno temporal.
 * @param {NodeJS.ProcessEnv} entorno
 * @returns {string}
 */
function obtenerSecreto(entorno) {
  if (entorno.JWT_SECRETO) {
    if (entorno.JWT_SECRETO.length < 32) {
      throw new Error('JWT_SECRETO debe tener al menos 32 caracteres.');
    }
    return entorno.JWT_SECRETO;
  }
  if (entorno.NODE_ENV === 'production') {
    throw new Error('Defina la variable de entorno JWT_SECRETO para ejecutar en producción.');
  }
  console.warn('[VitaHealth] JWT_SECRETO no definido: se usa uno temporal; las sesiones se cierran al reiniciar.');
  return crypto.randomBytes(48).toString('hex');
}

/**
 * @param {NodeJS.ProcessEnv} [entorno]
 * @returns {object} Configuración de arranque del servidor.
 */
function cargarConfig(entorno = process.env) {
  return {
    puerto: Number(entorno.PUERTO) || 3001,
    secreto: obtenerSecreto(entorno),
    duracionToken: Number(entorno.JWT_DURACION_SEGUNDOS) || 7200,
    archivoDatos: path.resolve(entorno.ARCHIVO_DATOS || path.join(__dirname, '..', 'data', 'vitahealth.json')),
    origenesCors: (entorno.CORS_ORIGENES || '')
      .split(',')
      .map((origen) => origen.trim())
      .filter(Boolean),
  };
}

module.exports = { PREFIJO_API, cargarConfig };
