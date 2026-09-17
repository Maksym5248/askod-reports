import './style.css';
const repository = 'Maksym5248/askod-reports';
const releases = `https://github.com/${repository}/releases`;
type Asset = {
  name: string;
  browser_download_url: string;
  size: number;
  state: string;
};
const containers = ['windows', 'ubuntu', 'mac'] as const;
const status = document.querySelector<HTMLElement>('#release-status')!;
function message(text: string) {
  for (const id of containers) document.getElementById(id)!.textContent = text;
}
function safeLink(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return (
      url.origin === 'https://github.com' &&
      url.pathname.startsWith(`/${repository}/releases/`)
    );
  } catch {
    return false;
  }
}
function addDownload(
  parent: HTMLElement,
  asset: Asset,
  label: string,
  assets: Asset[],
) {
  const row = document.createElement('div');
  row.className = 'download-row';
  const link = document.createElement('a');
  link.className = 'download';
  link.href = asset.browser_download_url;
  link.textContent = label;
  row.append(link);
  const info = document.createElement('div');
  info.className = 'file-info';
  info.textContent = `${(asset.size / 1024 / 1024).toFixed(0)} МБ`;
  const checksum = assets.find((a) => a.name === `${asset.name}.sha256`);
  if (checksum) {
    const sum = document.createElement('a');
    sum.href = checksum.browser_download_url;
    sum.textContent = 'SHA-256';
    sum.setAttribute('aria-label', `Контрольна сума ${asset.name}`);
    info.append(sum);
  }
  row.append(info);
  parent.append(row);
}
async function load() {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repository}/releases/latest`,
      {
        signal: AbortSignal.timeout(10000),
        headers: { Accept: 'application/vnd.github+json' },
      },
    );
    if (response.status === 404) {
      status.textContent = 'Перший реліз ще готується';
      message('Збірку ще не опубліковано');
      return;
    }
    if (!response.ok) throw new Error(`GitHub ${response.status}`);
    const data = await response.json();
    if (
      typeof data.tag_name !== 'string' ||
      !/^v\d+\.\d+\.\d+$/.test(data.tag_name) ||
      !Array.isArray(data.assets) ||
      data.draft ||
      data.prerelease
    )
      throw new Error('Invalid release');
    const version = data.tag_name.slice(1);
    const assets: Asset[] = data.assets.filter(
      (a: Asset) =>
        typeof a.name === 'string' &&
        a.name.startsWith(`ASKOD-Reports-${version}-`) &&
        safeLink(a.browser_download_url) &&
        Number.isFinite(a.size) &&
        a.state === 'uploaded',
    );
    status.textContent = `Доступна версія ${version}`;
    if (safeLink(data.html_url))
      document.querySelector<HTMLAnchorElement>('#release-link')!.href =
        data.html_url;
    const choices: Record<
      (typeof containers)[number],
      Array<[string, string]>
    > = {
      windows: [
        ['-win-x64.exe', 'Завантажити інсталятор'],
        ['-win-x64.zip', 'ZIP-архів'],
      ],
      ubuntu: [
        ['-linux-x64.AppImage', 'Завантажити AppImage'],
        ['-linux-x64.deb', 'DEB-пакет'],
      ],
      mac: [
        ['-mac-arm64.dmg', 'DMG · Apple Silicon'],
        ['-mac-x64.dmg', 'DMG · Intel'],
      ],
    };
    for (const id of containers) {
      const parent = document.getElementById(id)!;
      parent.replaceChildren();
      for (const [suffix, label] of choices[id]) {
        const asset = assets.find(
          (a) => a.name === `ASKOD-Reports-${version}${suffix}`,
        );
        if (asset) addDownload(parent, asset, label, assets);
      }
      if (!parent.children.length)
        parent.textContent = 'Для цієї версії збірку ще не опубліковано';
    }
  } catch {
    status.textContent = 'Не вдалося перевірити останню версію';
    for (const id of containers) {
      const parent = document.getElementById(id)!;
      parent.replaceChildren();
      const link = document.createElement('a');
      link.href = releases;
      link.className = 'download';
      link.textContent = 'Відкрити GitHub Releases';
      parent.append(link);
    }
  }
}
void load();
