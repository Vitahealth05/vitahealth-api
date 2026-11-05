'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { esFechaValida, lunesDe, restarAnios, sumarDias } = require('../src/fechas');
const { cifrarContrasena, verificarContrasena } = require('../src/seguridad/contrasena');
const { emitirToken, verificarToken } = require('../src/seguridad/token');
const { calcularImc, clasificarImc } = require('../src/servicios/perfilServicio');
const { calcularCalorias, resumirAgua } = require('../src/servicios/registrosServicio');
const { calcularResumen } = require('../src/servicios/habitoServicio');

describe('fechas', () => {
  it('rechaza fechas que no existen o con otro formato', () => {
    assert.equal(esFechaValida('2026-02-28'), true);
    assert.equal(esFechaValida('2028-02-29'), true);
    for (const malo of ['2026-02-31', '2026-13-01', '04/11/2026', 20261104, null]) assert.equal(esFechaValida(malo), false);
  });
  it('calcula días, lunes y años', () => {
    assert.equal(sumarDias('2026-03-01', -1), '2026-02-28');
    assert.equal(lunesDe('2026-11-04'), '2026-11-02');
    assert.equal(lunesDe('2026-11-08'), '2026-11-02');
    assert.equal(lunesDe('2026-11-02'), '2026-11-02');
    assert.equal(restarAnios('2026-11-04', 13), '2013-11-04');
  });
});

describe('cálculos de salud', () => {
  it('IMC y clasificación igual que vitahealth-web (CP10)', () => {
    assert.equal(calcularImc(62.5, 165), 23);
    assert.equal(clasificarImc(23), 'Peso saludable');
    assert.equal(clasificarImc(18.4), 'Bajo peso');
    assert.equal(clasificarImc(25), 'Sobrepeso');
    assert.equal(clasificarImc(30), 'Obesidad');
    assert.equal(calcularImc(null, 165), null);
    assert.equal(clasificarImc(null), 'Sin datos');
  });
  it('calorías: caminata de 30 min = 140 kcal (CP08)', () => {
    assert.equal(calcularCalorias(280, 30), 140);
    assert.equal(calcularCalorias(150, 7), 17.5);
  });
  it('agua: vasos y porcentaje con tope de 100', () => {
    assert.deepEqual(resumirAgua([{ cantidadMl: 500 }, { cantidadMl: 250 }]), { totalMl: 750, metaMl: 2000, vasos: 3, porcentaje: 38 });
    assert.equal(resumirAgua([{ cantidadMl: 3000 }]).porcentaje, 100);
  });
});

describe('resumen de hábitos', () => {
  const base = { meta: 2, frecuencia: 'diaria' };
  it('diario: racha desde ayer si hoy aún no se cumple', () => {
    const registros = [
      { fecha: '2026-11-01', cantidad: 2 },
      { fecha: '2026-11-02', cantidad: 2 },
      { fecha: '2026-11-03', cantidad: 3 },
      { fecha: '2026-11-04', cantidad: 1 },
    ];
    assert.deepEqual(calcularResumen({ ...base, registros }, '2026-11-04'), {
      periodo: 'dia',
      cantidad: 1,
      porcentaje: 50,
      metaCumplida: false,
      racha: 3,
    });
  });
  it('un día sin cumplir corta la racha', () => {
    const registros = [
      { fecha: '2026-11-01', cantidad: 2 },
      { fecha: '2026-11-03', cantidad: 2 },
    ];
    assert.equal(calcularResumen({ ...base, registros }, '2026-11-03').racha, 1);
  });
  it('semanal: suma los días de la semana y cuenta semanas', () => {
    const registros = [
      { fecha: '2026-10-26', cantidad: 1 },
      { fecha: '2026-10-30', cantidad: 2 },
      { fecha: '2026-11-02', cantidad: 2 },
      { fecha: '2026-11-04', cantidad: 1 },
    ];
    const resumen = calcularResumen({ meta: 3, frecuencia: 'semanal', registros }, '2026-11-04');
    assert.deepEqual(resumen, { periodo: 'semana', cantidad: 3, porcentaje: 100, metaCumplida: true, racha: 2 });
  });
});

describe('seguridad', () => {
  it('la contraseña no se guarda en texto plano y usa sal aleatoria', async () => {
    const a = await cifrarContrasena('Clave1234');
    const b = await cifrarContrasena('Clave1234');
    assert.notEqual(a, b);
    assert.ok(!a.includes('Clave1234'));
    assert.equal(await verificarContrasena('Clave1234', a), true);
    assert.equal(await verificarContrasena('Otra12345', a), false);
  });

  const opciones = { secreto: 'a'.repeat(40), duracion: 60, ahora: new Date('2026-11-04T12:00:00Z') };
  it('acepta un token válido y rechaza uno vencido', () => {
    const { token } = emitirToken('u1', opciones);
    assert.equal(verificarToken(token, opciones).sub, 'u1');
    assert.equal(verificarToken(token, { ...opciones, ahora: new Date('2026-11-04T12:01:00Z') }), null);
  });
  it('rechaza tokens alterados, con otro secreto o sin firma', () => {
    const { token } = emitirToken('u1', opciones);
    const [cabecera, carga, firma] = token.split('.');
    const otraCarga = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(carga, 'base64url')), sub: 'u2' })).toString('base64url');
    const ninguna = Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url');
    assert.equal(verificarToken(`${cabecera}.${otraCarga}.${firma}`, opciones), null);
    assert.equal(verificarToken(`${ninguna}.${carga}.`, opciones), null);
    assert.equal(verificarToken(token, { ...opciones, secreto: 'b'.repeat(40) }), null);
    assert.equal(verificarToken('basura', opciones), null);
  });
});
