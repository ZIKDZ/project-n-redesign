import json
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from .models import Player, PlayerClip
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
    qs = (
        Player.objects
        .filter(status='active')
        .select_related('game', 'team')
        .prefetch_related('clip_set')
    )
    game = request.GET.get('game')
    team_id = request.GET.get('team')
    if game:
        qs = qs.filter(game__slug=game)
    if team_id:
        qs = qs.filter(team_id=team_id)
    return JsonResponse({'players': [p.to_dict() for p in qs]})


@require_http_methods(['GET'])
def get_player(request, pk):
    """Public — fetch a single player by id."""
    try:
        player = (
            Player.objects
            .select_related('game', 'team')
            .prefetch_related('clip_set')
            .get(pk=pk)
        )
        return JsonResponse(player.to_dict())
    except Player.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)


@login_required
@require_http_methods(['GET'])
def list_players_all(request):
    """Staff — all players including inactive/suspended."""
    qs = (
        Player.objects
        .all()
        .select_related('game', 'team')
        .prefetch_related('clip_set')
    )
    return JsonResponse({'players': [p.to_dict() for p in qs]})


@login_required
@require_http_methods(['POST'])
def create_player(request):
    """Staff only — add a player. Always receives multipart/form-data from the dashboard."""
    try:
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
            twitter_url=data.get('twitter_url', ''),
            instagram_url=data.get('instagram_url', ''),
            twitch_url=data.get('twitch_url', ''),
            kick_url=data.get('kick_url', ''),
            tiktok_url=data.get('tiktok_url', ''),
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
    """Staff only — update player info. Supports multipart (avatar) or JSON."""
    try:
        player = (
            Player.objects
            .select_related('game', 'team')
            .prefetch_related('clip_set')
            .get(pk=pk)
        )

        if request.content_type and 'multipart' in request.content_type:
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

        # Social links
        for field in ['twitter_url', 'instagram_url', 'twitch_url', 'kick_url', 'tiktok_url']:
            if field in data:
                setattr(player, field, data[field])

        # Personal info
        for field in ['first_name', 'last_name', 'email', 'phone', 'address']:
            if field in data:
                setattr(player, field, data[field])

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

        # Team FK
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


# ── Clip endpoints ─────────────────────────────────────────────────────────────

@login_required
@require_http_methods(['POST'])
def create_clip(request, pk):
    """
    Staff only — upload a Cloudinary video clip for a player.
    Expects multipart: video_file (required), title (required),
    description (optional), display_order (optional).
    """
    try:
        player = Player.objects.get(pk=pk)
    except Player.DoesNotExist:
        return JsonResponse({'error': 'Player not found'}, status=404)

    video_file = request.FILES.get('video_file')
    if not video_file:
        return JsonResponse({'error': 'No video file provided'}, status=400)

    title = request.POST.get('title', '').strip()
    if not title:
        return JsonResponse({'error': 'title is required'}, status=400)

    description = request.POST.get('description', '').strip()
    display_order = PlayerClip.objects.filter(player=player).count()

    try:
        raw_order = request.POST.get('display_order', '')
        if raw_order:
            display_order = int(raw_order)
    except ValueError:
        pass

    try:
        clip = PlayerClip.objects.create(
            player=player,
            title=title,
            description=description,
            video_file=video_file,
            display_order=display_order,
        )
        return JsonResponse(clip.to_dict(), status=201)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@login_required
@require_http_methods(['PATCH'])
def update_clip(request, pk, clip_pk):
    """Staff only — update clip title, description, or display_order."""
    try:
        clip = PlayerClip.objects.get(pk=clip_pk, player_id=pk)
    except PlayerClip.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    try:
        data = json.loads(request.body)
        for field in ['title', 'description', 'display_order']:
            if field in data:
                setattr(clip, field, data[field])
        clip.save()
        return JsonResponse(clip.to_dict())
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@login_required
@require_http_methods(['DELETE'])
def delete_clip(request, pk, clip_pk):
    """Staff only — delete a clip and remove it from Cloudinary."""
    try:
        clip = PlayerClip.objects.get(pk=clip_pk, player_id=pk)
        clip.delete()
        return JsonResponse({'success': True})
    except PlayerClip.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)