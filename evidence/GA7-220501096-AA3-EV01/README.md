# GA7-220501096-AA3-EV01

**Proyecto:** OmniBudget  
**Aprendiz:** Paulo Sánchez Contreras  
**Ficha:** 3235889  
**Módulo:** Preparación de movimientos desde CSV

## Descripción

El módulo permite cargar un archivo CSV, asignar las columnas de fecha, descripción e importe, revisar los movimientos y descargar una selección en CSV o JSON. Valida los datos, conserva la precisión de los importes y marca posibles duplicados para que el usuario decida cuáles exportar.

Se implementó con TypeScript y Next.js, conforme al stack del proyecto aprobado por el instructor. La interfaz está en español y usa controles HTML nativos. Es una vista temporal para utilizar y comprobar el módulo.

El backend separa modelos, servicios y controladores. El frontend consume la API y no contiene las reglas de procesamiento. El módulo funciona por sí mismo: recibe el archivo, lo procesa en memoria y devuelve el resultado, sin necesitar una cuenta, una conexión bancaria ni una base de datos.

La función corresponde al flujo de importación manual descrito en `HU-ACC-03`, `RF-DATA-02` y `RF-DATA-03` del [KB](../../KB.md). Se tomó como referencia la [arquitectura técnica de Confluence](https://thouzands.atlassian.net/wiki/spaces/O/pages/3080218/Technical+Architecture) y la [trazabilidad de requisitos en Jira](https://thouzands.atlassian.net/browse/OB-5).

## Ejecutar

Use Node.js 24 y npm. Desde la carpeta del proyecto:

```sh
npm ci
npm run dev
```

Abra `http://localhost:3000/es/csv-import` y pulse **Usar ejemplo ficticio**. Asigne las columnas Fecha, Descripción e Importe, en ese orden. Use día/mes/año, coma decimal y COP.

El ejemplo muestra siete filas: cinco válidas, dos con errores y dos posibles duplicados. Al desmarcar la línea 5, la descarga contiene las líneas 2, 3, 4 y 6.

## Código y verificación

El código del backend está en `src/modules/csv-import`. Las rutas HTTP están en `src/app/api/csv-import` y la vista está en `src/app/[locale]/csv-import`.

La implementación incluye comentarios, TypeScript estricto, ESLint y pruebas automatizadas. Se desarrolló mediante commits pequeños con Conventional Commits. Se verificaron el recorrido en navegador, las descargas y una compilación limpia sin credenciales de base de datos.

```sh
npm test
npm run lint
npm run build
npm run typecheck
```

La entrega `PAULO_SANCHEZ_AA3_EV01.zip` contiene el proyecto, sus pruebas y el [enlace del repositorio](REPOSITORIO.txt). La [guía del módulo](../../docs/modules/csv-import.md) describe su organización y sus contratos de datos.
