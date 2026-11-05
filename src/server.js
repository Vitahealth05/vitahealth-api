/**
 * @file Punto de entrada: carga la configuración y abre el puerto.
 */

'use strict';

const { crearApp } = require('./app');
const { PREFIJO_API, cargarConfig } = require('./config');

const config = cargarConfig();
const { servidor } = crearApp(config);

servidor.listen(config.puerto, () => {
  console.log(`VitaHealth API en http://localhost:${config.puerto}${PREFIJO_API}`);
  console.log(`Documentación en http://localhost:${config.puerto}/docs`);
});
