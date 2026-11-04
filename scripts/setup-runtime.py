#!/usr/bin/env python3
"""Install a checksummed Node distribution and project-local pnpm/Python."""
from pathlib import Path
import hashlib
import os
import platform
import subprocess

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / '.tools'
CACHE = ROOT / '.cache'
VERSION = (ROOT / '.node-version').read_text().strip()
PYTHON_VERSION = (ROOT / '.python-version').read_text().strip()
if platform.system() != 'Darwin' or platform.machine() != 'arm64':
    raise SystemExit('This bootstrap currently targets the selected Apple Silicon Mac.')
TOOLS.mkdir(exist_ok=True)
CACHE.mkdir(exist_ok=True)
archive = f'node-v{VERSION}-darwin-arm64.tar.gz'
base = f'https://nodejs.org/dist/v{VERSION}'


def run(args, **kwargs):
    print('Running:', ' '.join(str(x) for x in args), flush=True)
    return subprocess.run([str(x) for x in args], check=True, cwd=ROOT, **kwargs)


for name in ['SHASUMS256.txt', archive]:
    dest = CACHE / name
    if not dest.exists():
        run(['curl', '--fail', '--location', '--silent', '--show-error', '--retry', '2',
             f'{base}/{name}', '-o', dest])
expected = next(line.split()[0] for line in (CACHE / 'SHASUMS256.txt').read_text().splitlines() if line.split()[-1] == archive)
actual = hashlib.sha256((CACHE / archive).read_bytes()).hexdigest()
if actual != expected:
    raise SystemExit('Node SHA-256 mismatch; archive left for inspection.')
distribution = TOOLS / archive[:-7]
if not distribution.exists():
    run(['tar', '-xzf', CACHE / archive, '-C', TOOLS])
node_link = TOOLS / 'node'
if not node_link.exists():
    node_link.symlink_to(distribution.name, target_is_directory=True)
elif node_link.resolve() != distribution.resolve():
    raise SystemExit('Existing .tools/node differs; left untouched.')
env = {**os.environ, 'PATH': str(node_link / 'bin') + os.pathsep + os.environ['PATH'],
       'npm_config_cache': str(CACHE / 'npm')}
run([node_link / 'bin/node', node_link / 'lib/node_modules/npm/bin/npm-cli.js', 'install',
     '--prefix', TOOLS / 'pnpm', '--ignore-scripts', '--no-audit', '--no-fund', 'pnpm@11.25.0'], env=env)
env.update({'UV_PYTHON_INSTALL_DIR': str(TOOLS / 'python'), 'UV_CACHE_DIR': str(CACHE / 'uv'),
            'UV_PYTHON_BIN_DIR': str(TOOLS / 'python-bin')})
run(['uv', 'python', 'install', PYTHON_VERSION, '--no-bin'], env=env)
if not (ROOT / '.venv').exists():
    run(['uv', 'venv', '--python', PYTHON_VERSION, ROOT / '.venv'], env=env)
print('Project runtime installed; activate with: source ./scripts/env.sh', flush=True)
