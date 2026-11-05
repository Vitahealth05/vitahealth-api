'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { after, before, describe, it } = require('node:test');

const { SERVICIOS } = require('../scripts/especificacion');
const { iniciarApi } = require('./apoyo');

const docs = (archivo) => fs.readFileSync(path.join(__dirname, '..', 'docs', archivo), 'utf8');

describe('documentación', () => {
  let api;
  before(async () => {
    api = await iniciarApi();
  });
  after(() => api.cerrar());

  it('cada ruta real está documentada y no se documentan rutas inexistentes', () => {
    const reales = api.enrutador.rutas.map((r) => `${r.metodo} ${r.patron} ${r.publica}`).sort();
    const documentadas = SERVICIOS.map((s) => `${s.metodo} ${s.ruta} ${Boolean(s.publica)}`).sort();
    assert.deepEqual(documentadas, reales);
  });
  it('OpenAPI y SERVICIOS.md incluyen todos los servicios', () => {
    const openapi = JSON.parse(docs('openapi.json'));
    const markdown = docs('SERVICIOS.md');
    for (const s of SERVICIOS) {
      assert.ok(openapi.paths[s.ruta.replace(':id', '{id}')][s.metodo.toLowerCase()], s.ruta);
      assert.ok(markdown.includes(`\`${s.metodo} ${s.ruta}\``), s.ruta);
    }
  });
  it('la API publica la documentación', async () => {
    const pagina = await api.pedir('GET', '/docs');
    assert.equal(pagina.estado, 200);
    assert.match(pagina.cabeceras.get('content-type'), /text\/html/);
    assert.equal((await api.pedir('GET', '/api/v1/openapi.json')).json.openapi, '3.0.3');
  });
});
