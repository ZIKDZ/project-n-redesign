import json

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils.text import slugify
from django.views.decorators.http import require_http_methods

from .models import Tournament, Placement

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