/**
 * @file Genera la documentación ejecutando cada servicio contra la API real, de modo
 * que los ejemplos son respuestas auténticas. Uso: npm run docs
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { crearApp } = require('../src/app');
const { PREFIJO_API } = require('../src/config');
const { MODULOS, SERVICIOS } = require('./especificacion');

const DOCS = path.join(__dirname, '..', 'docs');
const clave = (s) => `${s.metodo} ${s.ruta}`;
const ancla = (s) => `${s.metodo}-${s.ruta}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
const CODIGOS = { 200: 'OK', 201: 'Created', 204: 'No Content', 400: 'Bad Request', 401: 'Unauthorized', 404: 'Not Found', 409: 'Conflict', 429: 'Too Many Requests' };
const TIPOS_OPENAPI = { texto: { type: 'string' }, 'número': { type: 'number' }, entero: { type: 'integer' }, booleano: { type: 'boolean' }, fecha: { type: 'string', format: 'date' } };
const esc = (t) => String(t).replace(/[&<>"]/g, (x) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[x]);

/**
 * Ordena las peticiones respetando las dependencias: primero las públicas, luego
 * creaciones y consultas, después lo que necesita datos y al final eliminaciones y logout.
 */
function ordenarDemos() {
  const etapa = (s) => {
    if (s.publica) return 0;
    if (s.demo.alFinal) return 5;
    if (s.metodo === 'DELETE') return 4;
    if (s.demo.despuesDe) return 3;
    return s.metodo === 'POST' || s.metodo === 'PUT' ? 1 : 2;
  };
  return [...SERVICIOS].sort((a, b) => etapa(a) - etapa(b));
}

