import json
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from .models import JoinRequest
from apps.players.models import Player
from apps.games.models import Game


def _resolve_game(game_slug):
    """Return a Game instance (or None) for the given slug."""
    try:
        return Game.objects.get(slug=game_slug, is_active=True)
    except Game.DoesNotExist:
        return None


@csrf_exempt
@require_http_methods(['POST'])
def submit_join(request):
    """Public endpoint — anyone can submit a join request."""
    try:
        data = json.loads(request.body)
        game_slug = data.get('game', '')
        game_obj = _resolve_game(game_slug)

        join = JoinRequest.objects.create(
            username=data['username'],
            ingame_username=data['ingame_username'],
            game=game_obj,
            game_slug_fallback=game_slug,
            discord_username=data['discord_username'],
            rank=data['rank'],
            email=data['email'],
        )
        return JsonResponse({'success': True, 'id': join.id}, status=201)
    except (KeyError, json.JSONDecodeError) as e:
        return JsonResponse({'error': str(e)}, status=400)


@login_required
@require_http_methods(['GET'])
def list_joins(request):
    """Staff only — list all join requests with optional status filter."""
    status = request.GET.get('status')
    qs = JoinRequest.objects.select_related('game').all()
    if status:
        qs = qs.filter(status=status)
    return JsonResponse({'joins': [j.to_dict() for j in qs]})


@login_required
@require_http_methods(['PATCH'])
def update_join_status(request, pk):
    """Staff only — update status/notes on a join request."""
    try:
        join = JoinRequest.objects.get(pk=pk)
        data = json.loads(request.body)
        if 'status' in data:
            join.status = data['status']
        if 'notes' in data:
            join.notes = data['notes']
        join.save()
        return JsonResponse(join.to_dict())
    except JoinRequest.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)


@login_required
@require_http_methods(['POST'])
def accept_join(request, pk):
    """Staff only — accept a join request and create a Player record."""
    try:
        join = JoinRequest.objects.select_related('game').get(pk=pk)

        if join.status == 'accepted':
            return JsonResponse({'error': 'Already accepted'}, status=400)

        game_slug = join.game.slug if join.game else join.game_slug_fallback

        Player.objects.create(
            username=join.username,
            ingame_username=join.ingame_username,
            game=game_slug,
            role='player',
            rank=join.rank,
            discord_username=join.discord_username,
            email=join.email,
        )

        join.status = 'accepted'
        join.save()

        return JsonResponse({'success': True})
    except JoinRequest.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)