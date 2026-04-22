import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { news as newsApi } from "../utils/api";
import { asset } from "../utils/asset";

// ── Types ─────────────────────────────────────────────────────────────────────
interface NewsItem {
  id: number;
  title: string;
  tag: string;
  description: string;
  thumbnail: string;
  published_at: string;
  is_published: boolean;
}

// ── Tag config ────────────────────────────────────────────────────────────────
function NBLIcon({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <img
      src={asset("images/logo.svg")}
      width={size}
      height={size}
      alt=""
      style={{ filter: "brightness(0) invert(1)", opacity: 0.9, flexShrink: 0 }}
    />
  );
}

const TAG_CONFIG: Record<string, { color: string; glow: string }> = {
  announcement: { color: "#a855f7", glow: "rgba(168,85,247,0.3)"  },
  award:        { color: "#ffd700", glow: "rgba(255,215,0,0.3)"   },
  community:    { color: "#34d399", glow: "rgba(52,211,153,0.3)"  },
  match:        { color: "#f87171", glow: "rgba(248,113,113,0.3)" },
  roster:       { color: "#60a5fa", glow: "rgba(96,165,250,0.3)"  },
  update:       { color: "#fb923c", glow: "rgba(251,146,60,0.3)"  },
};

// ── Paragraph parser — makes the description readable ─────────────────────────
function ArticleBody({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n\n+/)
    .flatMap(block => block.split(/\n/))
    .filter(Boolean);

  return (
    <div className="space-y-5">
      {paragraphs.map((para, i) => (
        <p
          key={i}
          className="text-white/75 leading-[1.85] text-[1.05rem]"
          style={{ fontFamily: "'Barlow', sans-serif" }}
        >
          {para}
        </p>
      ))}
    </div>
  );
}

