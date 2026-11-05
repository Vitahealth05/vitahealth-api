/**
 * @file Persistencia en un archivo JSON. Cada escritura va a un archivo temporal
 * y luego lo renombra, para no dañar los datos si el proceso se interrumpe.
 * Los servicios solo usan estos métodos, así que puede cambiarse por PostgreSQL
 * (el esquema está en vitahealth-web) sin tocar las demás capas.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const COLECCIONES = ['usuarios', 'perfiles', 'registrosActividad', 'hidratacion', 'comidas', 'sueno', 'habitos', 'tokensRevocados'];

class Repositorio {
  /** @param {string} archivo Ruta del archivo de datos. */
  constructor(archivo) {
    this.archivo = archivo;
    this.datos = Object.fromEntries(COLECCIONES.map((coleccion) => [coleccion, []]));
    if (fs.existsSync(archivo)) Object.assign(this.datos, JSON.parse(fs.readFileSync(archivo, 'utf8')));
  }

  /** @returns {object[]} Elementos que cumplen la condición. */
  filtrar(coleccion, condicion = () => true) {
    return this.datos[coleccion].filter(condicion);
  }

  /** @returns {object|undefined} Primer elemento que cumple la condición. */
  buscar(coleccion, condicion) {
    return this.datos[coleccion].find(condicion);
  }

  /** @returns {object} El elemento insertado. */
  insertar(coleccion, elemento) {
    this.datos[coleccion].push(elemento);
    this.guardar();
    return elemento;
  }

  /** @returns {boolean} true si se eliminó algún elemento. */
  eliminar(coleccion, condicion) {
    const antes = this.datos[coleccion].length;
    this.datos[coleccion] = this.datos[coleccion].filter((elemento) => !condicion(elemento));
    const cambio = this.datos[coleccion].length !== antes;
    if (cambio) this.guardar();
    return cambio;
  }

  /** Escribe todas las colecciones en disco. */
  guardar() {
    fs.mkdirSync(path.dirname(this.archivo), { recursive: true });
    const temporal = `${this.archivo}.tmp`;
    fs.writeFileSync(temporal, JSON.stringify(this.datos, null, 2));
    fs.renameSync(temporal, this.archivo);
  }
}

module.exports = { Repositorio };
