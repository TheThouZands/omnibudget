# GA7-220501096-AA4-EV03

## Componente front-end del proyecto formativo

**Aprendiz:** Paulo Sánchez Contreras

**Ficha:** 3235889

**Proyecto:** Omnibudget

**Versión:** 0.13.1

Esta evidencia contiene la codificación del componente front-end principal de Omnibudget. El alcance incluye la página pública de presentación, la navegación adaptable, la composición editorial, el fondo guilloché animado y el pie de página. La interfaz está escrita en español y enlaza con el módulo funcional de preparación de movimientos desde archivos CSV.

## Resultado entregado

- Página principal en la ruta `/es`.
- Navegación de escritorio y menú móvil.
- Marca compacta que aparece cuando la marca principal sale del área visible.
- Fondo guilloché con movimiento continuo, transiciones suaves y alternativa para movimiento reducido.
- Secciones editoriales adaptables a escritorio y dispositivos móviles.
- Pie de página con enlaces del proyecto y acceso a la plataforma.
- Enlace funcional desde la presentación hacia `/es/csv-import`.

## Artefactos aplicados

La implementación parte de los artefactos del ciclo de software incluidos en el proyecto:

- `KB.md`: alcance funcional, historias de usuario y reglas del producto.
- `design-qa.md`: verificación visual contra el prototipo de Figma.
- `design-qa/`: capturas y comparaciones de escritorio y móvil.
- `src/app/[locale]/page.tsx`: composición semántica de la página.
- `src/components/landing/`: componentes de navegación, fondo y pie de página.
- `messages/es.json`: textos localizados de la interfaz.

El diseño de referencia corresponde al archivo **Omnibudget Concept** de Figma:

<https://www.figma.com/design/A0JAB7cGFoRohTXf4tYxKb/Omnibudget-Concept?node-id=57-84>

## Tecnologías y estándares

- Next.js 16 con App Router.
- React 19 y TypeScript.
- Sass Modules para estilos encapsulados.
- `next-intl` para localización.
- HTML semántico, navegación por teclado y atributos ARIA.
- Nombres directos y componentes con una responsabilidad definida.
- Comentarios solo en las decisiones que no son evidentes por el código.
- Git y Conventional Commits para control de versiones.

## Ejecución

1. Instale Node.js 20 o una versión compatible.
2. Ejecute `npm ci` en la carpeta del proyecto.
3. Copie `.env.example` como `.env.local`.
4. Ejecute `npm run dev`.
5. Abra `http://localhost:3000/es`.

## Verificación

Antes de preparar la entrega se ejecutaron estas comprobaciones:

- `npm run lint`
- `npm run typecheck`
- `npm test`: 262 pruebas aprobadas en 7 archivos.
- `npm run build`
- Revisión visual en 1440 por 900 px y 390 por 844 px.
- Consola del navegador sin advertencias ni errores en una sesión nueva.
- Sin desbordamiento horizontal en escritorio o móvil.

El archivo `REPOSITORIO.txt` contiene el enlace y el commit de referencia.
