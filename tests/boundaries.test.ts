import { expect, it } from 'vitest';
import ts from 'typescript';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function sources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? sources(path)
      : /\.tsx?$/.test(path)
        ? [path]
        : [];
  });
}
it('keeps framework and delivery dependencies outside inner layers', () => {
  for (const layer of ['domain', 'application']) {
    for (const file of sources(`packages/${layer}/src`)) {
      const source = ts.createSourceFile(
        file,
        readFileSync(file, 'utf8'),
        ts.ScriptTarget.Latest,
      );
      for (const statement of source.statements) {
        if (
          !ts.isImportDeclaration(statement) &&
          !ts.isExportDeclaration(statement)
        )
          continue;
        if (
          !statement.moduleSpecifier ||
          !ts.isStringLiteral(statement.moduleSpecifier)
        )
          continue;
        const dependency = statement.moduleSpecifier.text;
        expect(
          dependency.startsWith('./') ||
            (layer === 'application' && dependency === '@askod/domain'),
          `${file}: ${dependency}`,
        ).toBe(true);
      }
    }
  }
});
