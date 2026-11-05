/**
 * @file Enrutador REST mínimo sobre node:http.
 * Asocia método + patrón (por ejemplo /habitos/:id) con un manejador.
 */

'use strict';

class Enrutador {
  constructor() {
    /** @type {{metodo: string, patron: string, segmentos: string[], publica: boolean, manejador: Function}[]} */
    this.rutas = [];
  }

  /**
   * Registra un servicio.
   * @param {string} metodo GET, POST, PUT o DELETE.
   * @param {string} patron Ruta relativa al prefijo de la API.
   * @param {Function} manejador Recibe el contexto y devuelve { estado?, datos? }.
   * @param {{publica?: boolean}} [opciones] publica=true no exige token.
   */
  agregar(metodo, patron, manejador, { publica = false } = {}) {
    this.rutas.push({ metodo, patron, segmentos: patron.split('/').filter(Boolean), publica, manejador });
  }

  /**
   * Busca la ruta que corresponde a una petición.
   * @param {string} metodo
   * @param {string} ruta
   * @returns {{ruta?: object, parametros?: object, permitidos: string[]}}
   */
  resolver(metodo, ruta) {
    const segmentos = ruta.split('/').filter(Boolean);
    const permitidos = [];
    for (const candidata of this.rutas) {
      const parametros = coincidir(candidata.segmentos, segmentos);
      if (!parametros) continue;
      if (candidata.metodo === metodo) return { ruta: candidata, parametros, permitidos };
      permitidos.push(candidata.metodo);
    }
    return { permitidos };
  }
}

/**
 * @param {string[]} patron
 * @param {string[]} segmentos
 * @returns {object|null} Parámetros de la ruta, o null si no coincide.
 */
function coincidir(patron, segmentos) {
  if (patron.length !== segmentos.length) return null;
  const parametros = {};
  for (let i = 0; i < patron.length; i += 1) {
    if (patron[i].startsWith(':')) parametros[patron[i].slice(1)] = segmentos[i];
    else if (patron[i] !== segmentos[i]) return null;
  }
  return parametros;
}

module.exports = { Enrutador };
