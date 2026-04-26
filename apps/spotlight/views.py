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
    """
    Apply POST/PATCH data + uploaded files to a SpotlightSlide instance.
    Mutates the slide in place. Always do a full save() after calling this.
    """
    media_type = data.get('media_type', slide.media_type or 'image')
    slide.media_type = media_type

    for field in ['title', 'href', 'pill_label']:
        if field in data:
            setattr(slide, field, data[field])

    if 'duration' in data:
        slide.duration = int(data['duration'])

    if 'is_active' in data:
        val = data['is_active']
        slide.is_active = val.lower() not in ('false', '0', '') if isinstance(val, str) else bool(val)

    if 'display_order' in data:
        slide.display_order = int(data['display_order'])

    if media_type == 'video':
        video_file = files.get('video_file') if files else None
        if video_file:
            slide.video_file = video_file
            slide.video_url = ''
        elif 'video_url' in data:
            slide.video_url = data['video_url']
        # Clear image fields when switching to video
        slide.image_url = ''
        slide.image_file = None
    else:
        image_file = files.get('image_file') if files else None
        if image_file:
            slide.image_file = image_file
            slide.image_url = ''
        elif 'image_url' in data:
            slide.image_url = data['image_url']
        # Clear video fields when switching to image
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

        # Defaults for new slides
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
            # Django does NOT auto-parse multipart for PUT/PATCH — do it manually.
            from django.http.multipartparser import MultiPartParser
            parser = MultiPartParser(request.META, request, request.upload_handlers)
            post_data, files = parser.parse()

            data = post_data
            # Get files from parsed multipart data
            video_file = files.get('video_file')
            image_file = files.get('image_file')
            
            # Create a files dict for _apply_slide_data
            files_dict = {}
            if video_file:
                files_dict['video_file'] = video_file
            if image_file:
                files_dict['image_file'] = image_file

            _apply_slide_data(slide, data, files_dict)
        else:
            data = json.loads(request.body)
            _apply_slide_data(slide, data, {})

        # Full save — avoids update_fields missing fields when media type changes
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