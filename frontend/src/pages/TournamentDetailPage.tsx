import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { tournaments as tournamentsApi, discordAuth } from "../utils/api";
import { asset } from "../utils/asset";
import Footer from "../components/footer";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Placement {
  id: number;
  placement: string;
  reward_text: string;
  display_order: number;
}

interface TournamentDetail {
  id: number;
  name: string;
  slug: string;
  game: string | null;
  game_title: string;
  format: "solo" | "team";
  team_size: number | null;
  bracket_type: string;
  status: "draft" | "open" | "closed" | "in_progress" | "completed";
  description: string;
  rules: string;
  requirements: string;
  banner: string;
  registration_open_at: string | null;
  registration_deadline: string | null;
  start_date: string | null;
  max_participants: number | null;
  registration_open: boolean;
  placements: Placement[];
  participant_count: number;
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

function DiscordIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function TextBlock({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/).flatMap(b => b.split(/\n/)).filter(Boolean);
  return (
    <div className="space-y-3">
      {paragraphs.map((p, i) => (
        <p key={i} className="text-white/65 leading-[1.8] text-sm">{p}</p>
      ))}
    </div>
  );
}

function CountdownStrip({ deadline, color }: { deadline: string | null; color: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000 * 30);
    return () => clearInterval(t);
  }, []);

  if (!deadline) return null;
  const diffMs = new Date(deadline).getTime() - now;
  if (diffMs <= 0) return null;

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);

  return (
    <div
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-wide"
      style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {days > 0 ? `${days}d ${hours}h left to register` : `${hours}h left to register`}
    </div>
  );
}