// ── Related Card ──────────────────────────────────────────────────────────────
function RelatedCard({ item, onClick }: { item: NewsItem; onClick: () => void }) {
  const cfg = TAG_CONFIG[item.tag] || TAG_CONFIG.announcement;
  const [hovered, setHovered] = useState(false);

  const formattedDate = (() => {
    try {
      return new Date(item.published_at + "T00:00:00").toLocaleDateString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
      });
    } catch { return item.published_at; }
  })();

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full text-left group"
    >
      <div
        className="rounded-2xl overflow-hidden border transition-all duration-300"
        style={{
          background: "rgba(255,255,255,0.04)",
          borderColor: hovered ? `${cfg.color}50` : "rgba(255,255,255,0.08)",
          transform: hovered ? "translateY(-3px)" : "translateY(0)",
          boxShadow: hovered ? `0 12px 30px ${cfg.glow}` : "none",
        }}
      >
        <div className="relative h-36 overflow-hidden">
          {item.thumbnail ? (
            <img
              src={item.thumbnail}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-500"
              style={{ transform: hovered ? "scale(1.07)" : "scale(1)" }}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: `${cfg.color}15` }}
            >
              <NBLIcon color={cfg.color} size={32} />
            </div>
          )}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(13,0,20,0.85), transparent)" }}
          />
          <span
            className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full"
            style={{ background: `${cfg.color}25`, color: cfg.color, border: `1px solid ${cfg.color}40` }}
          >
            <NBLIcon color={cfg.color} size={10} />
            {item.tag}
          </span>
        </div>
        <div className="p-4">
          <h4
            className="text-white font-black text-sm uppercase leading-tight line-clamp-2 mb-2"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {item.title}
          </h4>
          <p className="text-white/35 text-xs">{formattedDate}</p>
        </div>
      </div>
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function NewsArticlePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [article,  setArticle]  = useState<NewsItem | null>(null);
  const [related,  setRelated]  = useState<NewsItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [readPct,  setReadPct]  = useState(0);
  const [revealed, setRevealed] = useState(false);
  const articleRef = useRef<HTMLDivElement>(null);

  // Scroll tracking
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 60);
      if (articleRef.current) {
        const rect = articleRef.current.getBoundingClientRect();
        const total = articleRef.current.offsetHeight;
        const scrolled = Math.max(0, -rect.top);
        setReadPct(Math.min(100, Math.round((scrolled / total) * 100)));
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Load data
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setRevealed(false);
    (newsApi.list() as Promise<any>)
      .then(r => {
        const all: NewsItem[] = (r.news || []).filter((n: NewsItem) => n.is_published);
        const found = all.find(n => String(n.id) === id);
        if (!found) { navigate("/", { replace: true }); return; }
        setArticle(found);
        setRelated(all.filter(n => n.id !== found.id && n.tag === found.tag).slice(0, 3));
        setTimeout(() => setRevealed(true), 80);
      })
      .catch(() => navigate("/", { replace: true }))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0014] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div
              className="w-full h-full rounded-full border-2 animate-spin"
              style={{ borderColor: "#a855f7 transparent transparent transparent" }}
            />
            <div
              className="absolute inset-2 rounded-full border-2 animate-spin"
              style={{
                borderColor: "transparent #6d28d9 transparent transparent",
                animationDirection: "reverse",
                animationDuration: "0.6s",
              }}
            />
          </div>
          <p className="text-white/30 tracking-widest uppercase text-xs">Loading Article…</p>
        </div>
      </div>
    );
  }

  if (!article) return null;

  const cfg = TAG_CONFIG[article.tag] || TAG_CONFIG.announcement;

  const formattedDate = (() => {
    try {
      return new Date(article.published_at + "T00:00:00").toLocaleDateString("en-GB", {
        day: "numeric", month: "long", year: "numeric",
      });
    } catch { return article.published_at; }
  })();

  const wordCount = article.description.trim().split(/\s+/).length;
  const readTime  = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div
      className="min-h-screen bg-[#0d0014] text-white overflow-x-hidden"
      style={{ fontFamily: "'Barlow', sans-serif" }}
    >
      {/* ── Read progress bar ──────────────────────────────────────────── */}
      <div
        className="fixed top-0 left-0 z-[60] h-[3px] transition-all duration-100"
        style={{
          width: `${readPct}%`,
          background: `linear-gradient(90deg, ${cfg.color}, #a855f7, ${cfg.color})`,
          boxShadow: `0 0 10px ${cfg.glow}`,
        }}
      />

      {/* ── Navbar ────────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(13,0,20,0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(14px)" : "none",
          boxShadow: scrolled ? "0 1px 0 rgba(255,255,255,0.06)" : "none",
        }}
      >
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-xs font-bold tracking-wider uppercase group"
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
            alt="NBLEsport"
            width={24}
            height={24}
            style={{ filter: "brightness(0) invert(1)", opacity: 0.7 }}
          />
          <span
            className="text-white/40 text-xs font-black tracking-widest uppercase hidden sm:block"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            NBL<span style={{ color: cfg.color }}>ESPORT</span>
          </span>
          <div className="ml-auto flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
              style={{ background: `${cfg.color}20`, color: cfg.color, border: `1px solid ${cfg.color}35` }}
            >
              <NBLIcon color={cfg.color} size={12} />
              {article.tag}
            </span>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ minHeight: "520px" }}>
        {/* Background */}
        {article.thumbnail ? (
          <img
            src={article.thumbnail}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: 0.18 }}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 60% 40%, ${cfg.color}20 0%, transparent 65%)`,
            }}
          />
        )}

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(${cfg.color} 1px, transparent 1px), linear-gradient(90deg, ${cfg.color} 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />

        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, rgba(13,0,20,0.5) 0%, rgba(13,0,20,0.15) 40%, rgba(13,0,20,1) 100%)`,
          }}
        />

        {/* Ambient glow */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl pointer-events-none"
          style={{ width: "500px", height: "260px", background: `${cfg.glow}` }}
        />

        {/* Content */}
        <div
          className="relative z-10 max-w-3xl mx-auto px-6 pt-32 pb-16"
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
          }}
        >
          {/* Tag pill */}
          <div className="flex items-center gap-3 mb-6">
            <span
              className="inline-flex items-center gap-1.5 text-xs font-black tracking-widest uppercase px-4 py-1.5 rounded-full"
              style={{
                background: `${cfg.color}20`,
                color: cfg.color,
                border: `1px solid ${cfg.color}45`,
                boxShadow: `0 0 16px ${cfg.glow}`,
              }}
            >
              <NBLIcon color={cfg.color} size={12} />
              {article.tag}
            </span>
            <span className="text-white/25 text-xs tracking-widest">·</span>
            <span className="text-white/30 text-xs tracking-wider">{readTime} min read</span>
          </div>

          {/* Title */}
          <h1
            className="font-black text-5xl md:text-7xl uppercase leading-[0.9] mb-8 tracking-tight"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {article.title.split(" ").map((word, i, arr) => (
              <span
                key={i}
                style={{
                  color: i === arr.length - 1 ? cfg.color : "white",
                  opacity: revealed ? 1 : 0,
                  transform: revealed ? "none" : "translateY(15px)",
                  display: "inline-block",
                  transition: `opacity 0.5s ease-out ${0.1 + i * 0.06}s, transform 0.5s ease-out ${0.1 + i * 0.06}s`,
                  marginRight: "0.25em",
                }}
              >
                {word}
              </span>
            ))}
          </h1>

          {/* Meta row */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: `${cfg.color}20`, border: `1px solid ${cfg.color}30` }}
              >
                <img
                  src={asset("images/logo.svg")}
                  width={16}
                  height={16}
                  style={{ filter: "brightness(0) invert(1)" }}
                  alt=""
                />
              </div>
              <div>
                <p className="text-white text-xs font-bold">NBLEsport</p>
                <p className="text-white/30 text-[10px] tracking-wider">{formattedDate}</p>
              </div>
            </div>
            <div
              className="h-4 w-px bg-white/15"
            />
            <span className="text-white/30 text-xs tracking-widest">{wordCount} words</span>
          </div>
        </div>
      </div>

      {/* ── Thumbnail ─────────────────────────────────────────────────── */}
      {article.thumbnail && (
        <div
          className="max-w-3xl mx-auto px-6 -mt-8 mb-0 relative z-10"
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? "translateY(0)" : "translateY(30px)",
            transition: "opacity 0.7s ease-out 0.3s, transform 0.7s ease-out 0.3s",
          }}
        >
          <div
            className="rounded-2xl overflow-hidden border"
            style={{
              borderColor: `${cfg.color}30`,
              boxShadow: `0 24px 60px ${cfg.glow}, 0 0 0 1px ${cfg.color}15`,
            }}
          >
            <img
              src={article.thumbnail}
              alt={article.title}
              className="w-full object-cover"
              style={{ maxHeight: "420px" }}
            />
          </div>
        </div>
      )}

      {/* ── Article Body ──────────────────────────────────────────────── */}
      <div
        ref={articleRef}
        className="max-w-3xl mx-auto px-6 py-14"
        style={{
          opacity: revealed ? 1 : 0,
          transition: "opacity 0.8s ease-out 0.4s",
        }}
      >
        {/* Decorative divider */}
        <div className="flex items-center gap-4 mb-10">
          <div className="h-px flex-1" style={{ background: `linear-gradient(to right, ${cfg.color}50, transparent)` }} />
          <span className="text-2xl"><NBLIcon color={cfg.color} size={64} /></span>
          <div className="h-px flex-1" style={{ background: `linear-gradient(to left, ${cfg.color}50, transparent)` }} />
        </div>

        {/* Drop cap first paragraph */}
        <div
          className="prose max-w-none"
          style={{ "--accent": cfg.color } as React.CSSProperties}
        >
          <ArticleBody text={article.description} />
        </div>

        {/* Bottom divider */}
        <div className="flex items-center gap-4 mt-14">
          <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.08)" }} />
          <div className="flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: cfg.color }}
            />
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
          </div>
          <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.08)" }} />
        </div>

        {/* Share / Back strip */}
        <div className="mt-10 flex items-center justify-between flex-wrap gap-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-xs font-bold tracking-wider uppercase group"
          >
            <svg
              className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to NBLEsport
          </button>

          <div className="flex items-center gap-2">
            <span className="text-white/25 text-[10px] tracking-widest uppercase">Share</span>
            <button
              onClick={() => navigator.clipboard?.writeText(window.location.href)}
              className="flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase px-4 py-2 rounded-xl border transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: `${cfg.color}15`,
                color: cfg.color,
                borderColor: `${cfg.color}30`,
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Copy Link
            </button>
          </div>
        </div>
      </div>

      {/* ── Related Articles ──────────────────────────────────────────── */}
      {related.length > 0 && (
        <div
          className="border-t pb-20"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}
        >
          <div className="max-w-5xl mx-auto px-6 pt-16">
            <div className="flex items-center gap-4 mb-10">
              <div
                className="h-px flex-1"
                style={{ background: `linear-gradient(to right, ${cfg.color}40, transparent)` }}
              />
              <h2
                className="text-white font-black text-2xl uppercase tracking-widest"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                More <span style={{ color: cfg.color }}>Like This</span>
              </h2>
              <div
                className="h-px flex-1"
                style={{ background: `linear-gradient(to left, ${cfg.color}40, transparent)` }}
              />
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
              {related.map(item => (
                <RelatedCard
                  key={item.id}
                  item={item}
                  onClick={() => navigate(`/news/${item.id}`)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Footer strip ─────────────────────────────────────────────── */}
      <div
        className="border-t py-8"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="text-white/25 hover:text-white text-xs font-bold tracking-wider uppercase transition-colors flex items-center gap-2 group"
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
            style={{ color: cfg.color, fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            NBL<span className="text-white">ESPORT</span>
          </span>
        </div>
      </div>
    </div>
  );
}