/** Ejecuta cada servicio y guarda su ejemplo. */
async function capturarEjemplos() {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'vitahealth-docs-'));
  const { servidor } = crearApp({
    archivoDatos: path.join(carpeta, 'datos.json'),
    secreto: 'secreto-solo-para-generar-la-documentacion',
    reloj: () => new Date(2026, 10, 4, 12),
  });
  await new Promise((listo) => servidor.listen(0, '127.0.0.1', listo));
  const base = `http://127.0.0.1:${servidor.address().port}${PREFIJO_API}`;
  const contexto = {};

  const pedir = async (metodo, ruta, cuerpo, conToken = true) => {
    const respuesta = await fetch(base + ruta, {
      method: metodo,
      headers: {
        ...(cuerpo ? { 'Content-Type': 'application/json' } : {}),
        ...(conToken && contexto.token ? { Authorization: `Bearer ${contexto.token}` } : {}),
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    const texto = await respuesta.text();
    return { estado: respuesta.status, cuerpo: texto ? JSON.parse(texto) : undefined };
  };

  const ejemplos = {};
  for (const s of ordenarDemos()) {
    const ruta = s.ruta.replace(':id', contexto[s.demo.id]) + (s.demo.consulta || '');
    if (s.demo.repetir) await pedir(s.metodo, ruta, s.demo.cuerpo);
    const respuesta = await pedir(s.metodo, ruta, s.demo.cuerpo);
    const esperado = Number(Object.keys(s.respuestas)[0]);
    if (respuesta.estado !== esperado) {
      throw new Error(`${clave(s)} respondió ${respuesta.estado}, se esperaba ${esperado}: ${JSON.stringify(respuesta.cuerpo)}`);
    }
    if (s.demo.guardar) Object.assign(contexto, s.demo.guardar(respuesta.cuerpo.datos));
    ejemplos[clave(s)] = { ruta: PREFIJO_API + ruta, cuerpo: s.demo.cuerpo, respuesta };
  }

  // Ejemplos reales de errores. El logout del paso anterior revocó el token.
  const errores = { 401: await pedir('GET', '/perfil') };
  errores[409] = await pedir('POST', '/auth/registro', SERVICIOS.find((s) => s.ruta === '/auth/registro').demo.cuerpo, false);
  contexto.token = (await pedir('POST', '/auth/login', { correo: 'daniela@ejemplo.com', contrasena: 'Salud2026' }, false)).cuerpo.datos.token;
  errores[400] = await pedir('POST', '/habitos', { nombre: '', meta: 0 });
  errores[404] = await pedir('GET', '/habitos/no-existe');

  servidor.closeAllConnections();
  await new Promise((listo) => servidor.close(listo));
  fs.rmSync(carpeta, { recursive: true, force: true });
  return { ejemplos, errores };
}

/** Acorta el token para que el ejemplo sea legible. */
const json = (valor) =>
  JSON.stringify(valor, (k, v) => (k === 'token' ? `${v.slice(0, 20)}...` : k === 'contrasena' && typeof v === 'string' && v.includes(':') ? undefined : v), 2);
const tabla = (campos) =>
  `| Campo | Tipo | Obligatorio | Descripción |\n|---|---|---|---|\n${campos.map((f) => `| \`${f.nombre}\` | ${f.tipo} | ${f.requerido ? 'Sí' : 'No'} | ${f.descripcion} |`).join('\n')}\n`;

function generarMarkdown({ ejemplos, errores }) {
  let md = `# Documentación de los servicios de VitaHealth API\n\nGenerado con \`npm run docs\`. Los ejemplos son respuestas reales de la API.\n\n`;
  md += `- **URL base:** \`http://localhost:3001${PREFIJO_API}\`\n- **Formato:** JSON (\`Content-Type: application/json\`)\n- **Autenticación:** \`Authorization: Bearer <token>\`, obtenido en \`POST /auth/login\`. Los servicios marcados como públicos no la necesitan.\n- **Respuesta correcta:** \`{ "ok": true, "datos": ... }\`\n- **Respuesta de error:** \`{ "ok": false, "mensaje": "...", "detalles": ["..."] }\`\n\n## Índice\n\n| Módulo | Método | Ruta | Servicio |\n|---|---|---|---|\n`;
  for (const s of SERVICIOS) md += `| ${s.modulo} | ${s.metodo} | \`${s.ruta}\` | [${s.resumen}](#${ancla(s)}) |\n`;
  for (const [modulo, descripcion] of MODULOS) {
    md += `\n## ${modulo}\n\n${descripcion}\n`;
    for (const s of SERVICIOS.filter((x) => x.modulo === modulo)) {
      const e = ejemplos[clave(s)];
      md += `\n<a id="${ancla(s)}"></a>\n\n### ${s.resumen}\n\n\`${s.metodo} ${s.ruta}\` · ${s.publica ? 'Público' : 'Requiere token'}${s.hu ? ` · ${s.hu}` : ''}\n\n`;
      if (s.descripcion) md += `${s.descripcion}\n\n`;
      if (s.ruta.includes(':id')) md += `**Parámetro de ruta:** \`id\`, identificador del registro.\n\n`;
      if (s.consulta) md += `**Parámetros de consulta**\n\n${tabla(s.consulta)}\n`;
      if (s.cuerpo) md += `**Cuerpo**\n\n${tabla(s.cuerpo)}\n`;
      md += `**Respuestas**\n\n| Código | Significado |\n|---|---|\n${Object.entries(s.respuestas).map(([k, v]) => `| ${k} | ${v} |`).join('\n')}\n\n`;
      md += `**Ejemplo**\n\n\`\`\`http\n${s.metodo} ${e.ruta}\n${e.cuerpo ? `\n${json(e.cuerpo)}\n` : ''}\`\`\`\n\n`;
      md += `\`\`\`json\n// ${e.respuesta.estado} ${CODIGOS[e.respuesta.estado]}\n${e.respuesta.cuerpo ? json(e.respuesta.cuerpo) : '(sin contenido)'}\n\`\`\`\n`;
    }
  }
  md += `\n## Errores comunes\n\n| Código | Cuándo ocurre |\n|---|---|\n| 400 | Datos no válidos o JSON mal formado |\n| 401 | Falta el token, no es válido, venció o fue revocado |\n| 404 | La ruta o el registro no existe, o el registro es de otro usuario |\n| 405 | La ruta existe pero no admite ese método |\n| 409 | Conflicto con datos existentes |\n| 413 | El cuerpo supera 100 KB |\n| 415 | El cuerpo no se envió como JSON |\n| 429 | Demasiados intentos fallidos de inicio de sesión |\n| 500 | Error interno; no se exponen detalles |\n`;
  for (const codigo of [400, 401, 404, 409]) md += `\n\`\`\`json\n// ${codigo} ${CODIGOS[codigo]}\n${json(errores[codigo].cuerpo)}\n\`\`\`\n`;
  return md;
}

