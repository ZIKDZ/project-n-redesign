#!/usr/bin/env python
"""
clear_broken_cdn_urls_v2.py

Standalone script — run with plain `python`, from your project root (same
folder as manage.py / .env). Bootstraps Django using your real settings so
it uses the same DATABASE_URL / Cloudinary config as the app itself.

IMPORTANT — v2 vs v1
---------------------
v1 only checked the plain *_url fallback fields (banner_url, logo_url,
etc.) and assumed uploaded ImageField/FileField values (banner, logo,
avatar, thumbnail, image_file, video_file...) were unaffected by the
Cloudinary account switch. That assumption was wrong — an account switch
kills EVERY asset that lived under the old account, uploaded files
included (e.g. Team.logo pointing at .../media/teams/logos/... 404s too).

v2 checks BOTH kinds of field on every model:
  - Plain URLField fallbacks (banner_url, logo_url, thumbnail_url, ...)
  - Uploaded ImageField/FileField values (banner, logo, avatar, thumbnail,
    image_file, video_file, ...)

For a URLField, "broken" just means: clear the string to ''.
For an ImageField/FileField, "broken" means: clear the file reference on
the model (field = None) WITHOUT attempting to delete anything from
Cloudinary (the object is already gone / inaccessible there — there's
nothing to delete, and we don't want to accidentally touch a *working*
new-CDN asset some other row might share a derived path with). This just
disconnects the dead reference so the DB stops pointing at a 404, and your
existing get_banner()/get_logo()/etc. fallback methods return '' as intended.

Special case: django-cleanup is installed (see requirements.txt /
INSTALLED_APPS) and hooks pre_save signals to delete the OLD file from
storage whenever a FileField/ImageField value changes on save(). Since the
old file already doesn't exist on the new Cloudinary account, that delete
attempt would either no-op or throw — we defensively wrap saves so a
django-cleanup deletion failure never stops the whole run.

Safety
------
- Dry-run by default. Pass --apply to actually write changes.
- Concurrent checks with a short timeout — hundreds of rows resolve in
  seconds/minutes, not hours.
- Every field/model combo is checked and reported before anything is
  written. Full CSV report available via --report.
- Batched writes per model: file fields are cleared row-by-row with
  .save(update_fields=[...]) (Cloudinary + django-cleanup need a real
  instance & signal cycle — can't bulk .update() a FileField cleanly),
  but URL fields ARE bulk-updated since those are plain strings.

Usage
-----
    # Dry run, everything:
    python clear_broken_cdn_urls_v2.py

    # Actually clear:
    python clear_broken_cdn_urls_v2.py --apply

    # Only specific apps while testing:
    python clear_broken_cdn_urls_v2.py --only games,teams

    # Save CSV audit trail:
    python clear_broken_cdn_urls_v2.py --apply --report cdn_report.csv

    # Tune speed:
    python clear_broken_cdn_urls_v2.py --workers 24 --timeout 4

    # Skip uploaded-file fields and only check *_url fallbacks (old v1 behavior):
    python clear_broken_cdn_urls_v2.py --url-fields-only

    # Skip *_url fallbacks and only check uploaded file fields:
    python clear_broken_cdn_urls_v2.py --file-fields-only
"""
import argparse
import csv
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django  # noqa: E402
django.setup()

import requests  # noqa: E402
from django.db import transaction  # noqa: E402


# ── URLField fallbacks: (app_label, module_path, model_name, field_name) ────
URL_TARGETS = [
    ("games", "apps.games.models", "Game", "banner_url"),
    ("games", "apps.games.models", "Game", "logo_url"),
    ("teams", "apps.teams.models", "Team", "banner_url"),
    ("teams", "apps.teams.models", "Team", "logo_url"),
    ("matches", "apps.matches.models", "Match", "rival_logo_url"),
    ("news", "apps.news.models", "NewsPost", "thumbnail_url"),
    ("spotlight", "apps.spotlight.models", "SpotlightSlide", "video_url"),
    ("spotlight", "apps.spotlight.models", "SpotlightSlide", "image_url"),
    ("shop", "apps.shop.models", "Product", "banner_url"),
    ("shop", "apps.shop.models", "ProductImage", "image_url"),
    ("tournaments", "apps.tournaments.models", "Tournament", "banner_url"),
    ("tournaments", "apps.tournaments.models", "TournamentTeam", "logo_url"),
    # discord_avatar deliberately excluded — that's Discord's CDN, not ours.
]

