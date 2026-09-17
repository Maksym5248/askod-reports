import { spawn } from 'node:child_process';
import { cp, mkdir, readFile, rm, writeFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { build, Platform, Arch, type Configuration } from 'electron-builder';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const target = process.argv[2];
if (target !== 'windows' && target !== 'ubuntu' && target !== 'mac')
  throw new Error('Expected windows, ubuntu or mac');
if (target === 'mac' && process.platform !== 'darwin')
  throw new Error('macOS distributions must be built on macOS');
if (target === 'ubuntu' && process.platform !== 'linux')
  throw new Error(
    'Ubuntu packages must be built on Linux (Ubuntu 22.04/24.04 or the desktop-build workflow).',
  );
const architecture =
  target === 'mac' && process.arch === 'arm64' ? Arch.arm64 : Arch.x64;
const engine =
  target === 'windows'
    ? 'windows'
    : target === 'mac'
      ? architecture === Arch.arm64
        ? 'darwin-arm64'
        : 'darwin'
      : 'debian-openssl-3.0.x';
const queryEngine =
  target === 'windows'
    ? 'query_engine-windows.dll.node'
    : `libquery_engine-${engine}.${target === 'mac' ? 'dylib' : 'so'}.node`;
const stage = resolve(root, '.data', 'packaging', target);
const manifest = resolve(root, 'apps/desktop/packaging');
const env = {
  ...process.env,
  PRISMA_CLI_BINARY_TARGETS: engine,
  CHECKPOINT_DISABLE: '1',
};
async function run(args: string[], cwd = stage) {
  await new Promise<void>((success, failure) => {
    const child = spawn(process.execPath, args, { cwd, env, stdio: 'inherit' });
    child.on('error', failure);
    child.on('exit', (code) =>
      code === 0
        ? success()
        : failure(new Error(`Command failed (${code}): ${args.join(' ')}`)),
    );
  });
}
// Delete only the isolated packaging staging directory, never user data.
await rm(stage, { recursive: true, force: true });
await mkdir(stage, { recursive: true });
await cp(resolve(manifest, 'package.json'), resolve(stage, 'package.json'));
await cp(
  resolve(manifest, 'package-lock.json'),
  resolve(stage, 'package-lock.json'),
);
await cp(resolve(root, 'apps/desktop/out'), resolve(stage, 'out'), {
  recursive: true,
});
await cp(resolve(root, 'apps/backend/prisma'), resolve(stage, 'prisma'), {
  recursive: true,
});
const schemaPath = resolve(stage, 'prisma/schema.prisma');
const schema = await readFile(schemaPath, 'utf8');
await writeFile(
  schemaPath,
  schema.replace(
    'provider = "prisma-client-js"',
    `provider = "prisma-client-js"\n  binaryTargets = ["native", "${engine}"]`,
  ),
);
const npmCli = process.env.npm_execpath;
if (!npmCli)
  throw new Error(
    'Run this script through npm run build:windows, build:ubuntu or build:mac',
  );
await run([
  npmCli,
  'ci',
  '--omit=dev',
  '--ignore-scripts',
  '--no-audit',
  '--no-fund',
]);
await run([
  resolve(stage, 'node_modules/prisma/build/index.js'),
  'generate',
  '--schema',
  schemaPath,
]);
// Fail before packaging when a target-native binary is missing.
await access(resolve(stage, 'node_modules/.prisma/client', queryEngine));
await access(
  resolve(
    stage,
    'node_modules/@prisma/engines',
    target === 'windows'
      ? 'schema-engine-windows.exe'
      : `schema-engine-${engine}`,
  ),
);
const config: Configuration = {
  appId: 'ua.askod.reports',
  productName: 'ASKOD Reports',
  electronVersion: require('electron/package.json').version,
  directories: { app: stage, output: resolve(root, 'release', target) },
  // Prisma executes its migration CLI and native engines from real paths.
  asar: false,
  npmRebuild: false,
  // Generated Prisma Client is not a declared npm package and is otherwise
  // omitted by electron-builder's production dependency collector.
  extraResources: [
    {
      from: resolve(stage, 'node_modules/.prisma'),
      to: 'app/node_modules/.prisma',
    },
  ],
  files: ['out/**/*', 'prisma/**/*', 'package.json', 'node_modules/**/*'],
  artifactName: 'ASKOD-Reports-${version}-${os}-${arch}.${ext}',
  win: { target: ['nsis', 'zip'], signExecutable: false },
  mac: {
    target: ['dmg', 'zip'],
    category: 'public.app-category.productivity',
    identity: '-',
    hardenedRuntime: false,
    notarize: false,
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: false,
  },
  linux: {
    target: ['AppImage', 'deb'],
    category: 'Office',
    maintainer: 'ASKOD Reports',
    executableName: 'askod-reports',
  },
};
await build({
  projectDir: root,
  targets: (target === 'windows'
    ? Platform.WINDOWS
    : target === 'mac'
      ? Platform.MAC
      : Platform.LINUX
  ).createTarget(undefined, architecture),
  config,
  publish: 'never',
});
const packaged = resolve(
  root,
  'release',
  target,
  target === 'windows'
    ? 'win-unpacked'
    : target === 'mac'
      ? `${architecture === Arch.arm64 ? 'mac-arm64' : 'mac'}/ASKOD Reports.app/Contents`
      : 'linux-unpacked',
  target === 'mac' ? 'Resources/app' : 'resources/app',
);
await access(resolve(packaged, 'node_modules/.prisma/client/default.js'));
await access(resolve(packaged, 'node_modules/.prisma/client', queryEngine));
await access(
  resolve(
    packaged,
    'node_modules/@prisma/engines',
    target === 'windows'
      ? 'schema-engine-windows.exe'
      : `schema-engine-${engine}`,
  ),
);
await access(resolve(packaged, 'node_modules/prisma/build/index.js'));
await access(resolve(packaged, 'prisma/migrations/migration_lock.toml'));
console.log(`Verified packaged Prisma runtime: ${packaged}`);
