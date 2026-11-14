#!/usr/bin/env python3
"""Restore commit-pinned upstream snapshots without running upstream code."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'references/manifest.json'
CACHE = ROOT / '.cache/reference-archives'


def fetch(entry):
    item = dict(entry)
    repo = item['repository']
    commit = item.get('commit') or item.get('requested_ref')
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repo) or not re.fullmatch(r'[a-f0-9]{40}', commit or ''):
        return {**item, 'status': 'failed', 'error': 'An explicit repository and commit are required'}
    dest = ROOT / 'references/sources' / repo
    try:
        if item['status'] == 'ready' and dest.exists():
            item.setdefault('checkout_type', 'git' if (dest / '.git').is_dir() else 'archive')
            return item
        url = f'https://codeload.github.com/{repo}/tar.gz/{commit}'
        archive = CACHE / (repo.replace('/', '--') + '-' + commit + '.tar.gz')
        if not archive.exists():
            partial = archive.with_suffix('.gz.part')
            subprocess.run(['curl', '--fail', '--location', '--silent', '--show-error',
                            '--connect-timeout', '20', '--max-time', '240', '--retry', '2',
                            '--retry-delay', '1', url, '-o', str(partial)], check=True, timeout=750)
            partial.replace(archive)
        digest = hashlib.sha256(archive.read_bytes()).hexdigest()
        with tempfile.TemporaryDirectory(dir=CACHE, prefix='extract-') as temporary:
            temporary = Path(temporary)
            with tarfile.open(archive, 'r:gz') as tar:
                roots = {member.name.split('/')[0] for member in tar.getmembers()}
                if len(roots) != 1 or not next(iter(roots)).endswith(commit):
                    raise ValueError('Archive root does not match the requested commit')
                tar.extractall(temporary, filter='data')
            extracted = temporary / next(iter(roots))
            if dest.exists():
                backup = ROOT / '.cache/reference-partials' / repo.replace('/', '--')
                backup.parent.mkdir(parents=True, exist_ok=True)
                if backup.exists(): raise ValueError('Partial backup exists; refusing overwrite')
                dest.rename(backup)
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(extracted), str(dest))
        if item.get('error'):
            item.setdefault('previous_attempts', []).append({'method': 'git', 'error': item['error']})
        item.update({'status': 'ready', 'commit': commit, 'checkout_type': 'archive',
                     'archive_url': url, 'archive_path': str(archive.relative_to(ROOT)),
                     'archive_sha256': digest, 'lfs_smudge_skipped': True,
                     'submodules_initialized': False,
                     'downloaded_at': datetime.now(timezone.utc).isoformat(),
                     'source_files': sum(p.is_file() or p.is_symlink() for p in dest.rglob('*')),
                     'license_files': sorted(p.name for p in dest.iterdir() if p.is_file() and re.search(r'license|copying|notice', p.name, re.I))})
        (dest / '.reference-source.json').write_text(json.dumps({k: item[k] for k in ['repository','commit','archive_url','archive_sha256']},indent=2)+'\n')
        item.pop('error', None)
    except Exception as exc:
        item.update(status='failed', error=str(exc)[-1800:])
    return item


def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text())
    entries = {e['repository']: e for e in manifest['entries']}
    with ThreadPoolExecutor(max_workers=4) as pool:
        jobs = [pool.submit(fetch, e) for e in entries.values()]
        for job in as_completed(jobs):
            item = job.result(); entries[item['repository']] = item
            manifest['entries'] = [entries[key] for key in sorted(entries)]
            temporary = MANIFEST.with_suffix('.json.tmp')
            temporary.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
            temporary.replace(MANIFEST)
            print(f"{item['status']}: {item['repository']} {item.get('commit','')[:12]}",flush=True)
    failed=[e for e in entries.values() if e['status']!='ready']
    print(f'Ready: {len(entries)-len(failed)}/{len(entries)}',flush=True)
    return bool(failed)


if __name__ == '__main__':
    sys.exit(main())
