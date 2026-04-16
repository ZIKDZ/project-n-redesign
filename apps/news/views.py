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
    """Staff only — create a news post."""
    try:
        data = json.loads(request.body)
        post = NewsPost.objects.create(
            title=data['title'],
            tag=data.get('tag', 'announcement'),
            description=data['description'],
            thumbnail_url=data.get('thumbnail_url', ''),
            published_at=data['published_at'],
            is_published=data.get('is_published', True),
        )
        return JsonResponse(post.to_dict(), status=201)
    except (KeyError, json.JSONDecodeError) as e:
        return JsonResponse({'error': str(e)}, status=400)


@login_required
@require_http_methods(['PUT', 'PATCH'])
def update_news(request, pk):
    """Staff only — update a news post."""
    try:
        post = NewsPost.objects.get(pk=pk)
        data = json.loads(request.body)
        for field in ['title', 'tag', 'description', 'thumbnail_url', 'published_at', 'is_published']:
            if field in data:
                setattr(post, field, data[field])
        post.save()
        return JsonResponse(post.to_dict())
    except NewsPost.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)


@login_required
@require_http_methods(['DELETE'])
def delete_news(request, pk):
    """Staff only — delete a news post."""
    try:
        NewsPost.objects.get(pk=pk).delete()
        return JsonResponse({'success': True})
    except NewsPost.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
