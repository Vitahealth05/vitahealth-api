/**
 * @file Hábitos saludables (HU08 a HU13). Parte del módulo de vitahealth-habitos,
 * ahora con hábitos por usuario y progreso correcto para hábitos semanales.
 */

'use strict';

const crypto = require('node:crypto');

const { errorNoEncontrado } = require('../http/errores');
const { Validador } = require('../http/validador');
const { fechaLocal, lunesDe, sumarDias } = require('../fechas');

const CATEGORIAS = Object.freeze(['hidratacion', 'actividad_fisica', 'sueno', 'alimentacion', 'bienestar']);
const FRECUENCIAS = Object.freeze(['diaria', 'semanal']);

/**
 * Agrupa los registros por periodo: día en los diarios, lunes de la semana en los semanales.
 * @returns {Map<string, number>} Cantidad acumulada por inicio de periodo.
 */
function acumularPorPeriodo(habito) {
  const totales = new Map();
  for (const { fecha, cantidad } of habito.registros) {
    const periodo = habito.frecuencia === 'semanal' ? lunesDe(fecha) : fecha;
    totales.set(periodo, (totales.get(periodo) || 0) + cantidad);
  }
  return totales;
}

/**
 * Progreso del periodo actual y racha de periodos seguidos con la meta cumplida.
 * Si el periodo actual aún no se cumple, la racha se cuenta desde el anterior.
 * @param {object} habito
 * @param {string} hoy AAAA-MM-DD
 * @returns {object}
 */
function calcularResumen(habito, hoy) {
  const semanal = habito.frecuencia === 'semanal';
  const paso = semanal ? 7 : 1;
  const actual = semanal ? lunesDe(hoy) : hoy;
  const totales = acumularPorPeriodo(habito);
  const cumplido = (periodo) => (totales.get(periodo) || 0) >= habito.meta;

  let cursor = cumplido(actual) ? actual : sumarDias(actual, -paso);
  let racha = 0;
  while (cumplido(cursor)) {
    racha += 1;
    cursor = sumarDias(cursor, -paso);
  }

  const cantidad = totales.get(actual) || 0;
  return {
    periodo: semanal ? 'semana' : 'dia',
    cantidad,
    porcentaje: Math.min(100, Math.round((cantidad / habito.meta) * 100)),
    metaCumplida: cumplido(actual),
    racha,
  };
}

class HabitoServicio {
  constructor({ repositorio, reloj }) {
    this.repositorio = repositorio;
    this.reloj = reloj;
  }

  hoy() {
    return fechaLocal(this.reloj());
  }

  /** Une el hábito con su resumen y quita el dueño. */
  #publico({ usuarioId, ...habito }) {
    return { ...habito, resumen: calcularResumen(habito, this.hoy()) };
  }

  #propio(usuario, id) {
    const habito = this.repositorio.buscar('habitos', (candidato) => candidato.id === id && candidato.usuarioId === usuario.id);
    if (!habito) throw errorNoEncontrado('Hábito');
    return habito;
  }

  listar(usuario, consulta) {
    const { categoria } = new Validador(consulta).opcion('categoria', CATEGORIAS).resultado();
    return this.repositorio
      .filtrar('habitos', (habito) => habito.usuarioId === usuario.id && (!categoria || habito.categoria === categoria))
      .map((habito) => this.#publico(habito));
  }

  obtener(usuario, id) {
    return this.#publico(this.#propio(usuario, id));
  }

  /** Reglas comunes de crear y actualizar. */
  #validar(cuerpo, obligatorio) {
    return new Validador(cuerpo)
      .texto('nombre', { obligatorio, max: 60 })
      .opcion('categoria', CATEGORIAS, { obligatorio })
      .opcion('frecuencia', FRECUENCIAS, { obligatorio })
      .numero('meta', { obligatorio, min: 0.01, max: 100000 })
      .texto('descripcion', { max: 200, nulo: true })
      .texto('unidad', { max: 20 });
  }

  crear(usuario, cuerpo) {
    const datos = this.#validar(cuerpo, true).resultado();
    const habito = this.repositorio.insertar('habitos', {
      id: crypto.randomUUID(),
      usuarioId: usuario.id,
      descripcion: null,
      unidad: 'veces',
      ...datos,
      activo: true,
      fechaCreacion: this.reloj().toISOString(),
      registros: [],
    });
    return this.#publico(habito);
  }

  /** Solo cambian los campos enviados; el historial se conserva. */
  actualizar(usuario, id, cuerpo) {
    const habito = this.#propio(usuario, id);
    const cambios = this.#validar(cuerpo, false).booleano('activo').resultado();
    Object.assign(habito, cambios);
    this.repositorio.guardar();
    return this.#publico(habito);
  }

  eliminar(usuario, id) {
    this.#propio(usuario, id);
    this.repositorio.eliminar('habitos', (habito) => habito.id === id);
  }

  /** Suma el avance de un día; no acepta fechas futuras. */
  registrarCumplimiento(usuario, id, cuerpo) {
    const habito = this.#propio(usuario, id);
    const hoy = this.hoy();
    const { cantidad, fecha = hoy } = new Validador(cuerpo)
      .numero('cantidad', { obligatorio: true, min: 0.01, max: 100000 })
      .fecha('fecha', { hasta: hoy })
      .resultado();
    const existente = habito.registros.find((registro) => registro.fecha === fecha);
    if (existente) existente.cantidad += cantidad;
    else {
      habito.registros.push({ fecha, cantidad });
      habito.registros.sort((a, b) => a.fecha.localeCompare(b.fecha));
    }
    this.repositorio.guardar();
    return this.#publico(habito);
  }
}

module.exports = { HabitoServicio, CATEGORIAS, FRECUENCIAS, calcularResumen };
