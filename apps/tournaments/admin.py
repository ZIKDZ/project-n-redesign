from django.contrib import admin
from .models import (
    Tournament, Placement, TournamentPlayer,
    TournamentTeam, TournamentTeamMember, Participant, Match,
)


class PlacementInline(admin.TabularInline):
    model = Placement
    extra = 1


@admin.register(Tournament)
class TournamentAdmin(admin.ModelAdmin):
    list_display = ('name', 'game', 'format', 'bracket_type', 'status', 'registration_deadline', 'start_date')
    list_filter = ('status', 'format', 'game')
    search_fields = ('name', 'slug')
    inlines = [PlacementInline]


@admin.register(TournamentPlayer)
class TournamentPlayerAdmin(admin.ModelAdmin):
    list_display = ('discord_username', 'discord_id', 'created_at')
    search_fields = ('discord_username', 'discord_id')


class TournamentTeamMemberInline(admin.TabularInline):
    model = TournamentTeamMember
    extra = 0
    raw_id_fields = ('player',)


@admin.register(TournamentTeam)
class TournamentTeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'tournament', 'tag', 'captain', 'invite_code')
    search_fields = ('name', 'tag', 'invite_code')
    raw_id_fields = ('tournament', 'captain')
    inlines = [TournamentTeamMemberInline]


@admin.register(Participant)
class ParticipantAdmin(admin.ModelAdmin):
    list_display = ('display_name', 'tournament', 'status', 'seed', 'registered_at')
    list_filter = ('status', 'tournament')
    raw_id_fields = ('tournament', 'player', 'team')


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = ('tournament', 'round_number', 'position', 'participant_a', 'participant_b', 'status')
    list_filter = ('status', 'tournament')
    raw_id_fields = ('tournament', 'participant_a', 'participant_b', 'winner', 'next_match')