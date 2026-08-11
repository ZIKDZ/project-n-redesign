import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { tournaments as tournamentsApi } from "../utils/api";
import { useEscapeBack } from "../hooks/useEscapeBack";
import { asset } from "../utils/asset";
import Footer from "../components/footer";


// ── Types ─────────────────────────────────────────────────────────────────────
interface Placement {
  id: number;
  placement: string;
  reward_text: string;
  display_order: number;
}

interface TournamentItem {
  id: number;
  name: string;
  slug: string;
  game: string | null;
  game_title: string;
  format: "solo" | "team";
  bracket_type: string;
  status: "draft" | "open" | "closed" | "in_progress" | "completed";
  description: string;
  banner: string;
  registration_deadline: string | null;
  start_date: string | null;
  max_participants: number | null;
  registration_open: boolean;
  placements: Placement[];
  participant_count?: number;
}

const GAME_COLORS: Record<string, string> = {
  rocket_league: "#60b8ff",
  valorant: "#ff7080",
  fortnite: "#ffd700",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot?: boolean }> = {
  open:         { label: "Registration Open", color: "#34d399", bg: "rgba(52,211,153,0.15)", border: "rgba(52,211,153,0.3)", dot: true },
  closed:       { label: "Registration Closed", color: "#fbbf24", bg: "rgba(251,191,36,0.15)", border: "rgba(251,191,36,0.3)" },
  in_progress:  { label: "Live", color: "#f87171", bg: "rgba(248,113,113,0.15)", border: "rgba(248,113,113,0.3)", dot: true },
  completed:    { label: "Completed", color: "#a855f7", bg: "rgba(168,85,247,0.15)", border: "rgba(168,85,247,0.3)" },
};

function NBLIcon({ size = 14, opacity = 0.9 }: { size?: number; opacity?: number }) {
  return (
    <img
      src={asset("images/logo.svg")}
      width={size}
      height={size}
      alt=""
      style={{ filter: "brightness(0) invert(1)", opacity, flexShrink: 0 }}
    />
  );
}

