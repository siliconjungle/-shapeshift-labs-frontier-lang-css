import { copyFile, mkdir, readdir, rm } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const entry of await readdir('src')) {
  if (!entry.endsWith('.js') && !entry.endsWith('.d.ts')) continue;
  await copyFile(`src/${entry}`, `dist/${entry}`);
}
