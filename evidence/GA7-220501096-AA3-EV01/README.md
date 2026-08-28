# GA7-220501096-AA3-EV01

## Identificación

- Proyecto: OmniBudget.
- Aprendiz: Paulo Sánchez Contreras.
- Ficha: 3235889.
- Módulo: preparación de movimientos desde un archivo CSV.
- Fecha de verificación: 27 de agosto de 2026.
- Repositorio: [TheThouZands/omnibudget](https://github.com/TheThouZands/omnibudget).

Esta entrega contiene un módulo funcional pequeño y separable. La interfaz es temporal y utiliza controles HTML sin estilos específicos. Las reglas de procesamiento están en el backend y no dependen de la vista.

## Relación con la guía de aprendizaje

La sección GA7-220501096-AA3-EV01 de la Guía de aprendizaje 7 solicita codificar un módulo a partir de los artefactos previos del proyecto, incluir comentarios, aplicar estándares de codificación y usar control de versiones. Solicita entregar el proyecto en un archivo ZIP o RAR y adjuntar un archivo con el enlace del repositorio.

El contexto de la actividad menciona frameworks de Java. Este proyecto utiliza TypeScript y Next.js por la decisión técnica vigente del proyecto. Se debe confirmar con el instructor que esta tecnología es aceptable para la evidencia. No se afirma que la guía autorice expresamente sustituir Java por Next.js.

La entrega no se presenta como el sistema completo ni como el cumplimiento completo de todas las historias del KB. Tampoco incorpora los requisitos de otra evidencia, como una demostración de video o un módulo CRUD adicional.

## Base documental y decisión de alcance

Se tomó como base el [KB del proyecto](../../KB.md), la documentación técnica del repositorio y el conjunto documental de diseño y preparación del entorno. También se consultaron la documentación de Confluence y los elementos disponibles de Jira como contexto de arquitectura y planificación.

La selección del módulo responde a tres hechos del KB: existe la importación manual segura (`HU-ACC-03`), se requiere cargar y asignar columnas de archivos CSV (`RF-DATA-02`) y el procesamiento manual debe funcionar sin un proveedor bancario (`RNF-REL-01`).

Se delimitó la función a **preparar, revisar y exportar**. Registrar movimientos en una cuenta exigiría otros módulos: usuarios, espacios de trabajo, cuentas, autorización y auditoría. Esos componentes no se sustituyeron por datos globales ni por simulaciones de persistencia.

Fuentes de arquitectura consultadas:

- [Product Brief and Operating Model](https://thouzands.atlassian.net/wiki/spaces/O/pages/2490377/Product+Brief+and+Operating+Model).
- [Technical Architecture](https://thouzands.atlassian.net/wiki/spaces/O/pages/3080218/Technical+Architecture).
- [Requirements Traceability](https://thouzands.atlassian.net/wiki/spaces/O/pages/2654226/Requirements+Traceability).
- [Instrucciones del repositorio](../../AGENTS.md): Next.js, `next-intl`, separación tipo MVC y servicios reutilizables.

En Jira, [OB-5: Seed requirements-to-backlog mapping](https://thouzands.atlassian.net/browse/OB-5) y [OB-6: Link code, migrations, and operations runbook](https://thouzands.atlassian.net/browse/OB-6) aportan contexto de trazabilidad y operación. Son tareas de documentación y preparación ya completadas, no tickets de implementación del módulo CSV.

No se crearon, modificaron ni cerraron elementos de Jira o páginas de Confluence como parte de esta implementación. La consulta de esos sistemas no se presenta como evidencia de una aprobación o un cierre de trabajo.

## Evidencia de implementación

| Aspecto solicitado | Evidencia en el proyecto |
| --- | --- |
| Módulo basado en artefactos previos | Alcance y matriz de trazabilidad en [la guía del módulo](../../docs/modules/csv-import.md). |
| Codificación con framework | Rutas HTTP y vista temporal en Next.js, con tipos y servicios en TypeScript. |
| Comentarios en el código | Comentarios sobre límites de entrada, precisión, separación HTTP, selección y validación al exportar. |
| Estándares de codificación | TypeScript estricto, ESLint, identificadores técnicos en inglés y mensajes de interfaz en el diccionario español. |
| Control de versiones | Commits pequeños con Conventional Commits y cambios de versión por implementación. |
| Verificación funcional | Pruebas automatizadas y recorrido de navegador con el archivo ficticio. |
| Proyecto comprimido y enlace | Código fuente, archivo de dependencias bloqueadas y [REPOSITORIO.txt](REPOSITORIO.txt). |

Los modelos y servicios no importan React, Next.js, Supabase ni otros módulos de negocio. Las rutas llaman a los controladores; los controladores llaman a los servicios. El frontend solo envía el archivo y las opciones, muestra la respuesta y permite seleccionar filas.

## Ejecutar y comprobar

Requisitos de la verificación: Node.js 24.17.0 y npm 11.13.0.

```sh
npm ci
npm run dev
```

Abra `http://localhost:3000/es/csv-import`. Para este módulo no se necesitan credenciales, base de datos, Docker ni un servicio Express. No ejecute migraciones de Supabase para usarlo.

Use **Usar ejemplo ficticio** y asigne las columnas Fecha, Descripción e Importe, en ese orden. Seleccione día/mes/año, coma decimal y COP.

Resultado esperado:

- Siete filas en total.
- Cinco filas válidas.
- Dos filas con errores, que no se pueden exportar.
- Dos filas marcadas como posibles duplicados; el módulo no las elimina.
- Al desmarcar la línea 5, la exportación contiene las líneas 2, 3, 4 y 6.

Comandos de verificación:

```sh
npm test
npm run lint
npm run build
npm run typecheck
```

El recorrido de navegador comprobó la inspección, una asignación de columnas inválida, la revisión correcta, la selección de filas y descargas reales en CSV y JSON. También comprobó que cambiar el formato de fecha elimina el resultado anterior y que una revisión sin filas válidas desactiva la descarga.

Los archivos descargados del ejemplo contenían cuatro filas y los importes exactos `150000000`, `12500050`, `820000` y `4500000`, expresados en unidades menores. No se utilizaron extractos personales para la demostración.

También se verificó una copia limpia de los archivos versionados, con una instalación nueva mediante `npm ci`. Esa copia no contenía `.env.local` ni variables de conexión a Supabase o PostgreSQL. Las pruebas, ESLint, TypeScript y la compilación de producción finalizaron correctamente. El servidor de producción abrió la ruta del módulo y ejecutó la inspección y revisión del ejemplo con el resultado esperado, sin una base de datos.

## Historial de implementación

| Commit | Cambio | Versión de la aplicación |
| --- | --- | --- |
| `6f56f52` | Analizador CSV con límites y pruebas. | `0.2.0` |
| `9e75c5c` | Validación de opciones y revisión de movimientos. | `0.3.0` |
| `85d7411` | Exportación de filas seleccionadas. | `0.4.0` |
| `9bcc46d` | Endpoints sin persistencia para inspección, revisión y exportación. | `0.5.0` |
| `d12b964` | Carga diferida de la base de datos y ruta pública sin sesión. | `0.5.1` |
| `0908359` | Adaptador HTTP del cliente y pruebas de separación. | `0.6.0` |
| `66b268f` | Vista temporal sin estilos, diccionario y ejemplo. | `0.7.0` |

Los commits se crearon en `main`. La implementación no reescribe el historial previo. La documentación se entrega en un commit separado. La publicación de estos commits en el repositorio remoto y el despliegue quedan a cargo de un paso posterior autorizado.

## Límites de la entrega

- No registra ni confirma movimientos en una cuenta.
- No realiza categorización, conciliación, conversión de moneda ni deduplicación histórica.
- No persiste archivos, sesiones de importación ni resultados.
- No asigna naturaleza financiera a partir del signo del importe.
- No implementa la interfaz definitiva ni añade estilos del módulo.
- No modifica el esquema Drizzle, las migraciones Supabase ni el proyecto Vercel.
- La instalación tiene avisos de auditoría de dependencias. Deben revisarse antes de un despliegue público; una compilación correcta no equivale a una certificación de seguridad.

La [guía técnica](../../docs/modules/csv-import.md) especifica los formatos admitidos, límites, contratos HTTP, controles de exportación y requisitos de una integración futura.

## Preparar el archivo de entrega

Nombre del archivo: `PAULO_SANCHEZ_AA3_EV01.zip`.

La carpeta comprimida debe incluir los archivos del proyecto, el código del módulo, las pruebas, estas notas y `REPOSITORIO.txt`. Debe excluir credenciales, `.git`, `node_modules`, `.next`, archivos personales y resultados temporales. La carpeta no necesita una base de datos para ejecutar esta función.

Antes de entregar el enlace del repositorio como evidencia de esta implementación, publique los commits aprobados y compruebe que el instructor puede acceder a ellos. El enlace por sí solo no prueba que los cambios locales estén disponibles en el remoto.
