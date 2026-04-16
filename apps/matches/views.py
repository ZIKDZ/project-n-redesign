import json
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from .models import Match


@require_http_methods(['GET'])
def list_matches(request):
    """Public — returns all matches, optionally filtered by status or game."""
    qs = Match.objects.all()
    status = request.GET.get('status')
    game = request.GET.get('game')
    if status:
        qs = qs.filter(status=status)
    if game:
        qs = qs.filter(game=game)
    return JsonResponse({'matches': [m.to_dict() for m in qs]})


@login_required
@require_http_methods(['POST'])
def create_match(request):
    """Staff only — create a new match."""
    try:
        data = json.loads(request.body)
        match = Match.objects.create(
            rival=data['rival'],
            match_type=data.get('match_type', 'tournament'),
            game=data['game'],
            date=data['date'],
            time=data['time'],
            status=data.get('status', 'upcoming'),
            score=data.get('score', ''),
            winner=data.get('winner', ''),
        )
        return JsonResponse(match.to_dict(), status=201)
    except (KeyError, json.JSONDecodeError) as e:
        return JsonResponse({'error': str(e)}, status=400)


@login_required
@require_http_methods(['PUT', 'PATCH'])
def update_match(request, pk):
    """Staff only — update a match."""
    try:
        match = Match.objects.get(pk=pk)
        data = json.loads(request.body)
        for field in ['rival', 'match_type', 'game', 'date', 'time', 'status', 'score', 'winner']:
            if field in data:
                setattr(match, field, data[field])
        match.save()
        return JsonResponse(match.to_dict())
    except Match.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)


@login_required
@require_http_methods(['DELETE'])
def delete_match(request, pk):
    """Staff only — delete a match."""
    try:
        Match.objects.get(pk=pk).delete()
        return JsonResponse({'success': True})
    except Match.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
