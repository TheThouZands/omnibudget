# Preparación de movimientos desde CSV

## Propósito y alcance

Este módulo permite preparar un archivo de movimientos sin conectar un banco ni registrar datos en una cuenta. Recibe un CSV, permite asignar sus columnas, valida cada fila y marca posibles duplicados dentro del mismo archivo. Después, exporta las filas válidas que el usuario selecciona.

La salida es un conjunto de movimientos preparados, no un asiento contable ni una importación confirmada. Cada movimiento conserva `origin = csv_import` y `status = pending_review`.

El módulo no necesita autenticación, un espacio de trabajo, cuentas, categorías, Supabase, PostgreSQL ni un proceso Express. No crea tablas ni migraciones. No guarda archivos ni movimientos. Cada solicitud contiene todo lo necesario para procesar el archivo.

## Ejecutar el módulo

Use Node.js 24 y npm. La entrega se verificó con Node.js 24.17.0 y npm 11.13.0.

```sh
npm ci
npm run dev
```

Abra `http://localhost:3000/es/csv-import`. No necesita crear `.env.local` para esta ruta. La instalación de dependencias y la compilación inicial pueden necesitar acceso a Internet.

Para ejecutar la compilación de producción:

```sh
npm run build
npm start
```

Las otras rutas de la aplicación conservan sus requisitos de configuración. Por ejemplo, `/api/health/db` necesita una base de datos. Su fallo sin credenciales no impide usar el módulo CSV. No ejecute `db:migrate`, `db:deploy` ni `dev:local` para probar esta entrega.

## Separación de responsabilidades

```text
Vista HTML temporal
  -> adaptador HTTP del cliente
  -> rutas POST de Next.js
  -> controladores con Request/Response
  -> servicios de procesamiento
  -> modelos y contratos TypeScript
```

| Ubicación | Responsabilidad |
| --- | --- |
| `src/modules/csv-import/models` | Límites, errores, opciones y contratos de datos. |
| `src/modules/csv-import/services` | Lectura CSV, normalización, validación, duplicados y exportación. |
| `src/modules/csv-import/controllers` | Lectura limitada de la solicitud y traducción entre HTTP y los servicios. |
| `src/app/api/csv-import` | Adaptadores mínimos de las tres rutas POST. |
| `src/app/[locale]/csv-import/use-csv-api.ts` | Envíos HTTP, cancelación y estado de las solicitudes de la vista. |
| `src/app/[locale]/csv-import` | Controles HTML temporales para probar el flujo. |
| `messages/es.json` | Textos de la interfaz en español, mediante `next-intl`. |
| `public/examples/csv-statement.csv` | Datos ficticios para la demostración. |

Los modelos y servicios no importan React, Next.js, Supabase ni otros módulos de negocio. Los controladores utilizan las interfaces web `Request` y `Response`. La vista no importa funciones de procesamiento; solo importa tipos y consume los endpoints.

Esta estructura aplica la separación entre modelo, vista y controlador solicitada para el repositorio. Los servicios contienen las reglas que un controlador futuro puede reutilizar. La interfaz definitiva puede reemplazar la vista temporal sin modificar esas reglas.

No se añadió Express porque el proceso es breve y no mantiene sesiones de trabajo en el servidor. Una integración futura puede llamar a los mismos servicios desde un adaptador Express. No necesita trasladar lógica desde componentes React.

Las pruebas de arquitectura comprueban la dirección de las importaciones estáticas. No sustituyen una revisión completa de dependencias ni detectan todos los mecanismos posibles de carga dinámica.

## Formatos admitidos

