#!/usr/bin/env python3
"""Validate Command Academy JSON command libraries."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = {'name', 'category', 'summary', 'description', 'syntax', 'options', 'examples', 'risk', 'compatibility', 'tags', 'related'}
VALID_RISK = {'safe', 'caution', 'danger'}
failed = False
for platform in ('linux', 'windows'):
    path = ROOT / 'data' / f'{platform}.json'
    try:
        data = json.loads(path.read_text(encoding='utf-8'))
    except Exception as exc:
        print(f'FAIL {path}: {exc}')
        failed = True
        continue
    commands = data.get('commands')
    if not isinstance(commands, list):
        print(f'FAIL {path}: commands must be an array')
        failed = True
        continue
    names = set()
    for index, command in enumerate(commands, 1):
        label = f'{path.name} entry #{index}'
        missing = REQUIRED - set(command)
        if missing:
            print(f'FAIL {label}: missing {", ".join(sorted(missing))}')
            failed = True
        name = str(command.get('name', '')).strip()
        if not name:
            print(f'FAIL {label}: empty name')
            failed = True
        elif name.casefold() in names:
            print(f'FAIL {label}: duplicate command name {name!r}')
            failed = True
        names.add(name.casefold())
        if command.get('risk') not in VALID_RISK:
            print(f'FAIL {label}: risk must be one of {sorted(VALID_RISK)}')
            failed = True
        for key in ('options', 'examples', 'tags', 'related'):
            if key in command and not isinstance(command[key], list):
                print(f'FAIL {label}: {key} must be an array')
                failed = True
    print(f'{"FAIL" if failed else "OK"} {path.name}: {len(commands)} commands')
if failed:
    raise SystemExit(1)
print('All command libraries passed validation.')
