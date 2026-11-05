/**
 * @file Apoyo de las pruebas: levanta la API real en un puerto temporal.
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { crearApp } = require('../src/app');

const SECRETO = 'secreto-de-pruebas-con-longitud-suficiente-0123456789';
const USUARIO = {
  nombre: 'Ana',
  apellido: 'Pérez',
  correo: 'ana@correo.com',
  contrasena: 'Clave1234',
  confirmacion: 'Clave1234',
  aceptaTerminos: true,
};

/** @returns {Promise<object>} API de prueba con cliente HTTP y reloj controlable. */
async function iniciarApi() {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'vitahealth-'));
  const archivoDatos = path.join(carpeta, 'datos.json');
  const api = { ahora: new Date(2026, 10, 4, 12), archivoDatos };
  const { servidor, enrutador } = crearApp({ archivoDatos, secreto: SECRETO, origenesCors: ['http://permitido.test'], reloj: () => api.ahora });
  await new Promise((listo) => servidor.listen(0, '127.0.0.1', listo));
  const base = `http://127.0.0.1:${servidor.address().port}`;

  /** Hace una petición y devuelve estado, cuerpo y cabeceras. */
  api.pedir = async (metodo, ruta, { cuerpo, token, cabeceras = {}, crudo } = {}) => {
    const respuesta = await fetch(`${base}${ruta.startsWith('/api') || ruta === '/docs' ? ruta : `/api/v1${ruta}`}`, {
      method: metodo,
      redirect: 'manual',
      headers: {
        ...(cuerpo !== undefined || crudo !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...cabeceras,
      },
      body: crudo ?? (cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined),
    });
    const texto = await respuesta.text();
    let json;
    try {
      json = JSON.parse(texto);
    } catch {
      json = undefined;
    }
    return { estado: respuesta.status, json, texto, cabeceras: respuesta.headers };
  };

  /** Registra un usuario e inicia sesión. @returns {Promise<string>} Token. */
  api.crearSesion = async (correo = USUARIO.correo) => {
    await api.pedir('POST', '/auth/registro', { cuerpo: { ...USUARIO, correo } });
    const { json } = await api.pedir('POST', '/auth/login', { cuerpo: { correo, contrasena: USUARIO.contrasena } });
    return json.datos.token;
  };

  api.enrutador = enrutador;
  api.cerrar = async () => {
    servidor.closeAllConnections();
    await new Promise((listo) => servidor.close(listo));
    fs.rmSync(carpeta, { recursive: true, force: true });
  };
  return api;
}

module.exports = { iniciarApi, USUARIO, SECRETO };
