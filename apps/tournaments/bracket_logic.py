from django.db.models import F

from .models import Match


def _seed_order(size):
    """Classic bracket seeding (1v16, 8v9, ... for size=16)."""
    if size == 1:
        return [1]
    prev = _seed_order(size // 2)
    order = []
    for s in prev:
        order.append(s)
        order.append(size + 1 - s)
    return order


def generate_bracket(tournament):
    participants = list(
        tournament.participants
        .exclude(status__in=['withdrawn', 'disqualified'])
        .order_by(F('seed').asc(nulls_last=True), 'registered_at')
    )
    n = len(participants)
    if n < 2:
        raise ValueError('Need at least 2 active participants to generate a bracket.')

    size = 1
    while size < n:
        size *= 2

    order = _seed_order(size)
    slots = [participants[s - 1] if s <= n else None for s in order]

    tournament.matches.all().delete()

    # Each entry is what feeds one slot of the next round:
    # a Match (winner advances) or a Participant (bye, walks straight in).
    entries = []
    for pos in range(size // 2):
        a, b = slots[2 * pos], slots[2 * pos + 1]
        if a and b:
            entries.append(Match.objects.create(
                tournament=tournament, round_number=1, position=pos + 1,
                participant_a=a, participant_b=b, status='ready',
            ))
        else:
            entries.append(a or b)          # no match created

    for r in range(2, size.bit_length()):
        nxt = []
        for pos in range(len(entries) // 2):
            m = Match.objects.create(tournament=tournament, round_number=r, position=pos + 1)
            for slot, e in (('a', entries[2 * pos]), ('b', entries[2 * pos + 1])):
                if isinstance(e, Match):
                    e.next_match, e.next_match_slot = m, slot
                    e.save(update_fields=['next_match', 'next_match_slot'])
                else:
                    setattr(m, 'participant_' + slot, e)
            m.status = 'ready' if (m.participant_a_id and m.participant_b_id) else 'pending'
            m.save(update_fields=['participant_a', 'participant_b', 'status'])
            nxt.append(m)
        entries = nxt

    if tournament.status == 'closed':
        tournament.status = 'in_progress'
        tournament.save(update_fields=['status'])


def resolve_bye(match):
    has_a = match.participant_a_id is not None
    has_b = match.participant_b_id is not None

    if has_a and has_b:
        match.status = 'ready'
        match.save(update_fields=['status'])
    elif (has_a and not has_b
          and not Match.objects.filter(next_match=match, next_match_slot='b').exists()):
        # Slot B is empty AND no feeder match will ever fill it → true bye
        set_winner(match, match.participant_a)
    elif (has_b and not has_a
          and not Match.objects.filter(next_match=match, next_match_slot='a').exists()):
        set_winner(match, match.participant_b)
    else:
        # Either both empty, or an empty slot is waiting on a feeder → just wait
        match.status = 'pending'
        match.save(update_fields=['status'])


def set_winner(match, winner):
    match.winner = winner
    match.status = 'completed'
    match.save(update_fields=['winner', 'status'])
    if match.next_match_id:
        nm = match.next_match
        setattr(nm, 'participant_' + match.next_match_slot, winner)
        nm.status = 'ready' if (nm.participant_a_id and nm.participant_b_id) else 'pending'
        nm.save(update_fields=['participant_a', 'participant_b', 'status'])


def clear_winner(match):
    """Undo a match result. Blocked if the next round already has its own result recorded."""
    if match.next_match_id:
        nm = match.next_match
        if nm.winner_id:
            raise ValueError("Undo that match's next-round result first.")
        if match.next_match_slot == 'a':
            nm.participant_a = None
        else:
            nm.participant_b = None
        nm.status = 'pending'
        nm.save(update_fields=['participant_a', 'participant_b', 'status'])
    match.winner = None
    match.status = 'ready' if (match.participant_a_id and match.participant_b_id) else 'pending'
    match.save(update_fields=['winner', 'status'])