# ── Uploaded ImageField / FileField values (actual Cloudinary assets) ──────
FILE_TARGETS = [
    ("games", "apps.games.models", "Game", "banner"),
    ("games", "apps.games.models", "Game", "logo"),
    ("teams", "apps.teams.models", "Team", "banner"),
    ("teams", "apps.teams.models", "Team", "logo"),
    ("matches", "apps.matches.models", "Match", "rival_logo"),
    ("news", "apps.news.models", "NewsPost", "thumbnail"),
    ("spotlight", "apps.spotlight.models", "SpotlightSlide", "video_file"),
    ("spotlight", "apps.spotlight.models", "SpotlightSlide", "image_file"),
    ("shop", "apps.shop.models", "Product", "banner"),
    ("shop", "apps.shop.models", "ProductImage", "image"),
    ("tournaments", "apps.tournaments.models", "Tournament", "banner"),
    ("tournaments", "apps.tournaments.models", "TournamentTeam", "logo"),
    ("players", "apps.players.models", "Player", "avatar"),
    ("players", "apps.players.models", "PlayerClip", "video_file"),
]

DEFAULT_TIMEOUT = 6
DEFAULT_WORKERS = 16
USER_AGENT = "Mozilla/5.0 (compatible; CDNLinkChecker/1.0)"



# Only these HTTP statuses count as "confirmed gone". Anything else (network
# errors, timeouts, 5xx, rate limiting, etc.) is treated as UNKNOWN and never
# clears a field — we would rather leave a working image alone than risk
# nuking a reference over a flaky connection.
CONFIRMED_GONE_STATUSES = {404, 410}

# Retries for transient network errors before giving up and reporting UNKNOWN
# (never "broken") for that URL.
TRANSIENT_RETRIES = 3
RETRY_BACKOFF_SECONDS = 1.5


def url_is_reachable(url, timeout):
    """
    Returns (verdict, detail) where verdict is one of:
      "alive"    - resource responds fine, definitely not broken
      "gone"     - server confirmed 404/410, safe to clear
      "unknown"  - could not get a confirmed answer (timeout, DNS error,
                   5xx, connection refused, etc.) - NEVER treated as broken
    """
    headers = {"User-Agent": USER_AGENT}
    last_detail = "unknown"

    for attempt in range(1, TRANSIENT_RETRIES + 1):
        try:
            resp = requests.head(url, timeout=timeout, allow_redirects=True, headers=headers)
            status = resp.status_code

            if status < 400:
                return "alive", str(status)

            if status in CONFIRMED_GONE_STATUSES:
                return "gone", str(status)

            # Ambiguous status (403/405/501/5xx/etc.) — confirm with a
            # ranged GET before drawing any conclusion at all.
            resp2 = requests.get(
                url, timeout=timeout, allow_redirects=True,
                headers={**headers, "Range": "bytes=0-0"},
            )
            status2 = resp2.status_code

            if status2 < 400:
                return "alive", str(status2)
            if status2 in CONFIRMED_GONE_STATUSES:
                return "gone", str(status2)

            # Neither HEAD nor GET gave a confirmed answer either way
            # (e.g. 500, 503, 429) — do not treat as broken.
            return "unknown", f"HEAD {status} / GET {status2} (not a confirmed-gone status)"

        except requests.exceptions.RequestException as e:
            last_detail = type(e).__name__
            if attempt < TRANSIENT_RETRIES:
                time.sleep(RETRY_BACKOFF_SECONDS * attempt)
                continue
            # Exhausted retries on a network-level error (timeout, DNS,
            # connection refused, etc.) — this is NOT confirmation the
            # asset is gone, just that we couldn't reach it right now.
            return "unknown", f"{last_detail} (after {TRANSIENT_RETRIES} attempts)"

    return "unknown", last_detail  # pragma: no cover — loop always returns above


def collect_url_jobs(only):
    import importlib
    jobs = []
    for app_label, module_path, model_name, field_name in URL_TARGETS:
        if only and app_label not in only:
            continue
        module = importlib.import_module(module_path)
        model = getattr(module, model_name)
        qs = (
            model.objects
            .exclude(**{field_name: ""})
            .exclude(**{f"{field_name}__isnull": True})
            .only("id", field_name)
        )
        for obj in qs:
            url = getattr(obj, field_name)
            if url:
                jobs.append({
                    "kind": "url", "app": app_label, "model": model_name,
                    "pk": obj.pk, "field": field_name, "url": url,
                })
    return jobs


