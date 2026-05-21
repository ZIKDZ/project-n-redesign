import json
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from .models import NewsPost


@require_http_methods(['GET'])
def list_news(request):
    """Public — published posts only."""
    qs = NewsPost.objects.filter(is_published=True)
    tag = request.GET.get('tag')
    if tag:
        qs = qs.filter(tag=tag)
    return JsonResponse({'news': [n.to_dict() for n in qs]})


@login_required
@require_http_methods(['GET'])
def list_news_all(request):
    """Staff — all posts including drafts."""
    qs = NewsPost.objects.all()
    return JsonResponse({'news': [n.to_dict() for n in qs]})


@login_required
@require_http_methods(['POST'])
def create_news(request):
    """Staff only — create a news post. Accepts multipart (file upload) or JSON."""
    try:
        if request.content_type and 'multipart' in request.content_type:
            data           = request.POST
            thumbnail_file = request.FILES.get('thumbnail')

            published_at = data.get('published_at', '').strip()
            if not published_at:
                return JsonResponse({'error': 'published_at is required'}, status=400)

            post = NewsPost(
                title         = data['title'],
                tag           = data.get('tag', 'announcement'),
                description   = data['description'],
                thumbnail_url = data.get('thumbnail_url', '') if not thumbnail_file else '',
                published_at  = published_at,
                is_published  = data.get('is_published', 'true').lower() != 'false',
            )
            if thumbnail_file:
                post.thumbnail = thumbnail_file
            post.save()

        else:
            data = json.loads(request.body)
            published_at = (data.get('published_at') or '').strip()
            if not published_at:
                return JsonResponse({'error': 'published_at is required'}, status=400)

            post = NewsPost.objects.create(
                title         = data['title'],
                tag           = data.get('tag', 'announcement'),
                description   = data['description'],
                thumbnail_url = data.get('thumbnail_url', ''),
                published_at  = published_at,
                is_published  = data.get('is_published', True),
            )

        return JsonResponse(post.to_dict(), status=201)

    except KeyError as e:
        return JsonResponse({'error': f'Missing field: {e}'}, status=400)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@login_required
@require_http_methods(['PUT', 'PATCH'])
def update_news(request, pk):
    """
    Staff only — update a news post.
    django-cleanup automatically deletes old thumbnail from CDN when field changes.
    """
    try:
        post = NewsPost.objects.get(pk=pk)

        if request.content_type and 'multipart' in request.content_type:
            from django.http.multipartparser import MultiPartParser
            parser = MultiPartParser(request.META, request, request.upload_handlers)
            post_data, files = parser.parse()

            data           = post_data
            thumbnail_file = files.get('thumbnail')

            # Update scalar fields
            for field in ['title', 'tag', 'description', 'published_at']:
                if field in data:
                    value = data[field].strip() if field == 'published_at' else data[field]
                    setattr(post, field, value)

            if 'is_published' in data:
                post.is_published = data['is_published'].lower() != 'false'

            # ── Thumbnail ─────────────────────────────────────────────────────
            # django-cleanup detects the field change on save() and deletes old file
            if thumbnail_file:
                post.thumbnail     = thumbnail_file
                post.thumbnail_url = ''
            elif 'thumbnail_url' in data:
                post.thumbnail     = None  # Setting to None triggers cleanup of old file
                post.thumbnail_url = data['thumbnail_url']

        else:
            # JSON payload
            data = json.loads(request.body)
            for field in ['title', 'tag', 'description', 'thumbnail_url', 'published_at', 'is_published']:
                if field in data:
                    setattr(post, field, data[field])

        post.save()  # django-cleanup's pre_save signal fires here
        return JsonResponse(post.to_dict())

    except NewsPost.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@login_required
@require_http_methods(['DELETE'])
def delete_news(request, pk):
    """
    Staff only — delete a news post.
    django-cleanup automatically removes thumbnail from CDN via post_delete signal.
    """
    try:
        NewsPost.objects.get(pk=pk).delete()
        return JsonResponse({'success': True})
    except NewsPost.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)