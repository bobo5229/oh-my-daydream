import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../astro.config.mjs';
import { loadPresentation } from '../src/presentation.ts';
import { assertSafeOutput, withSourceGuard } from '../src/content/source-guard.ts';

if (process.argv.length > 2) throw new Error('受保护构建不接受覆盖输出路径等额外参数。');
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const sourceRoot = resolve(projectRoot, '..');
const configuredRoot = resolve(projectRoot, config.root ?? '.');
if (resolve(configuredRoot) !== resolve(projectRoot)) throw new Error('构建根目录必须是 reader 工程。');
for (const target of [config.outDir, config.cacheDir, config.build?.client, config.build?.server]) {
  if (target) await assertSafeOutput(projectRoot, String(target));
}
await withSourceGuard(sourceRoot, async () => {
  const presentation = await loadPresentation({ sourceRoot, render: false });
  for (const diagnostic of presentation.diagnostics) console.warn(`[reader:${diagnostic.code}] ${diagnostic.file}: ${diagnostic.message}`);
  const packageRoot = resolve(projectRoot, 'node_modules/astro');
  const manifest = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8')) as { bin: { astro: string } };
  await new Promise<void>((done, reject) => {
    const child = spawn(process.execPath, [resolve(packageRoot, manifest.bin.astro), 'build'], {
      cwd: projectRoot, stdio: 'inherit', env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
    });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? done() : reject(new Error(`Astro build exited with ${code}`)));
  });
});
console.log('Source integrity verified: source path set and byte hashes are unchanged.');