| Entrada | Regla |
| --- | --- |
| Archivo | Extensión `.csv`, codificación UTF-8 y encabezados en la primera fila no vacía. |
| Tamaño | Hasta 2 MiB por archivo y 64 KiB adicionales para el cuerpo multipart. |
| Filas | Hasta 5000 filas de datos, sin contar el encabezado. |
| Columnas | Hasta 50 columnas. Cada fila debe tener la misma cantidad que el encabezado. |
| Celdas | Hasta 5000 unidades de texto de JavaScript por celda; una descripción preparada admite hasta 500. |
| Separador | Coma, punto y coma o tabulación. Se puede detectar o elegir de forma explícita. |
| Campos | Fecha, descripción e importe. Cada campo debe usar una columna diferente. |
| Fecha | `YYYY-MM-DD`, `DD/MM/YYYY` o `MM/DD/YYYY`, según la opción elegida. Años entre 1900 y 2100. |
| Importe | Una columna con signo. Se admiten hasta dos decimales, agrupaciones de miles válidas y paréntesis para valores negativos. |
| Moneda | COP, USD o EUR. La moneda elegida se aplica a todas las filas. No hay conversión de divisas. |

El analizador admite campos entre comillas, comillas escapadas y saltos de línea dentro de un campo entre comillas. Rechaza comillas mal formadas. Las líneas físicas vacías no generan movimientos; una fila con separadores y campos vacíos sí se conserva para su validación.

El módulo no adivina el formato de fecha, el separador decimal ni la moneda. La vista muestra valores iniciales que el usuario debe comprobar. No admite archivos XLSX, PDF ni extractos con columnas separadas de débito y crédito. Convierta estos últimos a una sola columna con signo antes de cargarlos.

## Reglas de preparación

1. Valide la estructura del archivo antes de revisar movimientos.
2. Compruebe las tres columnas y las opciones de interpretación.
3. Valide la fecha real, la descripción y el importe de cada fila.
4. Convierta el importe a unidades menores con `BigInt`, sin usar coma flotante para el cálculo.
5. Marque todos los miembros de cada grupo de posibles duplicados.
6. Permita seleccionar solo filas válidas y exporte una selección explícita.

Un importe positivo produce `direction = inflow`. Un importe negativo produce `direction = outflow`. El importe preparado siempre es absoluto y se devuelve como una cadena de dígitos. Por ejemplo, `-125000,50` produce `amountMinor = "12500050"` y `direction = outflow`.

El límite absoluto es `9223372036854775807` unidades menores. Los ceros, los importes fuera del rango, los símbolos de moneda, la notación exponencial y los decimales excedentes se rechazan. El módulo no redondea un importe para hacerlo válido.

Una entrada no equivale necesariamente a un ingreso real y una salida no equivale necesariamente a un gasto real. Por este motivo, el módulo no asigna `financial_nature`, `type`, categoría, cuenta ni espacio de trabajo. Estos campos corresponden a la integración contable posterior.

Para detectar posibles duplicados se comparan la fecha, la descripción normalizada, el importe, la dirección y la moneda. La normalización de la descripción para esta comparación aplica NFKC, unifica espacios y no distingue mayúsculas. No reemplaza la descripción original preparada.

`duplicateRows` cuenta todas las filas de esos grupos, no solo las repeticiones posteriores a la primera. `duplicateGroup` identifica la línea de origen del primer miembro. Las marcas se calculan sobre todo el archivo y se conservan aunque el usuario exporte solo parte de un grupo. No existe comparación con archivos anteriores o con datos de una cuenta.

## API HTTP

Las tres rutas utilizan `POST` y `multipart/form-data`. No requieren cookies ni una sesión. La API no tiene efectos persistentes.

| Ruta | Campos del formulario | Resultado |
| --- | --- | --- |
| `/api/csv-import/inspect` | `file`, `delimiter` opcional | Separador, encabezados, primeras cinco filas y total de filas. |
| `/api/csv-import/review` | `file`, `delimiter` opcional, `options` como JSON | Opciones validadas, filas, problemas y resumen. |
| `/api/csv-import/export` | Los campos de revisión, `selectedRows` como JSON y `format` | Archivo CSV o JSON con las filas seleccionadas. |

`delimiter` puede ser `auto`, `,`, `;` o un carácter de tabulación. Si se omite, se detecta automáticamente.

