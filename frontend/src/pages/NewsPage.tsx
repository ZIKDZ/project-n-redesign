import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { news as newsApi } from "../utils/api";
import { asset } from "../utils/asset";
import Footer from "../components/footer";

// ── Types ─────────────────────────────────────────────────────────────────────
interface NewsItem {
  id: number;
  title: string;
  tag: string;
  description: string;
  thumbnail?: string;
  published_at: string;
  is_pinned: boolean;
}

// ── Shared Config & Icon (consistent with NewsArticlePage) ─────────────────────
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
  announcement: { color: "#a855f7", glow: "rgba(168,85,247,0.3)" },
  award:        { color: "#ffd700", glow: "rgba(255,215,0,0.3)" },
  community:    { color: "#34d399", glow: "rgba(52,211,153,0.3)" },
  match:        { color: "#f87171", glow: "rgba(248,113,113,0.3)" },
  roster:       { color: "#60a5fa", glow: "rgba(96,165,250,0.3)" },
  update:       { color: "#fb923c", glow: "rgba(251,146,60,0.3)" },
};

// ── NewsCard Component (extracted & adapted from Landing) ─────────────────────
function NewsCard({
  tag,
  title,
  description,
  date,
  thumbnail,
  isPinned,
  onReadMore,
}: {
  tag: string;
  title: string;
  description: string;
  date: string;
  thumbnail: string;
  isPinned: boolean;
  onReadMore?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const cfg = TAG_CONFIG[tag] || TAG_CONFIG.announcement;

  const formattedDate = (() => {
    try {
      return new Date(date + "T00:00:00").toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return date;
    }
  })();

  return (
    <div
      className="group border rounded-2xl overflow-hidden transition-all duration-300 flex flex-col cursor-pointer relative"
      style={{
        background: isPinned ? "rgba(251,191,36,0.04)" : "rgba(255,255,255,0.04)",
        borderColor: hovered
          ? `${cfg.color}50`
          : isPinned
            ? "rgba(251,191,36,0.2)"
            : "rgba(255,255,255,0.08)",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hovered ? `0 16px 40px ${isPinned ? "rgba(251,191,36,0.2)" : cfg.glow}` : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onReadMore}
    >
      {/* ✅ Pinned badge overlay */}
      {isPinned && (
        <span
          className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full"
          style={{
            background: "rgba(251,191,36,0.15)",
            color: "#fbbf24",
            border: "1px solid rgba(251,191,36,0.3)",
          }}
        >
          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.822 2.267a.5.5 0 0 0-.356 0L3.667 4.5a.5.5 0 0 0-.334.467v3.416a.5.5 0 0 0 .334.467l2.389.866v4.45a.5.5 0 0 0 .334.467l3.444 1.25a.5.5 0 0 0 .356 0l3.444-1.25a.5.5 0 0 0 .334-.467V9.716l2.389-.866a.5.5 0 0 0 .334-.467V4.967a.5.5 0 0 0-.334-.467L9.822 2.267z" />
          </svg>
          PINNED
        </span>
      )}

      {/* Thumbnail */}
      <div className="relative overflow-hidden h-48 shrink-0">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500"
            style={{ transform: hovered ? "scale(1.06)" : "scale(1)" }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-5xl"
            style={{ background: `${cfg.color}15` }}
          >
            <NBLIcon color={cfg.color} size={48} />
          </div>
        )}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(13,0,20,0.88), transparent 55%)" }}
        />
        <span
          className="absolute top-3 left-3 inline-flex items-center gap-1.5 text-xs font-black tracking-widest uppercase px-3 py-1 rounded-full"
          style={{
            background: `${cfg.color}20`,
            color: cfg.color,
            border: `1px solid ${cfg.color}40`,
          }}
        >
          <NBLIcon color={cfg.color} size={10} />
          {tag}
        </span>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col flex-1">
        <h3
          className="text-white font-black text-base uppercase leading-tight mb-2 line-clamp-2"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          {title}
        </h3>
        <p className="text-white/50 text-sm leading-relaxed mb-4 line-clamp-3 flex-1">
          {description}
        </p>
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/6">
          <span className="text-xs text-white/25 tracking-wider">{formattedDate}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReadMore?.();
            }}
            className="flex items-center gap-1.5 text-xs font-black tracking-widest uppercase px-4 py-2 rounded-xl transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
            style={{
              background: hovered ? `${cfg.color}15` : "rgba(255,255,255,0.05)",
              color: hovered ? cfg.color : "rgba(255,255,255,0.6)",
              border: `1px solid ${hovered ? cfg.color + "40" : "rgba(255,255,255,0.1)"}`,
            }}
          >
            Read More
            <svg className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────
