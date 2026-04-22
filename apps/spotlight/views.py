import json
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from .models import SpotlightSlide


@require_http_methods(['GET'])
def list_slides(request):
    """Public — active slides in order."""
    qs = SpotlightSlide.objects.filter(is_active=True)
    return JsonResponse({'slides': [s.to_dict() for s in qs]})


@login_required
@require_http_methods(['GET'])
def list_slides_all(request):
    """Staff — all slides including inactive."""
    qs = SpotlightSlide.objects.all()
    return JsonResponse({'slides': [s.to_dict() for s in qs]})


def _apply_slide_data(slide, data, files):
    """Apply POST/PATCH data + uploaded files to a SpotlightSlide instance."""
    media_type = data.get('media_type', slide.media_type or 'image')
    slide.media_type = media_type

    for field in ['title', 'href', 'pill_label']:
        if field in data:
            setattr(slide, field, data[field])

    if 'duration' in data:
        slide.duration = int(data['duration'])
    if 'is_active' in data:
        val = data['is_active']
        if isinstance(val, str):
            slide.is_active = val.lower() not in ('false', '0', '')
        else:
            slide.is_active = bool(val)
    if 'display_order' in data:
        slide.display_order = int(data['display_order'])

    if media_type == 'video':
        video_file = files.get('video_file') if files else None
        if video_file:
            slide.video_file = video_file
            slide.video_url = ''
        elif 'video_url' in data:
            slide.video_url = data['video_url']
            # False = "clear this field" for FileField/ImageField without triggering validation
            slide.video_file = None

        # Clear image fields safely
        slide.image_url = ''
        slide.image_file = None

    else:
        image_file = files.get('image_file') if files else None
        if image_file:
            slide.image_file = image_file
            slide.image_url = ''
        elif 'image_url' in data:
            slide.image_url = data['image_url']
            slide.image_file = None

        # Clear video fields safely
        slide.video_url = ''
        slide.video_file = None

    return slide


@login_required
@require_http_methods(['POST'])
def create_slide(request):
    """Staff only — create a spotlight slide. Accepts multipart or JSON."""
    try:
        slide = SpotlightSlide()

        if request.content_type and 'multipart' in request.content_type:
            data = request.POST
            files = request.FILES
        else:
            data = json.loads(request.body)
            files = {}

        # Set defaults for new slides
        slide.pill_label = 'MATCH DAY · ROCKET LEAGUE'
        slide.duration = 8
        slide.is_active = True
        slide.display_order = 0

        _apply_slide_data(slide, data, files)
        slide.save()

        return JsonResponse(slide.to_dict(), status=201)

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@login_required
@require_http_methods(['PUT', 'PATCH'])
def update_slide(request, pk):
    """Staff only — update a slide."""
    try:
        slide = SpotlightSlide.objects.get(pk=pk)

        if request.content_type and 'multipart' in request.content_type:
            # Django already parses these for you — no manual MultiPartParser needed
            data = request.POST
            files = request.FILES
        else:
            data = json.loads(request.body)
            files = {}

        _apply_slide_data(slide, data, files)
        slide.save()
        return JsonResponse(slide.to_dict())

    except SpotlightSlide.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@login_required
@require_http_methods(['DELETE'])
def delete_slide(request, pk):
    """Staff only — delete a slide."""
    try:
        SpotlightSlide.objects.get(pk=pk).delete()
        return JsonResponse({'success': True})
    except SpotlightSlide.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)