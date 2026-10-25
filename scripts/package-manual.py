#!/usr/bin/env python3
"""Package the local handbook and its referenced Markdown; exclude all private app data."""
from pathlib import Path
from datetime import datetime, timezone
import argparse
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parent.parent
MANUAL = ROOT / 'docs/manual'

def content():
    return json.loads((MANUAL / 'content.json').read_text())

def files_to_package(data):
    files = {p for p in MANUAL.rglob('*') if p.is_file()}
    refs = [href for c in data['chapters'] for _, href in c['sources']]
    refs += [r['record'] for r in data['resolutions']]
    for href in refs:
        if href.startswith('https:') or not href.endswith('.md'):
            continue
        target = (MANUAL / href).resolve()
        if not target.is_relative_to(ROOT) or target.suffix != '.md':
            raise ValueError('Unsafe reference')
        if not target.is_file():
            raise FileNotFoundError(target.relative_to(ROOT))
        files.add(target)
    files.update(p for p in (ROOT / 'docs/resolutions').rglob('*') if p.is_file())
    # Preserve historical source records cited by dated resolution summaries.
    for name in [
        'docs/OUTLOOK-WEB.md', 'docs/SEARCH-QA.md', 'docs/SUBTASK-CHECKBOX-QA.md',
        'ai/RELEASE-2026-10-22-TUTORIAL-ORIGIN.md', 'ai/RELEASE-2026-10-22-ENTRA-FOOTER.md',
        'ai/RELEASE-2026-10-25.md',
    ]:
        files.add(ROOT / name)
    for p in files:
        if not p.is_relative_to(ROOT) or not p.is_file() or p.suffix.lower() not in {'.html','.css','.js','.md','.png','.jpg','.jpeg','.svg','.json','.csv'}:
            raise ValueError('Non-document artifact rejected: ' + str(p))
    return sorted(files)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=ROOT / 'outputs/manual/Worktello-Manual-2026-10-25.zip')
    args = parser.parse_args()
    data = content()
    (MANUAL / 'content.js').write_text('window.WORKTELLO_MANUAL = ' + json.dumps(data, ensure_ascii=False, indent=2) + ';\n')
    files = files_to_package(data)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    manifest = {'manualVersion':data['version'], 'packagedAt':datetime.now(timezone.utc).isoformat(), 'files':[{ 'path':str(p.relative_to(ROOT)), 'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]}
    with zipfile.ZipFile(args.output, 'w', zipfile.ZIP_DEFLATED) as z:
        for p in files:
            z.write(p, p.relative_to(ROOT))
        z.writestr('START-HERE.html','<!doctype html><meta charset="utf-8"><title>Worktello manual</title><meta http-equiv="refresh" content="0;url=docs/manual/index.html"><a href="docs/manual/index.html">Open the Worktello manual</a>')
        z.writestr('PACKAGE-MANIFEST.json', json.dumps(manifest, indent=2))
    with zipfile.ZipFile(args.output) as z:
        if z.testzip():
            raise ValueError('Package integrity failure')
    print(f'{args.output}: {len(files)} source/assets, {len(data["chapters"])} chapters, {len(data["resolutions"])} resolutions')
