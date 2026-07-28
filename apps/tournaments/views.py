import json

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils.text import slugify
from django.views.decorators.http import require_http_methods
from django.db import transaction

from .models import Tournament, Placement, Participant, TournamentTeam, TournamentTeamMember
from .discord_auth_views import get_current_player

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
            tournament.banner_url = data['banner_url']
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


# ── Public — Registration (Discord-authenticated players) ──────────────────

@require_http_methods(['POST'])
def register_solo(request, slug):
    try:
        tournament = Tournament.objects.get(slug=slug, status__in=PUBLIC_STATUSES)
    except Tournament.DoesNotExist:
        return JsonResponse({'error': 'Tournament not found'}, status=404)

    if tournament.format != 'solo':
        return JsonResponse({'error': 'This tournament requires a team.'}, status=400)

    if not tournament.registration_is_open():
        return JsonResponse({'error': 'Registration is not open.'}, status=400)

    player = get_current_player(request)
    if not player:
        return JsonResponse({'error': 'Sign in with Discord first.'}, status=401)

    if Participant.objects.filter(tournament=tournament, player=player).exists():
        return JsonResponse({'error': 'You are already registered.'}, status=400)

    if tournament.max_participants and tournament.participants.count() >= tournament.max_participants:
        return JsonResponse({'error': 'Registration is full.'}, status=400)

    participant = Participant.objects.create(tournament=tournament, player=player)
    return JsonResponse(participant.to_dict(), status=201)


@require_http_methods(['POST'])
def create_team(request, slug):
    try:
        tournament = Tournament.objects.get(slug=slug, status__in=PUBLIC_STATUSES)
    except Tournament.DoesNotExist:
        return JsonResponse({'error': 'Tournament not found'}, status=404)

    if tournament.format != 'team':
        return JsonResponse({'error': 'This tournament is solo-entry only.'}, status=400)

    if not tournament.registration_is_open():
        return JsonResponse({'error': 'Registration is not open.'}, status=400)

    player = get_current_player(request)
    if not player:
        return JsonResponse({'error': 'Sign in with Discord first.'}, status=401)

    if TournamentTeamMember.objects.filter(team__tournament=tournament, player=player).exists():
        return JsonResponse({'error': 'You are already part of a team in this tournament.'}, status=400)

    try:
        data = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        data = {}

    name = (data.get('name') or '').strip()
    if not name:
        return JsonResponse({'error': 'Team name is required.'}, status=400)

    if tournament.max_participants and tournament.participants.count() >= tournament.max_participants:
        return JsonResponse({'error': 'Registration is full.'}, status=400)

    with transaction.atomic():
        team = TournamentTeam.objects.create(
            tournament=tournament,
            name=name,
            tag=(data.get('tag') or '').strip()[:10],
            captain=player,
        )
        TournamentTeamMember.objects.create(team=team, player=player)
        Participant.objects.create(tournament=tournament, team=team)

    return JsonResponse(team.to_dict(), status=201)


@require_http_methods(['POST'])
def join_team(request, slug):
    try:
        tournament = Tournament.objects.get(slug=slug, status__in=PUBLIC_STATUSES)
    except Tournament.DoesNotExist:
        return JsonResponse({'error': 'Tournament not found'}, status=404)

    if not tournament.registration_is_open():
        return JsonResponse({'error': 'Registration is not open.'}, status=400)

    player = get_current_player(request)
    if not player:
        return JsonResponse({'error': 'Sign in with Discord first.'}, status=401)

    try:
        data = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        data = {}

    invite_code = (data.get('invite_code') or '').strip().upper()
    if not invite_code:
        return JsonResponse({'error': 'Invite code is required.'}, status=400)

    try:
        team = TournamentTeam.objects.get(tournament=tournament, invite_code=invite_code)
    except TournamentTeam.DoesNotExist:
        return JsonResponse({'error': 'Invalid invite code.'}, status=404)

    if TournamentTeamMember.objects.filter(team__tournament=tournament, player=player).exists():
        return JsonResponse({'error': 'You are already part of a team in this tournament.'}, status=400)

    if tournament.team_size and team.members.count() >= tournament.team_size:
        return JsonResponse({'error': 'This team is full.'}, status=400)

    TournamentTeamMember.objects.create(team=team, player=player)
    return JsonResponse(team.to_dict(), status=201)


@require_http_methods(['GET'])
def get_my_participation(request, slug):
    try:
        tournament = Tournament.objects.get(slug=slug, status__in=PUBLIC_STATUSES)
    except Tournament.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    player = get_current_player(request)
    if not player:
        return JsonResponse({'registered': False})

    if tournament.format == 'solo':
        participant = Participant.objects.filter(tournament=tournament, player=player).first()
        if not participant:
            return JsonResponse({'registered': False})
        return JsonResponse({'registered': True, 'kind': 'solo', 'participant': participant.to_dict()})

    membership = (
        TournamentTeamMember.objects
        .filter(team__tournament=tournament, player=player)
        .select_related('team')
        .first()
    )
    if not membership:
        return JsonResponse({'registered': False})
    return JsonResponse({
        'registered': True,
        'kind': 'team',
        'team': membership.team.to_dict(),
        'is_captain': membership.team.captain_id == player.id,
    })


# ── Staff — Participants (seeding / disqualify / withdraw) ─────────────────

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
    return JsonResponse({'participants': [p.to_dict() for p in participants]})


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