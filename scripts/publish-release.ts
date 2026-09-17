import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const repo = process.env.GITHUB_REPOSITORY;
const tag = process.env.RELEASE_TAG;
const token = process.env.GH_TOKEN;
const mode = process.env.RELEASE_EXISTING_ONLY === 'true';
if (
  !repo ||
  !/^[\w.-]+\/[\w.-]+$/.test(repo) ||
  !tag ||
  !/^v\d+\.\d+\.\d+$/.test(tag) ||
  !token
)
  throw new Error('Missing repository, token or stable release tag');
const api = `https://api.github.com/repos/${repo}`;
const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};
async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${api}${path}`, {
    ...options,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${path}`);
  return response.json();
}
// Never create a tag from an arbitrary branch while publishing binaries.
await request(`/git/ref/tags/${encodeURIComponent(tag)}`);
const directory = process.argv[2] ?? 'release-assets';
const names = (await readdir(directory)).filter((name) =>
  /\.(exe|zip|deb|AppImage|dmg)$/.test(name),
);
if (!names.length) throw new Error('No release assets found');
const version = tag.slice(1);
for (const name of names)
  if (!name.startsWith(`ASKOD-Reports-${version}-`))
    throw new Error(`Asset version mismatch: ${name}`);
if (
  !mode &&
  (!names.some((n) => n.endsWith('-win-x64.exe')) ||
    !names.some((n) => n.endsWith('-linux-x64.AppImage')) ||
    !names.some((n) => n.endsWith('-linux-x64.deb')))
)
  throw new Error(
    'Both Windows and Ubuntu packages are required before publishing',
  );
if (mode && !names.some((n) => n.endsWith('.dmg')))
  throw new Error('Missing macOS DMG');
type Release = {
  id: number;
  draft: boolean;
  immutable?: boolean;
  upload_url: string;
  html_url: string;
};
const lookup = await fetch(`${api}/releases/tags/${encodeURIComponent(tag)}`, {
  headers,
});
let release: Release;
if (lookup.status === 404) {
  if (mode)
    throw new Error('Publish the Windows/Ubuntu release before adding macOS');
  release = await request('/releases', {
    method: 'POST',
    body: JSON.stringify({
      tag_name: tag,
      name: `ASKOD Звіти ${tag}`,
      draft: true,
      body: 'Інсталятори ASKOD Звіти для Windows та Ubuntu. macOS додається окремою ручною збіркою.\n\nПакети без сертифіката видавця; macOS має лише ad-hoc підпис і не нотаризована. Біля кожного файлу доступна контрольна сума SHA-256.',
    }),
  });
} else {
  if (!lookup.ok) throw new Error(`Cannot read release: ${lookup.status}`);
  release = (await lookup.json()) as Release;
}
if (mode && release.draft)
  throw new Error('The base release must be published first');
if (release.immutable)
  throw new Error('Immutable releases cannot accept a later macOS build');
type Asset = { name: string; digest?: string };
const existing: Asset[] = [];
for (let page = 1; ; page++) {
  const assets = (await request(
    `/releases/${release.id}/assets?per_page=100&page=${page}`,
  )) as Asset[];
  existing.push(...assets);
  if (assets.length < 100) break;
}
async function upload(name: string, bytes: Uint8Array) {
  const digest = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
  const prior = existing.find((asset) => asset.name === name);
  if (prior) {
    if (prior.digest !== digest)
      throw new Error(`Refusing to replace an existing release asset: ${name}`);
    console.log(`Already uploaded: ${name}`);
    return;
  }
  const endpoint = new URL(release.upload_url.split('{')[0]!);
  if (endpoint.origin !== 'https://uploads.github.com')
    throw new Error('Unexpected upload host');
  endpoint.searchParams.set('name', name);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/octet-stream' },
    body: new Blob([Uint8Array.from(bytes)]),
  });
  if (!response.ok)
    throw new Error(`Upload failed: ${name} (${response.status})`);
  console.log(`Uploaded: ${name}`);
}
for (const name of names) {
  const bytes = await readFile(join(directory, name));
  await upload(name, bytes);
  await upload(
    `${name}.sha256`,
    new TextEncoder().encode(
      `${createHash('sha256').update(bytes).digest('hex')}  ${name}\n`,
    ),
  );
}
if (release.draft)
  await request(`/releases/${release.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ draft: false }),
  });
console.log(`Published: ${release.html_url}`);
