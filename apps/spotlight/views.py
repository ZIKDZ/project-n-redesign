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


@login_required
@require_http_methods(['POST'])
def create_slide(request):
    """Staff only — create a spotlight slide. Accepts multipart or JSON."""
    try:
        if request.content_type and 'multipart' in request.content_type:
            data = request.POST
            video_file = request.FILES.get('video_file')
            image_file = request.FILES.get('image_file')

            slide = SpotlightSlide(
                title=data.get('title', ''),
                media_type=data.get('media_type', 'video'),
                video_url=data.get('video_url', ''),
                image_url=data.get('image_url', ''),
                href=data.get('href', ''),
                pill_label=data.get('pill_label', 'MATCH DAY · ROCKET LEAGUE'),
                duration=int(data.get('duration', 8)),
                is_active=data.get('is_active', 'true').lower() != 'false',
                display_order=int(data.get('display_order', 0)),
            )
            slide.save()
            if video_file:
                slide.video_file = video_file
            if image_file:
                slide.image_file = image_file
            if video_file or image_file:
                slide.save()
        else:
            data = json.loads(request.body)
            slide = SpotlightSlide.objects.create(
                title=data.get('title', ''),
                media_type=data.get('media_type', 'video'),
                video_url=data.get('video_url', ''),
                image_url=data.get('image_url', ''),
                href=data.get('href', ''),
                pill_label=data.get('pill_label', 'MATCH DAY · ROCKET LEAGUE'),
                duration=data.get('duration', 8),
                is_active=data.get('is_active', True),
                display_order=data.get('display_order', 0),
            )

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
            from django.http.multipartparser import MultiPartParser
            parser = MultiPartParser(request.META, request, request.upload_handlers)
            post_data, files = parser.parse()
            data = post_data
            video_file = files.get('video_file')
            image_file = files.get('image_file')
        else:
            data = json.loads(request.body)
            video_file = image_file = None

        for field in ['title', 'media_type', 'video_url', 'image_url', 'href', 'pill_label']:
            if field in data:
                setattr(slide, field, data[field])
        if 'duration' in data:
            slide.duration = int(data['duration'])
        if 'is_active' in data:
            val = data['is_active']
            slide.is_active = (val != 'false' and val is not False) if isinstance(val, str) else bool(val)
        if 'display_order' in data:
            slide.display_order = int(data['display_order'])
        if video_file:
            slide.video_file = video_file
        if image_file:
            slide.image_file = image_file

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
