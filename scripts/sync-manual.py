#!/usr/bin/env python3
"""Download a versioned cloud manual into a new local folder; never overwrite a checkout."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import stat
import subprocess
import tempfile
import zipfile

ROOT=Path(__file__).resolve().parent.parent

def unpack_checked(package, destination):
    with zipfile.ZipFile(package) as archive:
        if sum(i.file_size for i in archive.infolist()) > 50*1024*1024:
            raise ValueError('Manual archive is too large')
        names=set()
        for info in archive.infolist():
            path=PurePosixPath(info.filename)
            if info.is_dir() or str(path) != info.filename or info.filename in names or path.is_absolute() or '..' in path.parts or '\\' in info.filename or stat.S_ISLNK(info.external_attr >> 16):
                raise ValueError('Unsafe archive member')
            names.add(info.filename)
            if path.parts and (path.parts[0] not in {'docs','ai','deploy'} and info.filename not in {'START-HERE.html','PACKAGE-MANIFEST.json'}):
                raise ValueError('Unexpected archive content')
            if any(part.startswith('.') for part in path.parts) or path.suffix.lower() in {'.pem','.env','.key'}:
                raise ValueError('Private file rejected')
        manifest=json.loads(archive.read('PACKAGE-MANIFEST.json'))
        for entry in manifest['files']:
            if entry['path'] not in names or hashlib.sha256(archive.read(entry['path'])).hexdigest()!=entry['sha256']:
                raise ValueError('Manual hash verification failed')
        if names != {entry['path'] for entry in manifest['files']} | {'START-HERE.html','PACKAGE-MANIFEST.json'}:
            raise ValueError('Unlisted archive content')
        if destination.exists(): raise FileExistsError(destination)
        destination.mkdir(parents=True)
        archive.extractall(destination)
    return destination/'docs/manual/index.html'

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--run',type=int)
    args=parser.parse_args()
    run=args.run
    if not run:
        runs=json.loads(subprocess.check_output(['gh','run','list','--workflow','nightly-manual.yml','--status','success','--limit','10','--json','databaseId'],cwd=ROOT,text=True))
        if not runs: raise SystemExit('No successful cloud manual run is available.')
        run=runs[0]['databaseId']
    parent=ROOT/'outputs/manual/cloud'; parent.mkdir(parents=True,exist_ok=True)
    destination=parent/f'run-{run}'
    if destination.exists():
        print(f'Existing snapshot preserved: {destination}')
        raise SystemExit(0)
    with tempfile.TemporaryDirectory(prefix='download-',dir=parent) as temp:
        staging=Path(temp)
        subprocess.run(['gh','run','download',str(run),'--name',f'worktello-manual-{run}','--dir',str(staging)],cwd=ROOT,check=True)
        entry=unpack_checked(staging/'Worktello-Manual-cloud.zip',staging/'site')
        status=json.loads((staging/'cloud-status.json').read_text())
        staging.rename(destination)
    print(destination/'site/docs/manual/index.html')
    print(json.dumps(status))
