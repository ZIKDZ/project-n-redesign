from django.db.models import F
from .models import Match, Participant


# ══════════════════════════════════════════════════════════════════════════════
# Helpers
# ══════════════════════════════════════════════════════════════════════════════

def _seed_order(size: int) -> list[int]:
    """
    Returns the seeded slot order for a bracket of `size` entrants.
    e.g. size=8 → [1,8,5,4,3,6,7,2] so that 1 meets 8, 4 meets 5, etc.
    """
    if size == 1:
        return [1]
    prev = _seed_order(size // 2)
    order = []
    for s in prev:
        order.append(s)
        order.append(size + 1 - s)
    return order


def _next_pow2(n: int) -> int:
    size = 1
    while size < n:
        size *= 2
    return size


def _active_participants(tournament) -> list:
    return list(
        tournament.participants
        .exclude(status__in=['withdrawn', 'disqualified'])
        .order_by(F('seed').asc(nulls_last=True), 'registered_at')
    )


def _make_match(tournament, bracket: str, round_number: int, position: int, **kwargs) -> Match:
    """One-liner factory so callers stay readable."""
    return Match.objects.create(
        tournament=tournament,
        bracket=bracket,
        round_number=round_number,
        position=position,
        **kwargs,
    )


def _link_winner(src: Match, dst: Match, slot: str) -> None:
    """Wire src's WINNER into dst's slot."""
    src.next_match      = dst
    src.next_match_slot = slot
    src.save(update_fields=['next_match', 'next_match_slot'])


def _link_loser(src: Match, dst: Match, slot: str) -> None:
    """Wire src's LOSER into dst's slot (winners-bracket matches only)."""
    src.loser_next_match      = dst
    src.loser_next_match_slot = slot
    src.save(update_fields=['loser_next_match', 'loser_next_match_slot'])


def _set_status(match: Match) -> None:
    match.status = 'ready' if (match.participant_a_id and match.participant_b_id) else 'pending'
    match.save(update_fields=['status'])


# ══════════════════════════════════════════════════════════════════════════════
# Public entry point
# ══════════════════════════════════════════════════════════════════════════════

def generate_bracket(tournament) -> None:
    if tournament.bracket_type == 'double_elim':
        _generate_double_elim(tournament)
    else:
        _generate_single_elim(tournament)


# ══════════════════════════════════════════════════════════════════════════════
# Single Elimination
# ══════════════════════════════════════════════════════════════════════════════

def _generate_single_elim(tournament) -> None:
    participants = _active_participants(tournament)
    n = len(participants)
    if n < 2:
        raise ValueError('Need at least 2 active participants.')

    size  = _next_pow2(n)
    order = _seed_order(size)
    slots = [participants[s - 1] if s <= n else None for s in order]

    tournament.matches.all().delete()

    # ── Round 1 ───────────────────────────────────────────────────────────────
    entries: list[Match | Participant | None] = []
    for pos in range(size // 2):
        a, b = slots[2 * pos], slots[2 * pos + 1]
        if a and b:
            m = _make_match(
                tournament, 'winners', 1, pos + 1,
                participant_a=a, participant_b=b, status='ready',
            )
            entries.append(m)
        else:
            entries.append(a or b)   # bye — carry the participant forward

    # ── Subsequent rounds ─────────────────────────────────────────────────────
    r = 2
    while len(entries) > 1:
        nxt: list[Match] = []
        for pos in range(len(entries) // 2):
            m = _make_match(tournament, 'winners', r, pos + 1)
            for slot, e in (('a', entries[2 * pos]), ('b', entries[2 * pos + 1])):
                if isinstance(e, Match):
                    _link_winner(e, m, slot)
                elif e is not None:
                    setattr(m, f'participant_{slot}', e)
            _set_status(m)
            nxt.append(m)
        entries = nxt
        r += 1

    _maybe_start(tournament)


# ══════════════════════════════════════════════════════════════════════════════
# Double Elimination
# ══════════════════════════════════════════════════════════════════════════════
#
#  Winners bracket (WB) runs normally.  Every WB loser drops into the Losers
#  Bracket (LB).  The LB champion meets the WB champion in a single Grand
#  Final — if the LB side wins, they are the outright champion (no reset).
#
#  LB structure for size=2^k:
#
#    LB-R1   pair up WB-R1 losers against each other          (size/4 matches)
#    LB-R2   LB-R1 winners  vs  WB-R2 losers  (mix)          (size/4 matches)
#    LB-R3   consolidation: LB-R2 winners only                (size/8 matches)
#    LB-R4   LB-R3 winners  vs  WB-R3 losers  (mix)
#    …alternating mix / consolidation until 1 remains…
#    Grand Final  WB champ (slot A)  vs  LB champ (slot B)
#
# ══════════════════════════════════════════════════════════════════════════════

def _generate_double_elim(tournament) -> None:
    participants = _active_participants(tournament)
    n = len(participants)
    if n < 2:
        raise ValueError('Need at least 2 active participants.')

    size  = _next_pow2(n)
    order = _seed_order(size)
    slots = [participants[s - 1] if s <= n else None for s in order]

    tournament.matches.all().delete()

    # ── WB Round 1 ────────────────────────────────────────────────────────────
    wb_r1_matches: list[Match | None] = []   # one entry per pair; None = bye pair
    wb_r1_entries: list[Match | Participant | None] = []

    for pos in range(size // 2):
        a, b = slots[2 * pos], slots[2 * pos + 1]
        if a and b:
            m = _make_match(
                tournament, 'winners', 1, pos + 1,
                participant_a=a, participant_b=b, status='ready',
            )
            wb_r1_matches.append(m)
            wb_r1_entries.append(m)
        else:
            wb_r1_matches.append(None)       # bye, no loser possible
            wb_r1_entries.append(a or b)

    # ── WB Rounds 2 … WB Final ────────────────────────────────────────────────
    # wb_round_matches[i]  = list of Match objects created in WB round i+1
    # wb_round_matches[0]  = WB R1 (only real matches, not byes)
    wb_round_matches: list[list[Match]] = [
        [m for m in wb_r1_matches if m is not None]
    ]

    entries = wb_r1_entries[:]
    wb_r = 2
    while len(entries) > 1:
        nxt: list[Match] = []
        round_matches: list[Match] = []
        for pos in range(len(entries) // 2):
            m = _make_match(tournament, 'winners', wb_r, pos + 1)
            for slot, e in (('a', entries[2 * pos]), ('b', entries[2 * pos + 1])):
                if isinstance(e, Match):
                    _link_winner(e, m, slot)
                elif e is not None:
                    setattr(m, f'participant_{slot}', e)
            _set_status(m)
            nxt.append(m)
            round_matches.append(m)
        wb_round_matches.append(round_matches)
        entries = nxt
        wb_r += 1

    wb_final: Match = wb_round_matches[-1][0]

    # ── Losers Bracket ────────────────────────────────────────────────────────
    lb_entries: list[Match | Participant | None] = []
    lb_r = 1

    # LB-R1 — pair WB-R1 losers against each other
    real_wb_r1 = [m for m in wb_r1_matches if m is not None]
    if len(real_wb_r1) >= 2:
        r1_lb: list[Match] = []
        for pos in range(len(real_wb_r1) // 2):
            m = _make_match(tournament, 'losers', lb_r, pos + 1, status='pending')
            src_a = real_wb_r1[2 * pos]
            src_b = real_wb_r1[2 * pos + 1]
            _link_loser(src_a, m, 'a')
            _link_loser(src_b, m, 'b')
            r1_lb.append(m)
        lb_entries = r1_lb          # type: ignore[assignment]
        lb_r += 1

        # If size=4 there's only 1 WB-R1 match each side → just 1 LB-R1 match
        # Handle odd leftover (shouldn't happen with powers of 2, but be safe)
        if len(real_wb_r1) % 2 == 1:
            # Last WB-R1 loser gets a bye into LB-R2
            lb_entries.append(real_wb_r1[-1])

    elif len(real_wb_r1) == 1:
        # Only 2 participants total → size=2, no LB-R1 needed
        lb_entries = [real_wb_r1[0]]

    # Subsequent LB rounds — alternate mix (with fresh WB losers) and
    # consolidation (pure LB survivors) until one entry remains.
    #
    # wb_round_matches[0] = WB-R1 losers (already consumed above)
    # wb_round_matches[1] = WB-R2 losers  ← first "fresh drop" round
    wb_drop_idx = 1   # index into wb_round_matches for the next WB-loser drop

    while len(lb_entries) > 1 or wb_drop_idx < len(wb_round_matches):

        # ── Mix round: LB survivors meet fresh WB losers ──────────────────────
        if wb_drop_idx < len(wb_round_matches):
            fresh = wb_round_matches[wb_drop_idx]   # real Match objects
            wb_drop_idx += 1

            if fresh and lb_entries:
                nxt = []
                # pair them 1-to-1; counts always match by bracket construction
                for pos in range(len(fresh)):
                    m = _make_match(tournament, 'losers', lb_r, pos + 1, status='pending')

                    # LB-survivor side → slot A
                    lb_e = lb_entries[pos] if pos < len(lb_entries) else None
                    if isinstance(lb_e, Match):
                        _link_winner(lb_e, m, 'a')
                    elif lb_e is not None:
                        m.participant_a = lb_e
                        m.save(update_fields=['participant_a'])

                    # Fresh WB loser → slot B
                    _link_loser(fresh[pos], m, 'b')

                    _set_status(m)
                    nxt.append(m)

                lb_entries = nxt    # type: ignore[assignment]
                lb_r += 1

        # ── Consolidation round: pure LB survivors ────────────────────────────
        if len(lb_entries) > 1:
            nxt = []
            for pos in range(len(lb_entries) // 2):
                m = _make_match(tournament, 'losers', lb_r, pos + 1, status='pending')
                for slot, e in (('a', lb_entries[2 * pos]), ('b', lb_entries[2 * pos + 1])):
                    if isinstance(e, Match):
                        _link_winner(e, m, slot)
                    elif e is not None:
                        setattr(m, f'participant_{slot}', e)
                _set_status(m)
                nxt.append(m)
            lb_entries = nxt        # type: ignore[assignment]
            lb_r += 1

    lb_final: Match = lb_entries[0]     # type: ignore[assignment]

    # ── Grand Final ───────────────────────────────────────────────────────────
    gf = _make_match(tournament, 'grand_final', 1, 1, status='pending')
    _link_winner(wb_final, gf, 'a')    # WB champion  → slot A
    _link_winner(lb_final, gf, 'b')    # LB champion  → slot B
    # Note: the WB Final loser also drops into the LB Final
    _link_loser(wb_final, lb_final, 'b')

    _maybe_start(tournament)


def _maybe_start(tournament) -> None:
    if tournament.status == 'closed':
        tournament.status = 'in_progress'
        tournament.save(update_fields=['status'])


# ══════════════════════════════════════════════════════════════════════════════
# Match resolution (shared by both bracket types)
# ══════════════════════════════════════════════════════════════════════════════

def set_winner(match: Match, winner: Participant) -> None:
    """
    Declare `winner` the winner of `match`.

    Winners bracket matches:
      • winner  → next_match (next WB round or Grand Final)
      • loser   → loser_next_match (LB drop-in slot)

    Losers bracket / Grand Final matches:
      • winner  → next_match only  (loser is eliminated)
    """
    if winner.pk == match.participant_a_id:
        loser = match.participant_b
    else:
        loser = match.participant_a

    match.winner = winner
    match.status = 'completed'
    match.save(update_fields=['winner', 'status'])

    # Advance winner
    if match.next_match_id:
        nm = match.next_match
        setattr(nm, f'participant_{match.next_match_slot}', winner)
        _set_status(nm)

    # Drop loser into LB (only from winners bracket; LB losers are eliminated)
    if match.bracket == 'winners' and loser and match.loser_next_match_id:
        lm = match.loser_next_match
        setattr(lm, f'participant_{match.loser_next_match_slot}', loser)
        _set_status(lm)


def clear_winner(match: Match) -> None:
    """
    Undo the result of `match`.  Raises ValueError if downstream matches
    have already been decided (must undo those first).
    """
    # Guard: winner's next match
    if match.next_match_id:
        nm = match.next_match
        if nm.winner_id:
            raise ValueError("Undo that match's next-round result first.")
        setattr(nm, f'participant_{match.next_match_slot}', None)
        nm.status = 'pending'
        nm.save(update_fields=['participant_a', 'participant_b', 'status'])

    # Guard: loser's LB match
    if match.bracket == 'winners' and match.loser_next_match_id:
        lm = match.loser_next_match
        if lm.winner_id:
            raise ValueError(
                "Undo the losers-bracket result that used this match's loser first."
            )
        setattr(lm, f'participant_{match.loser_next_match_slot}', None)
        lm.status = 'pending'
        lm.save(update_fields=['participant_a', 'participant_b', 'status'])

    match.winner = None
    match.status = 'ready' if (match.participant_a_id and match.participant_b_id) else 'pending'
    match.save(update_fields=['winner', 'status'])


def resolve_bye(match: Match) -> None:
    """Auto-advance the sole participant when the other slot will never be filled."""
    has_a = match.participant_a_id is not None
    has_b = match.participant_b_id is not None

    if has_a and has_b:
        match.status = 'ready'
        match.save(update_fields=['status'])
    elif (has_a and not has_b
          and not Match.objects.filter(next_match=match, next_match_slot='b').exists()):
        set_winner(match, match.participant_a)
    elif (has_b and not has_a
          and not Match.objects.filter(next_match=match, next_match_slot='a').exists()):
        set_winner(match, match.participant_b)
    else:
        match.status = 'pending'
        match.save(update_fields=['status'])