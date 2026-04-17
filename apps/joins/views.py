import json
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from .models import JoinRequest
from apps.players.models import Player


@csrf_exempt
@require_http_methods(['POST'])
def submit_join(request):
    """Public endpoint — anyone can submit a join request."""
    try:
        data = json.loads(request.body)
        join = JoinRequest.objects.create(
            username=data['username'],
            ingame_username=data['ingame_username'],
            game=data['game'],
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
    qs = JoinRequest.objects.all()
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
        join = JoinRequest.objects.get(pk=pk)

        # Avoid duplicate players from the same join request
        if join.status == 'accepted':
            return JsonResponse({'error': 'Already accepted'}, status=400)

        Player.objects.create(
            username=join.username,
            ingame_username=join.ingame_username,
            game=join.game,
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