def collect_file_jobs(only):
    """
    For file fields we can't .only() the field alone and read .url safely
    without risking a DoesNotExist-style storage error on some backends, so
    we fetch the whole row and guard each .url access individually.
    """
    import importlib
    jobs = []
    for app_label, module_path, model_name, field_name in FILE_TARGETS:
        if only and app_label not in only:
            continue
        module = importlib.import_module(module_path)
        model = getattr(module, model_name)
        for obj in model.objects.all():
            file_field = getattr(obj, field_name)
            if not file_field:  # empty/None FileField
                continue
            try:
                url = file_field.url
            except Exception as e:
                # Storage backend couldn't even build a URL (e.g. underlying
                # object metadata is gone) — treat as broken immediately,
                # no need to HTTP-check it.
                jobs.append({
                    "kind": "file", "app": app_label, "model": model_name,
                    "pk": obj.pk, "field": field_name, "url": f"<unresolvable: {e}>",
                    "precomputed_broken": True,
                })
                continue
            jobs.append({
                "kind": "file", "app": app_label, "model": model_name,
                "pk": obj.pk, "field": field_name, "url": url,
                "precomputed_broken": False,
            })
    return jobs


def check_all(jobs, workers, timeout):
    """
    Sets job["verdict"] to "alive" / "gone" / "unknown" for every job.
    Only "gone" is ever eligible for clearing — "unknown" is reported
    separately so you can see it, but is never touched even with --apply.
    """
    results = []
    to_check = [j for j in jobs if not j.get("precomputed_broken")]
    already_broken = [j for j in jobs if j.get("precomputed_broken")]
    for j in already_broken:
        # Storage backend couldn't build a URL at all — that's a confirmed
        # local data problem, not a network fluke, so this one legitimately
        # counts as "gone".
        j["verdict"] = "gone"
        j["detail"] = "unresolvable URL (storage error)"
    results.extend(already_broken)

    total = len(to_check)
    if total:
        with ThreadPoolExecutor(max_workers=workers) as executor:
            future_to_job = {
                executor.submit(url_is_reachable, job["url"], timeout): job
                for job in to_check
            }
            done = 0
            for future in as_completed(future_to_job):
                job = future_to_job[future]
                try:
                    verdict, detail = future.result()
                except Exception as e:  # pragma: no cover
                    verdict, detail = "unknown", f"unexpected:{type(e).__name__}"
                job["verdict"] = verdict
                job["detail"] = detail
                results.append(job)
                done += 1
                if done % 25 == 0 or done == total:
                    print(f"  ...{done}/{total} checked")
    return results


def apply_url_changes(broken_url_jobs):
    import importlib
    by_group = {}
    for r in broken_url_jobs:
        key = (r["app"], r["model"], r["field"])
        by_group.setdefault(key, []).append(r["pk"])

    with transaction.atomic():
        for (app_label, model_name, field_name), pks in by_group.items():
            module_path = next(
                m for (a, m, mn, f) in URL_TARGETS
                if a == app_label and mn == model_name and f == field_name
            )
            module = importlib.import_module(module_path)
            model = getattr(module, model_name)
            updated = model.objects.filter(pk__in=pks).update(**{field_name: ""})
            print(f"  [url]  {app_label}.{model_name}.{field_name}: cleared {updated} row(s)")
    return len(by_group)