function generarOpenApi({ ejemplos }) {
  const paths = {};
  for (const s of SERVICIOS) {
    const ruta = s.ruta.replace(':id', '{id}');
    const esquema = (campos) => ({
      type: 'object',
      required: campos.filter((f) => f.requerido).map((f) => f.nombre),
      properties: Object.fromEntries(campos.map((f) => [f.nombre, { ...TIPOS_OPENAPI[f.tipo], description: f.descripcion }])),
    });
    const parameters = [
      ...(s.ruta.includes(':id') ? [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }] : []),
      ...(s.consulta || []).map((f) => ({ name: f.nombre, in: 'query', required: f.requerido, description: f.descripcion, schema: TIPOS_OPENAPI[f.tipo] })),
    ];
    const ejemplo = ejemplos[clave(s)];
    (paths[ruta] ||= {})[s.metodo.toLowerCase()] = {
      tags: [s.modulo],
      summary: s.resumen,
      ...(s.descripcion ? { description: s.descripcion } : {}),
      ...(s.publica ? { security: [] } : {}),
      ...(parameters.length ? { parameters } : {}),
      ...(s.cuerpo ? { requestBody: { required: true, content: { 'application/json': { schema: esquema(s.cuerpo), example: ejemplo.cuerpo } } } } : {}),
      responses: Object.fromEntries(
        Object.entries(s.respuestas).map(([codigo, descripcion]) => [
          codigo,
          {
            description: descripcion,
            ...(String(ejemplo.respuesta.estado) === codigo && ejemplo.respuesta.cuerpo
              ? { content: { 'application/json': { example: JSON.parse(json(ejemplo.respuesta.cuerpo)) } } }
              : {}),
          },
        ]),
      ),
    };
  }
  return {
    openapi: '3.0.3',
    info: { title: 'VitaHealth API', version: '1.0.0', description: 'Servicios web de la aplicación de hábitos saludables VitaHealth (SENA ADSO, GA7-220501096-AA5-EV03).' },
    servers: [{ url: `http://localhost:3001${PREFIJO_API}` }],
    tags: MODULOS.map(([name, description]) => ({ name, description })),
    security: [{ bearerAuth: [] }],
    components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
    paths,
  };
}

