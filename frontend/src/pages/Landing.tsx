import { useState, useEffect, useRef } from "react";
import { joins, matches as matchesApi, news as newsApi, games as gamesApi } from "../utils/api";

// ── Types ─────────────────────────────────────────────────────────────────────
interface GameData {
  id: number;
  title: string;
  slug: string;
  publisher: string;
  genre: string;
  banner: string;
  logo: string;
  overlay_color: string;
  ranks: string[];
  is_active: boolean;
  display_order: number;
}

function NBLLogoFull({ size = 48, className = "", color = "white" }: { size?: number; className?: string; color?: "white" | "black" | "purple" }) {
  const filter =
    color === "white" ? "brightness(0) invert(1)" :
    color === "black" ? "brightness(0)" :
    "brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(240deg)";
  return (
    <img src="/images/logo.svg" alt="NBLEsport logo" width={size} height={size}
      className={className} style={{ objectFit: "contain", filter }} />
  );
}

function Counter({ end, duration = 2000, suffix = "" }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [started, end, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href}
      className="text-gray-300 hover:text-purple-400 font-medium tracking-wider text-sm uppercase transition-colors duration-200 relative group">
      {children}
      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-purple-400 group-hover:w-full transition-all duration-300" />
    </a>
  );
}

// ── Dynamic Game Card ─────────────────────────────────────────────────────────
function GameCard({ game }: { game: GameData }) {
  const overlayColor = game.overlay_color || 'rgba(80,0,160,0.35)';
  return (
    <div className="group relative border border-white/10 rounded-2xl overflow-hidden hover:-translate-y-1 transition-all duration-300 cursor-pointer" style={{ background: "#13001f" }}>
      <div className="h-40 relative" style={{ overflow: "hidden", borderRadius: "16px 16px 0 0" }}>
        {game.banner ? (
          <img src={game.banner} alt={game.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            style={{ willChange: "transform", transform: "translateZ(0)" }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: overlayColor }}>
            <span className="text-white/20 text-4xl font-black" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {game.title.charAt(0)}
            </span>
          </div>
        )}
        <div className="absolute inset-0" style={{ background: `linear-gradient(to top, #13001f 0%, ${overlayColor} 50%, transparent 100%)` }} />
      </div>
      <div className="p-5">
        <h3 className="text-white font-bold text-lg mb-1 tracking-wide" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{game.title}</h3>
        <p className="text-white/40 text-xs mb-4">
          {[game.genre, game.publisher].filter(Boolean).join(' · ')}
        </p>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/25 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />Active
        </span>
      </div>
    </div>
  );
}

// ── Games Section (dynamic) ───────────────────────────────────────────────────
function GamesSection() {
  const [gameList, setGameList] = useState<GameData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (gamesApi.list() as Promise<any>)
      .then(r => setGameList(r.games || []))
      .catch(() => setGameList([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section id="games" className="py-24">
        <div className="max-w-7xl mx-auto px-6 flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </section>
    );
  }

  return (
    <section id="games" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-purple-400 font-bold tracking-widest uppercase text-sm mb-4 block">Our Games</span>
          <h2 className="text-5xl md:text-6xl font-black uppercase leading-tight mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            We Play to <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-violet-300">Win</span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">Competing at the highest level across the most exciting esports titles</p>
        </div>
        {gameList.length === 0 ? (
          <p className="text-center text-white/30 text-lg tracking-wider uppercase py-12">No active games yet.</p>
        ) : (
          <div className={`grid gap-6 ${gameList.length === 1 ? 'max-w-sm mx-auto' : gameList.length === 2 ? 'sm:grid-cols-2 max-w-2xl mx-auto' : 'sm:grid-cols-2 md:grid-cols-3'}`}>
            {gameList.map(g => <GameCard key={g.id} game={g} />)}
          </div>
        )}
      </div>
    </section>
  );
}

function PillarCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="group relative bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-purple-500/40 transition-all duration-300">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/5 to-violet-600/5 opacity-0 group-hover:opacity-100 transition-all duration-300" />
      <div className="relative">
        <div className="w-14 h-14 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mb-6 group-hover:bg-purple-500/30 transition-colors duration-300">
          {icon}
        </div>
        <h3 className="text-white font-bold text-xl mb-3" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{title}</h3>
        <p className="text-gray-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function StatCard({ value, label, suffix }: { value: number; label: string; suffix?: string }) {
  return (
    <div className="text-center">
      <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-violet-300 mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
        <Counter end={value} suffix={suffix || "+"} />
      </div>
      <p className="text-gray-400 uppercase tracking-widest text-sm font-medium">{label}</p>
    </div>
  );
}

