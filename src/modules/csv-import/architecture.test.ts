import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";

function sourceFiles(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(folder, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.tsx?$/.test(path) && !path.endsWith(".test.ts") ? [path] : [];
  });
}

function imports(file: string) {
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  return source.statements.filter(ts.isImportDeclaration);
}

it("keeps the backend independent from React, Next.js, and other business modules", () => {
  const root = resolve("src/modules/csv-import");
  for (const file of sourceFiles(root)) {
    for (const statement of imports(file)) {
      const specifier = (statement.moduleSpecifier as ts.StringLiteral).text;
      expect(specifier.startsWith("."), `${file}: ${specifier}`).toBe(true);
      expect(resolve(dirname(file), specifier).startsWith(root + sep), `${file}: ${specifier}`).toBe(true);
    }
  }
});

it("allows the temporary frontend to import backend contracts only as types", () => {
  for (const file of sourceFiles(resolve("src/app/[locale]/csv-import"))) {
    for (const statement of imports(file)) {
      const specifier = (statement.moduleSpecifier as ts.StringLiteral).text;
      if (specifier.includes("modules/csv-import")) {
        expect(specifier.includes("/models/"), `${file}: ${specifier}`).toBe(true);
        expect(statement.importClause?.isTypeOnly, `${file}: ${specifier}`).toBe(true);
      }
    }
  }
});
