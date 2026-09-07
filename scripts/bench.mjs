#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const port = process.env.BENCH_PORT || '3000';
const origin = `http://127.0.0.1:${port}`;

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', cwd: root, ...opts });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`));
    });
  });
}

await run('npm', ['run', 'build']);

const preview = spawn('node', ['scripts/preview-static.mjs'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, PORT: port },
});

async function waitForServer() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(origin);
      if (res.ok || res.status === 404) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Preview server did not start on ${origin}`);
}

try {
  await waitForServer();
  await run('node', ['scripts/bench-assets.mjs'], { env: { ...process.env, BENCH_ORIGIN: origin } });
} finally {
  preview.kill('SIGTERM');
}