function RegistrationPanel({
  t,
  player,
  myReg,
  regLoading,
  onSignIn,
  onChanged,
}: {
  t: TournamentDetail;
  player: { discord_username: string; discord_avatar: string } | null;
  myReg: any;
  regLoading: boolean;
  onSignIn: () => void;
  onChanged: () => void;
}) {
  const [mode, setMode] = useState<"idle" | "create" | "join">("idle");
  const [teamName, setTeamName] = useState("");
  const [teamTag, setTeamTag] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const inputClass =
    "w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm " +
    "placeholder-white/25 focus:outline-none focus:border-purple-500/60 transition-all duration-200";

  const run = async (fn: () => Promise<any>) => {
    setSubmitting(true);
    setError("");
    try {
      await fn();
      setMode("idle");
      setTeamName("");
      setTeamTag("");
      setInviteCode("");
      onChanged();
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!t.registration_open) {
    return (
      <button
        disabled
        className="w-full bg-white/5 border border-white/10 text-white/30 font-black py-3.5 rounded-xl text-sm tracking-widest uppercase cursor-not-allowed"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        {t.status === "completed" ? "Tournament Ended" : "Registration Closed"}
      </button>
    );
  }

  if (!player) {
    return (
      <button
        onClick={onSignIn}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3.5 rounded-xl text-sm tracking-widest uppercase transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 cursor-pointer"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        <DiscordIcon />
        Sign in with Discord
      </button>
    );
  }

  if (regLoading) {
    return (
      <div className="flex justify-center py-3">
        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Already registered solo ──
  if (myReg?.kind === "solo") {
    return (
      <div className="space-y-3">
        <div
          className="rounded-2xl border p-4 text-center"
          style={{ background: "rgba(52,211,153,0.06)", borderColor: "rgba(52,211,153,0.25)" }}
        >
          <p className="text-green-400 font-black text-sm tracking-widest uppercase">You're registered!</p>
          <p className="text-white/30 text-xs mt-1">We'll notify you when the bracket is ready.</p>
        </div>
        <button
          onClick={() => run(() => tournamentsApi.withdrawSolo(t.slug))}
          disabled={submitting}
          className="w-full text-red-400/60 hover:text-red-400 text-xs font-bold tracking-widest uppercase transition-colors cursor-pointer disabled:opacity-40"
        >
          {submitting ? "Withdrawing…" : "Withdraw"}
        </button>
        {error && <p className="text-red-400 text-xs text-center">{error}</p>}
      </div>
    );
  }

  // ── Already on a team ──
  if (myReg?.kind === "team") {
    const team = myReg.team;
    const isCaptain = myReg.is_captain;
    return (
      <div className="space-y-3">
        <div
          className="rounded-2xl border p-4 space-y-3"
          style={{ background: "rgba(52,211,153,0.06)", borderColor: "rgba(52,211,153,0.25)" }}
        >
          <div>
            <p className="text-green-400 font-black text-sm tracking-widest uppercase">On team {team.name}</p>
            <p className="text-white/30 text-xs mt-1">
              {team.member_count} member{team.member_count !== 1 ? "s" : ""}
              {t.team_size ? ` / ${t.team_size}` : ""}
            </p>
          </div>

          <div className="space-y-1.5">
            {team.members.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between bg-black/20 rounded-lg px-3 py-1.5">
                <span className="text-white/70 text-xs font-semibold flex items-center gap-1.5">
                  {m.is_captain && <span className="text-yellow-400">👑</span>}
                  {m.player.discord_username}
                </span>
                {isCaptain && !m.is_captain && (
                  <button
                    onClick={() => run(() => tournamentsApi.kickMember(t.slug, m.player.id))}
                    className="text-red-400/50 hover:text-red-400 text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Kick
                  </button>
                )}
              </div>
            ))}
          </div>

          {isCaptain && (
            <div className="bg-black/20 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
              <span className="text-white/40 text-[10px] tracking-widest uppercase">Invite Code</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-purple-300 font-bold tracking-widest text-sm">{team.invite_code}</span>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(team.invite_code);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="text-white/30 hover:text-white transition-colors cursor-pointer"
                  title="Copy"
                >
                  {copied ? "✓" : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {isCaptain ? (
          <button
            onClick={() => run(() => tournamentsApi.regenerateInviteCode(t.slug))}
            disabled={submitting}
            className="w-full text-white/30 hover:text-white/60 text-[10px] font-bold tracking-widest uppercase transition-colors cursor-pointer disabled:opacity-40"
          >
            Regenerate Invite Code
          </button>
        ) : (
          <button
            onClick={() => run(() => tournamentsApi.leaveTeam(t.slug))}
            disabled={submitting}
            className="w-full text-red-400/60 hover:text-red-400 text-xs font-bold tracking-widest uppercase transition-colors cursor-pointer disabled:opacity-40"
          >
            {submitting ? "Leaving…" : "Leave Team"}
          </button>
        )}
        {error && <p className="text-red-400 text-xs text-center">{error}</p>}
      </div>
    );
  }

  // ── Not registered yet — solo ──
  if (t.format === "solo") {
    return (
      <div className="space-y-2">
        <button
          onClick={() => run(() => tournamentsApi.registerSolo(t.slug))}
          disabled={submitting}
          className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black py-3.5 rounded-xl text-sm tracking-widest uppercase transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/30 hover:-translate-y-0.5 cursor-pointer"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          {submitting ? "Registering…" : "Register Now"}
        </button>
        {error && <p className="text-red-400 text-xs text-center">{error}</p>}
      </div>
    );
  }

  // ── Not registered yet — team, pick create or join ──
  if (mode === "idle") {
    return (
      <div className="space-y-2">
        <button
          onClick={() => setMode("create")}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black py-3 rounded-xl text-sm tracking-widest uppercase transition-all duration-200 cursor-pointer"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Create a Team
        </button>
        <button
          onClick={() => setMode("join")}
          className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-black py-3 rounded-xl text-sm tracking-widest uppercase transition-all duration-200 cursor-pointer"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Join with Invite Code
        </button>
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div className="space-y-3">
        <input placeholder="Team name" value={teamName} onChange={e => setTeamName(e.target.value)} className={inputClass} />
        <input placeholder="Tag (optional, e.g. NBL)" value={teamTag} onChange={e => setTeamTag(e.target.value)} maxLength={10} className={inputClass} />
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => run(() => tournamentsApi.createTeam(t.slug, { name: teamName.trim(), tag: teamTag.trim() }))}
            disabled={submitting || !teamName.trim()}
            className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black py-2.5 rounded-xl text-xs tracking-widest uppercase transition-all cursor-pointer"
          >
            {submitting ? "Creating…" : "Create"}
          </button>
          <button
            onClick={() => { setMode("idle"); setError(""); }}
            className="px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 font-bold py-2.5 rounded-xl text-xs tracking-widest uppercase transition-all cursor-pointer"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        placeholder="Invite code"
        value={inviteCode}
        onChange={e => setInviteCode(e.target.value.toUpperCase())}
        className={inputClass + " font-mono tracking-widest"}
      />
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => run(() => tournamentsApi.joinTeam(t.slug, inviteCode.trim()))}
          disabled={submitting || !inviteCode.trim()}
          className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black py-2.5 rounded-xl text-xs tracking-widest uppercase transition-all cursor-pointer"
        >
          {submitting ? "Joining…" : "Join Team"}
        </button>
        <button
          onClick={() => { setMode("idle"); setError(""); }}
          className="px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 font-bold py-2.5 rounded-xl text-xs tracking-widest uppercase transition-all cursor-pointer"
        >
          Back
        </button>
      </div>
    </div>
  );
}

export default function TournamentDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [t, setT] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [tab, setTab] = useState<"overview" | "rules" | "bracket">("overview");
  const [player, setPlayer] = useState<{ discord_username: string; discord_avatar: string } | null>(null);
  const [myReg, setMyReg] = useState<any>(null);
  const [regLoading, setRegLoading] = useState(true);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    (tournamentsApi.get(slug) as Promise<any>)
      .then(setT)
      .catch(() => navigate("/tournaments", { replace: true }))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    (discordAuth.me() as Promise<any>)
      .then(r => { if (r.authenticated) setPlayer(r.player); })
      .catch(() => {});
  }, []);

  const refreshMyRegistration = () => {
    if (!slug) return;
    setRegLoading(true);
    (tournamentsApi.myRegistration(slug) as Promise<any>)
      .then(r => setMyReg(r.registration))
      .catch(() => setMyReg(null))
      .finally(() => setRegLoading(false));
  };

  useEffect(refreshMyRegistration, [slug, player]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0014] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!t) return null;

  const color = GAME_COLORS[t.game || ""] || "#a855f7";
  const sc = STATUS_CONFIG[t.status] || STATUS_CONFIG.closed;
  const sortedPlacements = [...t.placements].sort((a, b) => a.display_order - b.display_order);

  const fmtDate = (d: string | null) => {
    if (!d) return null;
    try { return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
    catch { return d; }
  };

  const handleRegister = () => {
    window.location.href = discordAuth.loginUrl(`/tournaments/${t.slug}`);
  };

  return (
    <div className="min-h-screen bg-[#0d0014] text-white overflow-x-hidden" style={{ fontFamily: "'Barlow', sans-serif" }}>
      {/* ── Navbar ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(13,0,20,0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(14px)" : "none",
          boxShadow: scrolled ? "0 1px 0 rgba(255,255,255,0.06)" : "none",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/tournaments")}
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-xs font-bold tracking-wider uppercase group cursor-pointer"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Tournaments
          </button>
          <div className="h-4 w-px bg-white/15" />
          <span className="text-white/40 text-xs font-black tracking-widest uppercase hidden sm:block" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            NBL<span style={{ color }}>ESPORT</span>
          </span>

          <div className="ml-auto flex items-center gap-3">
            {player ? (
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full pl-1 pr-3 py-1">
                {player.discord_avatar ? (
                  <img src={player.discord_avatar} className="w-6 h-6 rounded-full" alt="" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-indigo-500/30 flex items-center justify-center">
                    <DiscordIcon className="w-3 h-3 text-indigo-300" />
                  </div>
                )}
                <span className="text-white/70 text-xs font-semibold">{player.discord_username}</span>
              </div>
            ) : (
              <button
                onClick={handleRegister}
                className="flex items-center gap-2 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 font-bold px-4 py-2 rounded-full text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer"
              >
                <DiscordIcon />
                Sign in
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="relative" style={{ minHeight: "380px" }}>
        {t.banner ? (
          <img src={t.banner} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.3 }} />
        ) : (
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 60% 30%, ${color}22 0%, transparent 65%)` }} />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(13,0,20,0.5) 0%, rgba(13,0,20,0.2) 40%, rgba(13,0,20,1) 100%)" }} />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />

        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-32 pb-12">
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <span
              className="inline-flex items-center gap-1.5 text-xs font-black tracking-widest uppercase px-3 py-1.5 rounded-full"
              style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
            >
              {sc.dot && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: sc.color }} />}
              {sc.label}
            </span>
            <span
              className="text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full"
              style={{ background: `${color}18`, color, border: `1px solid ${color}35` }}
            >
              {t.game_title || "Multi-Game"}
            </span>
            <span className="text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full bg-white/5 text-white/50 border border-white/10">
              {t.format === "team" ? `Team${t.team_size ? ` · ${t.team_size}v${t.team_size}` : ""}` : "Solo"}
            </span>
          </div>

          <h1
            className="font-black text-5xl md:text-7xl uppercase leading-none mb-5"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {t.name}
          </h1>

          {t.description && (
            <p className="text-white/55 text-lg max-w-2xl leading-relaxed mb-6">{t.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <CountdownStrip deadline={t.registration_deadline} color={color} />
            {t.max_participants && (
              <span className="text-white/30 text-xs font-bold tracking-wider">
                {t.participant_count}/{t.max_participants} registered
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center gap-1 border-b border-white/8 mb-10">
          {([
            ["overview", "Overview"],
            ["rules", "Rules & Requirements"],
            ["bracket", "Bracket"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="relative px-5 py-3 text-xs font-black tracking-widest uppercase transition-colors cursor-pointer"
              style={{ color: tab === id ? color : "rgba(255,255,255,0.35)" }}
            >
              {label}
              {tab === id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: color }} />
              )}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-10 pb-24">
          {/* ── Main column ── */}
          <div className="md:col-span-2">
            {tab === "overview" && (
              <div className="space-y-10">
                {/* Prize table */}
                {sortedPlacements.length > 0 && (
                  <div>
                    <h3 className="text-white font-black text-lg uppercase tracking-wide mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                      Prizes
                    </h3>
                    <div className="space-y-2">
                      {sortedPlacements.map(p => (
                        <div key={p.id} className="flex items-center justify-between bg-white/5 border border-white/8 rounded-xl px-5 py-3.5">
                          <span className="text-white font-bold text-sm">{p.placement}</span>
                          <span className="text-yellow-400/90 text-sm font-semibold">{p.reward_text || "—"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {t.description && (
                  <div>
                    <h3 className="text-white font-black text-lg uppercase tracking-wide mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                      About
                    </h3>
                    <TextBlock text={t.description} />
                  </div>
                )}
              </div>
            )}

            {tab === "rules" && (
              <div className="space-y-10">
                <div>
                  <h3 className="text-white font-black text-lg uppercase tracking-wide mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    Rules
                  </h3>
                  {t.rules ? <TextBlock text={t.rules} /> : <p className="text-white/25 text-sm">No rules published yet.</p>}
                </div>
                <div>
                  <h3 className="text-white font-black text-lg uppercase tracking-wide mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    Entry Requirements
                  </h3>
                  {t.requirements ? <TextBlock text={t.requirements} /> : <p className="text-white/25 text-sm">No specific requirements — everyone's welcome.</p>}
                </div>
              </div>
            )}

            {tab === "bracket" && (
              <div>
                <h3 className="text-white font-black text-lg uppercase tracking-wide mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  Bracket
                </h3>
                {t.status === "draft" || t.status === "open" ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <div className="text-4xl mb-4 opacity-20">🗓</div>
                    <p className="text-white/35 text-sm max-w-sm mx-auto">
                      The bracket will be generated once registration closes and seeding is finalized.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 p-10 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <div className="text-4xl mb-4 opacity-20">🏗️</div>
                    <p className="text-white/35 text-sm max-w-sm mx-auto">
                      Bracket viewer is coming in the next update — check back soon to follow the matches live.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Sidebar: registration ── */}
          <div>
            <div className="sticky top-28 rounded-3xl border border-white/10 p-6" style={{ background: "rgba(255,255,255,0.03)" }}>
              <h3 className="text-white font-black text-base uppercase mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                Registration
              </h3>

              <div className="space-y-3 mb-6 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-white/35">Format</span>
                  <span className="text-white/70 font-semibold">{t.format === "team" ? "Team" : "Solo"}</span>
                </div>
                {t.format === "team" && t.team_size && (
                  <div className="flex items-center justify-between">
                    <span className="text-white/35">Team size</span>
                    <span className="text-white/70 font-semibold">{t.team_size} players</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-white/35">Bracket</span>
                  <span className="text-white/70 font-semibold">Single Elimination</span>
                </div>
                {t.start_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-white/35">Starts</span>
                    <span className="text-white/70 font-semibold">{fmtDate(t.start_date)}</span>
                  </div>
                )}
                {t.registration_deadline && (
                  <div className="flex items-center justify-between">
                    <span className="text-white/35">Registration closes</span>
                    <span className="text-white/70 font-semibold">{fmtDate(t.registration_deadline)}</span>
                  </div>
                )}
                {t.max_participants && (
                  <div className="flex items-center justify-between">
                    <span className="text-white/35">Slots</span>
                    <span className="text-white/70 font-semibold">{t.participant_count}/{t.max_participants}</span>
                  </div>
                )}
              </div>

              <RegistrationPanel
                t={t}
                player={player}
                myReg={myReg}
                regLoading={regLoading}
                onSignIn={handleRegister}
                onChanged={refreshMyRegistration}
              />

              <p className="text-white/20 text-[10px] mt-3 text-center leading-relaxed">
                We only use your Discord identity to contact you about this tournament.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}