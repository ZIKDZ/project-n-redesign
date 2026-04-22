import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { teams as teamsApi, games as gamesApi } from "../utils/api";
import { asset } from '../utils/asset'

// ── Types ─────────────────────────────────────────────────────────────────────
interface PlayerData {
  id: number;
  username: string;
  ingame_username: string;
  avatar: string;
  bio: string;
  game: string;
  game_title: string;
  role: string;
  rank: string;
  status: string;
  team: string | null;
  team_id: number | null;
  discord_username: string;
  first_name: string;
  last_name: string;
  joined_at: string;
}

interface TeamData {
  id: number;
  name: string;
  game: string;
  description: string;
  banner_url: string;
  logo_url: string;
  max_players: number;
  igl: any;
  igl_id: number | null;
  visibility: string;
  is_active: boolean;
  players: PlayerData[];
  substitutes: PlayerData[];
}

interface GameData {
  id: number;
  title: string;
  slug: string;
  publisher: string;
  genre: string;
  banner: string;
  overlay_color: string;
  ranks: string[];
  is_active: boolean;
}

const ROLE_ORDER = ["captain", "player", "coach", "substitute", "content_creator"];

const ROLE_LABELS: Record<string, string> = {
  player: "Player",
  captain: "Captain",
  coach: "Coach",
  substitute: "Substitute",
  content_creator: "Content Creator",
};

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  captain:         { bg: "rgba(255,215,0,0.15)",   text: "#ffd700", border: "rgba(255,215,0,0.35)"   },
  player:          { bg: "rgba(168,85,247,0.15)",  text: "#c084fc", border: "rgba(168,85,247,0.35)"  },
  coach:           { bg: "rgba(96,165,250,0.15)",  text: "#60a5fa", border: "rgba(96,165,250,0.35)"  },
  substitute:      { bg: "rgba(156,163,175,0.15)", text: "#9ca3af", border: "rgba(156,163,175,0.3)"  },
  content_creator: { bg: "rgba(244,114,182,0.15)", text: "#f472b4", border: "rgba(244,114,182,0.3)"  },
};

