# Preparación de movimientos desde CSV

## Qué hace

Este módulo recibe un archivo CSV de movimientos, permite asignar sus columnas, valida cada fila y marca posibles duplicados. El usuario revisa el resultado, selecciona las filas que desea conservar y las descarga en CSV o JSON.

Funciona de forma autónoma. Cada solicitud incluye el archivo y sus opciones; el servidor procesa los datos en memoria y devuelve el resultado. No necesita una cuenta, una conexión bancaria ni una base de datos.

## Ejecutar

Use Node.js 24 y npm.

```sh
npm ci
npm run dev
```

Abra `http://localhost:3000/es/csv-import`. Pulse **Usar ejemplo ficticio** para probar el flujo con los datos incluidos. Esta ruta funciona sin un archivo `.env.local`.

Para usar la compilación de producción, ejecute `npm run build` y después `npm start`.

## Organización del código

| Ubicación | Responsabilidad |
| --- | --- |
| `src/modules/csv-import/models` | Contratos TypeScript, opciones, errores y límites. |
| `src/modules/csv-import/services` | Análisis CSV, validación, normalización, duplicados y exportación. |
| `src/modules/csv-import/controllers` | Lectura de solicitudes y respuestas HTTP. |
| `src/app/api/csv-import` | Rutas de Next.js que llaman a los controladores. |
| `src/app/[locale]/csv-import` | Vista HTML temporal y adaptador HTTP del cliente. |
| `messages/es.json` | Textos en español mediante `next-intl`. |

Los servicios y modelos no dependen de React, Next.js ni Supabase. Los controladores utilizan `Request` y `Response`. El frontend importa los contratos solo como tipos y consume la API; no procesa los movimientos. Esta separación permite reemplazar la vista o añadir otro adaptador HTTP sin cambiar las reglas del módulo.

La vista usa controles HTML nativos, sin estilos específicos del módulo.

## API

Las tres rutas reciben `POST` con `multipart/form-data`.

| Ruta | Campos | Resultado |
| --- | --- | --- |
| `/api/csv-import/inspect` | `file`, `delimiter` opcional | Encabezados, separador, primeras cinco filas y total. |
| `/api/csv-import/review` | Los anteriores y `options` como JSON | Movimientos preparados, errores por fila y resumen. |
| `/api/csv-import/export` | Los anteriores, `selectedRows` como JSON y `format` | Descarga de las filas seleccionadas en CSV o JSON. |

Ejemplo de `options` para el archivo incluido:

```json
{
  "columns": { "date": 0, "description": 1, "amount": 2 },
  "dateFormat": "dmy",
  "decimalSeparator": ",",
  "currency": "COP"
}
```

Los índices de columnas empiezan en cero. `delimiter` admite `auto`, coma, punto y coma o tabulación. `selectedRows` contiene números de líneas del archivo original; por ejemplo, `[2,3,4,6]`. `format` admite `csv` y `json`.

La exportación vuelve a procesar el archivo y valida la selección en el servidor. Conserva el orden original. Los errores de solicitud usan códigos como `{"error":{"code":"invalid_mapping"}}`, que la vista traduce al español.

## Reglas de los datos

- Use un CSV UTF-8 con encabezados y una columna para cada campo: fecha, descripción e importe con signo.
- Elija el formato de fecha: `YYYY-MM-DD`, `DD/MM/YYYY` o `MM/DD/YYYY`. Se admiten fechas reales entre 1900 y 2100.
- Elija coma o punto decimal y una moneda: COP, USD o EUR.
- Los importes se calculan con `BigInt` y se devuelven como cadenas de unidades menores. Por ejemplo, `-125000,50` produce `amountMinor = "12500050"` y `direction = outflow`.
- Las entradas usan `inflow` y las salidas usan `outflow`. Los movimientos preparados llevan `origin = csv_import` y `status = pending_review`.
- Los posibles duplicados se comparan por fecha, descripción normalizada, importe, dirección y moneda. Se marcan todos los miembros del grupo y el usuario elige cuáles exportar.
- Las filas inválidas muestran sus errores y quedan fuera de la selección.

Límites de entrada: 2 MiB por archivo, 5000 filas de datos, 50 columnas y 5000 unidades UTF-16 por celda. La descripción preparada admite hasta 500 unidades UTF-16. El importe admite hasta dos decimales y un valor absoluto máximo de `9223372036854775807` unidades menores. El cuerpo multipart admite 64 KiB adicionales al límite del archivo.

La salida JSON contiene `schema_version = 1`, `scope = statement_preparation` y un arreglo `transactions`. Cada movimiento incluye su línea de origen, fecha, descripción, `amount_cents`, moneda, dirección, origen, estado y marca de duplicado. `amount_cents` es una cadena de dígitos, no un número de coma flotante.

El CSV usa los mismos campos de cada movimiento. Las descripciones que podrían interpretarse como fórmulas reciben un apóstrofo de protección. Si abre el resultado en una hoja de cálculo, importe `amount_cents` como texto para conservar su precisión. JSON conserva el contrato de datos sin la conversión automática de la hoja de cálculo.

## Probar el ejemplo

1. Pulse **Usar ejemplo ficticio**.
2. Asigne Fecha a la columna 1, Descripción a la columna 2 e Importe a la columna 3.
3. Use día/mes/año, coma decimal y COP. Pulse **Revisar movimientos**.
4. Compruebe siete filas: cinco válidas, dos con errores y dos posibles duplicados.
5. Desmarque la línea 5 y descargue el resultado. La salida contiene las líneas 2, 3, 4 y 6.

Al cambiar una opción, la vista elimina la revisión anterior y solicita una nueva. Las tablas muestran 50 filas por página; la descarga incluye la selección de todas las páginas.

## Verificación y referencias

```sh
npm test
npm run lint
npm run build
npm run typecheck
```

Las pruebas cubren el análisis CSV, fechas, precisión de importes, duplicados, selección, exportación, solicitudes HTTP y separación entre backend y frontend. También se verificó el flujo en navegador y en una instalación limpia sin credenciales de base de datos.

El módulo se basa en `HU-ACC-03`, `RF-DATA-02` y `RF-DATA-03` del [KB](../../KB.md), y sigue la [arquitectura técnica](https://thouzands.atlassian.net/wiki/spaces/O/pages/3080218/Technical+Architecture) del proyecto.

Vea la [descripción de la entrega GA7-220501096-AA3-EV01](../../evidence/GA7-220501096-AA3-EV01/README.md).
