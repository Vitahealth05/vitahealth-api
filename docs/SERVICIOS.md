# Documentación de los servicios de VitaHealth API

Generado con `npm run docs`. Los ejemplos son respuestas reales de la API.

- **URL base:** `http://localhost:3001/api/v1`
- **Formato:** JSON (`Content-Type: application/json`)
- **Autenticación:** `Authorization: Bearer <token>`, obtenido en `POST /auth/login`. Los servicios marcados como públicos no la necesitan.
- **Respuesta correcta:** `{ "ok": true, "datos": ... }`
- **Respuesta de error:** `{ "ok": false, "mensaje": "...", "detalles": ["..."] }`

## Índice

| Módulo | Método | Ruta | Servicio |
|---|---|---|---|
| Generales | GET | `/salud` | [Consultar el estado de la API](#get-salud) |
| Generales | GET | `/catalogos` | [Consultar los valores permitidos](#get-catalogos) |
| Cuentas y sesiones | POST | `/auth/registro` | [Crear una cuenta](#post-auth-registro) |
| Cuentas y sesiones | POST | `/auth/login` | [Iniciar sesión](#post-auth-login) |
| Cuentas y sesiones | POST | `/auth/logout` | [Cerrar sesión](#post-auth-logout) |
| Perfil | GET | `/perfil` | [Consultar el perfil y el IMC](#get-perfil) |
| Perfil | PUT | `/perfil` | [Actualizar el perfil](#put-perfil) |
| Actividad física | GET | `/actividades` | [Consultar el catálogo de actividades](#get-actividades) |
| Actividad física | GET | `/registros-actividad` | [Consultar el historial de actividad](#get-registros-actividad) |
| Actividad física | POST | `/registros-actividad` | [Registrar una actividad](#post-registros-actividad) |
| Actividad física | DELETE | `/registros-actividad/:id` | [Eliminar un registro de actividad](#delete-registros-actividad-id) |
| Hidratación | GET | `/hidratacion` | [Consultar el agua de un día](#get-hidratacion) |
| Hidratación | POST | `/hidratacion` | [Registrar agua](#post-hidratacion) |
| Hidratación | DELETE | `/hidratacion/ultimo` | [Deshacer el último registro de agua](#delete-hidratacion-ultimo) |
| Nutrición | GET | `/comidas` | [Consultar las comidas](#get-comidas) |
| Nutrición | POST | `/comidas` | [Registrar una comida](#post-comidas) |
| Nutrición | PUT | `/comidas/:id` | [Actualizar una comida](#put-comidas-id) |
| Nutrición | DELETE | `/comidas/:id` | [Eliminar una comida](#delete-comidas-id) |
| Sueño | GET | `/sueno` | [Consultar el sueño](#get-sueno) |
| Sueño | POST | `/sueno` | [Registrar el sueño de un día](#post-sueno) |
| Sueño | DELETE | `/sueno/:id` | [Eliminar un registro de sueño](#delete-sueno-id) |
| Hábitos | GET | `/habitos` | [Consultar los hábitos](#get-habitos) |
| Hábitos | POST | `/habitos` | [Registrar un hábito](#post-habitos) |
| Hábitos | GET | `/habitos/:id` | [Consultar un hábito](#get-habitos-id) |
| Hábitos | PUT | `/habitos/:id` | [Actualizar un hábito](#put-habitos-id) |
| Hábitos | DELETE | `/habitos/:id` | [Eliminar un hábito](#delete-habitos-id) |
| Hábitos | POST | `/habitos/:id/registros` | [Registrar el cumplimiento](#post-habitos-id-registros) |
| Estadísticas | GET | `/estadisticas/dia` | [Consultar el resumen de un día](#get-estadisticas-dia) |
| Estadísticas | GET | `/estadisticas/semana` | [Consultar los últimos 7 días](#get-estadisticas-semana) |

## Generales

Estado de la API y listas de valores permitidos.

<a id="get-salud"></a>

### Consultar el estado de la API

`GET /salud` · Público

**Respuestas**

| Código | Significado |
|---|---|
| 200 | La API está en servicio |

**Ejemplo**

```http
GET /api/v1/salud
```

```json
// 200 OK
{
  "ok": true,
  "datos": {
    "servicio": "vitahealth-api",
    "version": "1.0.0",
    "fecha": "2026-11-04T17:00:00.000Z"
  }
}
```

<a id="get-catalogos"></a>

### Consultar los valores permitidos

`GET /catalogos` · Público

**Respuestas**

| Código | Significado |
|---|---|
| 200 | Listas de categorías, frecuencias, tipos de comida y calidades de sueño |

**Ejemplo**

```http
GET /api/v1/catalogos
```

```json
// 200 OK
{
  "ok": true,
  "datos": {
    "categoriasHabito": [
      "hidratacion",
      "actividad_fisica",
      "sueno",
      "alimentacion",
      "bienestar"
    ],
    "frecuenciasHabito": [
      "diaria",
      "semanal"
    ],
    "tiposComida": [
      "desayuno",
      "almuerzo",
      "cena",
      "merienda"
    ],
    "calidadesSueno": [
      "buena",
      "regular",
      "mala"
    ]
  }
}
```

## Cuentas y sesiones

Registro, inicio y cierre de sesión con token JWT.

<a id="post-auth-registro"></a>

### Crear una cuenta

`POST /auth/registro` · Público · HU01 / RF01

**Cuerpo**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `nombre` | texto | Sí | Máximo 80 caracteres |
| `apellido` | texto | Sí | Máximo 80 caracteres |
| `correo` | texto | Sí | Correo válido y no registrado; máximo 120 caracteres |
| `contrasena` | texto | Sí | De 8 a 128 caracteres, con letras y números |
| `confirmacion` | texto | Sí | Igual a contrasena |
| `aceptaTerminos` | booleano | Sí | Debe ser true |

**Respuestas**

| Código | Significado |
|---|---|
| 201 | Cuenta creada |
| 400 | Datos no válidos |
| 409 | El correo ya está registrado |

**Ejemplo**

```http
POST /api/v1/auth/registro

{
  "nombre": "Ingri Daniela",
  "apellido": "Rojas Sánchez",
  "correo": "daniela@ejemplo.com",
  "contrasena": "Salud2026",
  "confirmacion": "Salud2026",
  "aceptaTerminos": true
}
```

```json
// 201 Created
{
  "ok": true,
  "datos": {
    "id": "7a102d14-add1-49a6-8972-34fbefe56330",
    "nombre": "Ingri Daniela",
    "apellido": "Rojas Sánchez",
    "correo": "daniela@ejemplo.com",
    "fechaRegistro": "2026-11-04T17:00:00.000Z"
  }
}
```

<a id="post-auth-login"></a>

### Iniciar sesión

`POST /auth/login` · Público · HU02 / RF02

Devuelve el token que debe enviarse en los demás servicios con la cabecera `Authorization: Bearer <token>`. Vence a las 2 horas. Tras 5 intentos fallidos se bloquea el acceso por 15 minutos.

**Cuerpo**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `correo` | texto | Sí | Correo de la cuenta |
| `contrasena` | texto | Sí | Contraseña de la cuenta |

**Respuestas**

| Código | Significado |
|---|---|
| 200 | Sesión iniciada |
| 401 | Correo o contraseña incorrectos (mensaje genérico) |
| 429 | Demasiados intentos fallidos |

**Ejemplo**

```http
POST /api/v1/auth/login

{
  "correo": "daniela@ejemplo.com",
  "contrasena": "Salud2026"
}
```

```json
// 200 OK
{
  "ok": true,
  "datos": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiraEn": 7200,
    "tipo": "Bearer",
    "usuario": {
      "id": "7a102d14-add1-49a6-8972-34fbefe56330",
      "nombre": "Ingri Daniela",
      "apellido": "Rojas Sánchez",
      "correo": "daniela@ejemplo.com",
      "fechaRegistro": "2026-11-04T17:00:00.000Z"
    }
  }
}
```

<a id="post-auth-logout"></a>

### Cerrar sesión

`POST /auth/logout` · Requiere token · HU07 / RNF04

Revoca el token usado en la petición.

**Respuestas**

| Código | Significado |
|---|---|
| 204 | Sesión cerrada |
| 401 | Falta el token o no es válido |

**Ejemplo**

```http
POST /api/v1/auth/logout
```

```json
// 204 No Content
(sin contenido)
```

## Perfil

Datos personales, medidas e índice de masa corporal.

<a id="get-perfil"></a>

### Consultar el perfil y el IMC

`GET /perfil` · Requiere token · HU06 / RF03, RF08

**Respuestas**

| Código | Significado |
|---|---|
| 200 | Perfil del usuario |
| 401 | Falta el token o no es válido |

**Ejemplo**

```http
GET /api/v1/perfil
```

```json
// 200 OK
{
  "ok": true,
  "datos": {
    "id": "7a102d14-add1-49a6-8972-34fbefe56330",
    "nombre": "Ingri Daniela",
    "apellido": "Rojas Sánchez",
    "correo": "daniela@ejemplo.com",
    "fechaRegistro": "2026-11-04T17:00:00.000Z",
    "fechaNacimiento": "2000-05-20",
    "pesoKg": 62.5,
    "alturaCm": 165,
    "objetivo": "Mejorar mi condición física",
    "imc": 23,
    "clasificacionImc": "Peso saludable"
  }
}
```

<a id="put-perfil"></a>

### Actualizar el perfil

`PUT /perfil` · Requiere token · HU06 / RF03, RF08

Solo cambian los campos enviados. Con `null` se borra fechaNacimiento, pesoKg, alturaCm u objetivo.

**Cuerpo**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `nombre` | texto | No | Máximo 80 caracteres |
| `apellido` | texto | No | Máximo 80 caracteres |
| `fechaNacimiento` | fecha | No | Edad mínima: 13 años |
| `pesoKg` | número | No | De 20 a 400 |
| `alturaCm` | número | No | De 50 a 250 |
| `objetivo` | texto | No | Máximo 120 caracteres |

**Respuestas**

| Código | Significado |
|---|---|
| 200 | Perfil actualizado |
| 400 | Datos no válidos |
| 401 | Falta el token o no es válido |

**Ejemplo**

```http
PUT /api/v1/perfil

{
  "fechaNacimiento": "2000-05-20",
  "pesoKg": 62.5,
  "alturaCm": 165,
  "objetivo": "Mejorar mi condición física"
}
```

```json
// 200 OK
{
  "ok": true,
  "datos": {
    "id": "7a102d14-add1-49a6-8972-34fbefe56330",
    "nombre": "Ingri Daniela",
    "apellido": "Rojas Sánchez",
    "correo": "daniela@ejemplo.com",
    "fechaRegistro": "2026-11-04T17:00:00.000Z",
    "fechaNacimiento": "2000-05-20",
    "pesoKg": 62.5,
    "alturaCm": 165,
    "objetivo": "Mejorar mi condición física",
    "imc": 23,
    "clasificacionImc": "Peso saludable"
  }
}
```

## Actividad física

Catálogo de actividades y registro de ejercicio con cálculo de calorías.

<a id="get-actividades"></a>

### Consultar el catálogo de actividades

`GET /actividades` · Requiere token · HU05 / RF05

**Respuestas**

| Código | Significado |
|---|---|
| 200 | Actividades con sus calorías por hora |
| 401 | Falta el token o no es válido |

**Ejemplo**

```http
GET /api/v1/actividades
```

```json
// 200 OK
{
  "ok": true,
  "datos": [
    {
      "id": 1,
      "nombre": "Caminata",
      "descripcion": "Caminar a paso moderado",
      "tipo": "Cardio",
      "caloriasHora": 280
    },
    {
      "id": 2,
      "nombre": "Trote",
      "descripcion": "Correr a ritmo suave",
      "tipo": "Cardio",
      "caloriasHora": 600
    },
    {
      "id": 3,
      "nombre": "Ciclismo",
      "descripcion": "Bicicleta a ritmo moderado",
      "tipo": "Cardio",
      "caloriasHora": 480
    },
    {
      "id": 4,
      "nombre": "Natación",
      "descripcion": "Nado continuo",
      "tipo": "Cardio",
      "caloriasHora": 500
    },
    {
      "id": 5,
      "nombre": "Entrenamiento de fuerza",
      "descripcion": "Pesas o peso corporal",
      "tipo": "Fuerza",
      "caloriasHora": 320
    },
    {
      "id": 6,
      "nombre": "Yoga",
      "descripcion": "Posturas y respiración",
      "tipo": "Flexibilidad",
      "caloriasHora": 180
    },
    {
      "id": 7,
      "nombre": "Baile",
      "descripcion": "Rumba, salsa o aeróbicos",
      "tipo": "Cardio",
      "caloriasHora": 400
    },
    {
      "id": 8,
      "nombre": "Estiramientos",
      "descripcion": "Rutina de movilidad",
      "tipo": "Flexibilidad",
      "caloriasHora": 150
    }
  ]
}
```

<a id="get-registros-actividad"></a>

### Consultar el historial de actividad

`GET /registros-actividad` · Requiere token · HU05 / RF05

**Parámetros de consulta**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `desde` | fecha | No | Fecha inicial AAAA-MM-DD |
| `hasta` | fecha | No | Fecha final AAAA-MM-DD |

**Respuestas**

| Código | Significado |
|---|---|
| 200 | Registros, del más reciente al más antiguo |
| 400 | Datos no válidos |
| 401 | Falta el token o no es válido |

**Ejemplo**

```http
GET /api/v1/registros-actividad?desde=2026-11-01&hasta=2026-11-04
```

```json
// 200 OK
{
  "ok": true,
  "datos": [
    {
      "id": "96bb2146-8079-4ddf-9717-e81aba32a407",
      "actividadId": 1,
      "actividad": "Caminata",
      "fecha": "2026-11-04",
      "duracionMinutos": 30,
      "caloriasQuemadas": 140
    }
  ]
}
```

<a id="post-registros-actividad"></a>

### Registrar una actividad

`POST /registros-actividad` · Requiere token · HU05 / RF05

Las calorías se calculan solas: calorías por hora × minutos / 60.

**Cuerpo**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `actividadId` | entero | Sí | Id del catálogo (1 a 8) |
| `duracionMinutos` | entero | Sí | De 1 a 600 |
| `fecha` | fecha | No | AAAA-MM-DD, no futura. Por defecto, hoy |

**Respuestas**

| Código | Significado |
|---|---|
| 201 | Actividad registrada |
| 400 | Datos no válidos |
| 401 | Falta el token o no es válido |

**Ejemplo**

```http
POST /api/v1/registros-actividad

{
  "actividadId": 1,
  "duracionMinutos": 30,
  "fecha": "2026-11-04"
}
```

```json
// 201 Created
{
  "ok": true,
  "datos": {
    "id": "96bb2146-8079-4ddf-9717-e81aba32a407",
    "actividadId": 1,
    "actividad": "Caminata",
    "fecha": "2026-11-04",
    "duracionMinutos": 30,
    "caloriasQuemadas": 140
  }
}
```

<a id="delete-registros-actividad-id"></a>

### Eliminar un registro de actividad

`DELETE /registros-actividad/:id` · Requiere token · HU05 / RF05

**Parámetro de ruta:** `id`, identificador del registro.

**Respuestas**

| Código | Significado |
|---|---|
| 204 | Registro eliminado |
| 401 | Falta el token o no es válido |
| 404 | No existe o es de otro usuario |

**Ejemplo**

```http
DELETE /api/v1/registros-actividad/96bb2146-8079-4ddf-9717-e81aba32a407
```

```json
// 204 No Content
(sin contenido)
```

## Hidratación

Registro de agua frente a la meta diaria de 2000 ml (8 vasos de 250 ml).

<a id="get-hidratacion"></a>

### Consultar el agua de un día

`GET /hidratacion` · Requiere token · HU04 / RF04

**Parámetros de consulta**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `fecha` | fecha | No | AAAA-MM-DD. Por defecto, hoy |

**Respuestas**

| Código | Significado |
|---|---|
| 200 | Registros, total, vasos y porcentaje de la meta |
| 400 | Datos no válidos |
| 401 | Falta el token o no es válido |

**Ejemplo**

```http
GET /api/v1/hidratacion
```

```json
// 200 OK
{
  "ok": true,
  "datos": {
    "fecha": "2026-11-04",
    "totalMl": 1000,
    "metaMl": 2000,
    "vasos": 4,
    "porcentaje": 50,
    "registros": [
      {
        "id": "84aec239-8da5-458f-9f96-d7b4fa0d2810",
        "fecha": "2026-11-04",
        "cantidadMl": 500
      },
      {
        "id": "8dc3cbed-d6de-44c9-89b7-fdd37bd2c689",
        "fecha": "2026-11-04",
        "cantidadMl": 500
      }
    ]
  }
}
```

<a id="post-hidratacion"></a>

### Registrar agua

`POST /hidratacion` · Requiere token · HU04 / RF04

**Cuerpo**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `cantidadMl` | entero | Sí | De 50 a 3000 |
| `fecha` | fecha | No | AAAA-MM-DD, no futura. Por defecto, hoy |

**Respuestas**

| Código | Significado |
|---|---|
| 201 | Agua registrada; devuelve el resumen del día |
| 400 | Datos no válidos |
| 401 | Falta el token o no es válido |

**Ejemplo**

```http
POST /api/v1/hidratacion

{
  "cantidadMl": 500
}
```

```json
// 201 Created
{
  "ok": true,
  "datos": {
    "fecha": "2026-11-04",
    "totalMl": 1000,
    "metaMl": 2000,
    "vasos": 4,
    "porcentaje": 50,
    "registros": [
      {
        "id": "84aec239-8da5-458f-9f96-d7b4fa0d2810",
        "fecha": "2026-11-04",
        "cantidadMl": 500
      },
      {
        "id": "8dc3cbed-d6de-44c9-89b7-fdd37bd2c689",
        "fecha": "2026-11-04",
        "cantidadMl": 500
      }
    ]
  }
}
```

<a id="delete-hidratacion-ultimo"></a>

### Deshacer el último registro de agua

`DELETE /hidratacion/ultimo` · Requiere token · HU04 / RF04

**Parámetros de consulta**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `fecha` | fecha | No | AAAA-MM-DD. Por defecto, hoy |

**Respuestas**

| Código | Significado |
|---|---|
| 200 | Registro eliminado; devuelve el resumen del día |
| 401 | Falta el token o no es válido |
| 404 | No hay registros ese día |

**Ejemplo**

```http
DELETE /api/v1/hidratacion/ultimo
```

```json
// 200 OK
{
  "ok": true,
  "datos": {
    "fecha": "2026-11-04",
    "totalMl": 500,
    "metaMl": 2000,
    "vasos": 2,
    "porcentaje": 25,
    "registros": [
      {
        "id": "84aec239-8da5-458f-9f96-d7b4fa0d2810",
        "fecha": "2026-11-04",
        "cantidadMl": 500
      }
    ]
  }
}
```

## Nutrición

Registro de comidas y sus calorías.

<a id="get-comidas"></a>

### Consultar las comidas

`GET /comidas` · Requiere token

**Parámetros de consulta**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `desde` | fecha | No | Fecha inicial AAAA-MM-DD |
| `hasta` | fecha | No | Fecha final AAAA-MM-DD |

**Respuestas**

| Código | Significado |
|---|---|
| 200 | Comidas, de la más reciente a la más antigua |
| 400 | Datos no válidos |
| 401 | Falta el token o no es válido |

**Ejemplo**

```http
GET /api/v1/comidas
```

```json
// 200 OK
{
  "ok": true,
  "datos": [
    {
      "id": "4cf3baa7-abda-42eb-ae22-966ee8936bac",
      "tipo": "almuerzo",
      "descripcion": "Arroz con pollo y ensalada",
      "calorias": 600,
      "fecha": "2026-11-04"
    }
  ]
}
```

<a id="post-comidas"></a>

### Registrar una comida

`POST /comidas` · Requiere token

**Cuerpo**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `tipo` | texto | Sí | desayuno, almuerzo, cena o merienda |
| `descripcion` | texto | Sí | Máximo 120 caracteres |
| `calorias` | número | Sí | De 0 a 5000 |
| `fecha` | fecha | No | AAAA-MM-DD, no futura. Por defecto, hoy |

**Respuestas**

| Código | Significado |
|---|---|
| 201 | Comida registrada |
| 400 | Datos no válidos |
| 401 | Falta el token o no es válido |

**Ejemplo**

```http
POST /api/v1/comidas

{
  "tipo": "almuerzo",
  "descripcion": "Arroz con pollo y ensalada",
  "calorias": 650
}
```

```json
// 201 Created
{
  "ok": true,
  "datos": {
    "id": "4cf3baa7-abda-42eb-ae22-966ee8936bac",
    "tipo": "almuerzo",
    "descripcion": "Arroz con pollo y ensalada",
    "calorias": 650,
    "fecha": "2026-11-04"
  }
}
```

<a id="put-comidas-id"></a>

### Actualizar una comida

`PUT /comidas/:id` · Requiere token

Solo cambian los campos enviados.

**Parámetro de ruta:** `id`, identificador del registro.

**Cuerpo**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `tipo` | texto | No | desayuno, almuerzo, cena o merienda |
| `descripcion` | texto | No | Máximo 120 caracteres |
| `calorias` | número | No | De 0 a 5000 |
| `fecha` | fecha | No | AAAA-MM-DD, no futura. Por defecto, hoy |

**Respuestas**

| Código | Significado |
|---|---|
| 200 | Comida actualizada |
| 400 | Datos no válidos |
| 401 | Falta el token o no es válido |
| 404 | No existe o es de otro usuario |

**Ejemplo**

```http
PUT /api/v1/comidas/4cf3baa7-abda-42eb-ae22-966ee8936bac

{
  "calorias": 600
}
```

```json
// 200 OK
{
  "ok": true,
  "datos": {
    "id": "4cf3baa7-abda-42eb-ae22-966ee8936bac",
    "tipo": "almuerzo",
    "descripcion": "Arroz con pollo y ensalada",
    "calorias": 600,
    "fecha": "2026-11-04"
  }
}
```

<a id="delete-comidas-id"></a>

### Eliminar una comida

`DELETE /comidas/:id` · Requiere token

**Parámetro de ruta:** `id`, identificador del registro.

**Respuestas**

| Código | Significado |
|---|---|
| 204 | Comida eliminada |
| 401 | Falta el token o no es válido |
| 404 | No existe o es de otro usuario |

**Ejemplo**

```http
DELETE /api/v1/comidas/4cf3baa7-abda-42eb-ae22-966ee8936bac
```

```json
// 204 No Content
(sin contenido)
```

## Sueño

Horas y calidad del sueño de cada día.

<a id="get-sueno"></a>

### Consultar el sueño

`GET /sueno` · Requiere token

**Parámetros de consulta**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `desde` | fecha | No | Fecha inicial AAAA-MM-DD |
| `hasta` | fecha | No | Fecha final AAAA-MM-DD |

**Respuestas**

| Código | Significado |
|---|---|
| 200 | Registros, del más reciente al más antiguo |
| 400 | Datos no válidos |
| 401 | Falta el token o no es válido |

**Ejemplo**

```http
GET /api/v1/sueno
```

```json
// 200 OK
{
  "ok": true,
  "datos": [
    {
      "id": "26e4e01f-79f8-4f10-908b-20f3bdb49031",
      "fecha": "2026-11-04",
      "horas": 7.5,
      "calidad": "buena"
    }
  ]
}
```

<a id="post-sueno"></a>

### Registrar el sueño de un día

`POST /sueno` · Requiere token

**Cuerpo**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `horas` | número | Sí | De 0.5 a 24 |
| `calidad` | texto | No | buena, regular o mala |
| `fecha` | fecha | No | AAAA-MM-DD, no futura. Por defecto, hoy |

**Respuestas**

| Código | Significado |
|---|---|
| 201 | Sueño registrado |
| 400 | Datos no válidos |
| 401 | Falta el token o no es válido |
| 409 | Ya hay un registro para esa fecha |

**Ejemplo**

```http
POST /api/v1/sueno

{
  "horas": 7.5,
  "calidad": "buena"
}
```

```json
// 201 Created
{
  "ok": true,
  "datos": {
    "id": "26e4e01f-79f8-4f10-908b-20f3bdb49031",
    "fecha": "2026-11-04",
    "horas": 7.5,
    "calidad": "buena"
  }
}
```

<a id="delete-sueno-id"></a>

### Eliminar un registro de sueño

`DELETE /sueno/:id` · Requiere token

**Parámetro de ruta:** `id`, identificador del registro.

**Respuestas**

| Código | Significado |
|---|---|
| 204 | Registro eliminado |
| 401 | Falta el token o no es válido |
| 404 | No existe o es de otro usuario |

**Ejemplo**

```http
DELETE /api/v1/sueno/26e4e01f-79f8-4f10-908b-20f3bdb49031
```

```json
// 204 No Content
(sin contenido)
```

## Hábitos

Hábitos saludables con cumplimiento, progreso y racha.

<a id="get-habitos"></a>

### Consultar los hábitos

`GET /habitos` · Requiere token · HU09

**Parámetros de consulta**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `categoria` | texto | No | hidratacion, actividad_fisica, sueno, alimentacion o bienestar |

**Respuestas**

| Código | Significado |
|---|---|
| 200 | Hábitos con su resumen |
| 400 | Datos no válidos |
| 401 | Falta el token o no es válido |

**Ejemplo**

```http
GET /api/v1/habitos
```

```json
// 200 OK
{
  "ok": true,
  "datos": [
    {
      "id": "1597811a-81b8-4fa3-a70f-7dd3e65292fa",
      "descripcion": null,
      "unidad": "minutos",
      "nombre": "Meditar",
      "categoria": "bienestar",
      "frecuencia": "diaria",
      "meta": 15,
      "activo": true,
      "fechaCreacion": "2026-11-04T17:00:00.000Z",
      "registros": [
        {
          "fecha": "2026-11-04",
          "cantidad": 15
        }
      ],
      "resumen": {
        "periodo": "dia",
        "cantidad": 15,
        "porcentaje": 100,
        "metaCumplida": true,
        "racha": 1
      }
    }
  ]
}
```

<a id="post-habitos"></a>

### Registrar un hábito

`POST /habitos` · Requiere token · HU08

**Cuerpo**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `nombre` | texto | Sí | Máximo 60 caracteres |
| `categoria` | texto | Sí | hidratacion, actividad_fisica, sueno, alimentacion o bienestar |
| `frecuencia` | texto | Sí | diaria o semanal |
| `meta` | número | Sí | Mayor que cero |
| `descripcion` | texto | No | Máximo 200 caracteres |
| `unidad` | texto | No | Máximo 20 caracteres. Por defecto, veces |

**Respuestas**

| Código | Significado |
|---|---|
| 201 | Hábito registrado |
| 400 | Datos no válidos |
| 401 | Falta el token o no es válido |

**Ejemplo**

```http
POST /api/v1/habitos

{
  "nombre": "Meditar",
  "categoria": "bienestar",
  "frecuencia": "diaria",
  "meta": 10,
  "unidad": "minutos"
}
```

```json
// 201 Created
{
  "ok": true,
  "datos": {
    "id": "1597811a-81b8-4fa3-a70f-7dd3e65292fa",
    "descripcion": null,
    "unidad": "minutos",
    "nombre": "Meditar",
    "categoria": "bienestar",
    "frecuencia": "diaria",
    "meta": 10,
    "activo": true,
    "fechaCreacion": "2026-11-04T17:00:00.000Z",
    "registros": [],
    "resumen": {
      "periodo": "dia",
      "cantidad": 0,
      "porcentaje": 0,
      "metaCumplida": false,
      "racha": 0
    }
  }
}
```

<a id="get-habitos-id"></a>

### Consultar un hábito

`GET /habitos/:id` · Requiere token · HU09, HU13

**Parámetro de ruta:** `id`, identificador del registro.

**Respuestas**

| Código | Significado |
|---|---|
| 200 | Hábito con su progreso y racha |
| 401 | Falta el token o no es válido |
| 404 | No existe o es de otro usuario |

**Ejemplo**

```http
GET /api/v1/habitos/1597811a-81b8-4fa3-a70f-7dd3e65292fa
```

```json
// 200 OK
{
  "ok": true,
  "datos": {
    "id": "1597811a-81b8-4fa3-a70f-7dd3e65292fa",
    "descripcion": null,
    "unidad": "minutos",
    "nombre": "Meditar",
    "categoria": "bienestar",
    "frecuencia": "diaria",
    "meta": 15,
    "activo": true,
    "fechaCreacion": "2026-11-04T17:00:00.000Z",
    "registros": [
      {
        "fecha": "2026-11-04",
        "cantidad": 15
      }
    ],
    "resumen": {
      "periodo": "dia",
      "cantidad": 15,
      "porcentaje": 100,
      "metaCumplida": true,
      "racha": 1
    }
  }
}
```

<a id="put-habitos-id"></a>

### Actualizar un hábito

`PUT /habitos/:id` · Requiere token · HU10

Solo cambian los campos enviados; el historial de registros se conserva.

**Parámetro de ruta:** `id`, identificador del registro.

**Cuerpo**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `nombre` | texto | No | Máximo 60 caracteres |
| `categoria` | texto | No | Una categoría del catálogo |
| `frecuencia` | texto | No | diaria o semanal |
| `meta` | número | No | Mayor que cero |
| `descripcion` | texto | No | Máximo 200 caracteres |
| `unidad` | texto | No | Máximo 20 caracteres |
| `activo` | booleano | No | false lo excluye del panel diario |

**Respuestas**

| Código | Significado |
|---|---|
| 200 | Hábito actualizado |
| 400 | Datos no válidos |
| 401 | Falta el token o no es válido |
| 404 | No existe o es de otro usuario |

**Ejemplo**

```http
PUT /api/v1/habitos/1597811a-81b8-4fa3-a70f-7dd3e65292fa

{
  "meta": 15
}
```

```json
// 200 OK
{
  "ok": true,
  "datos": {
    "id": "1597811a-81b8-4fa3-a70f-7dd3e65292fa",
    "descripcion": null,
    "unidad": "minutos",
    "nombre": "Meditar",
    "categoria": "bienestar",
    "frecuencia": "diaria",
    "meta": 15,
    "activo": true,
    "fechaCreacion": "2026-11-04T17:00:00.000Z",
    "registros": [],
    "resumen": {
      "periodo": "dia",
      "cantidad": 0,
      "porcentaje": 0,
      "metaCumplida": false,
      "racha": 0
    }
  }
}
```

<a id="delete-habitos-id"></a>

### Eliminar un hábito

`DELETE /habitos/:id` · Requiere token · HU11

**Parámetro de ruta:** `id`, identificador del registro.

**Respuestas**

| Código | Significado |
|---|---|
| 204 | Hábito eliminado |
| 401 | Falta el token o no es válido |
| 404 | No existe o es de otro usuario |

**Ejemplo**

```http
DELETE /api/v1/habitos/1597811a-81b8-4fa3-a70f-7dd3e65292fa
```

```json
// 204 No Content
(sin contenido)
```

<a id="post-habitos-id-registros"></a>

### Registrar el cumplimiento

`POST /habitos/:id/registros` · Requiere token · HU12, HU13

Suma al avance del día y devuelve el progreso del periodo y la racha. En los hábitos semanales el progreso acumula de lunes a domingo y la racha cuenta semanas.

**Parámetro de ruta:** `id`, identificador del registro.

**Cuerpo**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `cantidad` | número | Sí | Mayor que cero |
| `fecha` | fecha | No | AAAA-MM-DD, no futura. Por defecto, hoy |

**Respuestas**

| Código | Significado |
|---|---|
| 201 | Cumplimiento registrado |
| 400 | Datos no válidos |
| 401 | Falta el token o no es válido |
| 404 | No existe o es de otro usuario |

**Ejemplo**

```http
POST /api/v1/habitos/1597811a-81b8-4fa3-a70f-7dd3e65292fa/registros

{
  "cantidad": 15
}
```

```json
// 201 Created
{
  "ok": true,
  "datos": {
    "id": "1597811a-81b8-4fa3-a70f-7dd3e65292fa",
    "descripcion": null,
    "unidad": "minutos",
    "nombre": "Meditar",
    "categoria": "bienestar",
    "frecuencia": "diaria",
    "meta": 15,
    "activo": true,
    "fechaCreacion": "2026-11-04T17:00:00.000Z",
    "registros": [
      {
        "fecha": "2026-11-04",
        "cantidad": 15
      }
    ],
    "resumen": {
      "periodo": "dia",
      "cantidad": 15,
      "porcentaje": 100,
      "metaCumplida": true,
      "racha": 1
    }
  }
}
```

## Estadísticas

Resumen que combina los datos de todos los módulos.

<a id="get-estadisticas-dia"></a>

### Consultar el resumen de un día

`GET /estadisticas/dia` · Requiere token · HU03 / RF06

**Parámetros de consulta**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `fecha` | fecha | No | AAAA-MM-DD. Por defecto, hoy |

**Respuestas**

| Código | Significado |
|---|---|
| 200 | Totales del día y hábitos cumplidos |
| 400 | Datos no válidos |
| 401 | Falta el token o no es válido |

**Ejemplo**

```http
GET /api/v1/estadisticas/dia
```

```json
// 200 OK
{
  "ok": true,
  "datos": {
    "fecha": "2026-11-04",
    "minutosActividad": 30,
    "caloriasQuemadas": 140,
    "caloriasConsumidas": 600,
    "aguaMl": 1000,
    "horasSueno": 7.5,
    "vasos": 4,
    "porcentajeAgua": 50,
    "habitos": {
      "activos": 1,
      "cumplidos": 1
    }
  }
}
```

<a id="get-estadisticas-semana"></a>

### Consultar los últimos 7 días

`GET /estadisticas/semana` · Requiere token · HU03 / RF06

**Parámetros de consulta**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `hasta` | fecha | No | Último día, no futuro. Por defecto, hoy |

**Respuestas**

| Código | Significado |
|---|---|
| 200 | Totales por día y de la semana |
| 400 | Datos no válidos |
| 401 | Falta el token o no es válido |

**Ejemplo**

```http
GET /api/v1/estadisticas/semana
```

```json
// 200 OK
{
  "ok": true,
  "datos": {
    "desde": "2026-10-29",
    "hasta": "2026-11-04",
    "dias": [
      {
        "fecha": "2026-10-29",
        "minutosActividad": 0,
        "caloriasQuemadas": 0,
        "caloriasConsumidas": 0,
        "aguaMl": 0,
        "horasSueno": 0
      },
      {
        "fecha": "2026-10-30",
        "minutosActividad": 0,
        "caloriasQuemadas": 0,
        "caloriasConsumidas": 0,
        "aguaMl": 0,
        "horasSueno": 0
      },
      {
        "fecha": "2026-10-31",
        "minutosActividad": 0,
        "caloriasQuemadas": 0,
        "caloriasConsumidas": 0,
        "aguaMl": 0,
        "horasSueno": 0
      },
      {
        "fecha": "2026-11-01",
        "minutosActividad": 0,
        "caloriasQuemadas": 0,
        "caloriasConsumidas": 0,
        "aguaMl": 0,
        "horasSueno": 0
      },
      {
        "fecha": "2026-11-02",
        "minutosActividad": 0,
        "caloriasQuemadas": 0,
        "caloriasConsumidas": 0,
        "aguaMl": 0,
        "horasSueno": 0
      },
      {
        "fecha": "2026-11-03",
        "minutosActividad": 0,
        "caloriasQuemadas": 0,
        "caloriasConsumidas": 0,
        "aguaMl": 0,
        "horasSueno": 0
      },
      {
        "fecha": "2026-11-04",
        "minutosActividad": 30,
        "caloriasQuemadas": 140,
        "caloriasConsumidas": 600,
        "aguaMl": 1000,
        "horasSueno": 7.5
      }
    ],
    "totales": {
      "minutosActividad": 30,
      "caloriasQuemadas": 140,
      "caloriasConsumidas": 600,
      "aguaMl": 1000,
      "horasSueno": 7.5
    }
  }
}
```

## Errores comunes

| Código | Cuándo ocurre |
|---|---|
| 400 | Datos no válidos o JSON mal formado |
| 401 | Falta el token, no es válido, venció o fue revocado |
| 404 | La ruta o el registro no existe, o el registro es de otro usuario |
| 405 | La ruta existe pero no admite ese método |
| 409 | Conflicto con datos existentes |
| 413 | El cuerpo supera 100 KB |
| 415 | El cuerpo no se envió como JSON |
| 429 | Demasiados intentos fallidos de inicio de sesión |
| 500 | Error interno; no se exponen detalles |

```json
// 400 Bad Request
{
  "ok": false,
  "mensaje": "Los datos enviados no son válidos",
  "detalles": [
    "El campo \"nombre\" es obligatorio.",
    "El campo \"categoria\" es obligatorio.",
    "El campo \"frecuencia\" es obligatorio.",
    "El campo \"meta\" debe estar entre 0.01 y 100000."
  ]
}
```

```json
// 401 Unauthorized
{
  "ok": false,
  "mensaje": "La sesión no es válida o ya venció"
}
```

```json
// 404 Not Found
{
  "ok": false,
  "mensaje": "Hábito no encontrado"
}
```

```json
// 409 Conflict
{
  "ok": false,
  "mensaje": "Ya existe una cuenta con ese correo"
}
```
