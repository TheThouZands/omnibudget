# Acceso a cuentas

El acceso usa Better Auth, su adaptador Drizzle y Argon2id, como el proyecto `portfolio`. La aplicación conserva el hash en `users.password_hash`. Better Auth administra los tokens, las cookies y las sesiones persistentes en `auth_sessions`. No se expone su controlador genérico de autenticación.

## Flujo

1. El usuario escribe su correo y verifica el código OTP.
2. El servidor consulta la cuenta solo después de validar la sesión de verificación de ese navegador.
3. Si la cuenta existe, solicita la contraseña. Si no existe, solicita los datos de registro y una contraseña de 8 a 128 caracteres, con al menos una mayúscula, una minúscula, un número y un símbolo. Zod aplica la política compartida. Los espacios se conservan, pero no cuentan como símbolo. La nueva política no bloquea el acceso de cuentas con contraseñas anteriores.
4. El servidor comprueba otra vez el correo verificado y consume la autorización de forma atómica. Una autorización solo permite un acceso correcto. El servidor limita los intentos de contraseña a cinco por autorización.
5. Better Auth crea una sesión de 30 días, con una cookie HttpOnly y SameSite=Strict; en producción también usa Secure. La sesión no se renueva de forma automática. Cerrar sesión elimina el registro del servidor.

La verificación inicial mantiene su límite de 30 minutos. Otro navegador necesita su propio OTP. Una recarga conserva tanto la autorización inicial como la sesión de acceso mientras sigan vigentes. Las contraseñas y los tokens no se guardan en el almacenamiento del navegador ni se incluyen en las respuestas JSON.

El correo OTP usa una [plantilla del repositorio](../../src/emails/README.md), con HTML y texto plano. Sus estilos y sus imágenes PNG se incluyen en el mensaje; no depende de imágenes ni fuentes externas. El logo y el guilloché proceden de los SVG originales y se incluyen mediante CID. El envío conserva la configuración SMTP y la emulación de desarrollo existentes. El campo del código usa `autocomplete="one-time-code"`; las sugerencias y las acciones para copiar dependen del sistema y de la aplicación de correo.

## Datos de registro

- El nombre de usuario es un nombre visible o apodo. No es un identificador único; el correo identifica la cuenta.
- El país es opcional y usa un código ISO de dos letras.
- El teléfono es opcional. El servidor usa `libphonenumber-js` para convertir los números válidos a E.164 en `phone`. Conserva el texto recibido en `phone_input` y la región telefónica en `phone_country`, separada del país del perfil. Si no puede normalizar el número, deja `phone` vacío y activa `phone_needs_review`, sin impedir el registro. Un prefijo internacional explícito tiene prioridad sobre la región seleccionada. El valor `phone_verified` siempre empieza en `false`. TODO: integrar un servicio de verificación antes de usar el teléfono como contacto verificado o mecanismo de recuperación.
- El nombre del espacio de trabajo es obligatorio y se guarda en `default_workspace_name`. Este flujo no crea todavía el espacio de trabajo ni sus cuentas financieras.

## Entornos

El almacenamiento de cuentas sigue el modo de la sesión de verificación (`VERIFICATION_SESSION_STORE_MODE`, o `OTP_STORE_MODE` como alternativa). Desarrollo usa memoria y correo emulado de forma predeterminada. Los datos de memoria no sobreviven al reinicio del servidor.

Para comprobar persistencia durante reinicios, use Supabase local o una rama de prueba, configure el modo `database` y mantenga estables los secretos. `npm run dev:local`, seguido de `npm run db:migrate`, permite preparar el entorno con Docker. No apunte las pruebas a la base de producción.

Producción requiere aplicar las migraciones de `supabase/migrations` con `npm run db:deploy`, incluida `20260921184535_phone_input_review.sql`. También requiere `BETTER_AUTH_SECRET`, con al menos 32 caracteres aleatorios. Use un secreto distinto de los secretos de OTP y de verificación. `BETTER_AUTH_URL` permite indicar el origen canónico. Cambiar el secreto invalida las cookies de acceso existentes.

Los formularios conservan identificadores y nombres estables. El correo verificado es de solo lectura y usa `autocomplete="username"`; la contraseña usa `current-password` al entrar y `new-password` al registrarse. El nombre visible usa `name`, el país usa `country` y el teléfono usa `tel`. Esto facilita el reconocimiento de datos personales por navegadores y gestores de contraseñas, sin depender de una extensión específica. Las sugerencias dependen de los datos guardados y de la configuración del navegador.

El servidor comprueba la sesión antes de mostrar la página o el modal de acceso. Una sesión válida lleva a la importación CSV sin mostrar el formulario. Para visitantes sin sesión, el campo de correo se muestra desde el inicio; mientras se consulta una posible autorización OTP, solo se desactiva el botón para continuar. Los campos obligatorios del registro tienen un asterisco rojo y conservan la validación nativa. El prefijo telefónico sigue al país del perfil hasta que la persona elige otro en su selector. Los números internacionales completos se separan al salir del campo; el servidor vuelve a normalizar el envío, incluso si el autocompletado no dispara los eventos del navegador.

Los enlaces de entrada de la portada usan la sesión validada en el servidor: llevan al acceso o a la importación CSV. Una sesión activa también muestra «Cerrar sesión» en la navegación, disponible en el menú de pantallas pequeñas. El mismo botón permanece en la herramienta CSV. El cierre revoca la sesión y la autorización OTP antes de volver a la portada. El acceso correcto y el cierre cargan un documento nuevo para descartar las rutas y los modales anteriores de la caché del navegador.

La contraseña nueva y su confirmación usan `autocomplete="new-password"`. Zod valida los requisitos y la coincidencia exacta tanto en el navegador como en el servidor. La confirmación no se guarda. Los requisitos aparecen solo al enfocar el campo, con indicadores que cambian al escribir. El campo de confirmación muestra únicamente si ambas contraseñas coinciden.

La barra de fortaleza usa `@zxcvbn-ts/core`, con diccionarios comunes, ingleses y españoles. Su puntuación es orientativa y no añade un requisito de registro. El cálculo se ejecuta en un Web Worker local, separado del hilo de la interfaz, sin enviar contraseñas a terceros. El navegador descarta resultados de entradas anteriores y termina el Worker al salir del registro. Floating UI posiciona las ayudas a la izquierda o arriba, según el espacio disponible; el viewport visual permite ajustar la posición cuando aparece el teclado. Las atribuciones están en `THIRD_PARTY_NOTICES.md`.

Las tablas tienen RLS activo. El servidor accede con la conexión PostgreSQL privada. Las credenciales de Supabase para el navegador no conceden acceso a las sesiones.
