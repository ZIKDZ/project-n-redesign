import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { tournaments as tournamentsApi, discordAuth } from "../utils/api";
import { asset } from "../utils/asset";
import Footer from "../components/footer";

// ── Types ─────────────────────────────────────────────────────────────────────
interface TournamentDetail {
  id: number;
  name: string;
  slug: string;
  game: string | null;
  game_title: string;
  format: "solo" | "team";
  team_size: number | null;
  status: "draft" | "open" | "closed" | "in_progress" | "completed";
  banner: string;
  registration_deadline: string | null;
  max_participants: number | null;
  registration_open: boolean;
  participant_count: number;
}

interface DiscordPlayer {
  discord_username: string;
  discord_avatar: string;
}

const GAME_COLORS: Record<string, string> = {
  rocket_league: "#60b8ff",
  valorant: "#ff7080",
  fortnite: "#ffd700",
};

function DiscordIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

// ── MemberRow ─────────────────────────────────────────────────────────────────
function MemberRow({
  member,
  isCaptain,
  canKick,
  onKick,
  kicking,
}: {
  member: any;
  isCaptain: boolean;
  canKick: boolean;
  onKick: () => void;
  kicking: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-2xl border px-5 py-4"
      style={{
        background: isCaptain ? "rgba(251,191,36,0.05)" : "rgba(255,255,255,0.03)",
        borderColor: isCaptain ? "rgba(251,191,36,0.25)" : "rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
          style={{
            background: isCaptain ? "rgba(251,191,36,0.15)" : "rgba(168,85,247,0.15)",
            color: isCaptain ? "#fbbf24" : "#c084fc",
          }}
        >
          {member.player.discord_username[0]?.toUpperCase()}
        </div>
        <div>
          <p className="text-white font-bold text-sm flex items-center gap-1.5">
            {isCaptain && <span className="text-yellow-400">👑</span>}
            {member.player.discord_username}
          </p>
          {isCaptain && (
            <p className="text-yellow-400/60 text-[10px] font-bold tracking-widest uppercase">Captain</p>
          )}
        </div>
      </div>
      {canKick && !isCaptain && (
        <button
          onClick={onKick}
          disabled={kicking}
          className="text-red-400/60 hover:text-red-400 text-xs font-bold tracking-widest uppercase transition-colors cursor-pointer disabled:opacity-40"
        >
          {kicking ? "Removing…" : "Remove"}
        </button>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TournamentTeamPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [t, setT] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState<DiscordPlayer | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [myReg, setMyReg] = useState<any>(null);
  const [regLoading, setRegLoading] = useState(true);

  const [mode, setMode] = useState<"idle" | "create" | "join">("idle");
  const [teamName, setTeamName] = useState("");
  const [teamTag, setTeamTag] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [transferTarget, setTransferTarget] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [kickingId, setKickingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmDisband, setConfirmDisband] = useState(false);

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
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, []);

  const refreshMyRegistration = () => {
    if (!slug) return;
    setRegLoading(true);
    (tournamentsApi.myRegistration(slug) as Promise<any>)
      .then(r => setMyReg(r.registration))
      .catch(() => setMyReg(null))
      .finally(() => setRegLoading(false));
  };

  useEffect(() => {
    if (authLoading) return;
    refreshMyRegistration();
  }, [slug, authLoading, player]);

  const run = async (fn: () => Promise<any>) => {
    setSubmitting(true);
    setError("");
    try {
      await fn();
      setMode("idle");
      setTeamName("");
      setTeamTag("");
      setInviteCode("");
      setTransferTarget("");
      setConfirmDisband(false);
      refreshMyRegistration();
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKick = async (playerId: number) => {
    if (!slug) return;
    setKickingId(playerId);
    setError("");
    try {
      await tournamentsApi.kickMember(slug, playerId);
      refreshMyRegistration();
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setKickingId(null);
    }
  };

  const handleSignIn = () => {
    if (!slug) return;
    window.location.href = discordAuth.loginUrl(`/tournaments/${slug}/team`);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#0d0014] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!t) return null;

  const color = GAME_COLORS[t.game || ""] || "#a855f7";
  const inputClass =
    "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm " +
    "placeholder-white/25 focus:outline-none focus:border-purple-500/60 transition-all duration-200";

  return (
    <div className="min-h-screen bg-[#0d0014] text-white overflow-x-hidden" style={{ fontFamily: "'Barlow', sans-serif" }}>
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-[#0d0014]/95 backdrop-blur-md border-b border-white/8">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(`/tournaments/${t.slug}`)}
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-xs font-bold tracking-wider uppercase group cursor-pointer"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t.name}
          </button>
          <div className="h-4 w-px bg-white/15" />
          <img src={asset("images/logo.svg")} alt="NBL" width={22} style={{ filter: "brightness(0) invert(1)", opacity: 0.6 }} />
          <span className="text-white/40 text-xs font-black tracking-widest uppercase hidden sm:block" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Team Management
          </span>

          <div className="ml-auto">
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
                onClick={handleSignIn}
                className="flex items-center gap-2 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 font-bold px-4 py-2 rounded-full text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer"
              >
                <DiscordIcon />
                Sign in
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Header ── */}
      <div className="relative py-14 overflow-hidden">
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 0%, ${color}18 0%, transparent 65%)` }} />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <span
            className="inline-flex items-center gap-1.5 text-xs font-black tracking-widest uppercase px-3 py-1.5 rounded-full mb-4"
            style={{ background: `${color}18`, color, border: `1px solid ${color}35` }}
          >
            {t.game_title || "Multi-Game"} · {t.format === "team" ? `Team${t.team_size ? ` · ${t.team_size}v${t.team_size}` : ""}` : "Solo"}
          </span>
          <h1 className="font-black text-4xl md:text-5xl uppercase leading-none mb-3" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Manage Your <span style={{ color }}>Team</span>
          </h1>
          <p className="text-white/40 text-sm max-w-md mx-auto">
            Create a squad, join one with an invite code, or manage your current roster for {t.name}.
          </p>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-2xl mx-auto px-6 pb-24">
        {!t.registration_open && (
          <div className="rounded-2xl border border-white/10 p-8 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
            <p className="text-white/40 font-bold text-sm uppercase tracking-widest">
              {t.status === "completed" ? "This tournament has ended" : "Registration is closed"}
            </p>
            <p className="text-white/20 text-xs mt-2">Team management isn't available right now.</p>
          </div>
        )}

        {t.registration_open && t.format === "solo" && (
          <div className="rounded-2xl border border-white/10 p-8 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
            <p className="text-white/40 font-bold text-sm uppercase tracking-widest">This is a solo tournament</p>
            <p className="text-white/20 text-xs mt-2">There's no team to manage — head back to register individually.</p>
            <button
              onClick={() => navigate(`/tournaments/${t.slug}`)}
              className="mt-6 text-purple-400 text-xs font-bold tracking-widest uppercase hover:text-purple-300 transition-colors cursor-pointer"
            >
              Back to tournament →
            </button>
          </div>
        )}

        {t.registration_open && t.format === "team" && !player && (
          <div className="rounded-2xl border border-white/10 p-10 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
            <DiscordIcon className="w-10 h-10 mx-auto mb-4 text-indigo-400/60" />
            <p className="text-white/50 font-bold text-sm uppercase tracking-widest mb-2">Sign in required</p>
            <p className="text-white/25 text-xs mb-6 max-w-xs mx-auto">
              Connect your Discord account to create or join a team for this tournament.
            </p>
            <button
              onClick={handleSignIn}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black px-6 py-3 rounded-xl text-sm tracking-widest uppercase transition-all duration-200 cursor-pointer"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              <DiscordIcon />
              Sign in with Discord
            </button>
          </div>
        )}

        {t.registration_open && t.format === "team" && player && regLoading && (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {t.registration_open && t.format === "team" && player && !regLoading && (
          <>
            {/* ── Not registered — choose create/join ── */}
            {!myReg && mode === "idle" && (
              <div className="grid sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setMode("create")}
                  className="rounded-2xl border border-purple-500/25 p-6 text-left hover:border-purple-500/50 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                  style={{ background: "rgba(168,85,247,0.06)" }}
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center mb-4 text-lg">
                    ➕
                  </div>
                  <h3 className="text-white font-black text-lg uppercase mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    Create a Team
                  </h3>
                  <p className="text-white/35 text-xs leading-relaxed">
                    Start a new squad and become captain. You'll get an invite code to share with teammates.
                  </p>
                </button>
                <button
                  onClick={() => setMode("join")}
                  className="rounded-2xl border border-white/10 p-6 text-left hover:border-white/25 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/15 flex items-center justify-center mb-4 text-lg">
                    🔑
                  </div>
                  <h3 className="text-white font-black text-lg uppercase mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    Join a Team
                  </h3>
                  <p className="text-white/35 text-xs leading-relaxed">
                    Got an invite code from a captain? Enter it here to join their roster.
                  </p>
                </button>
              </div>
            )}

            {!myReg && mode === "create" && (
              <div className="rounded-2xl border border-white/10 p-8" style={{ background: "rgba(255,255,255,0.03)" }}>
                <h3 className="text-white font-black text-lg uppercase mb-5" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  Create Your Team
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-white/50 text-[10px] font-bold tracking-widest uppercase mb-2">Team Name *</label>
                    <input placeholder="e.g. Nebula Prime" value={teamName} onChange={e => setTeamName(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-white/50 text-[10px] font-bold tracking-widest uppercase mb-2">Tag (optional)</label>
                    <input placeholder="e.g. NBL" value={teamTag} onChange={e => setTeamTag(e.target.value)} maxLength={10} className={inputClass} />
                  </div>
                </div>
                {error && <p className="text-red-400 text-xs mt-4">{error}</p>}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => run(() => tournamentsApi.createTeam(t.slug, { name: teamName.trim(), tag: teamTag.trim() }))}
                    disabled={submitting || !teamName.trim()}
                    className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black py-3 rounded-xl text-sm tracking-widest uppercase transition-all cursor-pointer"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                  >
                    {submitting ? "Creating…" : "Create Team"}
                  </button>
                  <button
                    onClick={() => { setMode("idle"); setError(""); }}
                    className="px-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 font-bold py-3 rounded-xl text-xs tracking-widest uppercase transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!myReg && mode === "join" && (
              <div className="rounded-2xl border border-white/10 p-8" style={{ background: "rgba(255,255,255,0.03)" }}>
                <h3 className="text-white font-black text-lg uppercase mb-5" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  Join With Invite Code
                </h3>
                <label className="block text-white/50 text-[10px] font-bold tracking-widest uppercase mb-2">Invite Code *</label>
                <input
                  placeholder="e.g. A1B2C3D4"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  className={inputClass + " font-mono tracking-widest text-center text-lg"}
                  maxLength={12}
                />
                {error && <p className="text-red-400 text-xs mt-4">{error}</p>}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => run(() => tournamentsApi.joinTeam(t.slug, inviteCode.trim()))}
                    disabled={submitting || !inviteCode.trim()}
                    className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black py-3 rounded-xl text-sm tracking-widest uppercase transition-all cursor-pointer"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                  >
                    {submitting ? "Joining…" : "Join Team"}
                  </button>
                  <button
                    onClick={() => { setMode("idle"); setError(""); }}
                    className="px-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 font-bold py-3 rounded-xl text-xs tracking-widest uppercase transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* ── Registered solo (shouldn't happen for team tournaments, guard anyway) ── */}
            {myReg?.kind === "solo" && (
              <div className="rounded-2xl border border-white/10 p-8 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                <p className="text-white/40 text-sm">You're registered as a solo entrant.</p>
              </div>
            )}

            {/* ── On a team ── */}
            {myReg?.kind === "team" && (() => {
              const team = myReg.team;
              const isCaptain = myReg.is_captain;
              const otherMembers = team.members.filter((m: any) => !m.is_captain);
              const capacityLabel = t.team_size ? `${team.member_count} / ${t.team_size} players` : `${team.member_count} player${team.member_count !== 1 ? "s" : ""}`;

              return (
                <div className="space-y-6">
                  {/* Team header card */}
                  <div
                    className="rounded-2xl border p-6"
                    style={{ background: "rgba(52,211,153,0.05)", borderColor: "rgba(52,211,153,0.25)" }}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <p className="text-green-400/70 text-[10px] font-bold tracking-widest uppercase mb-1">Your Team</p>
                        <h2 className="text-white font-black text-2xl uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                          {team.name} {team.tag && <span className="text-white/30 text-base">[{team.tag}]</span>}
                        </h2>
                        <p className="text-white/30 text-xs mt-1">{capacityLabel}</p>
                      </div>
                      {isCaptain && (
                        <div
                          className="rounded-xl px-4 py-2.5 flex items-center gap-3"
                          style={{ background: "rgba(0,0,0,0.25)" }}
                        >
                          <div>
                            <p className="text-white/30 text-[9px] font-bold tracking-widest uppercase">Invite Code</p>
                            <p className="font-mono text-purple-300 font-black tracking-widest">{team.invite_code}</p>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard?.writeText(team.invite_code);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 1500);
                            }}
                            className="text-white/40 hover:text-white transition-colors cursor-pointer"
                            title="Copy invite code"
                          >
                            {copied ? (
                              <span className="text-green-400 text-xs font-bold">✓ Copied</span>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                              </svg>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Roster */}
                  <div>
                    <p className="text-white/30 text-[10px] font-bold tracking-widest uppercase mb-3">Roster</p>
                    <div className="space-y-2">
                      {team.members.map((m: any) => (
                        <MemberRow
                          key={m.id}
                          member={m}
                          isCaptain={m.is_captain}
                          canKick={isCaptain}
                          kicking={kickingId === m.player.id}
                          onKick={() => {
                            if (confirm(`Remove ${m.player.discord_username} from the team?`)) {
                              handleKick(m.player.id);
                            }
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {error && (
                    <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                      ⚠ {error}
                    </p>
                  )}

                  {/* Captain controls */}
                  {isCaptain ? (
                    <div className="rounded-2xl border border-white/10 p-6 space-y-4" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <p className="text-white/30 text-[10px] font-bold tracking-widest uppercase">Captain Controls</p>

                      <button
                        onClick={() => run(() => tournamentsApi.regenerateInviteCode(t.slug))}
                        disabled={submitting}
                        className="w-full sm:w-auto text-white/40 hover:text-white/70 text-xs font-bold tracking-widest uppercase transition-colors cursor-pointer disabled:opacity-40"
                      >
                        ↻ Regenerate Invite Code
                      </button>

                      {otherMembers.length > 0 && (
                        <div>
                          <label className="block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-2">
                            Transfer Captaincy
                          </label>
                          <div className="flex gap-2">
                            <select
                              value={transferTarget}
                              onChange={e => setTransferTarget(e.target.value)}
                              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white/70 text-sm cursor-pointer focus:outline-none focus:border-purple-500/60"
                              style={{ background: "rgba(26,0,48,0.9)" }}
                            >
                              <option value="" style={{ background: "#1a0030" }}>Select a member…</option>
                              {otherMembers.map((m: any) => (
                                <option key={m.player.id} value={m.player.id} style={{ background: "#1a0030" }}>
                                  {m.player.discord_username}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => {
                                if (!transferTarget) return;
                                if (confirm("Transfer captaincy? You will become a regular member.")) {
                                  run(() => tournamentsApi.transferCaptain(t.slug, Number(transferTarget)));
                                }
                              }}
                              disabled={submitting || !transferTarget}
                              className="shrink-0 bg-purple-600/20 hover:bg-purple-600/30 disabled:opacity-30 border border-purple-500/30 text-purple-300 text-xs font-bold px-4 py-2.5 rounded-xl tracking-widest uppercase transition-all cursor-pointer"
                            >
                              Transfer
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="pt-2 border-t border-white/5">
                        {!confirmDisband ? (
                          <button
                            onClick={() => setConfirmDisband(true)}
                            disabled={submitting}
                            className="text-red-400/60 hover:text-red-400 text-xs font-bold tracking-widest uppercase transition-colors cursor-pointer disabled:opacity-40"
                          >
                            Disband Team
                          </button>
                        ) : (
                          <div
                            className="rounded-xl border p-4 space-y-3"
                            style={{ background: "rgba(248,113,113,0.06)", borderColor: "rgba(248,113,113,0.25)" }}
                          >
                            <p className="text-red-400/80 text-xs leading-relaxed">
                              This removes every member and cancels your team's registration. This cannot be undone.
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => run(() => tournamentsApi.disbandTeam(t.slug))}
                                disabled={submitting}
                                className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-black py-2.5 rounded-lg text-xs tracking-widest uppercase transition-all cursor-pointer disabled:opacity-40"
                              >
                                {submitting ? "Disbanding…" : "Confirm Disband"}
                              </button>
                              <button
                                onClick={() => setConfirmDisband(false)}
                                className="px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 font-bold py-2.5 rounded-lg text-xs tracking-widest uppercase transition-all cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (confirm("Leave this team?")) run(() => tournamentsApi.leaveTeam(t.slug));
                      }}
                      disabled={submitting}
                      className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400/80 hover:text-red-400 font-black py-3 rounded-xl text-sm tracking-widest uppercase transition-all cursor-pointer disabled:opacity-40"
                      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                    >
                      {submitting ? "Leaving…" : "Leave Team"}
                    </button>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
