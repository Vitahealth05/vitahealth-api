/**
 * @file Progreso y estadísticas (RF06): combina los datos de los demás módulos.
 */

'use strict';

const { Validador } = require('../http/validador');
const { errorValidacion } = require('../http/errores');
const { fechaLocal, sumarDias } = require('../fechas');
const { resumirAgua } = require('./registrosServicio');
const { calcularResumen } = require('./habitoServicio');

const sumar = (lista, campo) => Math.round(lista.reduce((suma, elemento) => suma + elemento[campo], 0) * 100) / 100;

class EstadisticasServicio {
  constructor({ repositorio, reloj }) {
    this.repositorio = repositorio;
    this.reloj = reloj;
  }

  /** Totales de un usuario en una fecha. */
  #totalesDia(usuario, fecha) {
    const delDia = (coleccion) =>
      this.repositorio.filtrar(coleccion, (registro) => registro.usuarioId === usuario.id && registro.fecha === fecha);
    const actividad = delDia('registrosActividad');
    return {
      fecha,
      minutosActividad: sumar(actividad, 'duracionMinutos'),
      caloriasQuemadas: sumar(actividad, 'caloriasQuemadas'),
      caloriasConsumidas: sumar(delDia('comidas'), 'calorias'),
      aguaMl: sumar(delDia('hidratacion'), 'cantidadMl'),
      horasSueno: sumar(delDia('sueno'), 'horas'),
    };
  }

  /** HU03: panel de un día, incluido el avance de los hábitos activos. */
  resumenDia(usuario, consulta) {
    const hoy = fechaLocal(this.reloj());
    const { fecha = hoy } = new Validador(consulta).fecha('fecha').resultado();
    const totales = this.#totalesDia(usuario, fecha);
    const agua = resumirAgua(
      this.repositorio.filtrar('hidratacion', (registro) => registro.usuarioId === usuario.id && registro.fecha === fecha),
    );
    const habitos = this.repositorio.filtrar('habitos', (habito) => habito.usuarioId === usuario.id && habito.activo);
    return {
      ...totales,
      vasos: agua.vasos,
      porcentajeAgua: agua.porcentaje,
      habitos: {
        activos: habitos.length,
        cumplidos: habitos.filter((habito) => calcularResumen(habito, fecha).metaCumplida).length,
      },
    };
  }

  /** HU03: los 7 días que terminan en la fecha indicada (hoy por defecto). */
  semana(usuario, consulta) {
    const hoy = fechaLocal(this.reloj());
    const { hasta = hoy } = new Validador(consulta).fecha('hasta').resultado();
    if (hasta > hoy) throw errorValidacion(['"hasta" no puede ser una fecha futura.']);
    const dias = [];
    for (let i = 6; i >= 0; i -= 1) dias.push(this.#totalesDia(usuario, sumarDias(hasta, -i)));
    const campos = ['minutosActividad', 'caloriasQuemadas', 'caloriasConsumidas', 'aguaMl', 'horasSueno'];
    return {
      desde: dias[0].fecha,
      hasta,
      dias,
      totales: Object.fromEntries(campos.map((campo) => [campo, sumar(dias, campo)])),
    };
  }
}

module.exports = { EstadisticasServicio };