const TAGS = ["all", "announcement", "award", "community", "match", "roster", "update"];
const PAGE_SIZE = 9;

// ── Main Component ────────────────────────────────────────────────────────────
export default function NewsPage() {
  const navigate = useNavigate();
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState("all");
  const [page, setPage] = useState(1);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setLoading(true);
    (newsApi.list() as Promise<any>)
      .then((r) => setNewsList(r.news || []))
      .catch(() => setNewsList([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [activeTag]);

  const filtered = activeTag === "all"
    ? newsList
    : newsList.filter((n) => n.tag === activeTag);

  // ✅ Pinned posts come first (API already orders this way, but enforce client-side too)
  const sorted = [...filtered].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const navAccent = TAG_CONFIG[activeTag !== "all" ? activeTag : "announcement"]?.color ?? "#a855f7";

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
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
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
            alt="NBLEsport"
            width={24}
            height={24}
            style={{ filter: "brightness(0) invert(1)", opacity: 0.7 }}
          />
          <span
            className="text-white/40 text-xs font-black tracking-widest uppercase hidden sm:block"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            NBL<span style={{ color: navAccent }}>ESPORT</span>
          </span>
          {activeTag !== "all" && (
            <div className="ml-auto flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
                style={{ background: `${navAccent}20`, color: navAccent, border: `1px solid ${navAccent}35` }}
              >
                <NBLIcon color={navAccent} size={12} />
                {activeTag}
              </span>
            </div>
          )}
        </div>
      </nav>

      {/* Header */}
      <div className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950/30 to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-600/15 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <span className="text-purple-400 font-bold tracking-widest uppercase text-sm mb-4 block">
            NBL Esport
          </span>
          <h1
            className="text-6xl md:text-7xl font-black uppercase leading-tight mb-4"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            News &{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-violet-300">
              Updates
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Stay up to date with everything happening at NBL Esport
          </p>
        </div>
      </div>

      {/* Tag Filters */}
      <div className="max-w-7xl mx-auto px-6 mb-10">
        <div className="flex flex-wrap gap-2 justify-center">
          {TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={`px-5 py-2.5 rounded-full text-xs font-black tracking-widest uppercase transition-all duration-200 cursor-pointer border ${
                activeTag === tag
                  ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/30"
                  : "bg-white/5 border-white/10 text-white/50 hover:border-purple-500/40 hover:text-white"
              }`}
            >
              {tag === "all" ? "ALL" : tag.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 pb-24">
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-white/30 text-xl tracking-wider uppercase">
              No {activeTag !== "all" ? activeTag : ""} posts found.
            </p>
            {activeTag !== "all" && (
              <button
                onClick={() => setActiveTag("all")}
                className="mt-6 text-purple-400 text-sm font-bold tracking-wider uppercase hover:text-purple-300 transition-colors cursor-pointer"
              >
                Clear filter →
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-white/30 text-sm tracking-wider uppercase mb-8 text-center">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length} posts
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginated.map((n) => (
                <NewsCard
                  key={n.id}
                  tag={n.tag}
                  title={n.title}
                  description={n.description}
                  date={n.published_at}
                  thumbnail={n.thumbnail || ""}
                  isPinned={n.is_pinned}
                  onReadMore={() => navigate(`/news/${n.id}`)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-16 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center disabled:opacity-30 hover:border-purple-500/40 transition-colors cursor-pointer"
                >
                  ←
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                  const isVisible = p === 1 || p === totalPages || Math.abs(p - page) <= 1;
                  const showEllipsisBefore = p === 2 && page > 3;
                  const showEllipsisAfter = p === totalPages - 1 && page < totalPages - 2;

                  if (!isVisible) return null;
                  if (showEllipsisBefore || showEllipsisAfter) {
                    return <span key={p} className="px-3 text-white/30">…</span>;
                  }

                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-11 h-11 rounded-2xl text-sm font-bold border transition-all ${
                        p === page
                          ? "bg-purple-600 border-purple-500 text-white"
                          : "bg-white/5 border-white/10 hover:border-purple-500/40"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center disabled:opacity-30 hover:border-purple-500/40 transition-colors cursor-pointer"
                >
                  →
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
