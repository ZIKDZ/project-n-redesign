import json

from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.http import JsonResponse
from django.utils.text import slugify
from django.views.decorators.http import require_http_methods
from .models import Tournament, Placement, Participant, Match
from .bracket_logic import generate_bracket, set_winner, clear_winner

from .models import Tournament, Placement, Participant

# Draft tournaments are staff-only — everything else is visible publicly
# (closed/in_progress/completed so people can still see brackets & results
# after registration ends).
PUBLIC_STATUSES = ['open', 'closed', 'in_progress', 'completed']

DATETIME_FIELDS = ('registration_open_at', 'registration_deadline', 'start_date')


def _unique_slug(name, exclude_id=None):
    base = slugify(name)[:200] or 'tournament'
    slug = base
    i = 2
    qs = Tournament.objects.all()
    if exclude_id:
        qs = qs.exclude(pk=exclude_id)
    while qs.filter(slug=slug).exists():
        slug = f'{base}-{i}'
        i += 1
    return slug


# ── Public ────────────────────────────────────────────────────────────────────

@require_http_methods(['GET'])
def list_tournaments(request):
    qs = (
        Tournament.objects
        .filter(status__in=PUBLIC_STATUSES)
        .select_related('game')
        .prefetch_related('placements')
    )
    game = request.GET.get('game')
    status = request.GET.get('status')
    if game:
        qs = qs.filter(game__slug=game)
    if status and status in PUBLIC_STATUSES:
        qs = qs.filter(status=status)
    return JsonResponse({'tournaments': [t.to_dict() for t in qs]})


@require_http_methods(['GET'])
def get_tournament(request, slug):
    try:
        tournament = (
            Tournament.objects
            .select_related('game')
            .prefetch_related('placements')
            .get(slug=slug, status__in=PUBLIC_STATUSES)
        )
    except Tournament.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    return JsonResponse(tournament.to_dict())


# ── Staff — Tournaments ─────────────────────────────────────────────────────

@login_required
@require_http_methods(['GET'])
def list_tournaments_all(request):
    qs = Tournament.objects.all().select_related('game').prefetch_related('placements')
    return JsonResponse({'tournaments': [t.to_dict() for t in qs]})


@login_required
@require_http_methods(['GET'])
def get_tournament_staff(request, pk):
    try:
        tournament = (
            Tournament.objects
            .select_related('game')
            .prefetch_related('placements')
            .get(pk=pk)
        )
    except Tournament.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    return JsonResponse(tournament.to_dict())


