import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { players as playersApi } from "../utils/api";
import { asset } from "../utils/asset";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Clip {
  id: number;
  title: string;
  description?: string;
  video_url: string;        // Cloudinary secure_url
  display_order: number;
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
  clips: Clip[];            // now PlayerClip objects
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
  rocket_league: { accent: "#60b8ff", glow: "rgba(96,184,255,0.3)",  overlay: "rgba(0,48,135,0.4)" },
  valorant:      { accent: "#ff7080", glow: "rgba(255,112,128,0.3)", overlay: "rgba(255,70,85,0.3)" },
  fortnite:      { accent: "#ffd700", glow: "rgba(255,215,0,0.3)",   overlay: "rgba(100,60,200,0.35)" },
};

const ROLE_LABELS: Record<string, string> = {
  player:          "Player",
  captain:         "Captain",
  coach:           "Coach",
  substitute:      "Substitute",
  content_creator: "Content Creator",
};

const ROLE_ICONS: Record<string, string> = {
  captain:         "👑",
  coach:           "🎯",
  content_creator: "🎬",
  substitute:      "🔄",
  player:          "⚡",
};

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

function ClipCard({
  clip,
  accent,
  index,
}: {
  clip: Clip;
  accent: string;
  index: number;
}) {
  const [playing, setPlaying]       = useState(false);
  const [hovered, setHovered]       = useState(false);
  const [muted, setMuted]           = useState(true);
  const [progress, setProgress]     = useState(0);
  const [duration, setDuration]     = useState(0);
  const [posterError, setPosterError] = useState(false);
  const videoRef                    = useRef<HTMLVideoElement>(null);

  // 🔥 FIXED Cloudinary poster logic (more reliable)
  const posterUrl = (() => {
    if (!clip.video_url) return "";

    try {
      // Only transform if it's a Cloudinary URL
      if (clip.video_url.includes("/upload/")) {
        return clip.video_url
          .replace("/upload/", "/upload/so_0,w_800,f_jpg/")
          .replace(/\.(mp4|mov|webm|mkv)(\?.*)?$/i, "");
      }
    } catch {}

    return "";
  })();

  const handlePlayPause = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const handleFullscreen = () => {
    const v = videoRef.current;
    if (!v) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      v.requestFullscreen();
    }
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress((v.currentTime / v.duration) * 100);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    v.currentTime = ratio * v.duration;
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

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
          boxShadow: hovered ? "0 16px 48px rgba(0,0,0,0.6)" : "0 4px 20px rgba(0,0,0,0.3)",
          background: "#0a0015",
        }}
      >
        {/* Video */}
        <div className="relative" style={{ paddingBottom: "56.25%" }}>
          <div className="absolute inset-0">
            <video
              ref={videoRef}
              src={clip.video_url}
              poster={!posterError ? posterUrl : undefined}
              muted={muted}
              playsInline
              preload="metadata"
              className="w-full h-full object-cover"
              onError={() => setPosterError(true)}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
              onEnded={() => setPlaying(false)}
            />

            {/* fallback gradient if no poster */}
            {!playing && !posterUrl && (
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.2))",
                }}
              />
            )}

            {/* Play button */}
            <button
              onClick={handlePlayPause}
              className="absolute inset-0 flex items-center justify-center transition-opacity duration-200 cursor-pointer"
              style={{ opacity: playing && !hovered ? 0 : 1 }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center transition-transform duration-200"
                style={{
                  background: `${accent}cc`,
                  boxShadow: `0 0 30px ${accent}80`,
                  transform: hovered ? "scale(1.1)" : "scale(1)",
                }}
              >
                {playing ? (
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </div>
            </button>

            {/* Controls */}
            <div className="absolute top-3 right-3 flex gap-2">
              {/* Mute */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMuted((m) => {
                    if (videoRef.current) videoRef.current.muted = !m;
                    return !m;
                  });
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-opacity duration-200"
                style={{
                  background: "rgba(0,0,0,0.60)",
                  opacity: hovered || playing ? 1 : 0,
                }}
              >
                <svg className="w-4 h-4 text-white/70" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3z" />
                </svg>
              </button>

              {/* Fullscreen */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleFullscreen();
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-opacity duration-200"
                style={{
                  background: "rgba(0,0,0,0.60)",
                  opacity: hovered || playing ? 1 : 0,
                }}
              >
                <svg className="w-4 h-4 text-white/70" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 14H5v5h5v-2H7v-3zm12 5v-5h-2v3h-3v2h5zM7 7h3V5H5v5h2V7zm10 3h2V5h-5v2h3v3z" />
                </svg>
              </button>
            </div>

            {/* Progress */}
            {(playing || hovered) && (
              <div className="absolute bottom-0 left-0 right-0 px-3 pb-2">
                <div className="flex justify-between text-[10px] text-white/50 mb-1 font-mono">
                  <span>{formatTime((progress / 100) * duration)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <div
                  className="h-1 rounded-full cursor-pointer overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.15)" }}
                  onClick={handleSeek}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${progress}%`, background: accent }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="px-4 py-3" style={{ background: "rgba(10,0,20,0.95)" }}>
          <h4 className="text-white font-black text-sm uppercase leading-tight line-clamp-1">
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
      style={{ background: `${accent}0f`, borderColor: `${accent}30` }}
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
function SocialBtn({
  href,
  icon,
  label,
  accent,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  accent: string;
}) {
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
        background:    h ? `${accent}20` : "rgba(255,255,255,0.05)",
        borderColor:   h ? `${accent}50` : "rgba(255,255,255,0.10)",
        color:         h ? accent : "rgba(255,255,255,0.5)",
        transform:     h ? "translateY(-2px)" : "none",
      }}
    >
      {icon}
      {label}
    </a>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PlayerPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [player,      setPlayer]      = useState<PlayerData | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [scrolled,    setScrolled]    = useState(false);
  const [avatarLoaded,setAvatarLoaded]= useState(false);
  const [revealed,    setRevealed]    = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    (playersApi.get(Number(id)) as Promise<any>)
      .then((data) => {
        // Sort clips by display_order so they always render correctly
        if (Array.isArray(data.clips)) {
          data.clips.sort(
            (a: Clip, b: Clip) => a.display_order - b.display_order
          );
        }
        setPlayer(data);
        setTimeout(() => setRevealed(true), 80);
      })
      .catch(() => navigate("/", { replace: true }))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0014] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
            <div
              className="absolute inset-2 rounded-full border-2 border-violet-700 border-t-transparent animate-spin"
              style={{ animationDirection: "reverse", animationDuration: "0.7s" }}
            />
          </div>
          <p className="text-white/30 text-xs tracking-widest uppercase">Loading Profile…</p>
        </div>
      </div>
    );
  }

  if (!player) return null;

  const colors = GAME_COLORS[player.game] ?? {
    accent:  "#a855f7",
    glow:    "rgba(168,85,247,0.3)",
    overlay: "rgba(80,0,160,0.35)",
  };
  const { accent, glow } = colors;

  const joinYear = (() => {
    try { return new Date(player.joined_at).getFullYear(); } catch { return "—"; }
  })();

  const socials = [
    player.twitter_url   && { href: player.twitter_url,   icon: <TwitterIcon />,   label: "Twitter / X" },
    player.instagram_url && { href: player.instagram_url, icon: <InstagramIcon />, label: "Instagram" },
    player.twitch_url    && { href: player.twitch_url,    icon: <TwitchIcon />,    label: "Twitch" },
    player.kick_url      && { href: player.kick_url,      icon: <KickIcon />,      label: "Kick" },
    player.tiktok_url    && { href: player.tiktok_url,    icon: <TikTokIcon />,    label: "TikTok" },
  ].filter(Boolean) as { href: string; icon: React.ReactNode; label: string }[];

  const hasClips = Array.isArray(player.clips) && player.clips.length > 0;

  return (
    <div
      className="min-h-screen bg-[#0d0014] text-white overflow-x-hidden"
      style={{ fontFamily: "'Barlow', sans-serif" }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* ── Navbar ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background:    scrolled ? "rgba(13,0,20,0.95)" : "transparent",
          backdropFilter:scrolled ? "blur(14px)"         : "none",
          boxShadow:     scrolled ? "0 1px 0 rgba(255,255,255,0.06)" : "none",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-xs font-bold tracking-wider uppercase group cursor-pointer"
          >
            <svg
              className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="h-4 w-px bg-white/15" />
          <img
            src={asset("images/logo.svg")}
            alt="NBL"
            width={24}
            style={{ filter: "brightness(0) invert(1)", opacity: 0.6 }}
          />
          <span
            className="text-white/40 text-xs font-black tracking-widest uppercase hidden sm:block"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            NBL<span style={{ color: accent }}>ESPORT</span>
          </span>
          <div className="ml-auto">
            <span
              className="text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full"
              style={{
                background: `${accent}20`,
                color: accent,
                border: `1px solid ${accent}35`,
              }}
            >
              {player.game_title}
            </span>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
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
            opacity:    revealed ? 1 : 0,
            transform:  revealed ? "none" : "translateY(20px)",
            transition: "opacity 0.7s ease-out, transform 0.7s ease-out",
          }}
        >
          <div className="flex flex-col md:flex-row items-start gap-10">

            {/* Avatar */}
            <div className="shrink-0">
              <div className="relative" style={{ width: 260, height: 260 }}>
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
                <div
                  className="absolute inset-0 rounded-3xl overflow-hidden"
                  style={{ boxShadow: `0 0 80px ${glow}, 0 0 30px ${glow}` }}
                >
                  {player.avatar ? (
                    <img
                      src={player.avatar}
                      alt={player.username}
                      className="w-full h-full object-cover"
                      style={{
                        opacity:    avatarLoaded ? 1 : 0,
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
                    background:   "rgba(13,0,20,0.95)",
                    borderColor:  `${accent}50`,
                    color:        accent,
                    backdropFilter: "blur(8px)",
                    boxShadow:    "0 4px 20px rgba(0,0,0,0.5)",
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

            {/* Info */}
            <div className="flex-1 min-w-0 pt-2">
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

              {player.ingame_username !== player.username && (
                <p
                  className="text-white/35 text-sm font-mono mb-4"
                  style={{ animation: "slideUp 0.5s ease-out both", animationDelay: "0.1s" }}
                >
                  {player.ingame_username}
                </p>
              )}

              <div
                className="flex flex-wrap items-center gap-2 mb-6"
                style={{ animation: "slideUp 0.5s ease-out both", animationDelay: "0.15s" }}
              >
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full"
                  style={{
                    background: `${accent}18`,
                    color:       accent,
                    border:     `1px solid ${accent}40`,
                    boxShadow:  `0 0 12px ${glow}`,
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

              {player.bio && (
                <p
                  className="text-white font-bold text-lg leading-relaxed max-w-2xl mb-6"
                  style={{
                    animation:      "slideUp 0.5s ease-out both",
                    animationDelay: "0.2s",
                    textShadow:     `0 0 20px ${glow}`,
                    letterSpacing:  "0.01em",
                  }}
                >
                  {player.bio}
                </p>
              )}

              <div
                className="flex flex-wrap gap-3 mb-6"
                style={{ animation: "slideUp 0.5s ease-out both", animationDelay: "0.25s" }}
              >
                {player.rank && <StatPill label="Rank"  value={player.rank}                          accent={accent} />}
                <StatPill label="Role"  value={ROLE_LABELS[player.role] || player.role} accent={accent} />
                <StatPill label="Since" value={String(joinYear)}                         accent={accent} />
                {hasClips && (
                  <StatPill label="Clips" value={String(player.clips.length)}            accent={accent} />
                )}
              </div>

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

        <div
          className="absolute bottom-0 left-0 right-0 h-24"
          style={{ background: "linear-gradient(to bottom, transparent, #0d0014)" }}
        />
      </div>

      {/* ── Highlights / Clips ── */}
      {hasClips && (
        <section className="py-16">
          <div className="max-w-6xl mx-auto px-6">
            {/* Section header */}
            <div className="flex items-center gap-4 mb-10">
              <div
                className="h-px flex-1"
                style={{ background: `linear-gradient(to right, ${accent}50, transparent)` }}
              />
              <div className="flex items-center gap-3">
                {/* Video camera icon — neutral, no longer YouTube-specific */}
                <svg
                  className="w-5 h-5"
                  style={{ color: accent }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
                <h2
                  className="text-white font-black text-2xl uppercase tracking-wide"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  Highlights
                </h2>
              </div>
              <div
                className="h-px flex-1"
                style={{ background: `linear-gradient(to left, ${accent}50, transparent)` }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {player.clips.map((clip, i) => (
                <ClipCard key={clip.id} clip={clip} accent={accent} index={i} />
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
              style={{ background: `${accent}08`, borderColor: `${accent}30` }}
              onClick={() => navigate(`/roster/${player.game}`)}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center font-black text-2xl border"
                style={{
                  background:  `${accent}18`,
                  borderColor: `${accent}35`,
                  color:        accent,
                  fontFamily:  "'Barlow Condensed', sans-serif",
                }}
              >
                {player.team[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <p
                  className="text-white font-black text-lg uppercase"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  {player.team}
                </p>
                <p className="text-white/35 text-xs">
                  {player.game_title} · {ROLE_LABELS[player.role]}
                </p>
              </div>
              <svg
                className="w-5 h-5 text-white/30 group-hover:text-white/70 group-hover:translate-x-1 transition-all"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
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
            <svg
              className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
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