Ejemplo de `options` para el archivo ficticio incluido:

```json
{
  "columns": { "date": 0, "description": 1, "amount": 2 },
  "dateFormat": "dmy",
  "decimalSeparator": ",",
  "currency": "COP"
}
```

Los índices de las columnas empiezan en cero. `selectedRows` contiene números de líneas físicas del archivo original, no índices de la tabla ni números de página. Por ejemplo, `[2,3,4,6]` selecciona cuatro movimientos del ejemplo y deja fuera una repetición.

`format` admite `csv` y `json`. La exportación vuelve a leer el archivo original y repite la validación. No acepta importes preparados por el navegador. Rechaza selecciones vacías, repetidas, inexistentes o correspondientes a filas inválidas. Mantiene el orden original de las filas.

### Ejemplo sin la interfaz

Ejecute este código con Node.js 24 desde la raíz del proyecto mientras el servidor está activo. El ejemplo usa solo datos ficticios. `FormData` establece el encabezado multipart y su separador de partes; no lo construya manualmente.

```js
const { readFile } = await import("node:fs/promises");
const file = new File(
  [await readFile("public/examples/csv-statement.csv")],
  "csv-statement.csv",
  { type: "text/csv" },
);
const options = {
  columns: { date: 0, description: 1, amount: 2 },
  dateFormat: "dmy",
  decimalSeparator: ",",
  currency: "COP",
};
const form = new FormData();
form.set("file", file);
form.set("delimiter", "auto");
form.set("options", JSON.stringify(options));
const response = await fetch("http://localhost:3000/api/csv-import/review", {
  method: "POST",
  body: form,
});
if (!response.ok) throw new Error(JSON.stringify(await response.json()));
console.log((await response.json()).summary);
```

El resumen esperado es `{ totalRows: 7, validRows: 5, invalidRows: 2, duplicateRows: 2 }`.

### Contrato de exportación

La salida JSON utiliza `schema_version = 1` y `scope = statement_preparation`. El alcance evita confundir este archivo con una exportación completa del libro de movimientos.

```json
{
  "schema_version": 1,
  "scope": "statement_preparation",
  "transactions": [
    {
      "source_line": 3,
      "transaction_date": "2026-08-02",
      "description": "Compra de alimentos",
      "amount_cents": "12500050",
      "currency": "COP",
      "direction": "outflow",
      "origin": "csv_import",
      "status": "pending_review",
      "duplicate_flag": false,
      "duplicate_group": null
    }
  ]
}
```

El CSV usa esos mismos campos de cada movimiento, encabezados en inglés, comas, comillas, BOM UTF-8 y saltos CRLF. Los campos de dinero permanecen como texto exacto. Sin embargo, una hoja de cálculo puede convertirlos a números y perder precisión al abrirlos. Para conservar el contrato sin esa conversión, use JSON o importe la columna `amount_cents` como texto.

La exportación CSV antepone un apóstrofo a las descripciones que podrían interpretarse como fórmulas de hoja de cálculo. La exportación JSON conserva la descripción preparada sin ese prefijo. Por tanto, el CSV es una salida de revisión y no se presenta como una copia textual idéntica del archivo original.

### Errores

Los errores de solicitud devuelven una estructura como `{"error":{"code":"invalid_mapping"}}`. Algunos errores del analizador incluyen `lineNumber`. La API no devuelve el contenido del archivo ni una traza de excepción dentro del error.

| Estado HTTP | Uso |
| --- | --- |
| `200` | Inspección, revisión o exportación correcta. Una revisión puede contener filas inválidas. |
| `400` | Estructura CSV, opciones, asignación o selección inválidas. |
| `413` | Archivo o cuerpo de la solicitud demasiado grande. |
| `415` | Formato de envío o extensión de archivo no admitidos. |
| `500` | Fallo inesperado de procesamiento, sin detalles internos. |

