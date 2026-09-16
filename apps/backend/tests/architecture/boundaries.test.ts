import { expect, it } from 'vitest';
import ts from 'typescript';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const backend = resolve(dirname(fileURLToPath(import.meta.url)), '../../src');
const workspace = resolve(backend, '../../..');
function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(resolve(directory, entry.name))
      : /\.tsx?$/.test(entry.name)
        ? [resolve(directory, entry.name)]
        : [],
  );
}
function dependencies(file: string): string[] {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
  );
  const result: string[] = [];
  function visit(node: ts.Node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      result.push(node.moduleSpecifier.text);
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === 'require'))
    ) {
      const argument = node.arguments[0];
      if (argument && ts.isStringLiteral(argument)) result.push(argument.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return result;
}
const inside = (target: string, directory: string) =>
  target === directory || target.startsWith(directory + sep);

it('keeps domain and application dependencies pointing inward', () => {
  for (const layer of ['domain', 'application'])
    for (const file of files(resolve(backend, layer))) {
      for (const dependency of dependencies(file)) {
        const target = resolve(dirname(file), dependency);
        const allowed =
          dependency.startsWith('.') &&
          (inside(target, resolve(backend, layer)) ||
            (layer === 'application' &&
              inside(target, resolve(backend, 'domain'))));
        expect(
          allowed,
          `${relative(backend, file)} imports ${dependency}`,
        ).toBe(true);
      }
    }
});
it('keeps infrastructure behind bootstrap and out of HTTP modules', () => {
  for (const file of files(backend))
    for (const dependency of dependencies(file)) {
      const name = relative(backend, file).split(sep).join('/');
      const target = dependency.startsWith('.')
        ? resolve(dirname(file), dependency)
        : dependency;
      const infrastructure =
        inside(target, resolve(backend, 'infrastructure')) ||
        /^(@prisma\/|exceljs$|yauzl$)/.test(dependency);
      if (infrastructure)
        expect(
          name.startsWith('infrastructure/') ||
            name === 'bootstrap/create-dependencies.ts',
          `${name} imports ${dependency}`,
        ).toBe(true);
      expect(
        /^(@askod\/(api|application|domain|infrastructure)|electron|react)(\/|$)/.test(
          dependency,
        ),
        `${name} imports ${dependency}`,
      ).toBe(false);
      if (
        name.startsWith('http/') ||
        name.startsWith('modules/') ||
        name === 'app.ts'
      ) {
        expect(
          /bootstrap[/\\](create-dependencies|shutdown)|[/\\]server$|config[/\\]environment/.test(
            target,
          ),
          `${name} bypasses bootstrap via ${dependency}`,
        ).toBe(false);
      }
    }
});
it('shares only browser-safe contracts with the renderer', () => {
  for (const [directory, external] of [
    [
      'apps/desktop/renderer/src',
      new Set([
        'react',
        'react-dom/client',
        '@askod/shared',
        'react-router-dom',
        '@mantine/core',
        '@mantine/core/styles.css',
        '@mantine/notifications',
        '@mantine/notifications/styles.css',
        '@tanstack/react-query',
        '@tanstack/react-table',
        'zustand',
        'zustand/middleware',
      ]),
    ],
    ['packages/shared/src', new Set(['zod'])],
  ] as const) {
    const root = resolve(workspace, directory);
    for (const file of files(root))
      for (const dependency of dependencies(file)) {
        expect(
          dependency.startsWith('.')
            ? inside(resolve(dirname(file), dependency), root)
            : external.has(dependency),
          `${relative(workspace, file)} imports ${dependency}`,
        ).toBe(true);
      }
  }
});
