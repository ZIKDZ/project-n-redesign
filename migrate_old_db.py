"""
migrate_old_db.py
=================
Migrates players and join-requests from the OLD SQLite database
into the NEW NBLEsport Django project (Supabase PostgreSQL).

HOW TO USE
----------
1. Copy this file into the ROOT of your Django project (next to manage.py).
2. Run:

       python migrate_old_db.py path/to/old_db.sqlite3

   Or, if you want a dry-run (no DB writes):

       python migrate_old_db.py path/to/old_db.sqlite3 --dry-run
"""

import os
import sys
import sqlite3
import django
import argparse
from pathlib import Path

# ── Set DATABASE_URL explicitly (one-time migration) ──────────────────────────
DATABASE_URL = (
    "postgresql://postgres.hqpbspugfhsmcowdiyxg:Chahine74DBase"
    "@aws-1-eu-west-3.pooler.supabase.com:6543/postgres"
)
os.environ['DATABASE_URL'] = DATABASE_URL

# ── Bootstrap Django ──────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection
from apps.players.models import Player
from apps.joins.models import JoinRequest
from apps.games.models import Game

# ── Old-game-name → new-game-slug mapping ────────────────────────────────────
GAME_NAME_TO_SLUG = {
    'Valorant':          'valorant',
    'Rocket League':     'rocket_league',
    'Fortnite':          'fortnite',
    'Counter Strike 2':  'counter_strike_2',
    'FC™ 25':            'fc_25',
}

JOIN_STATUS_MAP = {
    'accepted':  'accepted',
    'pending':   'pending',
    'rejected':  'rejected',
    'reviewing': 'reviewing',
}

PLAYER_STATUS_MAP = {
    'active':    'active',
    'inactive':  'inactive',
    'suspended': 'suspended',
}


# ── DB connection check ───────────────────────────────────────────────────────
def check_db_connection() -> bool:
    db_url = os.environ.get('DATABASE_URL', 'NOT SET')

    # Mask password for safe display
    if '://' in db_url and '@' in db_url:
        prefix = db_url[:db_url.index('://') + 3]
        rest   = db_url[db_url.index('@'):]
        safe   = f"{prefix}****{rest}"
    else:
        safe = db_url

    print(f"  DATABASE_URL : {safe}")

    try:
        with connection.cursor() as cur:
            cur.execute("SELECT version();")
            version = cur.fetchone()[0]
        print(f"  DB version   : {version[:70]}")

        # Confirm it's Supabase / PostgreSQL, not local SQLite
        if 'postgresql' in db_url or 'postgres' in db_url:
            print("  Target       : ✓ PostgreSQL (Supabase) — correct!")
        else:
            print("  Target       : ⚠ WARNING — does not look like PostgreSQL!")
        return True

    except Exception as exc:
        print(f"  ERROR        : {exc}")
        return False


# ── SQLite loader ─────────────────────────────────────────────────────────────
def load_sqlite(db_path: str):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("SELECT id, name FROM pages_game")
    old_games = {r['id']: r['name'] for r in cur.fetchall()}

    cur.execute("SELECT id, rank_name, game_id FROM pages_rank")
    old_ranks = {r['id']: {'name': r['rank_name'], 'game_id': r['game_id']}
                 for r in cur.fetchall()}

    cur.execute("""
        SELECT id, username, email, discord_username, in_game_username,
               status, application_date, game_id, rank_id, team_id
        FROM players_player
    """)
    old_players = [dict(r) for r in cur.fetchall()]

    cur.execute("""
        SELECT id, username, email, discord_username, in_game_username,
               application_date, status, game_id, rank_id
        FROM players_joinrequest
    """)
    old_joins = [dict(r) for r in cur.fetchall()]

    conn.close()
    return old_games, old_ranks, old_players, old_joins


# ── Game resolver ─────────────────────────────────────────────────────────────
def resolve_game(game_name: str) -> tuple:
    slug = GAME_NAME_TO_SLUG.get(game_name, game_name.lower().replace(' ', '_'))
    try:
        return Game.objects.get(slug=slug), slug
    except Game.DoesNotExist:
        return None, slug


# ── Player migration ──────────────────────────────────────────────────────────
def migrate_players(old_games, old_ranks, old_players, dry_run=False):
    created = skipped = 0

    for row in old_players:
        username = row['username']

        if Player.objects.filter(username=username).exists():
            print(f"  [SKIP-DUP] Player '{username}' already exists.")
            skipped += 1
            continue

        game_name = old_games.get(row['game_id'], '')
        game_obj, game_slug = resolve_game(game_name)

        rank_name = ''
        if row['rank_id'] and row['rank_id'] in old_ranks:
            rank_name = old_ranks[row['rank_id']]['name']

        status = PLAYER_STATUS_MAP.get(row.get('status', 'active'), 'active')

        if dry_run:
            print(f"  [DRY-RUN] Player: {username} | game={game_slug} | rank={rank_name} | status={status}")
            created += 1
            continue

        Player.objects.create(
            username=username,
            ingame_username=row['in_game_username'] or username,
            email=row['email'] or '',
            discord_username=row['discord_username'] or '',
            game=game_obj,
            game_slug_fallback=game_slug,
            rank=rank_name,
            role='player',
            status=status,
            bio='',
        )
        print(f"  [OK] Player created: {username} | {game_slug} | {rank_name}")
        created += 1

    return created, skipped


