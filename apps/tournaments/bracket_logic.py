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
    """(Re)builds the full match tree for a tournament from its active participants."""
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
    slots = [None] * size
    for i, seed_pos in enumerate(order):
        if seed_pos <= n:
            slots[i] = participants[seed_pos - 1]

    # Wipe any previous bracket for this tournament before rebuilding.
    tournament.matches.all().delete()

    num_rounds = size.bit_length() - 1

    round1 = []
    for pos in range(size // 2):
        m = Match.objects.create(
            tournament=tournament, round_number=1, position=pos + 1,
            participant_a=slots[2 * pos], participant_b=slots[2 * pos + 1],
        )
        round1.append(m)

    prev_round = round1
    for r in range(2, num_rounds + 1):
        this_round = []
        for pos in range(len(prev_round) // 2):
            this_round.append(Match.objects.create(tournament=tournament, round_number=r, position=pos + 1))
        for i, pm in enumerate(prev_round):
            nm = this_round[i // 2]
            pm.next_match = nm
            pm.next_match_slot = 'a' if i % 2 == 0 else 'b'
            pm.save(update_fields=['next_match', 'next_match_slot'])
        prev_round = this_round

    # Auto-resolve first-round byes (and anything they cascade into).
    for m in round1:
        resolve_bye(m)

    if tournament.status == 'closed':
        tournament.status = 'in_progress'
        tournament.save(update_fields=['status'])


def resolve_bye(match):
    has_a = match.participant_a_id is not None
    has_b = match.participant_b_id is not None
    if has_a and not has_b:
        set_winner(match, match.participant_a)
    elif has_b and not has_a:
        set_winner(match, match.participant_b)
    elif not has_a and not has_b:
        match.status = 'pending'
        match.save(update_fields=['status'])
    else:
        match.status = 'ready'
        match.save(update_fields=['status'])


def set_winner(match, winner):
    match.winner = winner
    match.status = 'bye' if (not match.participant_a_id or not match.participant_b_id) else 'completed'
    match.save(update_fields=['winner', 'status'])
    if match.next_match_id:
        nm = match.next_match
        if match.next_match_slot == 'a':
            nm.participant_a = winner
        else:
            nm.participant_b = winner
        nm.save(update_fields=['participant_a', 'participant_b'])
        resolve_bye(nm)


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