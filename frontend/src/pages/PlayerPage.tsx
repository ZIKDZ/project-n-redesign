import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { players as playersApi } from "../utils/api";
import { asset } from "../utils/asset";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Clip {
  title: string;
  youtube_url: string;
  description?: string;
}

interface PlayerData {
  id: number;
  username: string;
  ingame_username: string;
  avatar: string;
  bio: string;
  game: string;
  game_id: number | null;
  game_title: string;
  role: string;
  rank: string;
  status: string;
  team: string | null;
  team_id: number | null;
  clips: Clip[];
  discord_username: string;
  twitter_url: string;
  instagram_url: string;
  twitch_url: string;
  kick_url: string;
  tiktok_url: string;
  first_name: string;
  last_name: string;
  joined_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const GAME_COLORS: Record<string, { accent: string; glow: string; overlay: string }> = {
  rocket_league: { accent: "#60b8ff", glow: "rgba(96,184,255,0.3)", overlay: "rgba(0,48,135,0.4)" },
  valorant:      { accent: "#ff7080", glow: "rgba(255,112,128,0.3)", overlay: "rgba(255,70,85,0.3)" },
  fortnite:      { accent: "#ffd700", glow: "rgba(255,215,0,0.3)",  overlay: "rgba(100,60,200,0.35)" },
};

const ROLE_LABELS: Record<string, string> = {
  player: "Player",
  captain: "Captain",
  coach: "Coach",
  substitute: "Substitute",
  content_creator: "Content Creator",
};

const ROLE_ICONS: Record<string, string> = {
  captain: "👑",
  coach: "🎯",
  content_creator: "🎬",
  substitute: "🔄",
  player: "⚡",
};

function getYouTubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function getYouTubeThumbnail(url: string): string {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : "";
}

function getYouTubeEmbedUrl(url: string): string {
  const id = getYouTubeId(url);
  if (!id) return url;
  const origin = encodeURIComponent(window.location.origin);
  return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&origin=${origin}`;
}

// ── Social Icons ──────────────────────────────────────────────────────────────
function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TwitchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
    </svg>
  );
}

function KickIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M2 2h4v7l5-7h5l-6 8 6 8h-5l-5-7v7H2V2z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.78a4.85 4.85 0 0 1-1.01-.09z" />
    </svg>
  );
}

// ── YouTube Clip Card ─────────────────────────────────────────────────────────
function ClipCard({ clip, accent, index }: { clip: Clip; accent: string; index: number }) {
  const [playing, setPlaying] = useState(false);
  const [thumbError, setThumbError] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const thumbnail = getYouTubeThumbnail(clip.youtube_url);
  const embedUrl = getYouTubeEmbedUrl(clip.youtube_url);

  return (
    <div
      className="group relative"
      style={{
        animation: `slideUp 0.5s ease-out both`,
        animationDelay: `${index * 80}ms`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="rounded-2xl overflow-hidden transition-all duration-300"
        style={{
          border: `1px solid ${hovered ? `${accent}40` : "rgba(255,255,255,0.07)"}`,
          transform: hovered ? "translateY(-3px)" : "none",
          boxShadow: hovered
            ? `0 16px 48px rgba(0,0,0,0.6)`
            : "0 4px 20px rgba(0,0,0,0.3)",
          background: "#0a0015",
        }}
      >
        {/* Video frame */}
        <div
          className="relative cursor-pointer"
          style={{ paddingBottom: "56.25%" }}
          onClick={() => !playing && !iframeError && setPlaying(true)}
        >
          {playing && !iframeError ? (
            <iframe
              src={embedUrl}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              sandbox="allow-same-origin allow-scripts allow-popups allow-presentation allow-forms"
              referrerPolicy="no-referrer"
              title={clip.title}
              onError={() => {
                console.error("YouTube iframe error for:", clip.youtube_url);
                setIframeError(true);
              }}
            />
          ) : (
            <>
              {/* Thumbnail */}
              <div className="absolute inset-0 overflow-hidden">
                {thumbnail && !thumbError ? (
                  <img
                    src={thumbnail}
                    alt={clip.title}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out"
                    style={{ transform: hovered ? "scale(1.04)" : "scale(1)" }}
                    onError={() => setThumbError(true)}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: `${accent}10` }}
                  >
                    <svg
                      className="w-12 h-12"
                      style={{ color: `${accent}40` }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Gradient */}
              <div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 50%)",
                }}
              />

              {/* YouTube badge */}
              <div
                className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md px-2 py-1"
                style={{ background: "rgba(0,0,0,0.70)", backdropFilter: "blur(4px)" }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-red-500 shrink-0">
                  <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" />
                </svg>
                <span className="text-white/60 text-[9px] font-bold tracking-wider uppercase">YouTube</span>
              </div>

              {/* Error message if iframe failed */}
              {iframeError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                  <div className="text-center">
                    <p className="text-white/60 text-sm mb-2">Video unavailable</p>
                    <a
                      href={clip.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700"
                    >
                      Watch on YouTube
                    </a>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Info bar */}
        <div className="px-4 py-3" style={{ background: "rgba(10,0,20,0.95)" }}>
          <h4
            className="text-white font-black text-sm uppercase leading-tight line-clamp-1"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {clip.title}
          </h4>
          {clip.description && (
            <p className="text-white/35 text-xs mt-1 leading-relaxed line-clamp-2">
              {clip.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Stat Pill ─────────────────────────────────────────────────────────────────
function StatPill({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div
      className="flex flex-col items-center px-5 py-3 rounded-2xl border"
      style={{
        background: `${accent}0f`,
        borderColor: `${accent}30`,
      }}
    >
      <span className="text-white/30 text-[10px] font-bold tracking-widest uppercase mb-1">{label}</span>
      <span
        className="text-white font-black text-lg uppercase leading-none"
        style={{ fontFamily: "'Barlow Condensed', sans-serif", color: accent }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Social Button ─────────────────────────────────────────────────────────────
function SocialBtn({ href, icon, label, accent }: { href: string; icon: React.ReactNode; label: string; accent: string }) {
  const [h, setH] = useState(false);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer"
      style={{
        background: h ? `${accent}20` : "rgba(255,255,255,0.05)",
        borderColor: h ? `${accent}50` : "rgba(255,255,255,0.10)",
        color: h ? accent : "rgba(255,255,255,0.5)",
        transform: h ? "translateY(-2px)" : "none",
      }}
    >
      {icon}
      {label}
    </a>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PlayerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    (playersApi.get(Number(id)) as Promise<any>)
      .then(data => {
        setPlayer(data);
        setTimeout(() => setRevealed(true), 80);
      })
      .catch(() => navigate("/", { replace: true }))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0014] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
            <div className="absolute inset-2 rounded-full border-2 border-violet-700 border-t-transparent animate-spin" style={{ animationDirection: "reverse", animationDuration: "0.7s" }} />
          </div>
          <p className="text-white/30 text-xs tracking-widest uppercase">Loading Profile…</p>
        </div>
      </div>
    );
  }

  if (!player) return null;

  const colors = GAME_COLORS[player.game] || { accent: "#a855f7", glow: "rgba(168,85,247,0.3)", overlay: "rgba(80,0,160,0.35)" };
  const { accent, glow } = colors;

  const joinYear = (() => {
    try { return new Date(player.joined_at).getFullYear(); } catch { return "—"; }
  })();

  const socials = [
    player.twitter_url && { href: player.twitter_url, icon: <TwitterIcon />, label: "Twitter / X" },
    player.instagram_url && { href: player.instagram_url, icon: <InstagramIcon />, label: "Instagram" },
    player.twitch_url && { href: player.twitch_url, icon: <TwitchIcon />, label: "Twitch" },
    player.kick_url && { href: player.kick_url, icon: <KickIcon />, label: "Kick" },
    player.tiktok_url && { href: player.tiktok_url, icon: <TikTokIcon />, label: "TikTok" },
  ].filter(Boolean) as { href: string; icon: React.ReactNode; label: string }[];

  return (
    <div
      className="min-h-screen bg-[#0d0014] text-white overflow-x-hidden"
      style={{ fontFamily: "'Barlow', sans-serif" }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pulseRing {
          0% { box-shadow: 0 0 0 0 var(--ring-color); }
          70% { box-shadow: 0 0 0 10px transparent; }
          100% { box-shadow: 0 0 0 0 transparent; }
        }
      `}</style>

