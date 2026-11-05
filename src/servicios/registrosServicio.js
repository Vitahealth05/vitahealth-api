/**
 * @file Registros diarios del usuario: actividad física (RF05), hidratación (RF04),
 * comidas (módulo Nutrición) y sueño. Toda consulta o cambio se limita al dueño:
 * un registro de otro usuario se responde como no encontrado.
 */

'use strict';

const crypto = require('node:crypto');

const { errorConflicto, errorNoEncontrado, errorValidacion } = require('../http/errores');
const { Validador } = require('../http/validador');
const { fechaLocal } = require('../fechas');

/** Catálogo de actividades, igual al de database/vitahealth_postgresql.sql. */
const ACTIVIDADES = Object.freeze([
  { id: 1, nombre: 'Caminata', descripcion: 'Caminar a paso moderado', tipo: 'Cardio', caloriasHora: 280 },
  { id: 2, nombre: 'Trote', descripcion: 'Correr a ritmo suave', tipo: 'Cardio', caloriasHora: 600 },
  { id: 3, nombre: 'Ciclismo', descripcion: 'Bicicleta a ritmo moderado', tipo: 'Cardio', caloriasHora: 480 },
  { id: 4, nombre: 'Natación', descripcion: 'Nado continuo', tipo: 'Cardio', caloriasHora: 500 },
  { id: 5, nombre: 'Entrenamiento de fuerza', descripcion: 'Pesas o peso corporal', tipo: 'Fuerza', caloriasHora: 320 },
  { id: 6, nombre: 'Yoga', descripcion: 'Posturas y respiración', tipo: 'Flexibilidad', caloriasHora: 180 },
  { id: 7, nombre: 'Baile', descripcion: 'Rumba, salsa o aeróbicos', tipo: 'Cardio', caloriasHora: 400 },
  { id: 8, nombre: 'Estiramientos', descripcion: 'Rutina de movilidad', tipo: 'Flexibilidad', caloriasHora: 150 },
]);
const META_AGUA_ML = 2000;
const ML_POR_VASO = 250;
const TIPOS_COMIDA = Object.freeze(['desayuno', 'almuerzo', 'cena', 'merienda']);
const CALIDADES_SUENO = Object.freeze(['buena', 'regular', 'mala']);

/** Quita el dueño antes de enviar un registro al cliente. */
const publico = ({ usuarioId, ...resto }) => resto;
const porFechaDesc = (a, b) => b.fecha.localeCompare(a.fecha);

/** Calorías = calorías por hora × minutos / 60, con dos decimales. */
function calcularCalorias(caloriasHora, minutos) {
  return Math.round((caloriasHora * minutos * 100) / 60) / 100;
}

/** Resumen de agua de un día. */
function resumirAgua(registros) {
  const totalMl = registros.reduce((suma, registro) => suma + registro.cantidadMl, 0);
  return {
    totalMl,
    metaMl: META_AGUA_ML,
    vasos: Math.floor(totalMl / ML_POR_VASO),
    porcentaje: Math.min(100, Math.round((totalMl * 100) / META_AGUA_ML)),
  };
}

class RegistrosServicio {
  constructor({ repositorio, reloj }) {
    this.repositorio = repositorio;
    this.reloj = reloj;
  }

  hoy() {
    return fechaLocal(this.reloj());
  }

