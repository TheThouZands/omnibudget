# GA7-220501096-AA5-EV01

## Diseño y desarrollo de servicios web - caso

**Aprendiz:** Paulo Sánchez Contreras

**Ficha:** 3235889

**Proyecto:** Omnibudget

**Versión:** 0.33.0

**Fecha de verificación:** 21 de septiembre de 2026

## Resultado entregado

Esta evidencia contiene los servicios web de registro, inicio y cierre de sesión de Omnibudget. El correo electrónico identifica la cuenta. Los servicios de registro e inicio de sesión reciben ese correo y una contraseña.

Antes de crear una cuenta o iniciar sesión, la persona verifica su correo con un código de un solo uso (OTP). El servidor vincula esa verificación con el navegador que solicitó el código. Después del acceso correcto, la interfaz abre la herramienta de importación CSV.

El formulario se presenta como un modal desde la portada. También tiene una página de acceso directo en `/es/login`. La versión pública está disponible en [omnibudget.co](https://omnibudget.co).

## Relación con la actividad

| Solicitud de la guía | Implementación incluida |
| --- | --- |
| Servicio de registro | `POST /api/auth/register` crea la cuenta con el correo verificado, la contraseña y los datos del perfil. |
| Servicio de inicio de sesión | `POST /api/auth/login` recibe el correo y la contraseña. El servidor comprueba las credenciales. |
| Respuesta de autenticación correcta | El servicio devuelve HTTP 200 con `{"success":true}` y establece la cookie de sesión. |
| Respuesta de error de autenticación | Una contraseña incorrecta devuelve HTTP 401 con el código `invalid_credentials`. La ausencia de verificación devuelve HTTP 401 con `email_verification_required`. |
| Comentarios en el código | Los comentarios explican decisiones de seguridad, sesiones, persistencia e integración. |
| Control de versiones | El proyecto usa Git y commits pequeños con Conventional Commits. `REPOSITORIO.txt` identifica el repositorio y el código de referencia. |

Los requisitos funcionales corresponden a `RF-AUTH-01` y `RF-AUTH-02` del [KB](../../KB.md). La [trazabilidad de Confluence](https://thouzands.atlassian.net/wiki/spaces/O/pages/2654226/Requirements+Traceability) relaciona estos requisitos con el proyecto. [OB-5 en Jira](https://thouzands.atlassian.net/browse/OB-5) registra la organización de esa trazabilidad.

## Servicios incluidos

Las rutas reciben solicitudes HTTP y devuelven respuestas JSON. Las operaciones que modifican el estado comprueban el origen de la solicitud. El cliente conserva las cookies entre pasos.

| Método y ruta | Función |
| --- | --- |
| `POST /api/auth/otp/request` | Solicitar el código para un correo electrónico. |
| `POST /api/auth/otp/verify` | Comprobar el código y autorizar el siguiente paso en ese navegador. |
| `GET /api/auth/access` | Consultar el paso de acceso que corresponde a la sesión. |
| `DELETE /api/auth/access` | Descartar la verificación para cambiar el correo. |
| `POST /api/auth/register` | Registrar la cuenta y crear su sesión. |
| `POST /api/auth/login` | Validar las credenciales y crear la sesión. |
| `POST /api/auth/logout` | Revocar la sesión y la autorización de verificación. |

El registro solicita nombre visible, correo verificado, contraseña, confirmación y nombre del espacio de trabajo. El país y el teléfono son opcionales. El nombre del espacio se guarda en el perfil.

Zod valida los datos en el servidor. La contraseña nueva requiere entre 8 y 128 caracteres, con al menos una mayúscula, una minúscula, un número y un símbolo. Argon2id genera el hash de la contraseña. Better Auth administra las sesiones. La autorización OTP no sustituye la contraseña ni permite omitir su validación.

## Organización del código

- `src/app/api/auth/`: rutas HTTP de los servicios.
- `src/modules/auth/`: modelos, controladores, servicios, repositorios y gestión de sesiones.
- `src/components/auth/`: formularios y controles de acceso.
- `src/emails/`: plantilla HTML, texto plano e imágenes incorporadas al correo OTP.
- `src/db/schema.ts` y `supabase/migrations/`: modelos y migraciones de la base de datos.
- [Guía de acceso a cuentas](../../docs/modules/account-access.md): descripción técnica del flujo y de sus controles.

Las rutas de Next.js adaptan las solicitudes HTTP. El módulo de autenticación conserva las reglas en el servidor. La interfaz consume los servicios y muestra sus resultados.

## Ejecución local

Use Node.js 24 y npm. Extraiga el ZIP y abra una terminal en la carpeta `PAULO_SANCHEZ_AA5_EV01`. Ejecute:

```sh
npm ci
npm run dev
```

1. Abra `http://localhost:3000/es`.
2. Seleccione **Entrar a la plataforma**.
3. Escriba un correo de prueba y solicite el código.
4. Use el código que muestra el formulario en desarrollo.
5. Complete el registro si el correo es nuevo. Si la cuenta existe, escriba su contraseña.
6. Compruebe que la aplicación abre `/es/csv-import`.
7. Seleccione **Cerrar sesión** para volver a la portada.

Con la configuración predeterminada de desarrollo, no se envía correo real ni se necesita una base de datos remota. Las cuentas y las sesiones se conservan en memoria. Una recarga de la página conserva ese estado; un reinicio del servidor lo elimina.

Para conservar los datos entre reinicios, siga **Persistent local development** en el [README principal](../../README.md). Esa sección explica la base de datos local, los secretos estables y la separación de producción. El ZIP incluye `.env.example` como referencia; no contiene credenciales privadas.

## Verificación del punto de entrega

Se ejecutaron estas comprobaciones sobre la versión incluida:

- `npm test`: 436 pruebas aprobadas en 31 archivos.
- `npm run lint`: sin errores.
- `npm run typecheck`: sin errores.
- `npm run build`: compilación de producción correcta.

Las pruebas automatizadas incluyen credenciales incorrectas, verificación obligatoria, consumo único de la autorización, validación del registro y cierre de sesión. Permanecen en el proyecto para repetir las comprobaciones.

El archivo `PAULO_SANCHEZ_AA5_EV01.zip` contiene el código versionado, las migraciones, los recursos y esta documentación. El archivo `REPOSITORIO.txt` también está en la raíz del paquete. No se incluyen dependencias instaladas, compilaciones locales, credenciales ni archivos temporales de QA.
