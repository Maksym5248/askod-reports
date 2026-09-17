import { readFile } from 'node:fs/promises';

const tag = process.env.RELEASE_TAG;
if (tag && !/^v\d+\.\d+\.\d+$/.test(tag))
  throw new Error('Use a stable release tag such as v0.1.1');
const manifests = [
  'package.json',
  'apps/backend/package.json',
  'apps/desktop/package.json',
  'apps/desktop/packaging/package.json',
  'packages/shared/package.json',
];
const versions = await Promise.all(
  manifests.map(
    async (path) => JSON.parse(await readFile(path, 'utf8')).version as string,
  ),
);
if (versions.some((version) => version !== versions[0]))
  throw new Error('Workspace and packaging versions must match');
if (tag && tag !== `v${versions[0]}`)
  throw new Error(`Tag ${tag} does not match package version ${versions[0]}`);
console.log(`Verified release version ${versions[0]}`);
