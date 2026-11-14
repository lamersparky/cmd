#!/usr/bin/env python3
"""Add a command record to Command Academy's Linux or Windows JSON library."""
from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / 'data'


def ask(label: str, default: str = '') -> str:
    suffix = f' [{default}]' if default else ''
    value = input(f'{label}{suffix}: ').strip()
    return value or default


def parse_pipe_rows(values: list[str], required: int, label: str) -> list[list[str]]:
    rows = []
    for value in values:
        parts = [part.strip() for part in value.split('|')]
        if len(parts) < required or any(not part for part in parts[:required]):
            raise ValueError(f'{label} must use {required} non-empty fields separated by |: {value!r}')
        rows.append(parts)
    return rows


def interactive(args: argparse.Namespace) -> argparse.Namespace:
    print('\nCOMMAND ACADEMY // ADD COMMAND\n')
    args.name = args.name or ask('Command name')
    args.category = args.category or ask('Category')
    args.summary = args.summary or ask('Short description')
    args.syntax = args.syntax or ask('Syntax', args.name)
    args.risk = args.risk or ask('Risk (safe/caution/danger)', 'safe')
    args.compatibility = args.compatibility or ask('Compatibility note', 'Check your OS version and installed utilities.')
    if not args.option:
        print('Options: enter FLAG|description; press Enter on a blank line to finish.')
        args.option = []
        while True:
            row = input('  option> ').strip()
            if not row:
                break
            args.option.append(row)
    if not args.example:
        example = input('Example (COMMAND|DESCRIPTION|OUTPUT, optional)> ').strip()
        args.example = [example] if example else []
    if not args.related:
        args.related = [x.strip() for x in ask('Related commands (comma-separated)', '').split(',') if x.strip()]
    if not args.tag:
        args.tag = [x.strip() for x in ask('Search tags (comma-separated)', '').split(',') if x.strip()]
    return args


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--platform', choices=('linux', 'windows'), required=True, help='Which command library to update.')
    parser.add_argument('--name', help='Command name, e.g. ls or net user.')
    parser.add_argument('--category', help='Library category.')
    parser.add_argument('--summary', help='Short command description.')
    parser.add_argument('--syntax', help='Command syntax string.')
    parser.add_argument('--risk', choices=('safe', 'caution', 'danger'), help='Safety classification.')
    parser.add_argument('--compatibility', help='Platform/version compatibility note.')
    parser.add_argument('--option', action='append', default=[], help='Option in FLAG|description format; repeat as needed.')
    parser.add_argument('--example', action='append', default=[], help='Example in COMMAND|DESCRIPTION|OUTPUT format; repeat as needed.')
    parser.add_argument('--related', action='append', default=[], help='Related command name; repeat as needed.')
    parser.add_argument('--tag', action='append', default=[], help='Search tag; repeat as needed.')
    parser.add_argument('--dry-run', action='store_true', help='Validate and print the entry without saving.')
    args = parser.parse_args()

    try:
        if not all((args.name, args.category, args.summary, args.syntax, args.risk, args.compatibility)):
            args = interactive(args)
        name = args.name.strip()
        if not name or not args.category.strip() or not args.summary.strip() or not args.syntax.strip():
            raise ValueError('Name, category, summary, and syntax cannot be empty.')
        options = [{'flag': row[0], 'description': row[1]} for row in parse_pipe_rows(args.option, 2, 'Options')]
        examples = [{'command': row[0], 'description': row[1], 'output': row[2] if len(row) > 2 else ''} for row in parse_pipe_rows(args.example, 2, 'Examples')]
        if not examples:
            examples = [{'command': name, 'description': args.summary.strip(), 'output': 'Example output depends on your system and arguments.'}]
        related = []
        for item in args.related:
            related.extend(part.strip() for part in item.split(',') if part.strip())
        tags = []
        for item in args.tag:
            tags.extend(part.strip() for part in item.split(',') if part.strip())
        entry = {
            'name': name,
            'category': args.category.strip(),
            'summary': args.summary.strip(),
            'description': args.summary.strip(),
            'syntax': args.syntax.strip(),
            'options': options,
            'examples': examples,
            'risk': args.risk,
            'compatibility': args.compatibility.strip(),
            'tags': tags,
            'related': related,
        }
        path = DATA_DIR / f'{args.platform}.json'
        data = json.loads(path.read_text(encoding='utf-8'))
        if any(command['name'].casefold() == name.casefold() for command in data['commands']):
            raise ValueError(f'{name!r} already exists in {path.name}.')
        data['commands'].append(entry)
        data['commands'].sort(key=lambda command: command['name'].casefold())
        if args.dry_run:
            print(json.dumps(entry, indent=2, ensure_ascii=False))
            print(f'\nDRY RUN: {path.name} not changed.')
        else:
            path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
            print(f'Added {name!r} to {path}.')
            print(f'Library now contains {len(data["commands"])} commands.')
        return 0
    except (OSError, json.JSONDecodeError, ValueError) as error:
        print(f'Error: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