@login_required
@require_http_methods(['POST'])
def create_tournament(request):
    try:
        if request.content_type and 'multipart' in request.content_type:
            data = request.POST
            banner_file = request.FILES.get('banner')
        else:
            data = json.loads(request.body)
            banner_file = None

        name = data['name']
        tournament = Tournament(
            name=name,
            slug=_unique_slug(name),
            format=data.get('format', 'solo'),
            team_size=data.get('team_size') or None,
            bracket_type=data.get('bracket_type', 'single_elim'),
            status=data.get('status', 'draft'),
            description=data.get('description', ''),
            rules=data.get('rules', ''),
            requirements=data.get('requirements', ''),
            banner_url=data.get('banner_url', '') if not banner_file else '',
            max_participants=data.get('max_participants') or None,
        )
        for field in DATETIME_FIELDS:
            setattr(tournament, field, data.get(field) or None)

        game_id = data.get('game_id')
        if game_id:
            tournament.game_id = game_id
        if banner_file:
            tournament.banner = banner_file

        tournament.save()
        return JsonResponse(tournament.to_dict(), status=201)

    except KeyError as e:
        return JsonResponse({'error': f'Missing field: {e}'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@login_required
@require_http_methods(['PUT', 'PATCH'])
def update_tournament(request, pk):
    try:
        tournament = Tournament.objects.get(pk=pk)

        if request.content_type and 'multipart' in request.content_type:
            from django.http.multipartparser import MultiPartParser
            parser = MultiPartParser(request.META, request, request.upload_handlers)
            post_data, files = parser.parse()
            data = post_data
            banner_file = files.get('banner')
        else:
            data = json.loads(request.body)
            banner_file = None

        if 'name' in data and data['name'] != tournament.name:
            tournament.name = data['name']
            tournament.slug = _unique_slug(data['name'], exclude_id=tournament.id)

        for field in ['format', 'bracket_type', 'status', 'description', 'rules', 'requirements']:
            if field in data:
                setattr(tournament, field, data[field])

        for field in DATETIME_FIELDS:
            if field in data:
                setattr(tournament, field, data[field] or None)

        if 'team_size' in data:
            tournament.team_size = data['team_size'] or None
        if 'max_participants' in data:
            tournament.max_participants = data['max_participants'] or None
        if 'game_id' in data:
            tournament.game_id = data['game_id'] or None

        if banner_file:
            tournament.banner = banner_file
            tournament.banner_url = ''
        elif 'banner_url' in data:
            new_url = data['banner_url']
            if new_url:
                tournament.banner_url = new_url
                tournament.banner = None


        tournament.save()
        return JsonResponse(tournament.to_dict())

    except Tournament.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@login_required
@require_http_methods(['DELETE'])
def delete_tournament(request, pk):
    try:
        Tournament.objects.get(pk=pk).delete()
        return JsonResponse({'success': True})
    except Tournament.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)


# ── Staff — Placements (prize table) ────────────────────────────────────────

@login_required
@require_http_methods(['POST'])
def create_placement(request, pk):
    try:
        tournament = Tournament.objects.get(pk=pk)
        data = json.loads(request.body)
        placement = Placement.objects.create(
            tournament=tournament,
            placement=data['placement'],
            reward_text=data.get('reward_text', ''),
            display_order=data.get('display_order', tournament.placements.count()),
        )
        return JsonResponse(placement.to_dict(), status=201)
    except Tournament.DoesNotExist:
        return JsonResponse({'error': 'Tournament not found'}, status=404)
    except KeyError as e:
        return JsonResponse({'error': f'Missing field: {e}'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@login_required
@require_http_methods(['PATCH'])
def update_placement(request, pk, placement_pk):
    try:
        placement = Placement.objects.get(pk=placement_pk, tournament_id=pk)
        data = json.loads(request.body)
        for field in ['placement', 'reward_text', 'display_order']:
            if field in data:
                setattr(placement, field, data[field])
        placement.save()
        return JsonResponse(placement.to_dict())
    except Placement.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@login_required
@require_http_methods(['DELETE'])
def delete_placement(request, pk, placement_pk):
    try:
        Placement.objects.get(pk=placement_pk, tournament_id=pk).delete()
        return JsonResponse({'success': True})
    except Placement.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)


# ── Staff — Participants ─────────────────────────────────────────────────────

@login_required
@require_http_methods(['GET'])
def list_participants(request, pk):
    try:
        tournament = Tournament.objects.get(pk=pk)
    except Tournament.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    participants = (
        tournament.participants
        .select_related('player', 'team', 'team__captain')
        .prefetch_related('team__members__player')
    )
    data = []
    for p in participants:
        row = p.to_dict()
        if p.team:
            row['team'] = p.team.to_dict(include_members=True)
        data.append(row)
    return JsonResponse({'participants': data})


@login_required
@require_http_methods(['PATCH'])
def update_participant(request, pk, participant_pk):
    try:
        participant = Participant.objects.get(pk=participant_pk, tournament_id=pk)
    except Participant.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    if 'status' in data:
        participant.status = data['status']
    if 'seed' in data:
        participant.seed = data['seed'] or None
    participant.save()
    return JsonResponse(participant.to_dict())


@login_required
@require_http_methods(['DELETE'])
def delete_participant(request, pk, participant_pk):
    try:
        Participant.objects.get(pk=participant_pk, tournament_id=pk).delete()
        return JsonResponse({'success': True})
    except Participant.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

# ── Bracket ───────────────────────────────────────────────────────────────

@require_http_methods(['GET'])
def bracket_public(request, slug):
    try:
        tournament = Tournament.objects.get(slug=slug, status__in=PUBLIC_STATUSES)
    except Tournament.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    matches = tournament.matches.select_related(
        'participant_a__player', 'participant_a__team',
        'participant_b__player', 'participant_b__team',
    ).all()
    return JsonResponse({'matches': [m.to_dict() for m in matches]})


@login_required
@require_http_methods(['GET'])
def bracket_staff(request, pk):
    try:
        tournament = Tournament.objects.get(pk=pk)
    except Tournament.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    matches = tournament.matches.select_related(
        'participant_a__player', 'participant_a__team',
        'participant_b__player', 'participant_b__team',
    ).all()
    return JsonResponse({'matches': [m.to_dict() for m in matches]})


@login_required
@require_http_methods(['POST'])
def generate_bracket_view(request, pk):
    try:
        tournament = Tournament.objects.get(pk=pk)
    except Tournament.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    try:
        generate_bracket(tournament)
    except ValueError as e:
        return JsonResponse({'error': str(e)}, status=400)
    return JsonResponse({'matches': [m.to_dict() for m in tournament.matches.all()]})


@login_required
@require_http_methods(['DELETE'])
def reset_bracket_view(request, pk):
    try:
        tournament = Tournament.objects.get(pk=pk)
    except Tournament.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    tournament.matches.all().delete()
    return JsonResponse({'success': True})


@login_required
@require_http_methods(['PATCH'])
def update_match_view(request, pk, match_pk):
    try:
        match = Match.objects.get(pk=match_pk, tournament_id=pk)
    except Match.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    try:
        for slot in ('a', 'b'):
            key = f'participant_{slot}_id'
            if key in data:
                if match.status in ('completed', 'bye'):
                    return JsonResponse(
                        {'error': 'Cannot reassign a decided match — undo the result first.'}, status=400
                    )
                pid = data[key]
                if pid is not None:
                    if not Participant.objects.filter(pk=pid, tournament_id=pk).exists():
                        return JsonResponse({'error': 'Invalid participant for this tournament.'}, status=400)
                    # Bug B fix: a participant can only occupy one open slot at a
                    # time across the whole bracket. Without this, drag-and-drop
                    # can place the same participant into two different matches
                    # simultaneously (client-side alone can't be trusted here).
                    already_placed = Match.objects.filter(
                        tournament_id=pk,
                    ).filter(
                        Q(participant_a_id=pid) | Q(participant_b_id=pid)
                    ).exclude(pk=match.pk).exists()
                    if already_placed:
                        return JsonResponse(
                            {'error': 'That participant is already placed in another match.'}, status=400
                        )
                setattr(match, f'participant_{slot}_id', pid or None)

        if any(f'participant_{s}_id' in data for s in ('a', 'b')):
            match.status = 'ready' if (match.participant_a_id and match.participant_b_id) else 'pending'
            match.save(update_fields=['participant_a', 'participant_b', 'status'])

        if 'score_a' in data or 'score_b' in data:
            if 'score_a' in data:
                match.score_a = data['score_a']
            if 'score_b' in data:
                match.score_b = data['score_b']
            match.save(update_fields=['score_a', 'score_b'])

        if 'scheduled_time' in data:
            match.scheduled_time = data['scheduled_time'] or None
            match.save(update_fields=['scheduled_time'])

        if 'winner_id' in data:
            winner_id = data['winner_id']
            if winner_id is None:
                clear_winner(match)
            else:
                if winner_id not in (match.participant_a_id, match.participant_b_id):
                    return JsonResponse({'error': 'Winner must be one of the two participants.'}, status=400)
                # Bug A fix: a bye match legitimately has only ONE slot filled —
                # the other will never be filled, so requiring both here made a
                # bye's winner permanently un-redeclarable after Undo. The
                # winner_id is already validated above as one of the match's
                # actual participant ids, so there's nothing further to gain by
                # also requiring both slots to be filled.
                winner = Participant.objects.get(pk=winner_id)
                set_winner(match, winner)

        return JsonResponse(match.to_dict())
    except ValueError as e:
        return JsonResponse({'error': str(e)}, status=400)