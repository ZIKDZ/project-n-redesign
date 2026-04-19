import json
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from .models import Team


@require_http_methods(['GET'])
def list_teams(request):
    """Public — active, public teams with their rosters."""
    qs = Team.objects.filter(is_active=True, visibility='public').prefetch_related('players')
    game = request.GET.get('game')
    if game:
        qs = qs.filter(game=game)
    return JsonResponse({'teams': [t.to_dict() for t in qs]})


@login_required
@require_http_methods(['GET'])
def list_teams_all(request):
    """Staff — all teams including inactive and hidden."""
    qs = Team.objects.all().prefetch_related('players').select_related('igl')
    return JsonResponse({'teams': [t.to_dict() for t in qs]})


@login_required
@require_http_methods(['POST'])
def create_team(request):
    """Staff only — create a new team/roster. Accepts multipart (file upload) or JSON."""
    try:
        if request.content_type and 'multipart' in request.content_type:
            data        = request.POST
            banner_file = request.FILES.get('banner')
            logo_file   = request.FILES.get('logo')

            igl_id = data.get('igl_id') or None
            if igl_id and igl_id not in ('null', 'None', ''):
                igl_id = int(igl_id)
            else:
                igl_id = None

            team = Team(
                name=data['name'],
                game=data['game'],
                description=data.get('description', ''),
                # Only store URL fallback when no file provided
                banner_url=data.get('banner_url', '') if not banner_file else '',
                logo_url=data.get('logo_url', '')     if not logo_file   else '',
                max_players=int(data.get('max_players', 5)),
                igl_id=igl_id,
                visibility=data.get('visibility', 'public'),
                is_active=data.get('is_active', 'true').lower() != 'false',
            )
            if banner_file:
                team.banner = banner_file
            if logo_file:
                team.logo = logo_file
            team.save()

        else:
            data   = json.loads(request.body)
            igl_id = data.get('igl_id') or None
            team   = Team.objects.create(
                name=data['name'],
                game=data['game'],
                description=data.get('description', ''),
                banner_url=data.get('banner_url', ''),
                logo_url=data.get('logo_url', ''),
                max_players=data.get('max_players', 5),
                igl_id=igl_id,
                visibility=data.get('visibility', 'public'),
                is_active=data.get('is_active', True),
            )

        return JsonResponse(team.to_dict(), status=201)

    except KeyError as e:
        return JsonResponse({'error': f'Missing field: {e}'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@login_required
@require_http_methods(['PUT', 'PATCH'])
def update_team(request, pk):
    """Staff only — update a team/roster. Accepts multipart (file upload) or JSON."""
    try:
        team = Team.objects.get(pk=pk)

        if request.content_type and 'multipart' in request.content_type:
            # Django does NOT auto-parse multipart for PUT/PATCH — do it manually.
            from django.http.multipartparser import MultiPartParser
            parser = MultiPartParser(request.META, request, request.upload_handlers)
            post_data, files = parser.parse()

            data        = post_data
            banner_file = files.get('banner')
            logo_file   = files.get('logo')

            for field in ['name', 'game', 'description', 'visibility']:
                if field in data:
                    setattr(team, field, data[field])

            if 'max_players' in data:
                team.max_players = int(data['max_players'])
            if 'is_active' in data:
                team.is_active = data['is_active'].lower() != 'false'
            if 'igl_id' in data:
                raw = data['igl_id']
                team.igl_id = int(raw) if raw and raw not in ('null', 'None', '') else None

            # Banner
            if banner_file:
                team.banner     = banner_file
                team.banner_url = ''
            elif 'banner_url' in data:
                team.banner_url = data['banner_url']
                team.banner     = None

            # Logo
            if logo_file:
                team.logo     = logo_file
                team.logo_url = ''
            elif 'logo_url' in data:
                team.logo_url = data['logo_url']
                team.logo     = None

        else:
            data = json.loads(request.body)
            for field in ['name', 'game', 'description', 'banner_url', 'logo_url',
                          'max_players', 'visibility', 'is_active']:
                if field in data:
                    setattr(team, field, data[field])
            if 'igl_id' in data:
                team.igl_id = data['igl_id'] or None

        team.save()
        return JsonResponse(team.to_dict())

    except Team.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@login_required
@require_http_methods(['DELETE'])
def delete_team(request, pk):
    """Staff only — delete a team."""
    try:
        Team.objects.get(pk=pk).delete()
        return JsonResponse({'success': True})
    except Team.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)