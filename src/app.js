/**
 * @file Construye la aplicación: une las capas y atiende cada petición HTTP.
 * Se separa de server.js para poder probarla en un puerto temporal.
 */

'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const { PREFIJO_API } = require('./config');
const { Repositorio } = require('./datos/repositorio');
const { ErrorApi } = require('./http/errores');
const { crearRutas } = require('./rutas');
const { AuthServicio } = require('./servicios/authServicio');
const { PerfilServicio } = require('./servicios/perfilServicio');
const { RegistrosServicio } = require('./servicios/registrosServicio');
const { HabitoServicio } = require('./servicios/habitoServicio');
const { EstadisticasServicio } = require('./servicios/estadisticasServicio');

const LIMITE_CUERPO = 100 * 1024;
const CARPETA_DOCS = path.join(__dirname, '..', 'docs');

const CABECERAS_SEGURIDAD = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
};

/** Escribe una respuesta JSON. */
function responderJson(res, estado, contenido, cabeceras = {}) {
  res.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8', ...cabeceras });
  res.end(contenido === undefined ? undefined : JSON.stringify(contenido));
}

/**
 * Lee y valida el cuerpo JSON de una petición.
 * @returns {Promise<object>}
 */
async function leerCuerpo(req) {
  const fragmentos = [];
  let tamano = 0;
  for await (const fragmento of req) {
    tamano += fragmento.length;
    if (tamano > LIMITE_CUERPO) throw new ErrorApi(413, 'El cuerpo de la petición supera el límite de 100 KB');
    fragmentos.push(fragmento);
  }
  if (tamano === 0) return {};
  if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) {
    throw new ErrorApi(415, 'El cuerpo debe enviarse con Content-Type: application/json');
  }
  let cuerpo;
  try {
    cuerpo = JSON.parse(Buffer.concat(fragmentos).toString('utf8'));
  } catch {
    throw new ErrorApi(400, 'El cuerpo de la petición no es un JSON válido');
  }
  if (cuerpo === null || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) {
    throw new ErrorApi(400, 'El cuerpo de la petición debe ser un objeto JSON');
  }
  return cuerpo;
}

/** Sirve la documentación generada. */
function servirDocumentacion(res, ruta) {
  if (ruta === '/') {
    res.writeHead(302, { Location: '/docs' });
    return res.end();
  }
  const archivos = {
    '/docs': ['api.html', 'text/html; charset=utf-8'],
    [`${PREFIJO_API}/openapi.json`]: ['openapi.json', 'application/json; charset=utf-8'],
  };
  const archivo = archivos[ruta];
  if (!archivo || !Object.hasOwn(archivos, ruta)) return false;
  res.writeHead(200, {
    'Content-Type': archivo[1],
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
  });
  return res.end(fs.readFileSync(path.join(CARPETA_DOCS, archivo[0])));
}

/**
 * @param {{archivoDatos: string, secreto: string, duracionToken?: number, origenesCors?: string[], reloj?: Function}} opciones
 * @returns {{servidor: http.Server, enrutador: object}}
 */
function crearApp({ archivoDatos, secreto, duracionToken = 7200, origenesCors = [], reloj = () => new Date() }) {
  const repositorio = new Repositorio(archivoDatos);
  const dependencias = { repositorio, reloj };
  const auth = new AuthServicio({ ...dependencias, secreto, duracionToken });
  const enrutador = crearRutas(
    {
      auth,
      perfil: new PerfilServicio(dependencias),
      registros: new RegistrosServicio(dependencias),
      habitos: new HabitoServicio(dependencias),
      estadisticas: new EstadisticasServicio(dependencias),
    },
    reloj,
  );

  /** Atiende una petición; cualquier error se traduce a una respuesta uniforme. */
  async function atender(req, res) {
    for (const [nombre, valor] of Object.entries(CABECERAS_SEGURIDAD)) res.setHeader(nombre, valor);

    const origen = req.headers.origin;
    if (origen && origenesCors.includes(origen)) {
      res.setHeader('Access-Control-Allow-Origin', origen);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    let url;
    try {
      url = new URL(req.url, 'http://localhost');
    } catch {
      throw new ErrorApi(400, 'La dirección de la petición no es válida');
    }
    const ruta = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;

    if (req.method === 'GET' && servirDocumentacion(res, ruta) !== false) return undefined;
    if (ruta !== PREFIJO_API && !ruta.startsWith(`${PREFIJO_API}/`)) {
      throw new ErrorApi(404, `Ruta no encontrada: ${req.method} ${ruta}`);
    }

    const { ruta: destino, parametros, permitidos } = enrutador.resolver(req.method, ruta.slice(PREFIJO_API.length));
    if (!destino) {
      if (permitidos.length > 0) {
        res.setHeader('Allow', permitidos.join(', '));
        throw new ErrorApi(405, `Método ${req.method} no permitido en ${ruta}`);
      }
      throw new ErrorApi(404, `Ruta no encontrada: ${req.method} ${ruta}`);
    }

    const contexto = {
      parametros,
      consulta: Object.fromEntries(url.searchParams),
      ip: req.socket.remoteAddress,
    };
    if (!destino.publica) Object.assign(contexto, auth.autenticar(req.headers.authorization));
    contexto.cuerpo = req.method === 'POST' || req.method === 'PUT' ? await leerCuerpo(req) : {};

    const { estado = 200, datos } = await destino.manejador(contexto);
    if (estado === 204) {
      res.writeHead(204);
      return res.end();
    }
    return responderJson(res, estado, { ok: true, datos });
  }

  const servidor = http.createServer((req, res) => {
    atender(req, res).catch((error) => {
      if (res.headersSent) return res.destroy();
      if (error instanceof ErrorApi) {
        const { estado, message: mensaje, detalles } = error;
        return responderJson(res, estado, { ok: false, mensaje, detalles }, estado === 401 ? { 'WWW-Authenticate': 'Bearer' } : {});
      }
      // Error no previsto: se registra y no se exponen detalles internos.
      console.error('[VitaHealth] Error interno:', error);
      return responderJson(res, 500, { ok: false, mensaje: 'Error interno del servidor' });
    });
  });

  return { servidor, enrutador };
}

module.exports = { crearApp };