  /** Lee el rango desde/hasta de una consulta. */
  #rango(consulta) {
    const rango = new Validador(consulta).fecha('desde').fecha('hasta').resultado();
    if (rango.desde && rango.hasta && rango.desde > rango.hasta) {
      throw errorValidacion(['"desde" no puede ser posterior a "hasta".']);
    }
    return rango;
  }

  /** Lista los registros del usuario en un rango, del más reciente al más antiguo. */
  #listar(coleccion, usuario, consulta) {
    const { desde, hasta } = this.#rango(consulta);
    return this.repositorio
      .filtrar(
        coleccion,
        (registro) =>
          registro.usuarioId === usuario.id && (!desde || registro.fecha >= desde) && (!hasta || registro.fecha <= hasta),
      )
      .sort(porFechaDesc)
      .map(publico);
  }

  /** Elimina un registro propio. */
  #eliminar(coleccion, usuario, id, recurso) {
    const eliminado = this.repositorio.eliminar(coleccion, (registro) => registro.id === id && registro.usuarioId === usuario.id);
    if (!eliminado) throw errorNoEncontrado(recurso);
  }

  /** Valida una fecha opcional (por defecto hoy, nunca futura). */
  #fechaDe(validador) {
    validador.fecha('fecha', { hasta: this.hoy() });
    return validador;
  }

  // ---------- Actividad física (HU05) ----------

  listarActividad(usuario, consulta) {
    return this.#listar('registrosActividad', usuario, consulta);
  }

  registrarActividad(usuario, cuerpo) {
    const datos = this.#fechaDe(new Validador(cuerpo))
      .numero('actividadId', { obligatorio: true, min: 1, max: ACTIVIDADES.length, entero: true })
      .numero('duracionMinutos', { obligatorio: true, min: 1, max: 600, entero: true })
      .resultado();
    const actividad = ACTIVIDADES.find((candidata) => candidata.id === datos.actividadId);
    const registro = this.repositorio.insertar('registrosActividad', {
      id: crypto.randomUUID(),
      usuarioId: usuario.id,
      actividadId: actividad.id,
      actividad: actividad.nombre,
      fecha: datos.fecha || this.hoy(),
      duracionMinutos: datos.duracionMinutos,
      caloriasQuemadas: calcularCalorias(actividad.caloriasHora, datos.duracionMinutos),
    });
    return publico(registro);
  }

  eliminarActividad(usuario, id) {
    this.#eliminar('registrosActividad', usuario, id, 'Registro de actividad');
  }

  // ---------- Hidratación (HU04) ----------

  /** Registros y resumen de un día. */
  consultarAgua(usuario, consulta) {
    const { fecha = this.hoy() } = new Validador(consulta).fecha('fecha').resultado();
    const registros = this.repositorio.filtrar('hidratacion', (registro) => registro.usuarioId === usuario.id && registro.fecha === fecha);
    return { fecha, ...resumirAgua(registros), registros: registros.map(publico) };
  }

  registrarAgua(usuario, cuerpo) {
    const datos = this.#fechaDe(new Validador(cuerpo)).numero('cantidadMl', { obligatorio: true, min: 50, max: 3000, entero: true }).resultado();
    const fecha = datos.fecha || this.hoy();
    this.repositorio.insertar('hidratacion', { id: crypto.randomUUID(), usuarioId: usuario.id, fecha, cantidadMl: datos.cantidadMl });
    return this.consultarAgua(usuario, { fecha });
  }

  /** Deshace el último registro de agua del día. */
  deshacerAgua(usuario, consulta) {
    const { fecha = this.hoy() } = new Validador(consulta).fecha('fecha').resultado();
    const delDia = this.repositorio.filtrar('hidratacion', (registro) => registro.usuarioId === usuario.id && registro.fecha === fecha);
    if (delDia.length === 0) throw errorNoEncontrado('Registro de agua');
    const { id } = delDia[delDia.length - 1];
    this.repositorio.eliminar('hidratacion', (registro) => registro.id === id);
    return this.consultarAgua(usuario, { fecha });
  }

  // ---------- Comidas ----------

  listarComidas(usuario, consulta) {
    return this.#listar('comidas', usuario, consulta);
  }

  registrarComida(usuario, cuerpo) {
    const datos = this.#fechaDe(new Validador(cuerpo))
      .opcion('tipo', TIPOS_COMIDA, { obligatorio: true })
      .texto('descripcion', { obligatorio: true, max: 120 })
      .numero('calorias', { obligatorio: true, min: 0, max: 5000 })
      .resultado();
    const comida = this.repositorio.insertar('comidas', {
      id: crypto.randomUUID(),
      usuarioId: usuario.id,
      ...datos,
      fecha: datos.fecha || this.hoy(),
    });
    return publico(comida);
  }

  actualizarComida(usuario, id, cuerpo) {
    const comida = this.repositorio.buscar('comidas', (registro) => registro.id === id && registro.usuarioId === usuario.id);
    if (!comida) throw errorNoEncontrado('Comida');
    const cambios = this.#fechaDe(new Validador(cuerpo))
      .opcion('tipo', TIPOS_COMIDA)
      .texto('descripcion', { max: 120 })
      .numero('calorias', { min: 0, max: 5000 })
      .resultado();
    Object.assign(comida, cambios);
    this.repositorio.guardar();
    return publico(comida);
  }

  eliminarComida(usuario, id) {
    this.#eliminar('comidas', usuario, id, 'Comida');
  }

  // ---------- Sueño ----------

  listarSueno(usuario, consulta) {
    return this.#listar('sueno', usuario, consulta);
  }

  /** Solo se admite un registro de sueño por día. */
  registrarSueno(usuario, cuerpo) {
    const datos = this.#fechaDe(new Validador(cuerpo))
      .numero('horas', { obligatorio: true, min: 0.5, max: 24 })
      .opcion('calidad', CALIDADES_SUENO)
      .resultado();
    const fecha = datos.fecha || this.hoy();
    if (this.repositorio.buscar('sueno', (registro) => registro.usuarioId === usuario.id && registro.fecha === fecha)) {
      throw errorConflicto('Ya hay un registro de sueño para esa fecha');
    }
    const registro = this.repositorio.insertar('sueno', {
      id: crypto.randomUUID(),
      usuarioId: usuario.id,
      fecha,
      horas: datos.horas,
      calidad: datos.calidad ?? null,
    });
    return publico(registro);
  }

  eliminarSueno(usuario, id) {
    this.#eliminar('sueno', usuario, id, 'Registro de sueño');
  }
}

module.exports = { RegistrosServicio, ACTIVIDADES, TIPOS_COMIDA, CALIDADES_SUENO, calcularCalorias, resumirAgua };
