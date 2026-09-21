# Acceso a cuentas

El acceso usa Better Auth, su adaptador Drizzle y Argon2id, como el proyecto `portfolio`. La aplicación conserva el hash en `users.password_hash`. Better Auth administra los tokens, las cookies y las sesiones persistentes en `auth_sessions`. No se expone su controlador genérico de autenticación.

## Flujo

1. El usuario escribe su correo y verifica el código OTP.
2. El servidor consulta la cuenta solo después de validar la sesión de verificación de ese navegador.
3. Si la cuenta existe, solicita la contraseña. Si no existe, solicita los datos de registro y una contraseña de 12 a 128 caracteres.
4. El servidor comprueba otra vez el correo verificado y consume la autorización de forma atómica. Una autorización solo permite un acceso correcto. El servidor limita los intentos de contraseña a cinco por autorización.
5. Better Auth crea una sesión de 30 días, con una cookie HttpOnly y SameSite=Strict; en producción también usa Secure. La sesión no se renueva de forma automática. Cerrar sesión elimina el registro del servidor.

La verificación inicial mantiene su límite de 30 minutos. Otro navegador necesita su propio OTP. Una recarga conserva tanto la autorización inicial como la sesión de acceso mientras sigan vigentes. Las contraseñas y los tokens no se guardan en el almacenamiento del navegador ni se incluyen en las respuestas JSON.

## Datos de registro

- El nombre de usuario es un nombre visible o apodo. No es un identificador único; el correo identifica la cuenta.
- El país es opcional y usa un código ISO de dos letras.
- El teléfono es opcional. `libphonenumber-js` valida el formato y lo convierte a E.164. El valor `phone_verified` siempre empieza en `false`. TODO: integrar un servicio de verificación antes de usar el teléfono como contacto verificado o mecanismo de recuperación.
- El nombre del espacio de trabajo es obligatorio y se guarda en `default_workspace_name`. Este flujo no crea todavía el espacio de trabajo ni sus cuentas financieras.

## Entornos

El almacenamiento de cuentas sigue el modo de la sesión de verificación (`VERIFICATION_SESSION_STORE_MODE`, o `OTP_STORE_MODE` como alternativa). Desarrollo usa memoria y correo emulado de forma predeterminada. Los datos de memoria no sobreviven al reinicio del servidor.

Para comprobar persistencia durante reinicios, use Supabase local o una rama de prueba, configure el modo `database` y mantenga estables los secretos. `npm run dev:local`, seguido de `npm run db:migrate`, permite preparar el entorno con Docker. No apunte las pruebas a la base de producción.

Producción requiere las migraciones `20260921052157_account_sessions.sql` y `20260921053505_auth_adapter_models.sql`, además de `BETTER_AUTH_SECRET`, con al menos 32 caracteres aleatorios. Use un secreto distinto de los secretos de OTP y de verificación. `BETTER_AUTH_URL` permite indicar el origen canónico. Cambiar el secreto invalida las cookies de acceso existentes.

Los formularios conservan identificadores y nombres estables. El correo verificado es de solo lectura y usa `autocomplete="username"`; la contraseña usa `current-password` al entrar y `new-password` al registrarse. El nombre visible usa `nickname`, el país usa `country` y el teléfono usa `tel`. Esto facilita el reconocimiento por navegadores y gestores de contraseñas, sin depender de una extensión específica.

Las tablas tienen RLS activo. El servidor accede con la conexión PostgreSQL privada. Las credenciales de Supabase para el navegador no conceden acceso a las sesiones.
