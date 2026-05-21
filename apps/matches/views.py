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
    game   = request.GET.get('game')
    if status:
        qs = qs.filter(status=status)
    if game:
        qs = qs.filter(game=game)
    return JsonResponse({'matches': [m.to_dict() for m in qs]})


@login_required
@require_http_methods(['POST'])
def create_match(request):
    """Staff only — create a new match. Accepts multipart (logo upload) or JSON."""
    try:
        if request.content_type and 'multipart' in request.content_type:
            data      = request.POST
            logo_file = request.FILES.get('rival_logo')

            match = Match(
                rival          = data['rival'],
                rival_logo_url = data.get('rival_logo_url', '') if not logo_file else '',
                match_type     = data.get('match_type', 'tournament'),
                game           = data['game'],
                date           = data['date'],
                time           = data['time'],
                status         = data.get('status', 'upcoming'),
                score          = data.get('score', ''),
                winner         = data.get('winner', ''),
            )
            if logo_file:
                match.rival_logo = logo_file
            match.save()

        else:
            data = json.loads(request.body)
            match = Match.objects.create(
                rival          = data['rival'],
                rival_logo_url = data.get('rival_logo_url', ''),
                match_type     = data.get('match_type', 'tournament'),
                game           = data['game'],
                date           = data['date'],
                time           = data['time'],
                status         = data.get('status', 'upcoming'),
                score          = data.get('score', ''),
                winner         = data.get('winner', ''),
            )

        return JsonResponse(match.to_dict(), status=201)

    except KeyError as e:
        return JsonResponse({'error': f'Missing field: {e}'}, status=400)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@login_required
@require_http_methods(['PUT', 'PATCH'])
def update_match(request, pk):
    """
    Staff only — update a match.
    django-cleanup automatically deletes old rival_logo from CDN when field changes.
    """
    try:
        match = Match.objects.get(pk=pk)

        if request.content_type and 'multipart' in request.content_type:
            from django.http.multipartparser import MultiPartParser
            parser = MultiPartParser(request.META, request, request.upload_handlers)
            post_data, files = parser.parse()

            data      = post_data
            logo_file = files.get('rival_logo')

            # Update scalar fields
            for field in ['rival', 'match_type', 'game', 'date', 'time', 'status', 'score', 'winner']:
                if field in data:
                    setattr(match, field, data[field])

            # ── Rival Logo ────────────────────────────────────────────────────
            # django-cleanup detects the field change on save() and deletes old file
            if logo_file:
                match.rival_logo     = logo_file
                match.rival_logo_url = ''
            elif 'rival_logo_url' in data:
                match.rival_logo     = None  # Setting to None triggers cleanup of old file
                match.rival_logo_url = data['rival_logo_url']

        else:
            # JSON payload
            data = json.loads(request.body)
            for field in ['rival', 'rival_logo_url', 'match_type', 'game', 'date', 'time', 'status', 'score', 'winner']:
                if field in data:
                    setattr(match, field, data[field])

        match.save()  # django-cleanup's pre_save signal fires here
        return JsonResponse(match.to_dict())

    except Match.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@login_required
@require_http_methods(['DELETE'])
def delete_match(request, pk):
    """
    Staff only — delete a match.
    django-cleanup automatically removes rival_logo from CDN via post_delete signal.
    """
    try:
        Match.objects.get(pk=pk).delete()
        return JsonResponse({'success': True})
    except Match.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)