      {/* ── Navbar ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(13,0,20,0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(14px)" : "none",
          boxShadow: scrolled ? `0 1px 0 rgba(255,255,255,0.06)` : "none",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-xs font-bold tracking-wider uppercase group cursor-pointer"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="h-4 w-px bg-white/15" />
          <img src={asset("images/logo.svg")} alt="NBL" width={24} style={{ filter: "brightness(0) invert(1)", opacity: 0.6 }} />
          <span
            className="text-white/40 text-xs font-black tracking-widest uppercase hidden sm:block"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            NBL<span style={{ color: accent }}>ESPORT</span>
          </span>
          <div className="ml-auto">
            <span
              className="text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full"
              style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}35` }}
            >
              {player.game_title}
            </span>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <div className="relative" style={{ minHeight: "560px" }}>
        {/* Background atmosphere */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, rgba(13,0,20,1) 0%, rgba(20,0,40,1) 100%)" }}
          />
          <div
            className="absolute"
            style={{
              top: "-10%", right: "-5%",
              width: "60%", height: "80%",
              background: `radial-gradient(ellipse, ${glow} 0%, transparent 65%)`,
              opacity: 0.6,
            }}
          />
          <div
            className="absolute"
            style={{
              bottom: "0", left: "30%",
              width: "40%", height: "50%",
              background: `radial-gradient(ellipse, ${glow} 0%, transparent 70%)`,
              opacity: 0.25,
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(${accent} 1px, transparent 1px), linear-gradient(90deg, ${accent} 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div
          className="relative z-10 max-w-6xl mx-auto px-6 pt-28 pb-16"
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? "none" : "translateY(20px)",
            transition: "opacity 0.7s ease-out, transform 0.7s ease-out",
          }}
        >
          <div className="flex flex-col md:flex-row items-start gap-10">

            {/* ── Avatar ── */}
            <div className="shrink-0">
              <div className="relative" style={{ width: 260, height: 260 }}>
                {/* Outer glow ring */}
                <div
                  className="absolute rounded-3xl"
                  style={{
                    inset: "-3px",
                    background: `linear-gradient(135deg, ${accent}60 0%, ${accent}10 50%, ${accent}40 100%)`,
                    borderRadius: "26px",
                    animation: "scaleIn 0.6s ease-out both",
                    animationDelay: "0.1s",
                  }}
                />
                {/* Inner container */}
                <div
                  className="absolute inset-0 rounded-3xl overflow-hidden"
                  style={{
                    boxShadow: `0 0 80px ${glow}, 0 0 30px ${glow}`,
                  }}
                >
                  {player.avatar ? (
                    <img
                      src={player.avatar}
                      alt={player.username}
                      className="w-full h-full object-cover"
                      style={{
                        opacity: avatarLoaded ? 1 : 0,
                        transition: "opacity 0.4s ease",
                      }}
                      onLoad={() => setAvatarLoaded(true)}
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ background: `${accent}15` }}
                    >
                      <span
                        className="font-black text-8xl"
                        style={{ color: accent, fontFamily: "'Barlow Condensed', sans-serif" }}
                      >
                        {player.username[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Role badge */}
                <div
                  className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap px-4 py-1.5 rounded-xl border text-xs font-black tracking-widest uppercase"
                  style={{
                    background: "rgba(13,0,20,0.95)",
                    borderColor: `${accent}50`,
                    color: accent,
                    backdropFilter: "blur(8px)",
                    boxShadow: `0 4px 20px rgba(0,0,0,0.5)`,
                  }}
                >
                  {ROLE_ICONS[player.role] || "⚡"} {ROLE_LABELS[player.role] || player.role}
                </div>

                {/* Status dot */}
                {player.status === "active" && (
                  <div className="absolute -top-1.5 -right-1.5">
                    <span className="block w-4 h-4 rounded-full bg-green-400 border-2 border-[#0d0014] animate-pulse" />
                  </div>
                )}
              </div>
            </div>

            {/* ── Info ── */}
            <div className="flex-1 min-w-0 pt-2">
              {/* Username */}
              <div
                className="mb-2"
                style={{ animation: "slideUp 0.5s ease-out both", animationDelay: "0.05s" }}
              >
                <h1
                  className="font-black text-6xl md:text-8xl uppercase leading-none"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  <span className="text-white">{player.username}</span>
                </h1>
              </div>

              {/* Ingame name */}
              {player.ingame_username !== player.username && (
                <p
                  className="text-white/35 text-sm font-mono mb-4"
                  style={{ animation: "slideUp 0.5s ease-out both", animationDelay: "0.1s" }}
                >
                  {player.ingame_username}
                </p>
              )}

              {/* Game + team tags */}
              <div
                className="flex flex-wrap items-center gap-2 mb-6"
                style={{ animation: "slideUp 0.5s ease-out both", animationDelay: "0.15s" }}
              >
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full"
                  style={{
                    background: `${accent}18`,
                    color: accent,
                    border: `1px solid ${accent}40`,
                    boxShadow: `0 0 12px ${glow}`,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
                  {player.game_title}
                </span>
                {player.team && (
                  <span className="text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full bg-white/5 text-white/50 border border-white/10">
                    {player.team}
                  </span>
                )}
                {player.status !== "active" && (
                  <span className="text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">
                    {player.status}
                  </span>
                )}
              </div>

              {/* Bio */}
              {player.bio && (
                <p
                  className="text-white font-bold text-lg leading-relaxed max-w-2xl mb-6"
                  style={{ 
                    animation: "slideUp 0.5s ease-out both", 
                    animationDelay: "0.2s",
                    textShadow: `0 0 20px ${glow}`,
                    letterSpacing: "0.01em"
                  }}
                >
                  {player.bio}
                </p>
              )}

              {/* Stats row */}
              <div
                className="flex flex-wrap gap-3 mb-6"
                style={{ animation: "slideUp 0.5s ease-out both", animationDelay: "0.25s" }}
              >
                {player.rank && <StatPill label="Rank" value={player.rank} accent={accent} />}
                <StatPill label="Role" value={ROLE_LABELS[player.role] || player.role} accent={accent} />
                <StatPill label="Since" value={String(joinYear)} accent={accent} />
                {player.clips.length > 0 && (
                  <StatPill label="Clips" value={String(player.clips.length)} accent={accent} />
                )}
              </div>

              {/* Socials */}
              {socials.length > 0 && (
                <div
                  className="flex flex-wrap gap-2"
                  style={{ animation: "slideUp 0.5s ease-out both", animationDelay: "0.3s" }}
                >
                  {socials.map((s, i) => (
                    <SocialBtn key={i} {...s} accent={accent} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-24"
          style={{ background: "linear-gradient(to bottom, transparent, #0d0014)" }}
        />
      </div>

      {/* ── Highlights / Clips ── */}
      {player.clips.length > 0 && (
        <section className="py-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center gap-4 mb-10">
              <div className="h-px flex-1" style={{ background: `linear-gradient(to right, ${accent}50, transparent)` }} />
              <div className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-red-500">
                  <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" />
                </svg>
                <h2
                  className="text-white font-black text-2xl uppercase tracking-wide"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  Highlights
                </h2>
              </div>
              <div className="h-px flex-1" style={{ background: `linear-gradient(to left, ${accent}50, transparent)` }} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {player.clips.map((clip, i) => (
                <ClipCard key={i} clip={clip} accent={accent} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Team section ── */}
      {player.team && (
        <section className="py-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-px flex-1" style={{ background: `linear-gradient(to right, ${accent}50, transparent)` }} />
              <h2
                className="text-white font-black text-2xl uppercase tracking-wide"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                Roster
              </h2>
              <div className="h-px flex-1" style={{ background: `linear-gradient(to left, ${accent}50, transparent)` }} />
            </div>

            <div
              className="flex items-center gap-5 rounded-2xl border p-5 cursor-pointer group transition-all duration-300 hover:-translate-y-1"
              style={{
                background: `${accent}08`,
                borderColor: `${accent}30`,
              }}
              onClick={() => navigate(`/roster/${player.game}`)}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center font-black text-2xl border"
                style={{
                  background: `${accent}18`,
                  borderColor: `${accent}35`,
                  color: accent,
                  fontFamily: "'Barlow Condensed', sans-serif",
                }}
              >
                {player.team[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-white font-black text-lg uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {player.team}
                </p>
                <p className="text-white/35 text-xs">{player.game_title} · {ROLE_LABELS[player.role]}</p>
              </div>
              <svg className="w-5 h-5 text-white/30 group-hover:text-white/70 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </div>
          </div>
        </section>
      )}

      {/* ── Footer ── */}
      <footer className="border-t border-white/8 py-10 mt-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between flex-wrap gap-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-white/30 hover:text-white text-sm font-bold tracking-wider uppercase transition-colors group cursor-pointer"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to NBLEsport
          </button>
          <span
            className="font-black text-sm uppercase tracking-widest"
            style={{ color: accent, fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            NBL<span className="text-white">ESPORT</span>
          </span>
        </div>
      </footer>
    </div>
  );
}