Las respuestas del módulo incluyen `Cache-Control: no-store`, `Pragma: no-cache` y `X-Content-Type-Options: nosniff`.

## Demostración con datos ficticios

1. Abra `/es/csv-import` y pulse **Usar ejemplo ficticio**.
2. Asigne Fecha a la columna 1, Descripción a la columna 2 e Importe a la columna 3.
3. Mantenga día/mes/año, coma decimal y COP. Pulse **Revisar movimientos**.
4. Compruebe el total: siete filas, cinco válidas, dos con errores y dos posibles duplicados.
5. Observe que las líneas 7 y 8 no se pueden seleccionar.
6. Desmarque la línea 5, que repite el movimiento de la línea 4.
7. Descargue CSV y JSON. Cada archivo debe contener las líneas 2, 3, 4 y 6.
8. Cambie el formato de fecha a año-mes-día. La revisión anterior debe desaparecer.
9. Revise de nuevo. Todas las filas del ejemplo tendrán fecha inválida y la descarga quedará desactivada.

La selección inicial incluye todas las filas válidas, incluso posibles duplicados. La interfaz informa de este comportamiento. El usuario decide qué filas conservar. Las tablas muestran hasta 50 filas por página; la descarga incluye la selección de todas las páginas.

## Verificación e integración futura

```sh
npm test
npm run lint
npm run build
npm run typecheck
```

Las pruebas cubren el analizador, formatos ambiguos, precisión de importes, límites, fechas, duplicados, selección, protección de exportaciones, lectura HTTP, errores y separación de importaciones. También comprueban que la ruta pública no usa una sesión Supabase y que la comprobación de salud carga la base de datos solo cuando se solicita.

Antes de registrar movimientos en una cuenta, una integración futura debe resolver autenticación, autorización del espacio de trabajo, cuenta y moneda de destino, naturaleza financiera, categorías, idempotencia, duplicados históricos, auditoría y transacciones de base de datos. La salida de este módulo no omite esos requisitos ni los da por implementados.

La API pública procesa los archivos en memoria. El código del módulo no los escribe en disco, no registra sus contenidos y no los conserva entre solicitudes. El límite de bytes de entrada no es un límite del consumo total de memoria: el análisis multipart, los datos preparados y las respuestas requieren memoria adicional. Esto no certifica las políticas de retención, registro o seguridad de un proveedor de despliegue. Antes de exponerla a uso público real, revise HTTPS, límites de frecuencia, concurrencia, observabilidad y dependencias vulnerables.

## Trazabilidad

| Fuente del proyecto | Cobertura de esta entrega |
| --- | --- |
| `HU-ACC-03` | Preparación manual y revisión de duplicados. No incluye categorización en bloque ni registro en cuentas. |
| `RF-DATA-02` | Carga, asignación de fecha/descripción/importe y procesamiento de la etapa de preparación. |
| `RF-DATA-03` | Marca de posibles duplicados dentro del archivo actual. No incluye historial ni sincronización bancaria. |
| `HU-ACC-05` | Salida con `pending_review`. No confirma movimientos ni afecta reportes. |
| `RNF-REL-01` | El flujo no depende de un proveedor bancario ni de una base de datos. |
| `RNF-USA-01` | Interfaz temporal en español mediante el diccionario de `next-intl`. |
| `RNF-DATA-01` | Exportación de la selección del archivo actual. No exporta todos los datos de la plataforma. |

La base funcional está en [KB.md](../../KB.md). La organización técnica sigue las instrucciones actuales de [AGENTS.md](../../AGENTS.md) y la [arquitectura técnica de Confluence](https://thouzands.atlassian.net/wiki/spaces/O/pages/3080218/Technical+Architecture). Donde el KB anterior menciona `next-i18next`, se utiliza `next-intl`, que es la herramienta adoptada por el repositorio actual.

Consulte las [notas de entrega GA7-220501096-AA3-EV01](../../evidence/GA7-220501096-AA3-EV01/README.md) para el alcance académico y la preparación del archivo comprimido.
