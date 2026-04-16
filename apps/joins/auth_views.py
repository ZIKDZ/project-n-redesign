import json
from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt


@csrf_exempt
@require_http_methods(['POST'])
def login_view(request):
    try:
        data = json.loads(request.body)
        user = authenticate(
            request,
            username=data.get('username'),
            password=data.get('password'),
        )
        if user is not None and user.is_staff:
            login(request, user)
            return JsonResponse({
                'success': True,
                'user': {
                    'username': user.username,
                    'email': user.email,
                    'is_staff': user.is_staff,
                }
            })
        return JsonResponse({'error': 'Invalid credentials or not a staff member'}, status=401)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)


@require_http_methods(['POST'])
def logout_view(request):
    logout(request)
    return JsonResponse({'success': True})


@require_http_methods(['GET'])
def me_view(request):
    """React calls this on load to check if user is still logged in."""
    if request.user.is_authenticated and request.user.is_staff:
        return JsonResponse({
            'authenticated': True,
            'user': {
                'username': request.user.username,
                'email': request.user.email,
                'is_staff': request.user.is_staff,
            }
        })
    return JsonResponse({'authenticated': False}, status=401)
