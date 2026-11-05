/**
 * @file Fuente única de la documentación de los servicios. A partir de este archivo
 * scripts/generar-docs.js crea docs/SERVICIOS.md, docs/openapi.json, docs/api.html
 * y la colección de Postman. Una prueba exige que coincida con las rutas reales.
 * "demo" define la petición con la que se obtiene el ejemplo real de la documentación.
 */

'use strict';

const c = (nombre, tipo, requerido, descripcion) => ({ nombre, tipo, requerido, descripcion });
const COMUNES = { 400: 'Datos no válidos', 401: 'Falta el token o no es válido' };
const rango = [c('desde', 'fecha', false, 'Fecha inicial AAAA-MM-DD'), c('hasta', 'fecha', false, 'Fecha final AAAA-MM-DD')];
const fechaOpcional = c('fecha', 'fecha', false, 'AAAA-MM-DD, no futura. Por defecto, hoy');

const MODULOS = [
  ['Generales', 'Estado de la API y listas de valores permitidos.'],
  ['Cuentas y sesiones', 'Registro, inicio y cierre de sesión con token JWT.'],
  ['Perfil', 'Datos personales, medidas e índice de masa corporal.'],
  ['Actividad física', 'Catálogo de actividades y registro de ejercicio con cálculo de calorías.'],
  ['Hidratación', 'Registro de agua frente a la meta diaria de 2000 ml (8 vasos de 250 ml).'],
  ['Nutrición', 'Registro de comidas y sus calorías.'],
  ['Sueño', 'Horas y calidad del sueño de cada día.'],
  ['Hábitos', 'Hábitos saludables con cumplimiento, progreso y racha.'],
  ['Estadísticas', 'Resumen que combina los datos de todos los módulos.'],
];

