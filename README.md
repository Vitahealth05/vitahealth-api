# VitaHealth API

API REST de **VitaHealth**, la aplicación de hábitos saludables del programa **Análisis y Desarrollo de Software (ADSO) – SENA**.
Evidencia **GA7-220501096-AA5-EV03 – Diseño y desarrollo de servicios web – proyecto**.

| | |
|---|---|
| **Aprendiz** | Ingri Daniela Rojas Sánchez |
| **Equipo** | Luisa Fernanda Betancur Idarraga · Luna Michell Montealegre |
| **Instructor** | Roberto Echeverri Arroyave |
| **Repositorio** | https://github.com/Vitahealth05/vitahealth-api |

## Servicios

La API tiene **29 servicios** organizados en los módulos funcionales del software. Salvo los generales, el registro y el inicio de sesión, todos exigen un token.

| Módulo | Servicios |
|---|---|
| Generales | `GET /salud`, `GET /catalogos` |
| Cuentas y sesiones | `POST /auth/registro`, `POST /auth/login`, `POST /auth/logout` |
| Perfil | `GET /perfil`, `PUT /perfil` |
| Actividad física | `GET /actividades`, `GET` y `POST /registros-actividad`, `DELETE /registros-actividad/:id` |
| Hidratación | `GET` y `POST /hidratacion`, `DELETE /hidratacion/ultimo` |
| Nutrición | `GET` y `POST /comidas`, `PUT` y `DELETE /comidas/:id` |
| Sueño | `GET` y `POST /sueno`, `DELETE /sueno/:id` |
| Hábitos | `GET` y `POST /habitos`, `GET`, `PUT` y `DELETE /habitos/:id`, `POST /habitos/:id/registros` |
| Estadísticas | `GET /estadisticas/dia`, `GET /estadisticas/semana` |

Todas las rutas parten de `/api/v1`.

## Documentación

| Documento | Contenido |
|---|---|
| [`docs/SERVICIOS.md`](docs/SERVICIOS.md) | Cada servicio: parámetros, respuestas y un ejemplo real |
| [`docs/DISENO.md`](docs/DISENO.md) | Arquitectura, modelo de datos, seguridad y trazabilidad |
| `http://localhost:3001/docs` | La misma referencia como página web, con la API en ejecución |
| [`docs/openapi.json`](docs/openapi.json) | Especificación OpenAPI 3.0, compatible con Swagger Editor |
| [`docs/VitaHealth.postman_collection.json`](docs/VitaHealth.postman_collection.json) | Colección para importar en Postman |

## Instalación y ejecución

Requisitos: **Node.js 18 o superior** y **Git**. No hay dependencias que instalar.

```bash
git clone https://github.com/Vitahealth05/vitahealth-api.git
cd vitahealth-api
npm start
```

La API queda en `http://localhost:3001/api/v1`. Las variables de configuración están en [`.env.example`](.env.example).

## Prueba rápida

En Windows, use `curl.exe` en PowerShell o importe la colección de Postman.

```bash
# 1. Crear la cuenta
curl -X POST http://localhost:3001/api/v1/auth/registro -H "Content-Type: application/json" -d "{\"nombre\":\"Ana\",\"apellido\":\"Pérez\",\"correo\":\"ana@correo.com\",\"contrasena\":\"Clave1234\",\"confirmacion\":\"Clave1234\",\"aceptaTerminos\":true}"

# 2. Iniciar sesión y copiar el valor de "token"
curl -X POST http://localhost:3001/api/v1/auth/login -H "Content-Type: application/json" -d "{\"correo\":\"ana@correo.com\",\"contrasena\":\"Clave1234\"}"

# 3. Usar un servicio protegido
curl http://localhost:3001/api/v1/perfil -H "Authorization: Bearer TOKEN"
```

## Pruebas

```bash
npm test
```

Las 35 pruebas usan `node:test`. Las de integración levantan la API y hacen peticiones HTTP reales a cada módulo. También comprueban que cada ruta esté documentada.

`npm run docs` vuelve a generar la documentación ejecutando cada servicio.

## Estructura

```
vitahealth-api/
├── src/
│   ├── server.js        # Punto de entrada
│   ├── app.js           # Une las capas y atiende las peticiones
│   ├── config.js        # Variables de entorno
│   ├── fechas.js        # Utilidades de fechas
│   ├── http/            # Enrutador, validador y errores
│   ├── seguridad/       # Contraseñas y tokens
│   ├── rutas/           # Catálogo de servicios REST
│   ├── servicios/       # Lógica de negocio
│   └── datos/           # Repositorio (persistencia)
├── tests/               # Pruebas unitarias y de integración
├── scripts/             # Especificación y generador de la documentación
└── docs/                # Documentación
```

## Versionamiento

Se usa Git con las ramas `main`, `develop` y `feature/*`, y mensajes de Conventional Commits, según los estándares del equipo (AA1-EV02). La versión entregada tiene la etiqueta `v1.0.0`.
