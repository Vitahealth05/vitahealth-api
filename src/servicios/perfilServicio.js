/**
 * @file Perfil del usuario e IMC (RF03, RF08).
 */

'use strict';

const { Validador } = require('../http/validador');
const { fechaLocal, restarAnios } = require('../fechas');
const { usuarioPublico } = require('./authServicio');

/** @returns {number|null} IMC con un decimal. */
function calcularImc(pesoKg, alturaCm) {
  if (!pesoKg || !alturaCm) return null;
  const metros = alturaCm / 100;
  return Math.round((pesoKg / (metros * metros)) * 10) / 10;
}

/** @returns {string} Clasificación del IMC según la OMS. */
function clasificarImc(imc) {
  if (imc === null) return 'Sin datos';
  if (imc < 18.5) return 'Bajo peso';
  if (imc < 25) return 'Peso saludable';
  if (imc < 30) return 'Sobrepeso';
  return 'Obesidad';
}

class PerfilServicio {
  constructor({ repositorio, reloj }) {
    this.repositorio = repositorio;
    this.reloj = reloj;
  }

  /** @returns {object} Usuario, medidas e IMC calculado. */
  obtener(usuario) {
    const perfil = this.repositorio.buscar('perfiles', (candidato) => candidato.usuarioId === usuario.id) || {};
    const pesoKg = perfil.pesoKg ?? null;
    const alturaCm = perfil.alturaCm ?? null;
    const imc = calcularImc(pesoKg, alturaCm);
    return {
      ...usuarioPublico(usuario),
      fechaNacimiento: perfil.fechaNacimiento ?? null,
      pesoKg,
      alturaCm,
      objetivo: perfil.objetivo ?? null,
      imc,
      clasificacionImc: clasificarImc(imc),
    };
  }

  /** HU06: actualiza solo los campos enviados; null borra un dato opcional. */
  actualizar(usuario, cuerpo) {
    const edadMinima = restarAnios(fechaLocal(this.reloj()), 13);
    const cambios = new Validador(cuerpo)
      .texto('nombre', { max: 80 })
      .texto('apellido', { max: 80 })
      .fecha('fechaNacimiento', { hasta: edadMinima, nulo: true, mensajeHasta: 'La edad mínima es de 13 años.' })
      .numero('pesoKg', { min: 20, max: 400, nulo: true })
      .numero('alturaCm', { min: 50, max: 250, nulo: true })
      .texto('objetivo', { max: 120, nulo: true })
      .resultado();

    const { nombre, apellido, ...medidas } = cambios;
    if (nombre) usuario.nombre = nombre;
    if (apellido) usuario.apellido = apellido;

    let perfil = this.repositorio.buscar('perfiles', (candidato) => candidato.usuarioId === usuario.id);
    if (!perfil) {
      perfil = { usuarioId: usuario.id };
      this.repositorio.datos.perfiles.push(perfil);
    }
    Object.assign(perfil, medidas);
    this.repositorio.guardar();
    return this.obtener(usuario);
  }
}

module.exports = { PerfilServicio, calcularImc, clasificarImc };
