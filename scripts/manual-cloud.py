#!/usr/bin/env python3
"""Trusted, deterministic validation around a read-only AI documentation proposal."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
from datetime import datetime
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
SAFE = ('apps/', 'packages/', 'docs/', 'ai/', 'deploy/')
DRAFT = 'AI draft — review required'

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()

def evidence_path(value, root=ROOT):
    if not isinstance(value, str) or not value.startswith(SAFE) or '..' in Path(value).parts:
        raise ValueError('Unsafe evidence path')
    p = root / value
    if p.is_symlink() or not p.is_file() or not p.resolve().is_relative_to(root.resolve()):
        raise ValueError('Evidence file is missing or outside the repository')
    if p.suffix not in {'.md', '.ts', '.tsx', '.json', '.css', '.mjs', '.py'}:
        raise ValueError('Unsupported evidence type')
    tracked = subprocess.check_output(['git', 'ls-files', '--', value], cwd=root, text=True).strip()
    if tracked != value:
        raise ValueError('Evidence is not tracked')
    return value

def text(value, maximum):
    if not isinstance(value, str) or not value.strip() or len(value) > maximum:
        raise ValueError('Invalid documentation text')
    if re.search(r'javascript:[^\s]|data:[^\s]|https?://|<script|<iframe|BEGIN .*PRIVATE KEY|\bsk-[a-zA-Z0-9]{16}', value, re.I):
        raise ValueError('Unapproved link, executable markup or credential pattern')
    return value

def identifier(value):
    if not isinstance(value, str) or not re.fullmatch(r'[a-z][a-z0-9-]{0,60}', value):
        raise ValueError('Invalid documentation identifier')
    return value

def validate_proposal(proposal):
    if not isinstance(proposal, dict) or set(proposal) != {'summary', 'updates', 'resolutions'}:
        raise ValueError('Invalid proposal structure')
    text(proposal['summary'], 2000)
    for kind, maximum in [('updates', 12), ('resolutions', 8)]:
        items = proposal[kind]
        if not isinstance(items, list) or len(items) > maximum:
            raise ValueError('Too many documentation changes')
        ids = set()
        for item in items:
            expected = {'id','title','group','roles','intro','steps','notes','evidencePaths'} if kind == 'updates' else {'id','title','symptom','cause','fix','verification','evidencePaths'}
            if not isinstance(item, dict) or set(item) != expected:
                raise ValueError('Unexpected proposal field')
            key = identifier(item['id'])
            if key in ids:
                raise ValueError('Duplicate documentation identifier')
            ids.add(key)
            text(item['title'], 150)
            if not isinstance(item['evidencePaths'], list) or not 1 <= len(item['evidencePaths']) <= 8:
                raise ValueError('Evidence is required')
            for path in item['evidencePaths']:
                evidence_path(path)
            if kind == 'updates':
                text(item['group'], 80); text(item['intro'], 2000)
                if not isinstance(item['roles'], list) or not item['roles'] or any(role not in ['Agent','Admin','Customer'] for role in item['roles']):
                    raise ValueError('Invalid manual role')
                if not isinstance(item['steps'], list) or not 1 <= len(item['steps']) <= 12:
                    raise ValueError('Invalid steps')
                for step in item['steps']:
                    if not isinstance(step, dict) or set(step) != {'title','text'}:
                        raise ValueError('Invalid step')
                    text(step['title'],150); text(step['text'],2000)
                if not isinstance(item['notes'], list) or len(item['notes']) > 8:
                    raise ValueError('Invalid notes')
                for note in item['notes']: text(note,1000)
            else:
                for field in ['symptom','cause','fix','verification']: text(item[field],2000)
    return proposal

def apply_proposal(proposal, root=ROOT):
    validate_proposal(proposal)
    now = datetime.now(ZoneInfo('Asia/Karachi'))
    content_path = root / 'docs/manual/content.json'
    data = json.loads(content_path.read_text())
    by_id = {c['id']: c for c in data['chapters']}
    sha = git('rev-parse','HEAD')
    def sources(paths):
        return [[p, f'https://github.com/digisol-ae/COEX/blob/{sha}/{p}'] for p in paths]
    for item in proposal['updates']:
        old = by_id.get(item['id'])
        chapter = {k:item[k] for k in ['id','title','group','roles','intro','steps','notes']}
        chapter.update(status=DRAFT, sources=sources(item['evidencePaths']), images=old['images'] if old else [], related=old['related'] if old else [])
        if old:
            data['chapters'][data['chapters'].index(old)] = chapter
        else:
            data['chapters'].append(chapter)
        by_id[item['id']] = chapter
    existing = {r['id'] for r in data['resolutions']}
    for item in proposal['resolutions']:
        if item['id'] in existing:
            raise ValueError('Existing verified resolution cannot be overwritten by an AI draft')
        name = f"{now:%Y-%m-%d}-{item['id']}.md"
        path = root / 'docs/resolutions/drafts' / name
        if path.exists(): raise ValueError('Draft already exists')
        path.parent.mkdir(parents=True,exist_ok=True)
        body = f"# {item['title']}\n\n**{DRAFT}.** Generated from repository evidence; no new live interaction was performed.\n"
        for field in ['symptom','cause','fix','verification']:
            body += f"\n## {field.title()}\n\n{item[field]}\n"
        body += '\n## Evidence\n\n' + '\n'.join(f'- [{p}](https://github.com/digisol-ae/COEX/blob/{sha}/{p})' for p in item['evidencePaths']) + '\n'
        path.write_text(body)
        card = {k:item[k] for k in ['id','title','symptom','cause','fix','verification']}
        card.update(date=now.strftime('%d %b %Y'),status=DRAFT,record='../resolutions/drafts/'+name)
        data['resolutions'].append(card)
    changed = bool(proposal['updates'] or proposal['resolutions'])
    if changed:
        data.update(updated=now.strftime('%d %B %Y'),version=now.strftime('%Y.%m.%d')+'-draft')
        content_path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    return changed

def validate_manual(root=ROOT):
    manual = root / 'docs/manual'
    data = json.loads((manual/'content.json').read_text())
    ids = [c['id'] for c in data['chapters']]
    if len(ids)!=len(set(ids)): raise ValueError('Duplicate chapter')
    for chapter in data['chapters']:
        for related in chapter['related']:
            if related not in ids: raise ValueError('Missing related chapter')
        for src,_ in chapter['images']:
            p=manual/'assets'/src
            if p.is_symlink() or not p.is_file() or not p.resolve().is_relative_to((manual/'assets').resolve()):
                raise ValueError('Invalid screenshot reference')
    for p in manual.rglob('*'):
        if p.is_symlink(): raise ValueError('Symlinks are not allowed in a manual package')
    return data

if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('action',choices=['evidence','apply','validate'])
    args=parser.parse_args()
    output=ROOT/'outputs/manual'; output.mkdir(parents=True,exist_ok=True)
    if args.action=='evidence':
        state=ROOT/'docs/manual/automation-state.json'
        previous=json.loads(state.read_text()).get('sourceCommit') if state.exists() else None
        if previous:
            git('merge-base','--is-ancestor',previous,'HEAD')
            span=f'{previous}..HEAD'
        else: span='HEAD~15..HEAD'
        payload={'sourceCommit':git('rev-parse','HEAD'),'previousSource':previous,'commits':git('log','--format=%h %s',span),'changedFiles':git('diff','--name-only',span),'generatedAt':datetime.now(ZoneInfo('Asia/Karachi')).isoformat()}
        (output/'evidence.json').write_text(json.dumps(payload,indent=2)+'\n')
    elif args.action=='apply':
        import os
        proposal=json.loads(os.environ['MANUAL_PROPOSAL_JSON'])
        changed=apply_proposal(proposal)
        (output/'proposal-summary.json').write_text(json.dumps({'changed':changed,'summary':proposal['summary'],'aiStatus':'draft generated; review required'},indent=2)+'\n')
        (ROOT/'docs/manual/automation-state.json').write_text(json.dumps({'sourceCommit':git('rev-parse','HEAD'),'reviewStatus':'AI draft — review required'},indent=2)+'\n')
    data=validate_manual()
    print(json.dumps({'chapters':len(data['chapters']),'resolutions':len(data['resolutions']),'validation':'passed'}))
