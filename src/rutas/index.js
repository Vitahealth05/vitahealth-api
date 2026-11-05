/**
 * @file Catálogo de servicios REST: conecta cada ruta con su caso de uso.
 * El detalle de cada servicio está en docs/SERVICIOS.md.
 */

'use strict';

const { Enrutador } = require('../http/enrutador');
const { ACTIVIDADES, TIPOS_COMIDA, CALIDADES_SUENO } = require('../servicios/registrosServicio');
const { CATEGORIAS, FRECUENCIAS } = require('../servicios/habitoServicio');

const creado = (datos) => ({ estado: 201, datos });
const sinContenido = () => ({ estado: 204 });

/**
 * @param {{auth: object, perfil: object, registros: object, habitos: object, estadisticas: object}} servicios
 * @param {Function} reloj
 * @returns {Enrutador}
 */
function crearRutas({ auth, perfil, registros, habitos, estadisticas }, reloj) {
  const r = new Enrutador();
  const publica = { publica: true };

  // Generales
  r.agregar('GET', '/salud', () => ({ datos: { servicio: 'vitahealth-api', version: '1.0.0', fecha: reloj().toISOString() } }), publica);
  r.agregar(
    'GET',
    '/catalogos',
    () => ({ datos: { categoriasHabito: CATEGORIAS, frecuenciasHabito: FRECUENCIAS, tiposComida: TIPOS_COMIDA, calidadesSueno: CALIDADES_SUENO } }),
    publica,
  );

  // Cuentas y sesiones
  r.agregar('POST', '/auth/registro', async ({ cuerpo }) => creado(await auth.registrar(cuerpo)), publica);
  r.agregar('POST', '/auth/login', async ({ cuerpo, ip }) => ({ datos: await auth.iniciarSesion(cuerpo, ip) }), publica);
  r.agregar('POST', '/auth/logout', ({ sesion }) => {
    auth.cerrarSesion(sesion);
    return sinContenido();
  });

  // Perfil
  r.agregar('GET', '/perfil', ({ usuario }) => ({ datos: perfil.obtener(usuario) }));
  r.agregar('PUT', '/perfil', ({ usuario, cuerpo }) => ({ datos: perfil.actualizar(usuario, cuerpo) }));

  // Actividad física
  r.agregar('GET', '/actividades', () => ({ datos: ACTIVIDADES }));
  r.agregar('GET', '/registros-actividad', ({ usuario, consulta }) => ({ datos: registros.listarActividad(usuario, consulta) }));
  r.agregar('POST', '/registros-actividad', ({ usuario, cuerpo }) => creado(registros.registrarActividad(usuario, cuerpo)));
  r.agregar('DELETE', '/registros-actividad/:id', ({ usuario, parametros }) => {
    registros.eliminarActividad(usuario, parametros.id);
    return sinContenido();
  });

  // Hidratación
  r.agregar('GET', '/hidratacion', ({ usuario, consulta }) => ({ datos: registros.consultarAgua(usuario, consulta) }));
  r.agregar('POST', '/hidratacion', ({ usuario, cuerpo }) => creado(registros.registrarAgua(usuario, cuerpo)));
  r.agregar('DELETE', '/hidratacion/ultimo', ({ usuario, consulta }) => ({ datos: registros.deshacerAgua(usuario, consulta) }));

  // Nutrición
  r.agregar('GET', '/comidas', ({ usuario, consulta }) => ({ datos: registros.listarComidas(usuario, consulta) }));
  r.agregar('POST', '/comidas', ({ usuario, cuerpo }) => creado(registros.registrarComida(usuario, cuerpo)));
  r.agregar('PUT', '/comidas/:id', ({ usuario, parametros, cuerpo }) => ({ datos: registros.actualizarComida(usuario, parametros.id, cuerpo) }));
  r.agregar('DELETE', '/comidas/:id', ({ usuario, parametros }) => {
    registros.eliminarComida(usuario, parametros.id);
    return sinContenido();
  });

  // Sueño
  r.agregar('GET', '/sueno', ({ usuario, consulta }) => ({ datos: registros.listarSueno(usuario, consulta) }));
  r.agregar('POST', '/sueno', ({ usuario, cuerpo }) => creado(registros.registrarSueno(usuario, cuerpo)));
  r.agregar('DELETE', '/sueno/:id', ({ usuario, parametros }) => {
    registros.eliminarSueno(usuario, parametros.id);
    return sinContenido();
  });

  // Hábitos
  r.agregar('GET', '/habitos', ({ usuario, consulta }) => ({ datos: habitos.listar(usuario, consulta) }));
  r.agregar('POST', '/habitos', ({ usuario, cuerpo }) => creado(habitos.crear(usuario, cuerpo)));
  r.agregar('GET', '/habitos/:id', ({ usuario, parametros }) => ({ datos: habitos.obtener(usuario, parametros.id) }));
  r.agregar('PUT', '/habitos/:id', ({ usuario, parametros, cuerpo }) => ({ datos: habitos.actualizar(usuario, parametros.id, cuerpo) }));
  r.agregar('DELETE', '/habitos/:id', ({ usuario, parametros }) => {
    habitos.eliminar(usuario, parametros.id);
    return sinContenido();
  });
  r.agregar('POST', '/habitos/:id/registros', ({ usuario, parametros, cuerpo }) => ({
    estado: 201,
    datos: habitos.registrarCumplimiento(usuario, parametros.id, cuerpo),
  }));

  // Estadísticas
  r.agregar('GET', '/estadisticas/dia', ({ usuario, consulta }) => ({ datos: estadisticas.resumenDia(usuario, consulta) }));
  r.agregar('GET', '/estadisticas/semana', ({ usuario, consulta }) => ({ datos: estadisticas.semana(usuario, consulta) }));

  return r;
}

module.exports = { crearRutas };