function generarPostman({ ejemplos }) {
  const variable = { 'POST /registros-actividad': 'actividad', 'POST /comidas': 'comida', 'POST /sueno': 'sueno', 'POST /habitos': 'habito' };
  const usar = { '/registros-actividad/:id': 'actividad', '/comidas/:id': 'comida', '/sueno/:id': 'sueno', '/habitos/:id': 'habito', '/habitos/:id/registros': 'habito' };
  return {
    info: { name: 'VitaHealth API', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json', description: 'Ejecute primero "Crear una cuenta" e "Iniciar sesión": el token y los ids se guardan solos.' },
    auth: { type: 'bearer', bearer: [{ key: 'token', value: '{{token}}', type: 'string' }] },
    variable: [{ key: 'baseUrl', value: `http://localhost:3001${PREFIJO_API}` }, { key: 'token', value: '' }, ...['actividad', 'comida', 'sueno', 'habito'].map((key) => ({ key, value: '' }))],
    item: MODULOS.map(([modulo]) => ({
      name: modulo,
      item: SERVICIOS.filter((s) => s.modulo === modulo).map((s) => {
        const ruta = usar[s.ruta] ? s.ruta.replace(':id', `{{${usar[s.ruta]}}}`) : s.ruta;
        const guardar = s.ruta === '/auth/login' ? 'token' : variable[clave(s)];
        const campo = s.ruta === '/auth/login' ? 'token' : 'id';
        return {
          name: s.resumen,
          ...(guardar ? { event: [{ listen: 'test', script: { type: 'text/javascript', exec: [`pm.collectionVariables.set('${guardar}', pm.response.json().datos.${campo});`] } }] } : {}),
          request: {
            method: s.metodo,
            ...(s.publica ? { auth: { type: 'noauth' } } : {}),
            header: s.cuerpo ? [{ key: 'Content-Type', value: 'application/json' }] : [],
            url: `{{baseUrl}}${ruta}`,
            ...(ejemplos[clave(s)].cuerpo ? { body: { mode: 'raw', raw: JSON.stringify(ejemplos[clave(s)].cuerpo, null, 2) } } : {}),
          },
        };
      }),
    })),
  };
}

function generarHtml({ ejemplos }) {
  const tablaHtml = (titulo, campos) =>
    `<h4>${titulo}</h4><div class="t"><table><tr><th>Campo</th><th>Tipo</th><th>Obligatorio</th><th>Descripción</th></tr>${campos.map((f) => `<tr><td><code>${esc(f.nombre)}</code></td><td>${esc(f.tipo)}</td><td>${f.requerido ? 'Sí' : 'No'}</td><td>${esc(f.descripcion)}</td></tr>`).join('')}</table></div>`;
  const secciones = MODULOS.map(([modulo, descripcion]) => {
    const tarjetas = SERVICIOS.filter((s) => s.modulo === modulo).map((s) => {
      const e = ejemplos[clave(s)];
      return `<details id="${ancla(s)}"><summary><span class="m ${s.metodo}">${s.metodo}</span> <code>${esc(s.ruta)}</code> <span class="r">${esc(s.resumen)}</span></summary><div class="c">
<p class="a">${s.publica ? 'Público' : 'Requiere token'}${s.hu ? ` · ${esc(s.hu)}` : ''}</p>${s.descripcion ? `<p>${esc(s.descripcion).replace(/`([^`]+)`/g, '<code>$1</code>')}</p>` : ''}
${s.consulta ? tablaHtml('Parámetros de consulta', s.consulta) : ''}${s.cuerpo ? tablaHtml('Cuerpo', s.cuerpo) : ''}
<h4>Respuestas</h4><ul>${Object.entries(s.respuestas).map(([k, v]) => `<li><b>${k}</b> ${esc(v)}</li>`).join('')}</ul>
<h4>Ejemplo</h4><pre>${esc(`${s.metodo} ${e.ruta}`)}${e.cuerpo ? `\n\n${esc(json(e.cuerpo))}` : ''}</pre><pre>${e.respuesta.estado} ${CODIGOS[e.respuesta.estado]}${e.respuesta.cuerpo ? `\n\n${esc(json(e.respuesta.cuerpo))}` : ''}</pre></div></details>`;
    });
    return `<section><h2>${esc(modulo)}</h2><p>${esc(descripcion)}</p>${tarjetas.join('')}</section>`;
  }).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VitaHealth API</title><style>
:root{--f:#f4f8f5;--s:#fff;--t:#1d2d24;--d:#5a6d62;--b:#d8e4dc;--v:#1f7a4d;--c:#eef4f0}
@media(prefers-color-scheme:dark){:root{--f:#131a16;--s:#1b241f;--t:#e7efe9;--d:#a3b4a9;--b:#32413a;--v:#5fce96;--c:#111714}}
*{box-sizing:border-box}body{margin:0;background:var(--f);color:var(--t);font:16px/1.5 system-ui,sans-serif}main{max-width:860px;margin:auto;padding:32px 16px}
h1{margin:0;color:var(--v)}h2{margin:32px 0 4px}h4{margin:16px 0 6px}p{margin:6px 0}code,pre{font-family:ui-monospace,Consolas,monospace;font-size:14px}.i{color:var(--d)}
details{background:var(--s);border:1px solid var(--b);border-radius:10px;margin:8px 0}summary{cursor:pointer;padding:10px 12px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.m{font:700 12px ui-monospace,monospace;padding:3px 7px;border-radius:5px;color:#fff;min-width:58px;text-align:center}.GET{background:#2467a8}.POST{background:#1f7a4d}.PUT{background:#9a6200}.DELETE{background:#b23a3a}.r{color:var(--d)}
.c{padding:0 12px 12px;border-top:1px solid var(--b)}.a{color:var(--d);font-size:14px;margin-top:10px}pre{background:var(--c);padding:10px;border-radius:8px;overflow:auto}.t{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:14px}td,th{border:1px solid var(--b);padding:5px 8px;text-align:left}ul{margin:0;padding-left:20px}
</style></head><body><main><h1>VitaHealth API</h1><p class="i">URL base <code>${PREFIJO_API}</code> · ${SERVICIOS.length} servicios · Autenticación <code>Authorization: Bearer &lt;token&gt;</code> · Especificación <a href="${PREFIJO_API}/openapi.json">OpenAPI</a></p>${secciones}</main></body></html>\n`;
}

(async () => {
  const capturas = await capturarEjemplos();
  fs.writeFileSync(path.join(DOCS, 'SERVICIOS.md'), generarMarkdown(capturas));
  fs.writeFileSync(path.join(DOCS, 'openapi.json'), `${JSON.stringify(generarOpenApi(capturas), null, 2)}\n`);
  fs.writeFileSync(path.join(DOCS, 'VitaHealth.postman_collection.json'), `${JSON.stringify(generarPostman(capturas), null, 2)}\n`);
  fs.writeFileSync(path.join(DOCS, 'api.html'), generarHtml(capturas));
  console.log(`Documentación generada: ${SERVICIOS.length} servicios.`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
