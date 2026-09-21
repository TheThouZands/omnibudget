# Plantillas de correo

Las plantillas son funciones de TypeScript. Reciben datos y devuelven `subject`,
`text` y `html`. No envían mensajes ni leen credenciales. El servicio SMTP de
autenticación usa estos tres valores con Nodemailer y la configuración existente.

- `verification-code.ts`: contenido del correo de verificación, código y vencimiento.
- `layout.ts`: estructura común, marca y escape de texto para HTML.
- `styles.ts`: estilos de correo, insertados en los atributos `style` al renderizar.
- `assets.ts` y `assets.generated.json`: imágenes PNG incluidas en el mensaje mediante CID.

Para agregar otro correo, cree una función que devuelva `RenderedEmail` y use
`renderEmailLayout`. Mantenga la versión de texto y escape cada valor dinámico
con `escapeEmailHtml` antes de insertarlo en `contentHtml`. Ese parámetro solo
acepta HTML creado por las plantillas del repositorio, nunca contenido del cliente.
Use `createEmailImages` si la plantilla usa la marca y el fondo comunes. No se
necesita un motor de plantillas, acceso a archivos en producción ni un proveedor
de correo distinto.

El correo OTP conserva los seis dígitos como texto continuo. El espaciado es solo
visual. El código aparece al principio del texto y en la vista previa del correo,
pero no en el asunto. Los clientes pueden mostrarlo en sus notificaciones según
la configuración del usuario. La duración procede de la política OTP del servidor;
se presenta como «Vence en 10 minutos». El diseño no descarga imágenes ni fuentes.

El logo y el fondo guilloché son PNG estáticos generados desde `public/omnibudget.svg`
y `public/guilloche.svg`. Los SVG originales no cambian. `npm run email:assets`
regenera las copias con Sharp, solo en desarrollo. El archivo generado se incluye
en el repositorio para que el envío no dependa de leer archivos o convertir imágenes.
Los bytes viajan dentro del correo como imágenes inline CID, no como enlaces web
ni URI de datos en el HTML. El código sigue siendo texto seleccionable. Un cliente
que no muestre fondos conserva el color de papel y todos los datos de acceso.

El campo web ya usa `autocomplete="one-time-code"`, `inputmode="numeric"` y un
único campo de texto. La detección, la acción «Copiar código» y el autocompletado
dependen del sistema, del navegador y de la aplicación de correo. No existe una
instrucción en esta plantilla que fuerce esas acciones. WebOTP usa SMS, no correo.
La verificación en el servidor y su vínculo con la sesión no cambian.

Compruebe las plantillas con `npm test -- src/emails` y el envío con
`npm test -- src/modules/auth/services/smtp-otp-sender.test.ts`. Estas pruebas no
envían correos. El modo de desarrollo sigue emulando la entrega. La apariencia en
Outlook, Gmail y Mail, así como las sugerencias del teclado, requieren comprobarse
en esos clientes; una vista previa de navegador no sustituye esa comprobación.
