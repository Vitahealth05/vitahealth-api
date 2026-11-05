/**
 * @file Utilidades de fechas en formato AAAA-MM-DD. Las operaciones se hacen en
 * UTC para que los cambios de horario no alteren el conteo de días.
 */

'use strict';

/** @returns {string} Fecha local AAAA-MM-DD de un objeto Date. */
function fechaLocal(fecha) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** @returns {boolean} true si es texto AAAA-MM-DD y la fecha existe (rechaza 2026-02-31). */
function esFechaValida(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().startsWith(valor);
}

/** @returns {string} La fecha desplazada n días. */
function sumarDias(fecha, dias) {
  const resultado = new Date(`${fecha}T00:00:00Z`);
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return resultado.toISOString().slice(0, 10);
}

/** @returns {string} El lunes de la semana de la fecha. */
function lunesDe(fecha) {
  const diaSemana = new Date(`${fecha}T00:00:00Z`).getUTCDay();
  return sumarDias(fecha, -((diaSemana + 6) % 7));
}

/** @returns {string} La misma fecha n años antes. */
function restarAnios(fecha, anios) {
  return `${String(Number(fecha.slice(0, 4)) - anios).padStart(4, '0')}${fecha.slice(4)}`;
}

module.exports = { fechaLocal, esFechaValida, sumarDias, lunesDe, restarAnios };
