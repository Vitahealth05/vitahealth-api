# Diseño de los servicios web de VitaHealth

Evidencia GA7-220501096-AA5-EV03.

## 1. Características del software y servicios

VitaHealth ayuda a las personas a llevar hábitos saludables. Los módulos funcionales definidos en los estándares del equipo (AA1-EV02) y los requisitos de `vitahealth-web` se traducen en estos recursos REST:

| Módulo del software | Requisito o historia | Recurso |
|---|---|---|
| Cuentas | RF01, RF02, RNF04 · HU01, HU02, HU07 | `/auth` |
| Perfil | RF03, RF08 · HU06 | `/perfil` |
| Ejercicio y actividad | RF05 · HU05 | `/actividades`, `/registros-actividad` |
| Hidratación | RF04 · HU04 | `/hidratacion` |
| Nutrición | Módulo de AA1-EV02 · HU14 | `/comidas` |
| Sueño | Módulo de AA1-EV02 · HU15 | `/sueno` |
| Hábitos | HU08 a HU13 | `/habitos` |
| Progreso y estadísticas | RF06 · HU03 | `/estadisticas` |

Las historias nuevas continúan la numeración del proyecto:

| ID | Historia de usuario | Criterios de aceptación |
|---|---|---|
| HU14 | **Como** usuario **quiero** registrar mis comidas **para** controlar las calorías que consumo. | Tipo de una lista, descripción obligatoria, calorías de 0 a 5000 y fecha no futura. Se puede editar y eliminar. |
| HU15 | **Como** usuario **quiero** registrar mis horas de sueño **para** revisar si descanso bien. | Horas de 0,5 a 24, calidad opcional, fecha no futura y un solo registro por día. |

## 2. Arquitectura

La API es una aplicación por capas. Cada capa solo conoce a la siguiente.

```
Cliente web o móvil
      │  HTTP + JSON, Authorization: Bearer <token>
      ▼
app.js ─────── seguridad de cabeceras, CORS, lectura de JSON, autenticación, errores
      │
rutas/ ─────── asocia método y ruta con un caso de uso
      │
servicios/ ─── reglas de negocio, validación y cálculos
      │
datos/ ─────── repositorio: lectura y escritura de datos/vitahealth.json
```

### Convenciones REST

| Aspecto | Regla |
|---|---|
| Versión | Todas las rutas empiezan por `/api/v1` |
| Recursos | Sustantivos: `/habitos`, `/habitos/:id` |
| Métodos | `GET` consulta, `POST` crea, `PUT` actualiza, `DELETE` elimina |
| Respuesta correcta | `{ "ok": true, "datos": ... }` |
| Respuesta de error | `{ "ok": false, "mensaje": "...", "detalles": [...] }` |
| Códigos | 200, 201, 204, 400, 401, 404, 405, 409, 413, 415, 429 y 500 |
| Fechas | `AAAA-MM-DD` |

## 3. Modelo de datos

Conserva las entidades de `database/vitahealth_postgresql.sql` y agrega comidas, sueño y hábitos.

```
Usuario ──1───0..1── Perfil
   │
   ├──1────*── RegistroActividad ──*───1── Actividad (catálogo)
   ├──1────*── Hidratacion
   ├──1────*── Comida
   ├──1────*── Sueno  (uno por usuario y fecha)
   └──1────*── Habito ──1────*── RegistroDiario
```

| Entidad | Campos |
|---|---|
| Usuario | id, nombre, apellido, correo (único), contrasena (hash), fechaRegistro |
| Perfil | usuarioId, fechaNacimiento, pesoKg, alturaCm, objetivo |
| RegistroActividad | id, usuarioId, actividadId, actividad, fecha, duracionMinutos, caloriasQuemadas |
| Hidratacion | id, usuarioId, fecha, cantidadMl |
| Comida | id, usuarioId, tipo, descripcion, calorias, fecha |
| Sueno | id, usuarioId, fecha, horas, calidad |
| Habito | id, usuarioId, nombre, descripcion, categoria, frecuencia, meta, unidad, activo, fechaCreacion, registros |

## 4. Reglas de negocio

| Regla | Valor |
|---|---|
| Contraseña | De 8 a 128 caracteres, con letras y números |
| IMC | peso / altura², con la clasificación de la OMS |
| Peso, altura y edad | De 20 a 400 kg, de 50 a 250 cm y mínimo 13 años |
| Calorías de actividad | Calorías por hora × minutos / 60 |
| Duración de actividad | De 1 a 600 minutos |
| Agua | De 50 a 3000 ml por registro; meta de 2000 ml; un vaso son 250 ml |
| Fechas de registro | No pueden ser futuras |
| Racha de hábitos | Periodos seguidos con la meta cumplida; si el actual aún no se cumple, cuenta desde el anterior |
| Hábitos semanales | El progreso acumula de lunes a domingo y la racha cuenta semanas |

## 5. Seguridad

| Riesgo | Medida |
|---|---|
| Robo de contraseñas | PBKDF2-HMAC-SHA256 con 210 000 iteraciones y sal aleatoria; nunca se devuelven |
| Suplantación | Token JWT HS256 con vencimiento de 2 horas; se verifican firma, algoritmo y emisor |
| Sesiones abiertas | `POST /auth/logout` revoca el token |
| Acceso a datos ajenos | Cada consulta filtra por el dueño; un registro ajeno responde 404 |
| Adivinar contraseñas | Bloqueo de 15 minutos tras 5 intentos fallidos por IP y correo |
| Descubrir correos | El mensaje de error es el mismo si el correo existe o no |
| Asignación masiva | Solo se copian campos validados; `id` o `registros` enviados se ignoran |
| Abuso de peticiones | Cuerpo máximo de 100 KB y validación de tipo y formato |
| Fuga de información | Los errores 500 no muestran detalles internos |
| Orígenes no autorizados | CORS solo para los orígenes de `CORS_ORIGENES` |

## 6. Decisiones de diseño

| Decisión | Razón | Consecuencia |
|---|---|---|
| Node.js sin dependencias externas (`node:http`, `node:crypto`) | Continúa la tecnología de `vitahealth-habitos` y se ejecuta sin instalar paquetes | El enrutador y los tokens son propios; si se pasa a Express cambian `app.js` y `http/enrutador.js`, no los servicios |
| Repositorio aparte de `vitahealth-web` | El módulo web está en Java; los clientes consumen esta API por HTTP | Los datos aún no se comparten con el módulo Java |
| Persistencia en archivo JSON | Permite ejecutar el proyecto sin instalar una base de datos | Sirve para desarrollo con un solo proceso; en producción debe cambiarse por PostgreSQL implementando la misma clase `Repositorio` |
| Hábitos por usuario | La versión de `vitahealth-habitos` no tenía cuentas | La racha y el progreso se calculan para cada persona |

## 7. Estándares del equipo aplicados (AA1-EV02)

| Regla | Aplicación |
|---|---|
| Organización por capas | `rutas`, `servicios`, `datos`, `http`, `seguridad` |
| camelCase, PascalCase y MAYÚSCULAS | `registrarCumplimiento`, `HabitoServicio`, `META_AGUA_ML` |
| Documentación de código | Comentarios JSDoc |
| Manejo de errores | `ErrorApi` con código HTTP y manejo central en `app.js` |
| Pruebas | `npm test` antes de integrar |
| Ramas y commits | `main`, `develop`, `feature/*` y Conventional Commits |

El proyecto incluye `.editorconfig`. No incluye ESLint ni Prettier porque añadirían dependencias de desarrollo que no se pudieron instalar ni ejecutar durante la construcción.
