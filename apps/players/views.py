import json
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from .models import Player


@require_http_methods(['GET'])
def list_players(request):
    """Public — active players, optionally filtered by game or team."""
    qs = Player.objects.filter(is_active=True).select_related('team')
    game = request.GET.get('game')
    team_id = request.GET.get('team')
    if game:
        qs = qs.filter(game=game)
    if team_id:
        qs = qs.filter(team_id=team_id)
    return JsonResponse({'players': [p.to_dict() for p in qs]})


@login_required
@require_http_methods(['GET'])
def list_players_all(request):
    """Staff — all players including inactive."""
    qs = Player.objects.all().select_related('team')
    return JsonResponse({'players': [p.to_dict() for p in qs]})


@login_required
@require_http_methods(['POST'])
def create_player(request):
    """Staff only — add a player to the roster."""
    try:
        data = json.loads(request.body)
        player = Player.objects.create(
            username=data['username'],
            ingame_username=data['ingame_username'],
            real_name=data.get('real_name', ''),
            game=data['game'],
            role=data.get('role', 'player'),
            rank=data['rank'],
            discord_username=data.get('discord_username', ''),
            email=data.get('email', ''),
            team_id=data.get('team_id'),
            bio=data.get('bio', ''),
        )
        return JsonResponse(player.to_dict(), status=201)
    except (KeyError, json.JSONDecodeError) as e:
        return JsonResponse({'error': str(e)}, status=400)


@login_required
@require_http_methods(['PUT', 'PATCH'])
def update_player(request, pk):
    """Staff only — update player info."""
    try:
        player = Player.objects.get(pk=pk)
        data = json.loads(request.body)
        for field in ['username', 'ingame_username', 'real_name', 'game', 'role',
                      'rank', 'discord_username', 'email', 'is_active', 'bio']:
            if field in data:
                setattr(player, field, data[field])
        if 'team_id' in data:
            player.team_id = data['team_id']
        player.save()
        return JsonResponse(player.to_dict())
    except Player.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)


@login_required
@require_http_methods(['DELETE'])
def delete_player(request, pk):
    """Staff only — remove a player."""
    try:
        Player.objects.get(pk=pk).delete()
        return JsonResponse({'success': True})
    except Player.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
