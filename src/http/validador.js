/**
 * @file Validación de los datos de entrada. Acumula todos los errores para
 * devolverlos juntos. Un campo ausente solo es error si es obligatorio.
 */

'use strict';

const { errorValidacion } = require('./errores');
const { esFechaValida } = require('../fechas');

class Validador {
  /** @param {object} datos Cuerpo JSON o parámetros de consulta. */
  constructor(datos) {
    this.datos = datos;
    this.errores = [];
    this.valores = {};
  }

  /** Lee el campo; registra el error si falta y es obligatorio. */
  #leer(campo, obligatorio, nulo) {
    const valor = this.datos[campo];
    const vacio = valor === undefined || valor === null || valor === '';
    if (vacio) {
      if (obligatorio) this.errores.push(`El campo "${campo}" es obligatorio.`);
      else if (valor !== undefined && nulo) this.valores[campo] = null;
      else if (valor === null || valor === '') this.errores.push(`El campo "${campo}" no puede estar vacío.`);
      return undefined;
    }
    return valor;
  }

  /** Texto recortado con longitud máxima. */
  texto(campo, { obligatorio = false, max = 255, nulo = false } = {}) {
    const valor = this.#leer(campo, obligatorio, nulo);
    if (valor === undefined) return this;
    if (typeof valor !== 'string' || valor.trim() === '') {
      this.errores.push(`El campo "${campo}" debe ser un texto no vacío.`);
    } else if (valor.trim().length > max) {
      this.errores.push(`El campo "${campo}" no puede superar ${max} caracteres.`);
    } else {
      this.valores[campo] = valor.trim();
    }
    return this;
  }

  /** Número dentro de un rango; en consultas admite texto numérico. */
  numero(campo, { obligatorio = false, min, max, entero = false, nulo = false } = {}) {
    const valor = this.#leer(campo, obligatorio, nulo);
    if (valor === undefined) return this;
    if (typeof valor !== 'number' || !Number.isFinite(valor)) {
      this.errores.push(`El campo "${campo}" debe ser un número.`);
    } else if (entero && !Number.isInteger(valor)) {
      this.errores.push(`El campo "${campo}" debe ser un número entero.`);
    } else if ((min !== undefined && valor < min) || (max !== undefined && valor > max)) {
      this.errores.push(`El campo "${campo}" debe estar entre ${min} y ${max}.`);
    } else {
      this.valores[campo] = valor;
    }
    return this;
  }

  /** Fecha real AAAA-MM-DD; con hasta se rechazan las posteriores. */
  fecha(campo, { obligatorio = false, hasta, nulo = false, mensajeHasta } = {}) {
    const valor = this.#leer(campo, obligatorio, nulo);
    if (valor === undefined) return this;
    if (!esFechaValida(valor)) {
      this.errores.push(`El campo "${campo}" debe ser una fecha válida con formato AAAA-MM-DD.`);
    } else if (hasta && valor > hasta) {
      this.errores.push(mensajeHasta || `El campo "${campo}" no puede ser una fecha futura.`);
    } else {
      this.valores[campo] = valor;
    }
    return this;
  }

  /** Valor dentro de una lista cerrada. */
  opcion(campo, opciones, { obligatorio = false, nulo = false } = {}) {
    const valor = this.#leer(campo, obligatorio, nulo);
    if (valor === undefined) return this;
    if (!opciones.includes(valor)) {
      this.errores.push(`El campo "${campo}" debe ser uno de: ${opciones.join(', ')}.`);
    } else {
      this.valores[campo] = valor;
    }
    return this;
  }

  /** Booleano estricto. */
  booleano(campo) {
    const valor = this.#leer(campo, false, false);
    if (valor === undefined) return this;
    if (typeof valor !== 'boolean') this.errores.push(`El campo "${campo}" debe ser true o false.`);
    else this.valores[campo] = valor;
    return this;
  }

  /** Agrega una regla propia. */
  agregarError(mensaje) {
    this.errores.push(mensaje);
    return this;
  }

  /**
   * @returns {object} Solo los campos válidos y permitidos.
   * @throws Error 400 si hubo algún problema.
   */
  resultado() {
    if (this.errores.length > 0) throw errorValidacion(this.errores);
    return this.valores;
  }
}

module.exports = { Validador };
