"""
Thin wrapper around Discord's OAuth2 flow, used to verify a player's
identity before they can register for a tournament or manage a team.

Required env vars (see config/settings.py):
  DISCORD_CLIENT_ID
  DISCORD_CLIENT_SECRET
  DISCORD_REDIRECT_URI   e.g. https://nblesport.com/api/auth/discord/callback/

Set these up in the Discord Developer Portal (discord.com/developers/applications):
  - Create an application → OAuth2 → add the redirect URI above
  - Scopes needed: "identify" only (we never touch guilds/messages)
"""
import secrets
from urllib.parse import urlencode

import requests
from django.conf import settings

DISCORD_API_BASE = 'https://discord.com/api'
DISCORD_OAUTH_AUTHORIZE_URL = 'https://discord.com/oauth2/authorize'
DISCORD_OAUTH_TOKEN_URL = f'{DISCORD_API_BASE}/oauth2/token'
DISCORD_USER_URL = f'{DISCORD_API_BASE}/users/@me'


def generate_state():
    """Random token stored in session + sent to Discord, checked on callback (CSRF protection for the OAuth flow)."""
    return secrets.token_urlsafe(24)


def build_authorize_url(state):
    params = {
        'client_id': settings.DISCORD_CLIENT_ID,
        'redirect_uri': settings.DISCORD_REDIRECT_URI,
        'response_type': 'code',
        'scope': 'identify',
        'state': state,
        'prompt': 'none',
    }
    return f'{DISCORD_OAUTH_AUTHORIZE_URL}?{urlencode(params)}'


def exchange_code_for_token(code):
    data = {
        'client_id': settings.DISCORD_CLIENT_ID,
        'client_secret': settings.DISCORD_CLIENT_SECRET,
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': settings.DISCORD_REDIRECT_URI,
    }
    headers = {'Content-Type': 'application/x-www-form-urlencoded'}
    resp = requests.post(DISCORD_OAUTH_TOKEN_URL, data=data, headers=headers, timeout=10)
    resp.raise_for_status()
    return resp.json()


def fetch_discord_user(access_token):
    headers = {'Authorization': f'Bearer {access_token}'}
    resp = requests.get(DISCORD_USER_URL, headers=headers, timeout=10)
    resp.raise_for_status()
    return resp.json()


def avatar_url(discord_user):
    user_id = discord_user.get('id')
    avatar_hash = discord_user.get('avatar')
    if not avatar_hash:
        return ''
    ext = 'gif' if avatar_hash.startswith('a_') else 'png'
    return f'https://cdn.discordapp.com/avatars/{user_id}/{avatar_hash}.{ext}?size=128'


def display_username(discord_user):
    """Discord dropped discriminators for most accounts (username is unique now), but some legacy accounts still have one."""
    username = discord_user.get('username', 'unknown')
    discriminator = discord_user.get('discriminator')
    if discriminator and discriminator != '0':
        return f'{username}#{discriminator}'
    return username