// ── Player Card ───────────────────────────────────────────────────────────────
function PlayerCard({
  player,
  accentColor,
  index,
}: {
  player: PlayerData;
  accentColor: string;
  index: number;
}) {
  const [hovered, setHovered] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const roleStyle = ROLE_COLORS[player.role] || ROLE_COLORS.player;

  const joinYear = (() => {
    try {
      return new Date(player.joined_at).getFullYear();
    } catch {
      return "—";
    }
  })();

  return (
    <div
      className="relative group"
      style={{
        animation: `fadeSlideUp 0.5s ease-out forwards`,
        animationDelay: `${index * 60}ms`,
        opacity: 0,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="relative rounded-2xl overflow-hidden border transition-all duration-300"
        style={{
          background: "rgba(255,255,255,0.04)",
          borderColor: hovered ? `${accentColor}50` : "rgba(255,255,255,0.08)",
          transform: hovered ? "translateY(-4px)" : "translateY(0)",
          boxShadow: hovered ? `0 20px 40px ${accentColor}20` : "none",
        }}
      >
        {/* Top accent bar */}
        <div
          className="h-0.5 w-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
            opacity: hovered ? 1 : 0.4,
            transition: "opacity 0.3s",
          }}
        />

        {/* Avatar section */}
        <div
          className="relative overflow-hidden flex items-center justify-center"
          style={{
            height: "220px",
            background: `radial-gradient(ellipse at center, ${accentColor}15 0%, transparent 70%)`,
          }}
        >
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `linear-gradient(${accentColor} 1px, transparent 1px), linear-gradient(90deg, ${accentColor} 1px, transparent 1px)`,
              backgroundSize: "30px 30px",
            }}
          />

          {player.avatar && !imgErr ? (
            <img
              src={player.avatar}
              alt={player.username}
              className="w-full h-full object-cover object-top transition-transform duration-500"
              style={{ transform: hovered ? "scale(1.06)" : "scale(1)" }}
              onError={() => setImgErr(true)}
            />
          ) : (
            <div
              className="w-28 h-28 rounded-2xl flex items-center justify-center font-black text-5xl border-2"
              style={{
                background: `${accentColor}18`,
                borderColor: `${accentColor}40`,
                color: accentColor,
                fontFamily: "'Barlow Condensed', sans-serif",
              }}
            >
              {player.username[0]?.toUpperCase() ?? "?"}
            </div>
          )}

          {/* Role badge */}
          <div className="absolute top-3 left-3">
            <span
              className="text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full"
              style={{
                background: roleStyle.bg,
                color: roleStyle.text,
                border: `1px solid ${roleStyle.border}`,
              }}
            >
              {ROLE_LABELS[player.role] ?? player.role}
            </span>
          </div>

          {player.role === "captain" && (
            <div className="absolute top-3 right-3 text-yellow-400 text-lg">👑</div>
          )}

          <div
            className="absolute bottom-0 left-0 right-0 h-20"
            style={{
              background: "linear-gradient(to top, rgba(13,0,20,0.95), transparent)",
            }}
          />
        </div>

        {/* Info section */}
        <div className="p-5 pt-3">
          <div className="mb-3">
            <h3
              className="text-white font-black text-xl uppercase leading-tight"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              {player.username}
            </h3>
            {player.ingame_username !== player.username && (
              <p className="text-white/35 text-xs font-mono mt-0.5">
                {player.ingame_username}
              </p>
            )}
          </div>

          {player.rank && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-white/25 text-[10px] font-bold tracking-widest uppercase">Rank</span>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: `${accentColor}18`,
                  color: accentColor,
                  border: `1px solid ${accentColor}30`,
                }}
              >
                {player.rank}
              </span>
            </div>
          )}

          {player.bio && (
            <p className="text-white/40 text-xs leading-relaxed line-clamp-2 mb-3">
              {player.bio}
            </p>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            {player.team && (
              <span className="text-white/25 text-[10px] tracking-widest uppercase">
                {player.team}
              </span>
            )}
            <span className="text-white/20 text-[10px] ml-auto">Since {joinYear}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Roster Section ─────────────────────────────────────────────────────────────
function RosterSection({
  team,
  accentColor,
}: {
  team: TeamData;
  accentColor: string;
}) {
  const orderedPlayers = [...team.players].sort(
    (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)
  );

  const initials = team.name
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="mb-16">
      {/* Team header */}
      <div
        className="relative rounded-2xl overflow-hidden mb-8 border border-white/10"
        style={{ background: "rgba(255,255,255,0.03)" }}
      >
        <div className="relative h-32 overflow-hidden">
          {team.banner_url ? (
            <img
              src={team.banner_url}
              alt={team.name}
              className="w-full h-full object-cover opacity-50"
            />
          ) : (
            <div className="w-full h-full" style={{ background: `${accentColor}18` }} />
          )}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to right, rgba(13,0,20,0.9), rgba(13,0,20,0.3))",
            }}
          />
          <span
            className="absolute right-8 top-1/2 -translate-y-1/2 font-black text-[80px] leading-none select-none"
            style={{
              color: `${accentColor}10`,
              fontFamily: "'Barlow Condensed', sans-serif",
            }}
          >
            {initials}
          </span>
        </div>

        <div className="flex items-end gap-5 px-6 pb-5 -mt-8 relative">
          <div
            className="w-16 h-16 rounded-xl border-2 flex items-center justify-center overflow-hidden shrink-0 shadow-lg"
            style={{
              background: `${accentColor}20`,
              borderColor: `${accentColor}40`,
              boxShadow: `0 4px 20px ${accentColor}30`,
            }}
          >
            {team.logo_url ? (
              <img src={team.logo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span
                className="font-black text-2xl"
                style={{ color: accentColor, fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                {initials}
              </span>
            )}
          </div>

          <div className="flex-1 pb-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2
                className="text-white font-black text-2xl uppercase"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                {team.name}
              </h2>
              <span
                className="text-xs font-bold px-3 py-1 rounded-full"
                style={{
                  background: `${accentColor}18`,
                  color: accentColor,
                  border: `1px solid ${accentColor}35`,
                }}
              >
                {orderedPlayers.length}/{team.max_players} players
              </span>
              {team.igl && (
                <span className="text-xs text-yellow-400/70 font-bold tracking-wider">
                  👑 IGL: {team.igl.username}
                </span>
              )}
            </div>
            {team.description && (
              <p className="text-white/35 text-sm mt-1 max-w-xl">{team.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Players grid */}
      {orderedPlayers.length === 0 ? (
        <div
          className="rounded-2xl border border-white/8 p-10 text-center"
          style={{ background: "rgba(255,255,255,0.02)" }}
        >
          <p className="text-white/20 tracking-wider text-sm uppercase">
            No active players assigned to this roster yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {orderedPlayers.map((p, i) => (
            <PlayerCard key={p.id} player={p} accentColor={accentColor} index={i} />
          ))}
          {team.substitutes.length > 0 && (
            <>
              <div className="col-span-full flex items-center gap-3 mt-2">
                <div className="h-px flex-1" style={{ background: `${accentColor}25` }} />
                <span className="text-white/25 text-xs font-bold tracking-widest uppercase">
                  Substitutes
                </span>
                <div className="h-px flex-1" style={{ background: `${accentColor}25` }} />
              </div>
              {team.substitutes.map((p, i) => (
                <PlayerCard
                  key={p.id}
                  player={p}
                  accentColor={accentColor}
                  index={orderedPlayers.length + i}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RosterPage() {
  const { gameSlug } = useParams<{ gameSlug: string }>();
  const navigate = useNavigate();

  const [game, setGame] = useState<GameData | null>(null);
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!gameSlug) return;
    setLoading(true);

    Promise.all([
      gamesApi.list() as Promise<any>,
      teamsApi.list(gameSlug) as Promise<any>,
    ])
      .then(([gamesRes, teamsRes]) => {
        const foundGame = gamesRes.games?.find((g: GameData) => g.slug === gameSlug);
        if (!foundGame) {
          navigate("/", { replace: true });
          return;
        }
        setGame(foundGame);
        setTeams(teamsRes.teams || []);
      })
      .catch(() => navigate("/", { replace: true }))
      .finally(() => setLoading(false));
  }, [gameSlug]);

  const accentColor = (() => {
    const oc = game?.overlay_color || "";
    const m = oc.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) return `rgb(${m[1]},${m[2]},${m[3]})`;
    return "#a855f7";
  })();

  const totalPlayers = teams.reduce(
    (sum, t) => sum + t.players.length + t.substitutes.length,
    0
  );

  if (loading) {
    return (
      <div
        className="min-h-screen bg-[#0d0014] flex items-center justify-center"
        style={{ fontFamily: "'Barlow', sans-serif" }}
      >
        <div className="text-center">
          <div
            className="w-14 h-14 rounded-full border-2 animate-spin mx-auto mb-4"
            style={{ borderColor: `${accentColor} transparent transparent transparent` }}
          />
          <p className="text-white/30 tracking-widest uppercase text-sm">Loading Roster…</p>
        </div>
      </div>
    );
  }

  if (!game) return null;

  return (
    <div
      className="min-h-screen bg-[#0d0014] text-white overflow-x-hidden"
      style={{ fontFamily: "'Barlow', sans-serif" }}
    >
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroReveal {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-text        { animation: heroReveal 0.7s ease-out forwards; }
        .hero-text-delay  { animation: heroReveal 0.7s ease-out 0.15s forwards; opacity: 0; }
        .hero-text-delay2 { animation: heroReveal 0.7s ease-out 0.3s  forwards; opacity: 0; }
      `}</style>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(13,0,20,0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          boxShadow: scrolled ? "0 1px 0 0 rgba(255,255,255,0.06)" : "0 1px 0 0 rgba(255,255,255,0)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-bold tracking-wider uppercase group cursor-pointer"  // ← added cursor-pointer
          >
            <svg
              className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="h-4 w-px bg-white/15" />
          <span className="text-white/30 text-xs tracking-widest uppercase">
            {game.title} Roster
          </span>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ minHeight: "420px" }}>
        {game.banner && (
          <img
            src={game.banner}
            alt={game.title}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: 0.25 }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${accentColor}20 0%, transparent 60%)` }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(13,0,20,0.5) 0%, rgba(13,0,20,0.0) 40%, rgba(13,0,20,1) 100%)",
          }}
        />
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl pointer-events-none"
          style={{ width: "500px", height: "300px", background: `${accentColor}20` }}
        />
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `linear-gradient(${accentColor} 1px, transparent 1px), linear-gradient(90deg, ${accentColor} 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-28 pb-16 flex flex-col items-center text-center">
          <div
            className="hero-text inline-flex items-center gap-2 rounded-full px-4 py-2 mb-6 text-xs font-bold tracking-widest uppercase"
            style={{
              background: `${accentColor}20`,
              color: accentColor,
              border: `1px solid ${accentColor}40`,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accentColor }} />
            Active Roster · {game.genre || "Esports"}
          </div>

          <h1
            className="hero-text-delay font-black text-6xl md:text-8xl uppercase leading-none mb-4"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            <span className="text-white">Meet the </span>
            <span
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: `linear-gradient(135deg, ${accentColor}, white)` }}
            >
              {game.title}
            </span>
          </h1>
          <p className="hero-text-delay2 text-white/40 text-base max-w-lg leading-relaxed mb-8">
            {game.publisher && `Published by ${game.publisher} · `}
            Our competitive players pushing for the top
          </p>

          <div className="hero-text-delay2 flex flex-wrap items-center justify-center gap-3">
            {[
              { label: "Active Players", val: totalPlayers },
              { label: "Rosters",        val: teams.length },
            ].map(s => (
              <div
                key={s.label}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-bold"
                style={{
                  background: `${accentColor}12`,
                  color: accentColor,
                  borderColor: `${accentColor}30`,
                }}
              >
                <span
                  className="text-white font-black text-xl"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  {s.val}
                </span>
                <span className="text-white/40 text-xs tracking-widest uppercase">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 pb-24 pt-4">
        {teams.length === 0 ? (
          <div
            className="text-center py-24 rounded-3xl border border-white/8 mt-8"
            style={{ background: "rgba(255,255,255,0.02)" }}
          >
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 border"
              style={{ background: `${accentColor}15`, borderColor: `${accentColor}30` }}
            >
              <svg
                className="w-9 h-9"
                style={{ color: accentColor }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round" strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                />
              </svg>
            </div>
            <h3
              className="text-white font-black text-3xl uppercase mb-3"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              Roster Coming Soon
            </h3>
            <p className="text-white/30 max-w-sm mx-auto text-sm leading-relaxed">
              We're building our {game.title} lineup. Stay tuned for player announcements.
            </p>
          </div>
        ) : (
          teams.map(team => (
            <RosterSection key={team.id} team={team} accentColor={accentColor} />
          ))
        )}
      </div>

      {/* ── Footer strip ─────────────────────────────────────────────────── */}
      <div className="border-t border-white/8 py-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="text-white/30 hover:text-white text-sm font-bold tracking-wider uppercase transition-colors flex items-center gap-2 group cursor-pointer"  // ← added cursor-pointer
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
            style={{ color: accentColor, fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            NBL<span className="text-white">ESPORT</span>
          </span>
        </div>
      </div>
    </div>
  );
}