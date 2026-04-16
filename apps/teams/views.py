import json
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from .models import Team


@require_http_methods(['GET'])
def list_teams(request):
    """Public — active teams with their rosters."""
    qs = Team.objects.filter(is_active=True).prefetch_related('players')
    game = request.GET.get('game')
    if game:
        qs = qs.filter(game=game)
    return JsonResponse({'teams': [t.to_dict() for t in qs]})


@login_required
@require_http_methods(['GET'])
def list_teams_all(request):
    """Staff — all teams including inactive."""
    qs = Team.objects.all().prefetch_related('players')
    return JsonResponse({'teams': [t.to_dict() for t in qs]})


@login_required
@require_http_methods(['POST'])
def create_team(request):
    """Staff only — create a new team."""
    try:
        data = json.loads(request.body)
        team = Team.objects.create(
            name=data['name'],
            game=data['game'],
            description=data.get('description', ''),
            is_active=data.get('is_active', True),
        )
        return JsonResponse(team.to_dict(), status=201)
    except (KeyError, json.JSONDecodeError) as e:
        return JsonResponse({'error': str(e)}, status=400)


@login_required
@require_http_methods(['PUT', 'PATCH'])
def update_team(request, pk):
    """Staff only — update a team."""
    try:
        team = Team.objects.get(pk=pk)
        data = json.loads(request.body)
        for field in ['name', 'game', 'description', 'is_active']:
            if field in data:
                setattr(team, field, data[field])
        team.save()
        return JsonResponse(team.to_dict())
    except Team.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)


@login_required
@require_http_methods(['DELETE'])
def delete_team(request, pk):
    """Staff only — delete a team."""
    try:
        Team.objects.get(pk=pk).delete()
        return JsonResponse({'success': True})
    except Team.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