function TournamentCard({ t, onClick }: { t: TournamentItem; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const color = GAME_COLORS[t.game || ""] || "#a855f7";
  const sc = STATUS_CONFIG[t.status] || STATUS_CONFIG.closed;

  const formattedDeadline = (() => {
    if (!t.registration_deadline) return null;
    try {
      return new Date(t.registration_deadline).toLocaleDateString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
      });
    } catch { return null; }
  })();

  const topPlacement = [...t.placements].sort((a, b) => a.display_order - b.display_order)[0];

  return (
    <div
      className="group relative border rounded-2xl overflow-hidden transition-all duration-300 flex flex-col cursor-pointer"
      style={{
        background: "rgba(255,255,255,0.04)",
        borderColor: hovered ? `${color}55` : "rgba(255,255,255,0.08)",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hovered ? `0 20px 44px ${color}22` : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <div className="relative h-40 overflow-hidden shrink-0">
        {t.banner ? (
          <img
            src={t.banner}
            alt={t.name}
            className="w-full h-full object-cover transition-transform duration-500"
            style={{ transform: hovered ? "scale(1.06)" : "scale(1)" }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: `${color}15` }}>
            <span className="text-4xl font-black" style={{ color: `${color}30`, fontFamily: "'Barlow Condensed', sans-serif" }}>
              {t.name.charAt(0)}
            </span>
          </div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(13,0,20,0.9) 0%, transparent 55%)" }} />

        <span
          className="absolute top-3 left-3 inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full"
          style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
        >
          {sc.dot && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: sc.color }} />}
          {sc.label}
        </span>

        <span
          className="absolute top-3 right-3 text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
          style={{ background: `${color}22`, color, border: `1px solid ${color}40` }}
        >
          {t.format === "team" ? "Team" : "Solo"}
        </span>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2">
          <NBLIcon size={12} opacity={0.5} />
          <span className="text-white/35 text-[10px] font-bold tracking-widest uppercase">
            {t.game_title || "Multi-Game"}
          </span>
        </div>

        <h3
          className="text-white font-black text-xl uppercase leading-tight mb-2 line-clamp-2"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          {t.name}
        </h3>

        {t.description && (
          <p className="text-white/45 text-sm leading-relaxed mb-4 line-clamp-2 flex-1">{t.description}</p>
        )}

        {topPlacement && (
          <div className="flex items-center gap-2 mb-4 text-xs">
            <span className="text-yellow-400">🏆</span>
            <span className="text-white/50">
              {topPlacement.placement}
              {topPlacement.reward_text && <span className="text-yellow-400/80 font-semibold"> — {topPlacement.reward_text}</span>}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/6">
          <span className="text-[10px] text-white/25 tracking-wider">
            {formattedDeadline ? `Closes ${formattedDeadline}` : "No deadline"}
          </span>
          <span
            className="flex items-center gap-1.5 text-xs font-black tracking-widest uppercase px-4 py-2 rounded-xl transition-all duration-200"
            style={{
              background: hovered ? `${color}25` : "rgba(255,255,255,0.05)",
              color: hovered ? color : "rgba(255,255,255,0.5)",
              border: `1px solid ${hovered ? color + "45" : "rgba(255,255,255,0.1)"}`,
            }}
          >
            View
            <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}

const STATUS_FILTERS = ["all", "open", "in_progress", "closed", "completed"] as const;

export default function TournamentsPage() {
  const navigate = useNavigate();
  useEscapeBack(() => navigate("/"));
  const [list, setList] = useState<TournamentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<typeof STATUS_FILTERS[number]>("all");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setLoading(true);
    (tournamentsApi.list() as Promise<any>)
      .then(r => setList(r.tournaments || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? list : list.filter(t => t.status === filter);

  // live/open first, then closed, then completed
  const ORDER: Record<string, number> = { open: 0, in_progress: 1, closed: 2, completed: 3 };
  const sorted = [...filtered].sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9));

  return (
    <div className="min-h-screen bg-[#0d0014] text-white" style={{ fontFamily: "'Barlow', sans-serif" }}>
      {/* ── Navbar ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(13,0,20,0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(14px)" : "none",
          boxShadow: scrolled ? "0 1px 0 rgba(255,255,255,0.06)" : "none",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-xs font-bold tracking-wider uppercase group cursor-pointer"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="h-4 w-px bg-white/15" />
          <img src={asset("images/logo.svg")} alt="NBL" width={24} style={{ filter: "brightness(0) invert(1)", opacity: 0.7 }} />
          <span className="text-white/40 text-xs font-black tracking-widest uppercase hidden sm:block" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            NBL<span className="text-purple-400">ESPORT</span>
          </span>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950/30 to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-600/15 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <span className="text-purple-400 font-bold tracking-widest uppercase text-sm mb-4 block">NBL Esport</span>
          <h1 className="text-6xl md:text-7xl font-black uppercase leading-tight mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Tournament{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-violet-300">Manager</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Register with Discord, compete solo or with a team, and follow the bracket live.
          </p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="max-w-7xl mx-auto px-6 mb-10">
        <div className="flex flex-wrap gap-2 justify-center">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-5 py-2.5 rounded-full text-xs font-black tracking-widest uppercase transition-all duration-200 cursor-pointer border ${
                filter === s
                  ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/30"
                  : "bg-white/5 border-white/10 text-white/50 hover:border-purple-500/40 hover:text-white"
              }`}
            >
              {s === "all" ? "ALL" : (STATUS_CONFIG[s]?.label ?? s).toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid ── */}
      <main className="max-w-7xl mx-auto px-6 pb-24">
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4 opacity-20">🏆</div>
            <p className="text-white/30 text-xl tracking-wider uppercase">
              No {filter !== "all" ? (STATUS_CONFIG[filter]?.label ?? filter).toLowerCase() : ""} tournaments found.
            </p>
            {filter !== "all" && (
              <button
                onClick={() => setFilter("all")}
                className="mt-6 text-purple-400 text-sm font-bold tracking-wider uppercase hover:text-purple-300 transition-colors cursor-pointer"
              >
                Clear filter →
              </button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map(t => (
              <TournamentCard key={t.id} t={t} onClick={() => navigate(`/tournaments/${t.slug}`)} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
