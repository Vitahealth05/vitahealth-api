/**
 * @file Errores de la aplicación. Cada uno conoce su código HTTP, y el servidor
 * los convierte en una respuesta { ok: false, mensaje, detalles? }.
 */

'use strict';

class ErrorApi extends Error {
  /**
   * @param {number} estado Código HTTP.
   * @param {string} mensaje Mensaje para el cliente.
   * @param {string[]} [detalles] Lista de problemas concretos.
   */
  constructor(estado, mensaje, detalles) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estado = estado;
    this.detalles = detalles;
  }
}

const errorValidacion = (detalles) => new ErrorApi(400, 'Los datos enviados no son válidos', detalles);
const errorNoAutenticado = (mensaje = 'Debe iniciar sesión para usar este servicio') => new ErrorApi(401, mensaje);
const errorNoEncontrado = (recurso = 'Recurso') => new ErrorApi(404, `${recurso} no encontrado`);
const errorConflicto = (mensaje) => new ErrorApi(409, mensaje);

module.exports = { ErrorApi, errorValidacion, errorNoAutenticado, errorNoEncontrado, errorConflicto };
