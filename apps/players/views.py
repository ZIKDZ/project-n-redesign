import json
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from .models import Player
from apps.games.models import Game


def _resolve_game(game_id=None, game_slug=None):
    """Return a Game instance (or None) from an id or slug."""
    try:
        if game_id:
            return Game.objects.get(pk=game_id, is_active=True)
        if game_slug:
            return Game.objects.get(slug=game_slug, is_active=True)
    except Game.DoesNotExist:
        pass
    return None


@require_http_methods(['GET'])
def list_players(request):
    """Public — active players, optionally filtered by game or team."""
    qs = Player.objects.filter(status='active').select_related('game', 'team')
    game = request.GET.get('game')
    team_id = request.GET.get('team')
    if game:
        qs = qs.filter(game__slug=game)
    if team_id:
        qs = qs.filter(team_id=team_id)
    return JsonResponse({'players': [p.to_dict() for p in qs]})


@login_required
@require_http_methods(['GET'])
def list_players_all(request):
    """Staff — all players including inactive/suspended."""
    qs = Player.objects.all().select_related('game', 'team')
    return JsonResponse({'players': [p.to_dict() for p in qs]})


@login_required
@require_http_methods(['POST'])
def create_player(request):
    """Staff only — add a player. Always receives multipart/form-data from the dashboard."""
    try:
        # Django parses multipart automatically for POST
        if request.content_type and 'multipart' in request.content_type:
            data = request.POST
            avatar_file = request.FILES.get('avatar')
        else:
            data = json.loads(request.body)
            avatar_file = None

        game_obj = _resolve_game(
            game_id=data.get('game_id') or None,
            game_slug=data.get('game') or None,
        )
        game_slug = data.get('game', '')

        # FormData sends everything as strings — coerce carefully
        raw_age = data.get('age', '')
        raw_team = data.get('team_id', '')

        player = Player(
            username=data['username'],
            ingame_username=data.get('ingame_username', data['username']),
            game=game_obj,
            game_slug_fallback=game_obj.slug if game_obj else game_slug,
            role=data.get('role', 'player'),
            rank=data.get('rank', ''),
            status=data.get('status', 'active'),
            team_id=int(raw_team) if raw_team and raw_team not in ('null', 'None', '') else None,
            bio=data.get('bio', ''),
            discord_username=data.get('discord_username', ''),
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', ''),
            age=int(raw_age) if raw_age and raw_age not in ('null', 'None', '') else None,
            email=data.get('email', ''),
            phone=data.get('phone', ''),
            address=data.get('address', ''),
        )
        player.save()

        if avatar_file:
            player.avatar = avatar_file
            player.save()

        return JsonResponse(player.to_dict(), status=201)

    except KeyError as e:
        return JsonResponse({'error': f'Missing field: {e}'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@login_required
@require_http_methods(['PUT', 'PATCH'])
def update_player(request, pk):
    """Staff only — update player info. Supports multipart (avatar) or JSON.

    Django does NOT auto-parse multipart bodies for PATCH/PUT — only for POST.
    We use MultiPartParser explicitly when the content-type signals a file upload.
    """
    try:
        player = Player.objects.select_related('game', 'team').get(pk=pk)

        if request.content_type and 'multipart' in request.content_type:
            # Manually parse multipart for PATCH/PUT
            from django.http.multipartparser import MultiPartParser
            parser = MultiPartParser(request.META, request, request.upload_handlers)
            post_data, files = parser.parse()
            data = post_data
            avatar_file = files.get('avatar')
        else:
            data = json.loads(request.body)
            avatar_file = None

        # Profile fields
        for field in ['username', 'ingame_username', 'role', 'rank', 'status', 'bio', 'discord_username']:
            if field in data:
                setattr(player, field, data[field])

        # Personal info
        for field in ['first_name', 'last_name', 'email', 'phone', 'address']:
            if field in data:
                setattr(player, field, data[field])

        # age — FormData sends strings, coerce safely
        if 'age' in data:
            raw_age = data['age']
            player.age = int(raw_age) if raw_age and str(raw_age) not in ('null', 'None', '') else None

        # Game FK
        if 'game_id' in data or 'game' in data:
            game_obj = _resolve_game(
                game_id=data.get('game_id') or None,
                game_slug=data.get('game') or None,
            )
            player.game = game_obj
            if game_obj:
                player.game_slug_fallback = game_obj.slug

        # Team FK — FormData sends strings
        if 'team_id' in data:
            raw_team = data['team_id']
            player.team_id = int(raw_team) if raw_team and str(raw_team) not in ('null', 'None', '') else None

        # Avatar upload / clear
        clear_avatar = data.get('clear_avatar', '')
        if clear_avatar and str(clear_avatar).lower() not in ('false', '0', ''):
            player.avatar = None
        elif avatar_file:
            player.avatar = avatar_file
 
        player.save()
        return JsonResponse(player.to_dict())

    except Player.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@login_required
@require_http_methods(['DELETE'])
def delete_player(request, pk):
    """Staff only — permanently remove a player."""
    try:
        Player.objects.get(pk=pk).delete()
        return JsonResponse({'success': True})
    except Player.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)