function TickerTape() {
  const items = ["ROCKET LEAGUE", "VALORANT", "FORTNITE", "NBL ESPORTS", "MATCH DAY", "COMPETE", "BUILD", "DOMINATE", "FOR THE WIN", "NEBULA"];
  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden border-y border-purple-500/30 bg-purple-950/40 py-3">
      <div className="flex animate-ticker whitespace-nowrap">
        {doubled.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-4 px-4 text-purple-300 font-bold tracking-widest text-sm uppercase">
            {item}<span className="text-purple-500">◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}

const GAME_COLORS: Record<string, string> = {
  rocket_league: "#60b8ff",
  valorant: "#ff7080",
  fortnite: "#ffd700",
};

function MatchCard({ rival, type, game, date, time, status, score, winner, gameColor }: {
  rival: string; type: string; game: string;
  date: string; time: string; status: "upcoming" | "live" | "completed";
  score?: string; winner?: "nbl" | "rival" | "draw" | "";
  gameColor?: string;
}) {
  const color = gameColor || GAME_COLORS[game] || "#a855f7";
  const nblLoser = status === "completed" && winner === "rival";
  const rivalLoser = status === "completed" && winner === "nbl";

  const formattedDate = (() => {
    try {
      return new Date(date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    } catch { return date; }
  })();

  return (
    <div className="group flex items-center gap-5 bg-white/5 border border-white/8 hover:border-purple-500/35 rounded-2xl px-7 py-6 transition-all duration-200">
      <div className={`flex flex-col items-center gap-2 min-w-[100px] transition-opacity duration-200 ${nblLoser ? "opacity-40" : ""}`}>
        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center ${winner === "nbl" ? "ring-2 ring-purple-400/60" : ""}`}>
          <img src="/images/logo.svg" alt="NBL" width={32} height={32} style={{ filter: "brightness(0) invert(1)" }} />
        </div>
        <span className="text-white text-xs font-bold tracking-widest uppercase">NBL Esports</span>
      </div>
      <div className="flex-1 text-center">
        {status === "completed" ? (
          <>
            <div className="text-white font-black text-3xl tracking-widest" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{score}</div>
            <div className="text-white/30 text-xs font-bold tracking-widest uppercase mt-1">{type}</div>
          </>
        ) : (
          <>
            <div className="text-purple-400 font-black text-3xl tracking-wider" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>VS</div>
            <div className="text-white/30 text-xs font-bold tracking-widest uppercase mt-1">{type}</div>
          </>
        )}
      </div>
      <div className={`flex flex-col items-center gap-2 min-w-[100px] transition-opacity duration-200 ${rivalLoser ? "opacity-40" : ""}`}>
        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br from-pink-600 to-pink-500 flex items-center justify-center text-white font-black text-2xl ${winner === "rival" ? "ring-2 ring-pink-400/60" : ""}`}>
          {rival.charAt(0).toUpperCase()}
        </div>
        <span className="text-white text-xs font-bold tracking-widest uppercase text-center">{rival}</span>
      </div>
      <div className="ml-auto text-right min-w-[130px]">
        <span className="inline-flex items-center text-xs font-bold px-3 py-1 rounded-full mb-2 uppercase tracking-wider"
          style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>{game.replace('_', ' ')}</span>
        <div className="text-white font-bold text-sm">{formattedDate}</div>
        <div className="text-purple-400 text-sm mt-0.5">{time}</div>
      </div>
      {status === "live" && (
        <span className="ml-4 inline-flex items-center justify-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 uppercase tracking-widest" style={{ minWidth: "110px" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />Live
        </span>
      )}
      {status === "upcoming" && (
        <span className="ml-4 inline-flex items-center justify-center text-xs font-bold px-4 py-2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-widest" style={{ minWidth: "110px" }}>Upcoming</span>
      )}
      {status === "completed" && winner === "nbl" && (
        <span className="ml-4 inline-flex items-center justify-center text-xs font-bold px-4 py-2 rounded-full bg-green-500/15 text-green-400 border border-green-500/25 uppercase tracking-widest" style={{ minWidth: "110px" }}>Win</span>
      )}
      {status === "completed" && winner === "rival" && (
        <span className="ml-4 inline-flex items-center justify-center text-xs font-bold px-4 py-2 rounded-full uppercase tracking-widest"
          style={{ minWidth: "110px", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.1)" }}>Loss</span>
      )}
      {status === "completed" && winner === "draw" && (
        <span className="ml-4 inline-flex items-center justify-center text-xs font-bold px-4 py-2 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/25 uppercase tracking-widest" style={{ minWidth: "110px" }}>Draw</span>
      )}
    </div>
  );
}

function NewsCard({ tag, title, description, date, thumbnail }: { tag: string; title: string; description: string; date: string; thumbnail: string }) {
  const formattedDate = (() => {
    try { return new Date(date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) }
    catch { return date }
  })();
  return (
    <div className="group border border-white/8 hover:border-purple-500/40 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1" style={{ background: "rgba(255,255,255,0.04)" }}>
      <div className="relative overflow-hidden h-48">
        {thumbnail
          ? <img src={thumbnail} alt={tag} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" style={{ willChange: "transform", transform: "translateZ(0)" }} />
          : <div className="w-full h-full bg-purple-950/40 flex items-center justify-center"><span className="text-purple-500/40 text-4xl font-black" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>NBL</span></div>
        }
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(13,0,20,0.9), transparent)" }} />
        <span className="absolute top-3 left-3 text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full bg-purple-500/25 text-purple-300 border border-purple-500/40">{tag}</span>
      </div>
      <div className="p-5">
        {title && <h3 className="text-white font-bold text-sm mb-2 line-clamp-1">{title}</h3>}
        <p className="text-white/55 text-sm leading-relaxed mb-4 line-clamp-3">{description}</p>
        <span className="text-xs text-white/25 tracking-wider">{formattedDate}</span>
      </div>
    </div>
  );
}

function LiveNewsSection() {
  const [newsList, setNewsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (newsApi.list() as Promise<any>)
      .then(r => setNewsList(r.news || []))
      .catch(() => setNewsList([]))
      .finally(() => setLoading(false));
  }, []);

  const displayed = newsList.slice(0, 3);

  return (
    <section id="news" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-purple-400 font-bold tracking-widest uppercase text-sm mb-4 block">Latest News</span>
          <h2 className="text-5xl md:text-6xl font-black uppercase leading-tight mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            News & <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-violet-300">Updates</span>
          </h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayed.length === 0 ? (
          <p className="text-center text-white/30 text-lg tracking-wider uppercase py-12">No news yet. Check back soon.</p>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {displayed.map((n: any) => (
              <NewsCard key={n.id} tag={n.tag} title={n.title} description={n.description} date={n.published_at} thumbnail={n.thumbnail || ""} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Dynamic Join Form ─────────────────────────────────────────────────────────
function JoinForm() {
  const [gameList, setGameList] = useState<GameData[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [formData, setFormData] = useState({
    username: "", ingame_username: "", game: "", discord_username: "", rank: "", email: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
 
  // Load ONLY games open for registration
  useEffect(() => {
    (gamesApi.listOpen() as Promise<any>)
      .then(r => setGameList(r.games || []))
      .catch(() => setGameList([]))
      .finally(() => setLoadingGames(false));
  }, []);
 
  const selectedGame = gameList.find(g => g.slug === formData.game);
  const ranks = selectedGame?.ranks || [];
 
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Reset rank whenever game changes
    setFormData(prev => ({ ...prev, [name]: value, ...(name === "game" ? { rank: "" } : {}) }));
  };
 
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    try {
      await joins.submit(formData);
      setStatus("success");
      setFormData({ username: "", ingame_username: "", game: "", discord_username: "", rank: "", email: "" });
    } catch {
      setStatus("error");
    }
  };
 
  const inputClass =
    "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm " +
    "focus:outline-none focus:border-purple-500/60 focus:bg-purple-500/5 transition-all duration-200";
  const labelClass = "block text-white/60 text-xs font-bold tracking-widest uppercase mb-2";
 
  // ── No games open → show a friendly closed message instead of an empty form ──
  if (!loadingGames && gameList.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-purple-500/15 border border-purple-500/25 flex items-center justify-center mx-auto mb-6">
          {/* Lock icon */}
          <svg className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>
        <h3 className="text-white text-2xl font-black uppercase mb-3"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          Registrations Closed
        </h3>
        <p className="text-gray-400 max-w-sm mx-auto leading-relaxed">
          We're not currently recruiting for any game. Follow us on Discord and Instagram to be the first to know when spots open up.
        </p>
        <div className="flex items-center justify-center gap-4 mt-8">
          <a href="https://discord.com/invite/rXannpAynS" target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 font-bold px-5 py-2.5 rounded-xl text-sm tracking-wider uppercase transition-all duration-200">
            Join Discord
          </a>
          <a href="https://www.instagram.com/nblesport/" target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/30 text-pink-300 font-bold px-5 py-2.5 rounded-xl text-sm tracking-wider uppercase transition-all duration-200">
            Instagram
          </a>
        </div>
      </div>
    );
  }
 
  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-10">
      {status === "success" ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-white text-2xl font-black uppercase mb-3"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Application Sent!</h3>
          <p className="text-gray-400">We'll review your application and get back to you soon.</p>
          <button onClick={() => setStatus("idle")}
            className="mt-8 text-purple-400 text-sm font-bold tracking-wider uppercase hover:text-purple-300 transition-colors">
            Submit Another →
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Username</label>
              <input type="text" name="username" value={formData.username} onChange={handleChange}
                required placeholder="Your username" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>In-Game Username</label>
              <input type="text" name="ingame_username" value={formData.ingame_username} onChange={handleChange}
                required placeholder="Your in-game name" className={inputClass} />
            </div>
 
            {/* Game — only registration_open games */}
            <div>
              <label className={labelClass}>Game</label>
              <select name="game" value={formData.game} onChange={handleChange} required
                className={inputClass + " cursor-pointer"}>
                <option value="" disabled>
                  {loadingGames ? "Loading…" : "Select a game"}
                </option>
                {gameList.map(g => (
                  <option key={g.slug} value={g.slug} className="bg-[#1a0030]">{g.title}</option>
                ))}
              </select>
            </div>
 
            <div>
              <label className={labelClass}>Discord Username</label>
              <input type="text" name="discord_username" value={formData.discord_username} onChange={handleChange}
                required placeholder="username#0000" className={inputClass} />
            </div>
 
            {/* Rank — driven by selected game's rank list */}
            <div>
              <label className={labelClass}>Rank</label>
              <select name="rank" value={formData.rank} onChange={handleChange} required
                disabled={!formData.game || ranks.length === 0}
                className={inputClass + " cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"}>
                <option value="" disabled>
                  {!formData.game
                    ? "Select a game first"
                    : ranks.length === 0
                    ? "No ranks defined"
                    : "Select your rank"}
                </option>
                {ranks.map(r => (
                  <option key={r} value={r} className="bg-[#1a0030]">{r}</option>
                ))}
              </select>
            </div>
 
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange}
                required placeholder="your@email.com" className={inputClass} />
            </div>
          </div>
 
          {status === "error" && (
            <p className="mt-4 text-red-400 text-sm text-center">Something went wrong. Please try again.</p>
          )}
 
          <div className="mt-8">
            <button type="submit" disabled={status === "loading"}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black py-4 rounded-xl text-sm tracking-widest uppercase transition-all duration-200 hover:shadow-2xl hover:shadow-purple-500/40 hover:-translate-y-0.5"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "1rem" }}>
              {status === "loading" ? "Submitting…" : "Apply Now"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Match Schedule ─────────────────────────────────────────────────────────────
function MatchSchedule() {
  const [matchList, setMatchList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (matchesApi.list() as Promise<any>)
      .then(r => setMatchList(r.matches || []))
      .catch(() => setMatchList([]))
      .finally(() => setLoading(false));
  }, []);

  const displayed = matchList.slice(0, 5);

  return (
    <section id="schedule" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="inline-block border border-purple-500/40 text-purple-400 font-bold tracking-widest uppercase text-xs px-4 py-2 rounded-full mb-6">Playoff Schedule</span>
          <h2 className="text-5xl md:text-6xl font-black uppercase leading-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Match <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-violet-300">Schedule</span>
          </h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/30 text-lg tracking-wider uppercase">No matches scheduled yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mb-10">
            {displayed.map((m: any) => (
              <MatchCard key={m.id} rival={m.rival} type={m.match_type} game={m.game}
                date={m.date} time={m.time} status={m.status} score={m.score} winner={m.winner} />
            ))}
          </div>
        )}
        {matchList.length > 5 && (
          <div className="text-center">
            <a href="#" className="inline-flex items-center gap-2 bg-white/5 hover:bg-purple-500/15 border border-white/10 hover:border-purple-500/40 text-white font-bold px-8 py-3 rounded-full text-sm tracking-widest uppercase transition-all duration-200">
              View Full Match History →
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0d0014] text-white overflow-x-hidden" style={{ fontFamily: "'Barlow', sans-serif" }}>

      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#0d0014]/95 backdrop-blur-md shadow-lg shadow-purple-900/30" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="#" className="flex items-center gap-3 group">
            <NBLLogoFull size={40} className="group-hover:scale-110 transition-transform duration-200" />
            <div>
              <span className="block text-white font-black text-xl tracking-wider" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>NBL<span className="text-purple-400">ESPORT</span></span>
              <span className="block text-purple-400/60 text-xs tracking-widest uppercase">Nebula Esport</span>
            </div>
          </a>
          <div className="hidden md:flex items-center gap-8">
            <NavLink href="#games">Games</NavLink>
            <NavLink href="#schedule">Schedule</NavLink>
            <NavLink href="#about">About</NavLink>
            <NavLink href="#news">News</NavLink>
            <NavLink href="#join">Join Us</NavLink>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <a href="#join" className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-2.5 rounded-lg text-sm tracking-wider uppercase transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/30">Join Now</a>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden w-10 h-10 flex flex-col justify-center gap-1.5 items-center">
            <span className={`block w-6 h-0.5 bg-white transition-all duration-200 ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block w-6 h-0.5 bg-white transition-all duration-200 ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`block w-6 h-0.5 bg-white transition-all duration-200 ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-[#0d0014]/98 border-t border-white/10 px-6 py-6 flex flex-col gap-6">
            {["Games", "Schedule", "About", "News", "Join Us"].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(" ", "")}`} onClick={() => setMenuOpen(false)}
                className="text-gray-300 hover:text-purple-400 font-semibold tracking-wider uppercase transition-colors">{item}</a>
            ))}
            <a href="#join" className="bg-purple-600 text-white font-bold px-6 py-3 rounded-lg text-center tracking-wider uppercase">Join Now</a>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img src="/images/hero-bg.jpg" alt="" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0d0014]/60 via-[#0d0014]/20 to-[#0d0014]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d0014]/80 via-transparent to-[#0d0014]/80" />
        </div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-violet-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "linear-gradient(rgba(168,85,247,1) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-12 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/40 rounded-full px-4 py-2 mb-8">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-purple-300 text-sm font-semibold tracking-wider uppercase">Season Active</span>
            </div>
            <h1 className="text-7xl md:text-8xl font-black leading-none mb-6 uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              <span className="block text-white">COMPETE.</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-violet-400 to-purple-300">BUILD.</span>
              <span className="block text-white">DOMINATE.</span>
            </h1>
            <p className="text-gray-300 text-lg leading-relaxed mb-10 max-w-xl">
              NBLEsport is an Algerian premier esports organization competing across{" "}
              <span className="text-purple-400 font-semibold">Rocket League</span>,{" "}
              <span className="text-purple-400 font-semibold">Valorant</span>, and{" "}
              <span className="text-purple-400 font-semibold">Fortnite</span> and much more games. We scout talent, build champions, and create opportunities.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#join" className="group relative bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 py-4 rounded-xl text-sm tracking-widest uppercase transition-all duration-200 hover:shadow-2xl hover:shadow-purple-500/40 hover:-translate-y-0.5">
                Join the Team
              </a>
              <a href="#about" className="border border-white/20 hover:border-purple-500/60 text-white font-bold px-8 py-4 rounded-xl text-sm tracking-widest uppercase transition-all duration-200 hover:bg-purple-500/10 hover:-translate-y-0.5">Learn More</a>
            </div>
          </div>

          <div className="relative flex justify-center items-center">
            <img src="/images/rocket-car.png" alt="Rocket League Car" className="w-full max-w-lg object-contain drop-shadow-2xl animate-float" />
            <div className="absolute bottom-4 left-0 right-0 mx-auto w-max bg-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-2xl">
              <div className="text-xs text-purple-400 font-bold tracking-widest uppercase mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Match Day · Rocket League
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/30 border border-purple-500/50 flex items-center justify-center mb-1"><NBLLogoFull size={28} /></div>
                  <span className="text-white text-xs font-bold">NBL</span>
                </div>
                <div className="text-purple-300 font-black text-xl" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>VS</div>
                <div className="text-center">
                  <div className="w-10 h-10 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center mb-1"><span className="text-lg">🎮</span></div>
                  <span className="text-white text-xs font-bold">RIVAL</span>
                </div>
                <div className="text-xs text-gray-400 ml-2">
                  <div>Mission: Victory</div>
                  <div className="text-purple-400 font-semibold">For the win →</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <span className="text-gray-500 text-xs tracking-widest uppercase">Scroll</span>
          <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      <TickerTape />

      {/* STATS */}
      <section id="stats" className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950/20 to-transparent" />
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 md:gap-8">
            <StatCard value={3} label="Games Competed" suffix="+" />
            <StatCard value={50} label="Players Supported" suffix="+" />
            <StatCard value={100} label="Matches Played" suffix="+" />
            <StatCard value={2} label="Years Active" suffix="+" />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6"><div className="h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" /></div>

      {/* GAMES — dynamic from DB */}
      <GamesSection />

      {/* SCHEDULE */}
      <MatchSchedule />

      {/* ABOUT */}
      <section id="about" className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950/10 to-transparent" />
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="text-center mb-16">
            <span className="text-purple-400 font-bold tracking-widest uppercase text-sm mb-4 block">What We Do</span>
            <h2 className="text-5xl md:text-6xl font-black uppercase leading-tight mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-violet-300">Mission</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <PillarCard icon={<svg className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" /></svg>}
              title="Compete in Tournaments" description="We field competitive rosters across Valorant, Fortnite, and Rocket League — pushing for victory in every match day, every season." />
            <PillarCard icon={<svg className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>}
              title="Build & Support Teams" description="We scout raw talent and cultivate champions. Our coaching staff provides structured training, VOD review, and mental performance support." />
            <PillarCard icon={<svg className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>}
              title="Create Opportunities" description="From players to streamers and content creators — we open doors. NBLEsport is a launchpad for the next generation of esports professionals across Algeria." />
          </div>
        </div>
      </section>

      {/* BANNER */}
      <div className="py-6 mx-6 md:mx-12 rounded-3xl overflow-hidden relative my-4">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900 via-violet-900 to-purple-900" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.05) 10px, rgba(255,255,255,.05) 20px)" }} />
        <div className="relative max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <NBLLogoFull size={48} color="white" />
            <div>
              <div className="text-purple-300 text-xs font-bold tracking-widest uppercase mb-1">Season 2026</div>
              <h3 className="text-white text-2xl font-black uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>We're Recruiting · Open Tryouts Now</h3>
              <p className="text-purple-200/60 text-sm mt-1">Rocket League · Valorant · Fortnite — all divisions open</p>
            </div>
          </div>
          <a href="#join" className="shrink-0 bg-white text-purple-900 font-black px-6 py-3 rounded-xl text-sm tracking-widest uppercase hover:bg-purple-100 transition-all duration-200">Apply Now →</a>
        </div>
      </div>

      {/* NEWS */}
      <LiveNewsSection />

      {/* JOIN — with dynamic games */}
      <section id="join" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/20 to-[#0d0014]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl" />
        <div className="relative max-w-4xl mx-auto px-6">
          <div className="text-center mb-14">
            <NBLLogoFull size={64} className="mx-auto mb-6" />
            <h2 className="text-5xl md:text-6xl font-black uppercase mb-4 leading-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Ready to Join the{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-violet-300 to-purple-400">Nebula?</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">Fill in your details below and our team will reach out to you.</p>
          </div>
          <JoinForm />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <NBLLogoFull size={36} />
              <div>
                <span className="block text-white font-black tracking-wider text-lg" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>NBL<span className="text-purple-400">ESPORT</span></span>
                <span className="block text-gray-500 text-xs tracking-widest">© 2026 NBLEsport. All rights reserved.</span>
              </div>
            </div>
            <div className="flex items-center gap-6 text-gray-400 text-sm">
              <span className="text-purple-400 font-semibold">@NBLEsport</span>
              <span>·</span><span>Rocket League</span><span>·</span><span>Valorant</span><span>·</span><span>Fortnite</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="#" className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:border-purple-500/50 hover:bg-purple-500/10 transition-all duration-200">
                <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </a>
              <a href="https://www.instagram.com/nblesport/" className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:border-purple-500/50 hover:bg-purple-500/10 transition-all duration-200">
                <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="5" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
              </a>
              <a href="https://discord.com/invite/rXannpAynS" className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:border-purple-500/50 hover:bg-purple-500/10 transition-all duration-200">
                <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}