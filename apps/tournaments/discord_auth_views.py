from django.http import JsonResponse, HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from . import discord_service
from .models import TournamentPlayer

# Session key storing the logged-in TournamentPlayer's id. Deliberately
# separate from Django's staff `request.user` / `auth.login()` — these are
# two unrelated identity systems (staff dashboard vs public Discord login).
SESSION_KEY = 'tournament_player_id'


@require_http_methods(['GET'])
def discord_login(request):
    """
    Redirects the browser to Discord's OAuth consent screen.
    ?next=/tournaments/<slug> is remembered so the callback can send the
    player back to the page they started registering from.
    """
    state = discord_service.generate_state()
    request.session['discord_oauth_state'] = state
    request.session['discord_oauth_next'] = request.GET.get('next', '/')
    return HttpResponseRedirect(discord_service.build_authorize_url(state))


@require_http_methods(['GET'])
def discord_callback(request):
    code = request.GET.get('code')
    state = request.GET.get('state')
    expected_state = request.session.get('discord_oauth_state')
    next_path = request.session.pop('discord_oauth_next', '/')

    if not code or not state or state != expected_state:
        return HttpResponseRedirect(f'{next_path}?discord_error=invalid_state')

    try:
        token_data = discord_service.exchange_code_for_token(code)
        discord_user = discord_service.fetch_discord_user(token_data['access_token'])
    except Exception:
        return HttpResponseRedirect(f'{next_path}?discord_error=oauth_failed')

    player, _ = TournamentPlayer.objects.update_or_create(
        discord_id=discord_user['id'],
        defaults={
            'discord_username': discord_service.display_username(discord_user),
            'discord_avatar': discord_service.avatar_url(discord_user),
        },
    )

    request.session[SESSION_KEY] = player.id
    return HttpResponseRedirect(next_path)


@require_http_methods(['GET'])
def discord_me(request):
    player = get_current_player(request)
    if not player:
        return JsonResponse({'authenticated': False})
    return JsonResponse({'authenticated': True, 'player': player.to_dict()})


@csrf_exempt
@require_http_methods(['POST'])
def discord_logout(request):
    request.session.pop(SESSION_KEY, None)
    return JsonResponse({'success': True})


def get_current_player(request):
    """Shared helper for other tournament views: returns the logged-in TournamentPlayer or None."""
    player_id = request.session.get(SESSION_KEY)
    if not player_id:
        return None
    player = TournamentPlayer.objects.filter(pk=player_id).first()
    if not player:
        request.session.pop(SESSION_KEY, None)
    return player