# ── Join-request migration ────────────────────────────────────────────────────
def migrate_joins(old_games, old_ranks, old_joins, dry_run=False):
    created = skipped = 0

    for row in old_joins:
        username = row['username']

        if JoinRequest.objects.filter(username=username, email=row['email']).exists():
            print(f"  [SKIP-DUP] JoinRequest '{username}' already exists.")
            skipped += 1
            continue

        game_name = old_games.get(row['game_id'], '')
        game_obj, game_slug = resolve_game(game_name)

        rank_name = ''
        if row['rank_id'] and row['rank_id'] in old_ranks:
            rank_name = old_ranks[row['rank_id']]['name']

        status = JOIN_STATUS_MAP.get(row.get('status', 'pending'), 'pending')

        if dry_run:
            print(f"  [DRY-RUN] JoinRequest: {username} | game={game_slug} | rank={rank_name} | status={status}")
            created += 1
            continue

        JoinRequest.objects.create(
            username=username,
            ingame_username=row['in_game_username'] or username,
            email=row['email'] or '',
            discord_username=row['discord_username'] or '',
            game=game_obj,
            game_slug_fallback=game_slug,
            rank=rank_name,
            status=status,
            notes='[Migrated from legacy database]',
        )
        print(f"  [OK] JoinRequest created: {username} | {game_slug} | {rank_name} | {status}")
        created += 1

    return created, skipped


# ── Entry point ───────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description='Migrate old SQLite data to NBLEsport Supabase DB.'
    )
    parser.add_argument('sqlite_path', help='Path to the old db.sqlite3 file')
    parser.add_argument('--dry-run', action='store_true',
                        help='Print what would happen without writing anything')
    args = parser.parse_args()

    dry_run = args.dry_run

    print(f"\n{'='*60}")
    print(f"  NBLEsport Legacy DB Migration")
    print(f"  Source : {args.sqlite_path}")
    print(f"  Mode   : {'DRY RUN (no writes)' if dry_run else 'LIVE (writing to DB)'}")
    print(f"{'='*60}\n")

    # ── 1. Confirm target database ────────────────────────────────────────────
    print("[DB CHECK]")
    if not check_db_connection():
        print("\n  Aborting — fix your DATABASE_URL and try again.")
        sys.exit(1)
    print()

    # ── 2. Confirm source file ────────────────────────────────────────────────
    if not Path(args.sqlite_path).exists():
        print(f"ERROR: SQLite file not found: {args.sqlite_path}")
        sys.exit(1)

    # ── 3. Load old data ──────────────────────────────────────────────────────
    old_games, old_ranks, old_players, old_joins = load_sqlite(args.sqlite_path)

    print("Old DB summary:")
    print(f"  Games         : {len(old_games)}")
    print(f"  Ranks         : {len(old_ranks)}")
    print(f"  Players       : {len(old_players)}")
    print(f"  Join requests : {len(old_joins)}\n")

    # ── 4. Show game mapping ──────────────────────────────────────────────────
    print("Game mapping:")
    for gid, gname in old_games.items():
        slug   = GAME_NAME_TO_SLUG.get(gname, gname.lower().replace(' ', '_'))
        exists = Game.objects.filter(slug=slug).exists()
        mark   = "✓ in new DB" if exists else "✗ fallback only"
        print(f"  [{gid}] {gname!r:25s} → {slug!r:25s}  {mark}")
    print()

    # ── 5. Migrate ────────────────────────────────────────────────────────────
    print("─── Players ──────────────────────────────────────────────────")
    p_ok, p_skip = migrate_players(old_games, old_ranks, old_players, dry_run)
    print(f"\n  Result: {p_ok} created, {p_skip} skipped\n")

    print("─── Join Requests ────────────────────────────────────────────")
    j_ok, j_skip = migrate_joins(old_games, old_ranks, old_joins, dry_run)
    print(f"\n  Result: {j_ok} created, {j_skip} skipped\n")

    # ── 6. Summary ────────────────────────────────────────────────────────────
    print("=" * 60)
    if dry_run:
        print("  DRY RUN complete — nothing was written.")
        print("  Remove --dry-run to apply changes.")
    else:
        print("  Migration complete!")
        print(f"  Inserted: {p_ok} players  |  {j_ok} join-requests")
    print("=" * 60)


if __name__ == '__main__':
    main()