'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const { after, before, describe, it } = require('node:test');

const { iniciarApi, USUARIO } = require('./apoyo');

describe('API de VitaHealth (HTTP real)', () => {
  let api;
  let token;
  let tokenOtro;

  before(async () => {
    api = await iniciarApi();
    token = await api.crearSesion();
    tokenOtro = await api.crearSesion('otra@correo.com');
  });
  after(() => api.cerrar());

  describe('generales y protocolo', () => {
    it('salud y catálogos son públicos', async () => {
      assert.equal((await api.pedir('GET', '/salud')).json.datos.servicio, 'vitahealth-api');
      assert.ok((await api.pedir('GET', '/catalogos')).json.datos.tiposComida.includes('cena'));
    });
    it('responde 404, 405, JSON inválido, tipo incorrecto y cuerpo grande', async () => {
      assert.equal((await api.pedir('GET', '/no-existe', { token })).estado, 404);
      const noPermitido = await api.pedir('PATCH', '/perfil', { token });
      assert.equal(noPermitido.estado, 405);
      assert.match(noPermitido.cabeceras.get('allow'), /GET/);
      assert.equal((await api.pedir('POST', '/habitos', { token, crudo: '{mal' })).estado, 400);
      assert.equal((await api.pedir('POST', '/habitos', { token, crudo: '[1]' })).estado, 400);
      assert.equal(
        (await api.pedir('POST', '/habitos', { token, crudo: '{}', cabeceras: { 'Content-Type': 'text/plain' } })).estado,
        415,
      );
      assert.equal((await api.pedir('POST', '/habitos', { token, crudo: JSON.stringify({ a: 'x'.repeat(102400) }) })).estado, 413);
    });
    it('aplica CORS solo a los orígenes permitidos y envía cabeceras de seguridad', async () => {
      const permitido = await api.pedir('OPTIONS', '/habitos', { cabeceras: { Origin: 'http://permitido.test' } });
      assert.equal(permitido.estado, 204);
      assert.equal(permitido.cabeceras.get('access-control-allow-origin'), 'http://permitido.test');
      const otro = await api.pedir('GET', '/salud', { cabeceras: { Origin: 'http://malo.test' } });
      assert.equal(otro.cabeceras.get('access-control-allow-origin'), null);
      assert.equal(otro.cabeceras.get('x-content-type-options'), 'nosniff');
    });
    it('todos los servicios privados exigen token', async () => {
      for (const { metodo, patron, publica } of api.enrutador.rutas) {
        if (publica) continue;
        const respuesta = await api.pedir(metodo, patron.replace(':id', 'x'));
        assert.equal(respuesta.estado, 401, `${metodo} ${patron}`);
      }
    });
  });

  describe('cuentas (HU01, HU02, HU07)', () => {
    it('informa todos los errores del registro y no guarda nada', async () => {
      const { estado, json } = await api.pedir('POST', '/auth/registro', {
        cuerpo: { nombre: ' ', correo: 'malo', contrasena: 'corta', confirmacion: 'x' },
      });
      assert.equal(estado, 400);
      assert.ok(json.detalles.length >= 5);
    });
    it('no admite un correo repetido aunque cambie mayúsculas', async () => {
      const { estado } = await api.pedir('POST', '/auth/registro', { cuerpo: { ...USUARIO, correo: 'ANA@correo.com' } });
      assert.equal(estado, 409);
    });
    it('nunca expone la contraseña ni la guarda en texto plano', async () => {
      const { json } = await api.pedir('GET', '/perfil', { token });
      assert.equal(json.datos.contrasena, undefined);
      assert.ok(!fs.readFileSync(api.archivoDatos, 'utf8').includes(USUARIO.contrasena));
    });
    it('el error de login es igual si el correo existe o no', async () => {
      const a = await api.pedir('POST', '/auth/login', { cuerpo: { correo: USUARIO.correo, contrasena: 'incorrecta' } });
      const b = await api.pedir('POST', '/auth/login', { cuerpo: { correo: 'nadie@correo.com', contrasena: 'incorrecta' } });
      assert.equal(a.estado, 401);
      assert.deepEqual(a.json, b.json);
      assert.equal((await api.pedir('POST', '/auth/login', { cuerpo: {} })).estado, 401);
    });
    it('bloquea tras 5 intentos fallidos y libera a los 15 minutos', async () => {
      const correo = 'bloqueo@correo.com';
      await api.crearSesion(correo);
      const intento = (contrasena) => api.pedir('POST', '/auth/login', { cuerpo: { correo, contrasena } });
      for (let i = 0; i < 5; i += 1) assert.equal((await intento('mala12345')).estado, 401);
      assert.equal((await intento(USUARIO.contrasena)).estado, 429);
      const antes = api.ahora;
      api.ahora = new Date(antes.getTime() + 15 * 60 * 1000 + 1);
      assert.equal((await intento(USUARIO.contrasena)).estado, 200);
      api.ahora = antes;
    });
    it('el token vence y el logout lo revoca', async () => {
      const correo = 'salida@correo.com';
      const sesion = await api.crearSesion(correo);
      assert.equal((await api.pedir('POST', '/auth/logout', { token: sesion })).estado, 204);
      assert.equal((await api.pedir('GET', '/perfil', { token: sesion })).estado, 401);
      const antes = api.ahora;
      api.ahora = new Date(antes.getTime() + 7201 * 1000);
      assert.equal((await api.pedir('GET', '/perfil', { token })).estado, 401);
      api.ahora = antes;
      assert.equal((await api.pedir('GET', '/perfil', { token })).estado, 200);
    });
  });

  describe('perfil (HU06)', () => {
    it('calcula el IMC (CP10) y actualiza solo lo enviado', async () => {
      const { json } = await api.pedir('PUT', '/perfil', { token, cuerpo: { pesoKg: 62.5, alturaCm: 165, objetivo: 'Bajar estrés' } });
      assert.equal(json.datos.imc, 23);
      assert.equal(json.datos.clasificacionImc, 'Peso saludable');
      const segundo = await api.pedir('PUT', '/perfil', { token, cuerpo: { nombre: 'Ana María', objetivo: null } });
      assert.equal(segundo.json.datos.nombre, 'Ana María');
      assert.equal(segundo.json.datos.objetivo, null);
      assert.equal(segundo.json.datos.pesoKg, 62.5);
    });
    it('valida rangos y la edad mínima de 13 años', async () => {
      const malos = [{ pesoKg: 10 }, { alturaCm: 300 }, { pesoKg: '60' }, { fechaNacimiento: '2013-11-05' }, { nombre: null }];
      for (const cuerpo of malos) assert.equal((await api.pedir('PUT', '/perfil', { token, cuerpo })).estado, 400, JSON.stringify(cuerpo));
      assert.equal((await api.pedir('PUT', '/perfil', { token, cuerpo: { fechaNacimiento: '2013-11-04' } })).estado, 200);
    });
  });

  describe('actividad física (HU05)', () => {
    it('calcula calorías, filtra por fechas y elimina', async () => {
      assert.equal((await api.pedir('GET', '/actividades', { token })).json.datos.length, 8);
      const { estado, json } = await api.pedir('POST', '/registros-actividad', { token, cuerpo: { actividadId: 1, duracionMinutos: 30, fecha: '2026-11-03' } });
      assert.equal(estado, 201);
      assert.equal(json.datos.caloriasQuemadas, 140);
      assert.equal(json.datos.usuarioId, undefined);
      const filtrados = await api.pedir('GET', '/registros-actividad?desde=2026-11-03&hasta=2026-11-03', { token });
      assert.equal(filtrados.json.datos.length, 1);
      assert.equal((await api.pedir('GET', '/registros-actividad?desde=2026-11-04', { token })).json.datos.length, 0);
      assert.equal((await api.pedir('DELETE', `/registros-actividad/${json.datos.id}`, { token })).estado, 204);
      assert.equal((await api.pedir('DELETE', `/registros-actividad/${json.datos.id}`, { token })).estado, 404);
    });
    it('rechaza fechas futuras, rangos invertidos y datos fuera de rango', async () => {
      const pedir = (cuerpo) => api.pedir('POST', '/registros-actividad', { token, cuerpo });
      assert.equal((await pedir({ actividadId: 1, duracionMinutos: 30, fecha: '2026-11-05' })).estado, 400);
      assert.equal((await pedir({ actividadId: 99, duracionMinutos: 30 })).estado, 400);
      assert.equal((await pedir({ actividadId: 1, duracionMinutos: 601 })).estado, 400);
      assert.equal((await pedir({ actividadId: 1, duracionMinutos: 1.5 })).estado, 400);
      assert.equal((await api.pedir('GET', '/registros-actividad?desde=2026-11-04&hasta=2026-11-01', { token })).estado, 400);
      assert.equal((await api.pedir('GET', '/registros-actividad?desde=ayer', { token })).estado, 400);
    });
  });

  describe('hidratación (HU04)', () => {
    it('acumula, deshace el último y valida la cantidad', async () => {
      const sesion = await api.crearSesion('agua@correo.com');
      await api.pedir('POST', '/hidratacion', { token: sesion, cuerpo: { cantidadMl: 250 } });
      const { json } = await api.pedir('POST', '/hidratacion', { token: sesion, cuerpo: { cantidadMl: 500 } });
      assert.equal(json.datos.totalMl, 750);
      assert.equal(json.datos.vasos, 3);
      const deshecho = await api.pedir('DELETE', '/hidratacion/ultimo', { token: sesion });
      assert.equal(deshecho.json.datos.totalMl, 250);
      await api.pedir('DELETE', '/hidratacion/ultimo', { token: sesion });
      assert.equal((await api.pedir('DELETE', '/hidratacion/ultimo', { token: sesion })).estado, 404);
      assert.equal((await api.pedir('POST', '/hidratacion', { token: sesion, cuerpo: { cantidadMl: 49 } })).estado, 400);
      assert.equal((await api.pedir('POST', '/hidratacion', { token: sesion, cuerpo: { cantidadMl: 3001 } })).estado, 400);
    });
  });

  describe('comidas y sueño', () => {
    it('hace el CRUD de comidas', async () => {
      const { estado, json } = await api.pedir('POST', '/comidas', { token, cuerpo: { tipo: 'almuerzo', descripcion: 'Arroz con pollo', calorias: 650 } });
      assert.equal(estado, 201);
      const cambiada = await api.pedir('PUT', `/comidas/${json.datos.id}`, { token, cuerpo: { calorias: 600 } });
      assert.equal(cambiada.json.datos.calorias, 600);
      assert.equal(cambiada.json.datos.tipo, 'almuerzo');
      assert.equal((await api.pedir('POST', '/comidas', { token, cuerpo: { tipo: 'brunch', descripcion: 'x', calorias: 1 } })).estado, 400);
      assert.equal((await api.pedir('DELETE', `/comidas/${json.datos.id}`, { token })).estado, 204);
    });
    it('admite un solo registro de sueño por día', async () => {
      const cuerpo = { horas: 7.5, calidad: 'buena', fecha: '2026-11-02' };
      const { estado, json } = await api.pedir('POST', '/sueno', { token, cuerpo });
      assert.equal(estado, 201);
      assert.equal((await api.pedir('POST', '/sueno', { token, cuerpo })).estado, 409);
      assert.equal((await api.pedir('POST', '/sueno', { token, cuerpo: { horas: 25 } })).estado, 400);
      assert.equal((await api.pedir('DELETE', `/sueno/${json.datos.id}`, { token })).estado, 204);
    });
  });

  describe('hábitos (HU08 a HU13)', () => {
    it('recorre crear, consultar, filtrar, actualizar, cumplir y eliminar', async () => {
      const cuerpo = { nombre: 'Meditar', categoria: 'bienestar', frecuencia: 'diaria', meta: 2 };
      const { estado, json } = await api.pedir('POST', '/habitos', { token, cuerpo });
      assert.equal(estado, 201);
      const { id } = json.datos;
      assert.equal(json.datos.unidad, 'veces');
      assert.equal((await api.pedir('GET', `/habitos/${id}`, { token })).json.datos.nombre, 'Meditar');
      assert.equal((await api.pedir('GET', '/habitos?categoria=bienestar', { token })).json.datos.length, 1);
      assert.equal((await api.pedir('GET', '/habitos?categoria=sueno', { token })).json.datos.length, 0);
      assert.equal((await api.pedir('GET', '/habitos?categoria=otra', { token })).estado, 400);

      await api.pedir('POST', `/habitos/${id}/registros`, { token, cuerpo: { cantidad: 2, fecha: '2026-11-03' } });
      await api.pedir('POST', `/habitos/${id}/registros`, { token, cuerpo: { cantidad: 1 } });
      const cumplido = await api.pedir('POST', `/habitos/${id}/registros`, { token, cuerpo: { cantidad: 1 } });
      assert.equal(cumplido.estado, 201);
      assert.deepEqual(cumplido.json.datos.resumen, { periodo: 'dia', cantidad: 2, porcentaje: 100, metaCumplida: true, racha: 2 });

      const editado = await api.pedir('PUT', `/habitos/${id}`, { token, cuerpo: { meta: 4, id: 'pirata', registros: [], activo: false } });
      assert.equal(editado.json.datos.id, id);
      assert.equal(editado.json.datos.meta, 4);
      assert.equal(editado.json.datos.activo, false);
      assert.equal(editado.json.datos.registros.length, 2);

      assert.equal((await api.pedir('DELETE', `/habitos/${id}`, { token })).estado, 204);
      assert.equal((await api.pedir('GET', `/habitos/${id}`, { token })).estado, 404);
    });
    it('valida los datos del hábito y del cumplimiento', async () => {
      assert.equal((await api.pedir('POST', '/habitos', { token, cuerpo: { nombre: 'x'.repeat(61), categoria: 'bienestar', frecuencia: 'diaria', meta: 1 } })).estado, 400);
      assert.equal((await api.pedir('POST', '/habitos', { token, cuerpo: { nombre: 'x', categoria: 'bienestar', frecuencia: 'diaria', meta: 0 } })).estado, 400);
      const { json } = await api.pedir('POST', '/habitos', { token, cuerpo: { nombre: 'x', categoria: 'bienestar', frecuencia: 'diaria', meta: 1 } });
      const ruta = `/habitos/${json.datos.id}/registros`;
      assert.equal((await api.pedir('POST', ruta, { token, cuerpo: { cantidad: 0 } })).estado, 400);
      assert.equal((await api.pedir('POST', ruta, { token, cuerpo: { cantidad: 1, fecha: '2026-11-05' } })).estado, 400);
      assert.equal((await api.pedir('PUT', `/habitos/${json.datos.id}`, { token, cuerpo: { activo: 'no' } })).estado, 400);
      await api.pedir('DELETE', `/habitos/${json.datos.id}`, { token });
    });
  });

  describe('aislamiento entre usuarios', () => {
    it('un usuario no ve, cambia ni borra datos de otro', async () => {
      const habito = (await api.pedir('POST', '/habitos', { token, cuerpo: { nombre: 'Mío', categoria: 'sueno', frecuencia: 'diaria', meta: 1 } })).json.datos;
      const comida = (await api.pedir('POST', '/comidas', { token, cuerpo: { tipo: 'cena', descripcion: 'Sopa', calorias: 200 } })).json.datos;
      const sueno = (await api.pedir('POST', '/sueno', { token, cuerpo: { horas: 8 } })).json.datos;
      const actividad = (await api.pedir('POST', '/registros-actividad', { token, cuerpo: { actividadId: 6, duracionMinutos: 20 } })).json.datos;
      const pruebas = [
        ['GET', `/habitos/${habito.id}`],
        ['PUT', `/habitos/${habito.id}`, { meta: 9 }],
        ['DELETE', `/habitos/${habito.id}`],
        ['POST', `/habitos/${habito.id}/registros`, { cantidad: 1 }],
        ['PUT', `/comidas/${comida.id}`, { calorias: 1 }],
        ['DELETE', `/comidas/${comida.id}`],
        ['DELETE', `/sueno/${sueno.id}`],
        ['DELETE', `/registros-actividad/${actividad.id}`],
      ];
      for (const [metodo, ruta, cuerpo] of pruebas) {
        assert.equal((await api.pedir(metodo, ruta, { token: tokenOtro, cuerpo })).estado, 404, `${metodo} ${ruta}`);
      }
      for (const ruta of ['/habitos', '/comidas', '/sueno', '/registros-actividad']) {
        assert.deepEqual((await api.pedir('GET', ruta, { token: tokenOtro })).json.datos, [], ruta);
      }
    });
  });

  describe('estadísticas (HU03)', () => {
    it('combina los módulos por día y por semana', async () => {
      const sesion = await api.crearSesion('resumen@correo.com');
      await api.pedir('POST', '/hidratacion', { token: sesion, cuerpo: { cantidadMl: 500 } });
      await api.pedir('POST', '/registros-actividad', { token: sesion, cuerpo: { actividadId: 1, duracionMinutos: 30 } });
      await api.pedir('POST', '/registros-actividad', { token: sesion, cuerpo: { actividadId: 1, duracionMinutos: 30, fecha: '2026-10-29' } });
      await api.pedir('POST', '/registros-actividad', { token: sesion, cuerpo: { actividadId: 1, duracionMinutos: 30, fecha: '2026-10-28' } });
      await api.pedir('POST', '/comidas', { token: sesion, cuerpo: { tipo: 'cena', descripcion: 'Sopa', calorias: 300 } });
      await api.pedir('POST', '/sueno', { token: sesion, cuerpo: { horas: 7 } });
      const habito = (await api.pedir('POST', '/habitos', { token: sesion, cuerpo: { nombre: 'A', categoria: 'sueno', frecuencia: 'diaria', meta: 1 } })).json.datos;
      await api.pedir('POST', '/habitos', { token: sesion, cuerpo: { nombre: 'B', categoria: 'sueno', frecuencia: 'diaria', meta: 1 } });
      await api.pedir('POST', `/habitos/${habito.id}/registros`, { token: sesion, cuerpo: { cantidad: 1 } });

      const dia = (await api.pedir('GET', '/estadisticas/dia', { token: sesion })).json.datos;
      assert.deepEqual(dia, {
        fecha: '2026-11-04',
        minutosActividad: 30,
        caloriasQuemadas: 140,
        caloriasConsumidas: 300,
        aguaMl: 500,
        horasSueno: 7,
        vasos: 2,
        porcentajeAgua: 25,
        habitos: { activos: 2, cumplidos: 1 },
      });

      const semana = (await api.pedir('GET', '/estadisticas/semana', { token: sesion })).json.datos;
      assert.equal(semana.desde, '2026-10-29');
      assert.equal(semana.dias.length, 7);
      assert.equal(semana.totales.minutosActividad, 60);
      assert.equal((await api.pedir('GET', '/estadisticas/semana?hasta=2026-11-05', { token: sesion })).estado, 400);
    });
  });
});