def apply_file_changes(broken_file_jobs):
    """
    File fields need per-instance .save() (not bulk .update()) so
    django-cleanup's pre_save signal fires correctly and Cloudinary storage
    bookkeeping stays consistent. We set the field to None (not '') since
    that's the correct "empty" sentinel for FileField/ImageField.

    django-cleanup will try to delete the OLD (already-dead) file on save —
    that delete is expected to fail silently or no-op against the new CDN
    account, so we don't let a raised exception there abort the batch.
    """
    import importlib
    cleared = 0
    by_group = {}
    for r in broken_file_jobs:
        key = (r["app"], r["model"], r["field"])
        by_group.setdefault(key, []).append(r["pk"])

    for (app_label, model_name, field_name), pks in by_group.items():
        module_path = next(
            m for (a, m, mn, f) in FILE_TARGETS
            if a == app_label and mn == model_name and f == field_name
        )
        module = importlib.import_module(module_path)
        model = getattr(module, model_name)
        group_cleared = 0
        for obj in model.objects.filter(pk__in=pks):
            try:
                setattr(obj, field_name, None)
                obj.save(update_fields=[field_name])
                group_cleared += 1
            except Exception as e:
                print(f"  [file] WARNING: failed to clear {app_label}.{model_name}#{obj.pk}.{field_name}: {e}")
        print(f"  [file] {app_label}.{model_name}.{field_name}: cleared {group_cleared}/{len(pks)} row(s)")
        cleared += group_cleared
    return len(by_group), cleared


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="Actually write changes (default: dry run).")
    parser.add_argument("--only", type=str, default="", help="Comma-separated app labels, e.g. games,teams")
    parser.add_argument("--workers", type=int, default=DEFAULT_WORKERS)
    parser.add_argument("--timeout", type=float, default=DEFAULT_TIMEOUT)
    parser.add_argument("--report", type=str, default="", help="Optional CSV report output path.")
    parser.add_argument("--url-fields-only", action="store_true", help="Only check *_url fallback fields.")
    parser.add_argument("--file-fields-only", action="store_true", help="Only check uploaded file fields.")
    args = parser.parse_args()

    only = {a.strip() for a in args.only.split(",") if a.strip()}

    jobs = []
    if not args.file_fields_only:
        jobs += collect_url_jobs(only)
    if not args.url_fields_only:
        jobs += collect_file_jobs(only)

    total = len(jobs)
    if total == 0:
        print("No non-empty URL/file fields found. Nothing to check.")
        return

    n_url = sum(1 for j in jobs if j["kind"] == "url")
    n_file = sum(1 for j in jobs if j["kind"] == "file")
    print(f"Checking {total} references ({n_url} URL fields, {n_file} uploaded file fields) "
          f"with {args.workers} workers (timeout={args.timeout}s each)...")

    start = time.time()
    results = check_all(jobs, args.workers, args.timeout)
    elapsed = time.time() - start

    alive = [r for r in results if r["verdict"] == "alive"]
    gone = [r for r in results if r["verdict"] == "gone"]
    unknown = [r for r in results if r["verdict"] == "unknown"]
    broken = gone  # only "gone" (confirmed 404/410) is ever eligible to clear

    print(
        f"\nDone in {elapsed:.1f}s — {len(alive)} alive, {len(gone)} confirmed gone, "
        f"{len(unknown)} unknown (network issue / ambiguous — never cleared) out of {total}."
    )

    if args.report:
        with open(args.report, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["kind", "app", "model", "pk", "field", "url", "verdict", "detail"])
            writer.writeheader()
            for r in results:
                writer.writerow({k: r.get(k, "") for k in writer.fieldnames})
        print(f"Full report written to {args.report}")

    if unknown:
        print("\nUnknown / unreachable (NOT cleared — inspect manually if this looks wrong):")
        for r in unknown:
            print(f"  [{r['kind']}] [{r['app']}.{r['model']}#{r['pk']}] {r['field']} -> {r['url']}  ({r['detail']})")
        print(
            "  ^ These failed to load or gave an ambiguous status (timeout, DNS error, 5xx, "
            "rate limit, etc). That does NOT mean the asset is gone — it just means this run "
            "couldn't get a confirmed answer. Re-run later, or check them by hand in a browser. "
            "They are never cleared, with or without --apply."
        )

    if not broken:
        print("\nNo confirmed-gone (404/410) references found — no changes needed.")
        return

    print("\nConfirmed gone (404/410) — eligible to clear:")
    for r in broken:
        print(f"  [{r['kind']}] [{r['app']}.{r['model']}#{r['pk']}] {r['field']} -> {r['url']}  ({r['detail']})")

    if not args.apply:
        print(f"\nDry run only — no changes written. Re-run with --apply to clear these {len(broken)} field(s).")
        return

    print("\nApplying changes...")
    broken_url = [r for r in broken if r["kind"] == "url"]
    broken_file = [r for r in broken if r["kind"] == "file"]

    n_url_groups = apply_url_changes(broken_url) if broken_url else 0
    n_file_groups, n_file_cleared = apply_file_changes(broken_file) if broken_file else (0, 0)

    print(
        f"\nDone. Cleared {len(broken_url)} broken URL field(s) across {n_url_groups} group(s), "
        f"and {n_file_cleared} broken uploaded-file field(s) across {n_file_groups} group(s)."
    )
    print("Every field cleared above pointed at a dead/unreachable Cloudinary asset. "
          "Working files and URLs on the new CDN were left untouched.")


if __name__ == "__main__":
    main()