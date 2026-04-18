import json
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from .models import Game


@require_http_methods(['GET'])
def list_games(request):
    """Public — active games only (full showcase list)."""
    qs = Game.objects.filter(is_active=True)
    return JsonResponse({'games': [g.to_dict() for g in qs]})


@require_http_methods(['GET'])
def list_games_open(request):
    """Public — games currently open for registration (join-form list).

    Filters to is_active=True AND registration_open=True so the join form
    never shows a game that is inactive or has closed recruitment.
    """
    qs = Game.objects.filter(is_active=True, registration_open=True)
    return JsonResponse({'games': [g.to_dict() for g in qs]})


@login_required
@require_http_methods(['GET'])
def list_games_all(request):
    """Staff — all games including inactive, with full field set."""
    qs = Game.objects.all()
    return JsonResponse({'games': [g.to_dict() for g in qs]})


@login_required
@require_http_methods(['POST'])
def create_game(request):
    """Staff only — create a game. Accepts multipart (file upload) or JSON."""
    try:
        if request.content_type and 'multipart' in request.content_type:
            data = request.POST
            banner_file = request.FILES.get('banner')
            logo_file = request.FILES.get('logo')

            ranks_raw = data.get('ranks', '[]')
            try:
                ranks = json.loads(ranks_raw)
            except json.JSONDecodeError:
                ranks = [r.strip() for r in ranks_raw.split(',') if r.strip()]

            game = Game.objects.create(
                title=data['title'],
                slug=data['slug'],
                publisher=data.get('publisher', ''),
                genre=data.get('genre', ''),
                banner_url=data.get('banner_url', ''),
                logo_url=data.get('logo_url', ''),
                overlay_color=data.get('overlay_color', ''),
                ranks=ranks,
                is_active=data.get('is_active', 'true').lower() != 'false',
                registration_open=data.get('registration_open', 'false').lower() == 'true',
                display_order=int(data.get('display_order', 0)),
            )
            if banner_file:
                game.banner = banner_file
            if logo_file:
                game.logo = logo_file
            if banner_file or logo_file:
                game.save()
        else:
            data = json.loads(request.body)
            game = Game.objects.create(
                title=data['title'],
                slug=data['slug'],
                publisher=data.get('publisher', ''),
                genre=data.get('genre', ''),
                banner_url=data.get('banner_url', ''),
                logo_url=data.get('logo_url', ''),
                overlay_color=data.get('overlay_color', ''),
                ranks=data.get('ranks', []),
                is_active=data.get('is_active', True),
                registration_open=data.get('registration_open', False),
                display_order=data.get('display_order', 0),
            )

        return JsonResponse(game.to_dict(), status=201)

    except KeyError as e:
        return JsonResponse({'error': f'Missing field: {e}'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@login_required
@require_http_methods(['PUT', 'PATCH'])
def update_game(request, pk):
    """Staff only — update a game."""
    try:
        game = Game.objects.get(pk=pk)

        if request.content_type and 'multipart' in request.content_type:
            data = request.POST
            banner_file = request.FILES.get('banner')
            logo_file = request.FILES.get('logo')

            for field in ['title', 'slug', 'publisher', 'genre', 'banner_url', 'logo_url', 'overlay_color']:
                if field in data:
                    setattr(game, field, data[field])
            if 'is_active' in data:
                game.is_active = data['is_active'].lower() != 'false'
            if 'registration_open' in data:
                game.registration_open = data['registration_open'].lower() == 'true'
            if 'display_order' in data:
                game.display_order = int(data['display_order'])
            if 'ranks' in data:
                ranks_raw = data['ranks']
                try:
                    game.ranks = json.loads(ranks_raw)
                except json.JSONDecodeError:
                    game.ranks = [r.strip() for r in ranks_raw.split(',') if r.strip()]
            if banner_file:
                game.banner = banner_file
            if logo_file:
                game.logo = logo_file
        else:
            data = json.loads(request.body)
            for field in ['title', 'slug', 'publisher', 'genre', 'banner_url', 'logo_url',
                          'overlay_color', 'ranks', 'is_active', 'registration_open', 'display_order']:
                if field in data:
                    setattr(game, field, data[field])

        game.save()
        return JsonResponse(game.to_dict())

    except Game.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@login_required
@require_http_methods(['DELETE'])
def delete_game(request, pk):
    """Staff only — delete a game."""
    try:
        Game.objects.get(pk=pk).delete()
        return JsonResponse({'success': True})
    except Game.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)