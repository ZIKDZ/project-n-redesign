import json
import re

from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.core.files.uploadedfile import InMemoryUploadedFile

from .discord_auth_views import get_current_player
from .models import Tournament, TournamentTeam, TournamentTeamMember, Participant, generate_invite_code

ACTIVE_EXCLUDE = ['withdrawn', 'disqualified']


def _get_tournament(slug):
    return Tournament.objects.filter(slug=slug).first()


def _active_solo_participant(player, tournament):
    return Participant.objects.filter(tournament=tournament, player=player).exclude(status__in=ACTIVE_EXCLUDE).first()


def _active_team_membership(player, tournament):
    """The player's TournamentTeamMember row within this tournament, if any."""
    return (
        TournamentTeamMember.objects
        .filter(player=player, team__tournament=tournament)
        .select_related('team')
        .first()
    )


def _validate_email(email):
    """Basic email validation."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def _validate_team_tag(tag):
    """Validate team tag: alphanumeric only, max 6 chars."""
    if not tag:
        return True  # Optional field
    if len(tag) > 6:
        return False
    return tag.isalnum()


# ── Status ────────────────────────────────────────────────────────────────────

@require_http_methods(['GET'])
def my_registration(request, slug):
    tournament = _get_tournament(slug)
    if not tournament:
        return JsonResponse({'error': 'Not found'}, status=404)

    player = get_current_player(request)
    if not player:
        return JsonResponse({'authenticated': False, 'registration': None})

    if tournament.format == 'solo':
        participant = _active_solo_participant(player, tournament)
        return JsonResponse({
            'authenticated': True,
            'registration': {'kind': 'solo', 'participant': participant.to_dict()} if participant else None,
        })

    membership = _active_team_membership(player, tournament)
    if not membership:
        return JsonResponse({'authenticated': True, 'registration': None})
    return JsonResponse({
        'authenticated': True,
        'registration': {
            'kind': 'team',
            'team': membership.team.to_dict(),
            'is_captain': membership.team.captain_id == player.id,
        },
    })


# ── Solo ──────────────────────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(['POST'])
def register_solo(request, slug):
    tournament = _get_tournament(slug)
    if not tournament:
        return JsonResponse({'error': 'Tournament not found'}, status=404)
    if tournament.format != 'solo':
        return JsonResponse({'error': 'This tournament requires a team.'}, status=400)
    if not tournament.registration_is_open():
        return JsonResponse({'error': 'Registration is not open.'}, status=400)

    player = get_current_player(request)
    if not player:
        return JsonResponse({'error': 'Sign in with Discord first.'}, status=401)

    if _active_solo_participant(player, tournament):
        return JsonResponse({'error': 'You are already registered.'}, status=400)

    if tournament.max_participants:
        current = tournament.participants.exclude(status__in=ACTIVE_EXCLUDE).count()
        if current >= tournament.max_participants:
            return JsonResponse({'error': 'Registration is full.'}, status=400)

    participant = Participant.objects.create(tournament=tournament, player=player)
    return JsonResponse(participant.to_dict(), status=201)


@csrf_exempt
@require_http_methods(['POST'])
def withdraw_solo(request, slug):
    tournament = _get_tournament(slug)
    if not tournament:
        return JsonResponse({'error': 'Tournament not found'}, status=404)

    player = get_current_player(request)
    if not player:
        return JsonResponse({'error': 'Sign in with Discord first.'}, status=401)

    participant = _active_solo_participant(player, tournament)
    if not participant:
        return JsonResponse({'error': 'You are not registered.'}, status=400)

    participant.status = 'withdrawn'
    participant.save()
    return JsonResponse({'success': True})


# ── Teams ─────────────────────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(['POST'])
def create_team(request, slug):
    tournament = _get_tournament(slug)
    if not tournament:
        return JsonResponse({'error': 'Tournament not found'}, status=404)
    if tournament.format != 'team':
        return JsonResponse({'error': 'This tournament does not use teams.'}, status=400)
    if not tournament.registration_is_open():
        return JsonResponse({'error': 'Registration is not open.'}, status=400)

    player = get_current_player(request)
    if not player:
        return JsonResponse({'error': 'Sign in with Discord first.'}, status=401)

    if _active_team_membership(player, tournament):
        return JsonResponse({'error': 'You are already on a team for this tournament.'}, status=400)

    # Handle multipart/form-data for file upload
    if request.content_type and 'multipart/form-data' in request.content_type:
        # Extract form fields
        name = (request.POST.get('name') or '').strip()
        tag = (request.POST.get('tag') or '').strip()
        full_name = (request.POST.get('full_name') or '').strip()
        email = (request.POST.get('email') or '').strip()
        in_game_tag = (request.POST.get('in_game_tag') or '').strip()
        logo = request.FILES.get('logo')
    else:
        # Fallback to JSON for backwards compatibility
        try:
            data = json.loads(request.body)
            name = (data.get('name') or '').strip()
            tag = (data.get('tag') or '').strip()
            full_name = (data.get('full_name') or '').strip()
            email = (data.get('email') or '').strip()
            in_game_tag = (data.get('in_game_tag') or '').strip()
            logo = None
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid request.'}, status=400)

    # Validate required fields
    if not name:
        return JsonResponse({'error': 'Team name is required.'}, status=400)
    
    if len(name) > 50:
        return JsonResponse({'error': 'Team name must be 50 characters or less.'}, status=400)

    if tag and not _validate_team_tag(tag):
        return JsonResponse({'error': 'Team tag must be alphanumeric and 6 characters or less.'}, status=400)

    if not full_name:
        return JsonResponse({'error': 'Full name is required.'}, status=400)

    if not email:
        return JsonResponse({'error': 'Email is required.'}, status=400)

    if not _validate_email(email):
        return JsonResponse({'error': 'Invalid email format.'}, status=400)

    if not in_game_tag:
        return JsonResponse({'error': 'In-game tag is required.'}, status=400)

    # Validate logo if provided
    if logo:
        # Check file size (max 2MB)
        if logo.size > 2 * 1024 * 1024:
            return JsonResponse({'error': 'Logo must be smaller than 2MB.'}, status=400)
        
        # Check file type
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        if logo.content_type not in allowed_types:
            return JsonResponse({'error': 'Logo must be an image (JPEG, PNG, GIF, or WebP).'}, status=400)

    if tournament.max_participants:
        current_teams = (
            Participant.objects
            .filter(tournament=tournament, team__isnull=False)
            .exclude(status__in=ACTIVE_EXCLUDE)
            .count()
        )
        if current_teams >= tournament.max_participants:
            return JsonResponse({'error': 'Registration is full.'}, status=400)

    with transaction.atomic():
        # Create team
        team = TournamentTeam.objects.create(
            tournament=tournament,
            name=name,
            tag=tag,
            captain=player,
        )
        
        # Save logo if provided
        if logo:
            team.logo = logo
            team.save()

        # Create team member with player info
        member = TournamentTeamMember.objects.create(
            team=team,
            player=player,
            full_name=full_name,
            email=email,
            in_game_tag=in_game_tag,
        )
        
        # Create participant entry
        Participant.objects.create(tournament=tournament, team=team)

    return JsonResponse(team.to_dict(), status=201)


@csrf_exempt
@require_http_methods(['POST'])
def join_team(request, slug):
    tournament = _get_tournament(slug)
    if not tournament:
        return JsonResponse({'error': 'Tournament not found'}, status=404)
    if tournament.format != 'team':
        return JsonResponse({'error': 'This tournament does not use teams.'}, status=400)
    if not tournament.registration_is_open():
        return JsonResponse({'error': 'Registration is not open.'}, status=400)

    player = get_current_player(request)
    if not player:
        return JsonResponse({'error': 'Sign in with Discord first.'}, status=401)

    if _active_team_membership(player, tournament):
        return JsonResponse({'error': 'You are already on a team for this tournament.'}, status=400)

    try:
        data = json.loads(request.body)
        code = (data.get('invite_code') or '').strip().upper()
        if not code:
            return JsonResponse({'error': 'Invite code is required.'}, status=400)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid request.'}, status=400)

    team = TournamentTeam.objects.filter(tournament=tournament, invite_code=code).first()
    if not team:
        return JsonResponse({'error': 'Invalid invite code.'}, status=404)

    if tournament.team_size and team.members.count() >= tournament.team_size:
        return JsonResponse({'error': 'This team is already full.'}, status=400)

    # When joining, we might want to collect player info too
    # For now, create member without extra info (can be added later if needed)
    TournamentTeamMember.objects.create(team=team, player=player)
    return JsonResponse(team.to_dict(), status=201)


@csrf_exempt
@require_http_methods(['POST'])
def leave_team(request, slug):
    tournament = _get_tournament(slug)
    if not tournament:
        return JsonResponse({'error': 'Tournament not found'}, status=404)

    player = get_current_player(request)
    if not player:
        return JsonResponse({'error': 'Sign in with Discord first.'}, status=401)

    membership = _active_team_membership(player, tournament)
    if not membership:
        return JsonResponse({'error': 'You are not on a team for this tournament.'}, status=400)

    if membership.team.captain_id == player.id:
        return JsonResponse(
            {'error': "Captains can't leave — kick everyone and contact staff to disband, or transfer captaincy first."},
            status=400,
        )

    membership.delete()
    return JsonResponse({'success': True})


@csrf_exempt
@require_http_methods(['POST'])
def regenerate_invite_code(request, slug):
    tournament = _get_tournament(slug)
    if not tournament:
        return JsonResponse({'error': 'Tournament not found'}, status=404)

    player = get_current_player(request)
    if not player:
        return JsonResponse({'error': 'Sign in with Discord first.'}, status=401)

    membership = _active_team_membership(player, tournament)
    if not membership or membership.team.captain_id != player.id:
        return JsonResponse({'error': 'Only the team captain can do that.'}, status=403)

    membership.team.invite_code = generate_invite_code()
    membership.team.save()
    return JsonResponse(membership.team.to_dict())


@csrf_exempt
@require_http_methods(['POST'])
def kick_member(request, slug):
    tournament = _get_tournament(slug)
    if not tournament:
        return JsonResponse({'error': 'Tournament not found'}, status=404)

    player = get_current_player(request)
    if not player:
        return JsonResponse({'error': 'Sign in with Discord first.'}, status=401)

    membership = _active_team_membership(player, tournament)
    if not membership or membership.team.captain_id != player.id:
        return JsonResponse({'error': 'Only the team captain can do that.'}, status=403)

    try:
        data = json.loads(request.body)
        target_id = int(data['player_id'])
    except (KeyError, ValueError, json.JSONDecodeError):
        return JsonResponse({'error': 'player_id is required.'}, status=400)

    if target_id == player.id:
        return JsonResponse({'error': "Captains can't kick themselves."}, status=400)

    deleted, _ = TournamentTeamMember.objects.filter(team=membership.team, player_id=target_id).delete()
    if not deleted:
        return JsonResponse({'error': 'That player is not on your team.'}, status=404)

    return JsonResponse(membership.team.to_dict())


@csrf_exempt
@require_http_methods(['POST'])
def transfer_captain(request, slug):
    tournament = _get_tournament(slug)
    if not tournament:
        return JsonResponse({'error': 'Tournament not found'}, status=404)

    player = get_current_player(request)
    if not player:
        return JsonResponse({'error': 'Sign in with Discord first.'}, status=401)

    membership = _active_team_membership(player, tournament)
    if not membership or membership.team.captain_id != player.id:
        return JsonResponse({'error': 'Only the team captain can do that.'}, status=403)

    try:
        data = json.loads(request.body)
        target_id = int(data['player_id'])
    except (KeyError, ValueError, json.JSONDecodeError):
        return JsonResponse({'error': 'player_id is required.'}, status=400)

    if target_id == player.id:
        return JsonResponse({'error': 'You are already captain.'}, status=400)

    if not TournamentTeamMember.objects.filter(team=membership.team, player_id=target_id).exists():
        return JsonResponse({'error': 'That player is not on your team.'}, status=404)

    membership.team.captain_id = target_id
    membership.team.save()
    return JsonResponse(membership.team.to_dict())


@csrf_exempt
@require_http_methods(['POST'])
def disband_team(request, slug):
    tournament = _get_tournament(slug)
    if not tournament:
        return JsonResponse({'error': 'Tournament not found'}, status=404)

    player = get_current_player(request)
    if not player:
        return JsonResponse({'error': 'Sign in with Discord first.'}, status=401)

    membership = _active_team_membership(player, tournament)
    if not membership or membership.team.captain_id != player.id:
        return JsonResponse({'error': 'Only the team captain can do that.'}, status=403)

    team = membership.team
    # Participant.team uses SET_NULL, so it won't clean itself up — delete it
    # explicitly or you get an orphaned registered-but-teamless Participant row.
    Participant.objects.filter(tournament=tournament, team=team).delete()
    team.delete()  # cascades TournamentTeamMember rows
    return JsonResponse({'success': True})