const SERVICIOS = [
  { modulo: 'Generales', metodo: 'GET', ruta: '/salud', publica: true, resumen: 'Consultar el estado de la API', respuestas: { 200: 'La API está en servicio' }, demo: {} },
  { modulo: 'Generales', metodo: 'GET', ruta: '/catalogos', publica: true, resumen: 'Consultar los valores permitidos', respuestas: { 200: 'Listas de categorías, frecuencias, tipos de comida y calidades de sueño' }, demo: {} },

  {
    modulo: 'Cuentas y sesiones', hu: 'HU01 / RF01', metodo: 'POST', ruta: '/auth/registro', publica: true, resumen: 'Crear una cuenta',
    cuerpo: [c('nombre', 'texto', true, 'Máximo 80 caracteres'), c('apellido', 'texto', true, 'Máximo 80 caracteres'), c('correo', 'texto', true, 'Correo válido y no registrado; máximo 120 caracteres'), c('contrasena', 'texto', true, 'De 8 a 128 caracteres, con letras y números'), c('confirmacion', 'texto', true, 'Igual a contrasena'), c('aceptaTerminos', 'booleano', true, 'Debe ser true')],
    respuestas: { 201: 'Cuenta creada', 400: 'Datos no válidos', 409: 'El correo ya está registrado' },
    demo: { cuerpo: { nombre: 'Ingri Daniela', apellido: 'Rojas Sánchez', correo: 'daniela@ejemplo.com', contrasena: 'Salud2026', confirmacion: 'Salud2026', aceptaTerminos: true } },
  },
  {
    modulo: 'Cuentas y sesiones', hu: 'HU02 / RF02', metodo: 'POST', ruta: '/auth/login', publica: true, resumen: 'Iniciar sesión',
    descripcion: 'Devuelve el token que debe enviarse en los demás servicios con la cabecera `Authorization: Bearer <token>`. Vence a las 2 horas. Tras 5 intentos fallidos se bloquea el acceso por 15 minutos.',
    cuerpo: [c('correo', 'texto', true, 'Correo de la cuenta'), c('contrasena', 'texto', true, 'Contraseña de la cuenta')],
    respuestas: { 200: 'Sesión iniciada', 401: 'Correo o contraseña incorrectos (mensaje genérico)', 429: 'Demasiados intentos fallidos' },
    demo: { cuerpo: { correo: 'daniela@ejemplo.com', contrasena: 'Salud2026' }, guardar: (datos) => ({ token: datos.token }) },
  },
  { modulo: 'Cuentas y sesiones', hu: 'HU07 / RNF04', metodo: 'POST', ruta: '/auth/logout', resumen: 'Cerrar sesión', descripcion: 'Revoca el token usado en la petición.', respuestas: { 204: 'Sesión cerrada', 401: COMUNES[401] }, demo: { alFinal: true } },

  { modulo: 'Perfil', hu: 'HU06 / RF03, RF08', metodo: 'GET', ruta: '/perfil', resumen: 'Consultar el perfil y el IMC', respuestas: { 200: 'Perfil del usuario', 401: COMUNES[401] }, demo: {} },
  {
    modulo: 'Perfil', hu: 'HU06 / RF03, RF08', metodo: 'PUT', ruta: '/perfil', resumen: 'Actualizar el perfil',
    descripcion: 'Solo cambian los campos enviados. Con `null` se borra fechaNacimiento, pesoKg, alturaCm u objetivo.',
    cuerpo: [c('nombre', 'texto', false, 'Máximo 80 caracteres'), c('apellido', 'texto', false, 'Máximo 80 caracteres'), c('fechaNacimiento', 'fecha', false, 'Edad mínima: 13 años'), c('pesoKg', 'número', false, 'De 20 a 400'), c('alturaCm', 'número', false, 'De 50 a 250'), c('objetivo', 'texto', false, 'Máximo 120 caracteres')],
    respuestas: { 200: 'Perfil actualizado', ...COMUNES },
    demo: { cuerpo: { fechaNacimiento: '2000-05-20', pesoKg: 62.5, alturaCm: 165, objetivo: 'Mejorar mi condición física' } },
  },

  { modulo: 'Actividad física', hu: 'HU05 / RF05', metodo: 'GET', ruta: '/actividades', resumen: 'Consultar el catálogo de actividades', respuestas: { 200: 'Actividades con sus calorías por hora', 401: COMUNES[401] }, demo: {} },
  { modulo: 'Actividad física', hu: 'HU05 / RF05', metodo: 'GET', ruta: '/registros-actividad', resumen: 'Consultar el historial de actividad', consulta: rango, respuestas: { 200: 'Registros, del más reciente al más antiguo', ...COMUNES }, demo: { consulta: '?desde=2026-11-01&hasta=2026-11-04' } },
  {
    modulo: 'Actividad física', hu: 'HU05 / RF05', metodo: 'POST', ruta: '/registros-actividad', resumen: 'Registrar una actividad',
    descripcion: 'Las calorías se calculan solas: calorías por hora × minutos / 60.',
    cuerpo: [c('actividadId', 'entero', true, 'Id del catálogo (1 a 8)'), c('duracionMinutos', 'entero', true, 'De 1 a 600'), fechaOpcional],
    respuestas: { 201: 'Actividad registrada', ...COMUNES },
    demo: { cuerpo: { actividadId: 1, duracionMinutos: 30, fecha: '2026-11-04' }, guardar: (datos) => ({ actividad: datos.id }) },
  },
  { modulo: 'Actividad física', hu: 'HU05 / RF05', metodo: 'DELETE', ruta: '/registros-actividad/:id', resumen: 'Eliminar un registro de actividad', respuestas: { 204: 'Registro eliminado', 401: COMUNES[401], 404: 'No existe o es de otro usuario' }, demo: { id: 'actividad' } },

  { modulo: 'Hidratación', hu: 'HU04 / RF04', metodo: 'GET', ruta: '/hidratacion', resumen: 'Consultar el agua de un día', consulta: [c('fecha', 'fecha', false, 'AAAA-MM-DD. Por defecto, hoy')], respuestas: { 200: 'Registros, total, vasos y porcentaje de la meta', ...COMUNES }, demo: {} },
  { modulo: 'Hidratación', hu: 'HU04 / RF04', metodo: 'POST', ruta: '/hidratacion', resumen: 'Registrar agua', cuerpo: [c('cantidadMl', 'entero', true, 'De 50 a 3000'), fechaOpcional], respuestas: { 201: 'Agua registrada; devuelve el resumen del día', ...COMUNES }, demo: { cuerpo: { cantidadMl: 500 }, repetir: true } },
  { modulo: 'Hidratación', hu: 'HU04 / RF04', metodo: 'DELETE', ruta: '/hidratacion/ultimo', resumen: 'Deshacer el último registro de agua', consulta: [c('fecha', 'fecha', false, 'AAAA-MM-DD. Por defecto, hoy')], respuestas: { 200: 'Registro eliminado; devuelve el resumen del día', 401: COMUNES[401], 404: 'No hay registros ese día' }, demo: {} },

  { modulo: 'Nutrición', metodo: 'GET', ruta: '/comidas', resumen: 'Consultar las comidas', consulta: rango, respuestas: { 200: 'Comidas, de la más reciente a la más antigua', ...COMUNES }, demo: {  } },
  { modulo: 'Nutrición', metodo: 'POST', ruta: '/comidas', resumen: 'Registrar una comida', cuerpo: [c('tipo', 'texto', true, 'desayuno, almuerzo, cena o merienda'), c('descripcion', 'texto', true, 'Máximo 120 caracteres'), c('calorias', 'número', true, 'De 0 a 5000'), fechaOpcional], respuestas: { 201: 'Comida registrada', ...COMUNES }, demo: { cuerpo: { tipo: 'almuerzo', descripcion: 'Arroz con pollo y ensalada', calorias: 650 }, guardar: (datos) => ({ comida: datos.id }) } },
  { modulo: 'Nutrición', metodo: 'PUT', ruta: '/comidas/:id', resumen: 'Actualizar una comida', descripcion: 'Solo cambian los campos enviados.', cuerpo: [c('tipo', 'texto', false, 'desayuno, almuerzo, cena o merienda'), c('descripcion', 'texto', false, 'Máximo 120 caracteres'), c('calorias', 'número', false, 'De 0 a 5000'), fechaOpcional], respuestas: { 200: 'Comida actualizada', ...COMUNES, 404: 'No existe o es de otro usuario' }, demo: { id: 'comida', cuerpo: { calorias: 600 } } },
  { modulo: 'Nutrición', metodo: 'DELETE', ruta: '/comidas/:id', resumen: 'Eliminar una comida', respuestas: { 204: 'Comida eliminada', 401: COMUNES[401], 404: 'No existe o es de otro usuario' }, demo: { id: 'comida' } },

  { modulo: 'Sueño', metodo: 'GET', ruta: '/sueno', resumen: 'Consultar el sueño', consulta: rango, respuestas: { 200: 'Registros, del más reciente al más antiguo', ...COMUNES }, demo: {  } },
  { modulo: 'Sueño', metodo: 'POST', ruta: '/sueno', resumen: 'Registrar el sueño de un día', cuerpo: [c('horas', 'número', true, 'De 0.5 a 24'), c('calidad', 'texto', false, 'buena, regular o mala'), fechaOpcional], respuestas: { 201: 'Sueño registrado', ...COMUNES, 409: 'Ya hay un registro para esa fecha' }, demo: { cuerpo: { horas: 7.5, calidad: 'buena' }, guardar: (datos) => ({ sueno: datos.id }) } },
  { modulo: 'Sueño', metodo: 'DELETE', ruta: '/sueno/:id', resumen: 'Eliminar un registro de sueño', respuestas: { 204: 'Registro eliminado', 401: COMUNES[401], 404: 'No existe o es de otro usuario' }, demo: { id: 'sueno' } },

  { modulo: 'Hábitos', hu: 'HU09', metodo: 'GET', ruta: '/habitos', resumen: 'Consultar los hábitos', consulta: [c('categoria', 'texto', false, 'hidratacion, actividad_fisica, sueno, alimentacion o bienestar')], respuestas: { 200: 'Hábitos con su resumen', ...COMUNES }, demo: { despuesDe: 'POST /habitos/:id/registros' } },
  { modulo: 'Hábitos', hu: 'HU08', metodo: 'POST', ruta: '/habitos', resumen: 'Registrar un hábito', cuerpo: [c('nombre', 'texto', true, 'Máximo 60 caracteres'), c('categoria', 'texto', true, 'hidratacion, actividad_fisica, sueno, alimentacion o bienestar'), c('frecuencia', 'texto', true, 'diaria o semanal'), c('meta', 'número', true, 'Mayor que cero'), c('descripcion', 'texto', false, 'Máximo 200 caracteres'), c('unidad', 'texto', false, 'Máximo 20 caracteres. Por defecto, veces')], respuestas: { 201: 'Hábito registrado', ...COMUNES }, demo: { cuerpo: { nombre: 'Meditar', categoria: 'bienestar', frecuencia: 'diaria', meta: 10, unidad: 'minutos' }, guardar: (datos) => ({ habito: datos.id }) } },
  { modulo: 'Hábitos', hu: 'HU09, HU13', metodo: 'GET', ruta: '/habitos/:id', resumen: 'Consultar un hábito', respuestas: { 200: 'Hábito con su progreso y racha', 401: COMUNES[401], 404: 'No existe o es de otro usuario' }, demo: { id: 'habito' } },
  { modulo: 'Hábitos', hu: 'HU10', metodo: 'PUT', ruta: '/habitos/:id', resumen: 'Actualizar un hábito', descripcion: 'Solo cambian los campos enviados; el historial de registros se conserva.', cuerpo: [c('nombre', 'texto', false, 'Máximo 60 caracteres'), c('categoria', 'texto', false, 'Una categoría del catálogo'), c('frecuencia', 'texto', false, 'diaria o semanal'), c('meta', 'número', false, 'Mayor que cero'), c('descripcion', 'texto', false, 'Máximo 200 caracteres'), c('unidad', 'texto', false, 'Máximo 20 caracteres'), c('activo', 'booleano', false, 'false lo excluye del panel diario')], respuestas: { 200: 'Hábito actualizado', ...COMUNES, 404: 'No existe o es de otro usuario' }, demo: { id: 'habito', cuerpo: { meta: 15 } } },
  { modulo: 'Hábitos', hu: 'HU11', metodo: 'DELETE', ruta: '/habitos/:id', resumen: 'Eliminar un hábito', respuestas: { 204: 'Hábito eliminado', 401: COMUNES[401], 404: 'No existe o es de otro usuario' }, demo: { id: 'habito' } },
  { modulo: 'Hábitos', hu: 'HU12, HU13', metodo: 'POST', ruta: '/habitos/:id/registros', resumen: 'Registrar el cumplimiento', descripcion: 'Suma al avance del día y devuelve el progreso del periodo y la racha. En los hábitos semanales el progreso acumula de lunes a domingo y la racha cuenta semanas.', cuerpo: [c('cantidad', 'número', true, 'Mayor que cero'), fechaOpcional], respuestas: { 201: 'Cumplimiento registrado', ...COMUNES, 404: 'No existe o es de otro usuario' }, demo: { id: 'habito', cuerpo: { cantidad: 15 } } },

  { modulo: 'Estadísticas', hu: 'HU03 / RF06', metodo: 'GET', ruta: '/estadisticas/dia', resumen: 'Consultar el resumen de un día', consulta: [c('fecha', 'fecha', false, 'AAAA-MM-DD. Por defecto, hoy')], respuestas: { 200: 'Totales del día y hábitos cumplidos', ...COMUNES }, demo: { despuesDe: 'POST /habitos/:id/registros' } },
  { modulo: 'Estadísticas', hu: 'HU03 / RF06', metodo: 'GET', ruta: '/estadisticas/semana', resumen: 'Consultar los últimos 7 días', consulta: [c('hasta', 'fecha', false, 'Último día, no futuro. Por defecto, hoy')], respuestas: { 200: 'Totales por día y de la semana', ...COMUNES }, demo: { despuesDe: 'POST /habitos/:id/registros' } },
];

module.exports = { MODULOS, SERVICIOS };
