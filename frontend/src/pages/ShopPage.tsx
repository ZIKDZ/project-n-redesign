// ShopPage.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { asset } from "../utils/asset";

// ── Types ─────────────────────────────────────────────────────────────────────

interface VariantAttribute {
  name: string;
  type: 'select' | 'text';
  values: string[];
}

interface VariantCombination {
  id: string;
  values: Record<string, string>;
  stock: number;
  sku?: string;
}

interface VariantConfig {
  attributes: VariantAttribute[];
  variants: VariantCombination[];
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  category: string;
  banner: string;
  variant_config: VariantConfig;
  track_stock: boolean;
  total_stock: number | null;
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  jersey: "Jersey",
  hoodie: "Hoodie",
  cap: "Cap",
  accessory: "Accessory",
  other: "Other",
};

const CATEGORY_ICONS: Record<string, string> = {
  jersey: "👕",
  hoodie: "🧥",
  cap: "🧢",
  accessory: "🎮",
  other: "✨",
};

// ── Product Card ──────────────────────────────────────────────────────────────
function ProductCard({ product, onClick }: { product: Product; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  // Get all unique attribute values from variants - handles both schemas
  const getAllAttributeValues = (attributeName: string): string[] => {
    const config = product.variant_config;
    if (!config || !config.variants) return [];
    
    // Check if it's the new flat schema (variants have {attribute, value})
    const isNewSchema = config.variants.some((v: any) => v?.attribute !== undefined);
    
    if (isNewSchema) {
      // New flat schema - filter by attribute name
      return [...new Set(
        config.variants
          .filter((v: any) => v?.attribute === attributeName)
          .map((v: any) => v?.value)
          .filter(Boolean)
      )] as string[];
    } else {
      // Old schema - variants have {values: {AttributeName: "value"}}
      return [...new Set(
        config.variants
          .map((v: any) => v?.values?.[attributeName])
          .filter(Boolean)
      )] as string[];
    }
  };

  // Display first 2 attribute types
  const attributeTypes = product.variant_config?.attributes.slice(0, 2) || [];
  
  const inStock = !product.track_stock
    ? true
    : (product.total_stock ?? 0) > 0;

  return (
    <div
      className="group relative cursor-pointer"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="relative rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col"
        style={{
          background: "rgba(255,255,255,0.04)",
          borderColor: hovered ? "rgba(168,85,247,0.4)" : "rgba(255,255,255,0.08)",
          transform: hovered ? "translateY(-4px)" : "translateY(0)",
          boxShadow: hovered ? "0 20px 48px rgba(168,85,247,0.15)" : "none",
        }}
      >
        {/* Featured badge */}
        {product.is_featured && (
          <div className="absolute top-3 left-3 z-10">
            <span className="inline-flex items-center gap-1 text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/35">
              ⭐ Featured
            </span>
          </div>
        )}

        {/* Out of stock overlay (only when tracking is on) */}
        {product.track_stock && !inStock && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl"
            style={{ background: "rgba(13,0,20,0.6)", backdropFilter: "blur(2px)" }}
          >
            <span className="text-white/60 font-black text-sm uppercase tracking-widest">
              Out of Stock
            </span>
          </div>
        )}

        {/* Top accent */}
        <div
          className="h-0.5 w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(168,85,247,0.8), transparent)",
            opacity: hovered ? 1 : 0.3,
            transition: "opacity 0.3s",
          }}
        />

        {/* Banner */}
        <div
          className="relative overflow-hidden"
          style={{ height: "260px", background: "rgba(168,85,247,0.08)" }}
        >
          {product.banner ? (
            <img
              src={product.banner}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500"
              style={{ transform: hovered ? "scale(1.05)" : "scale(1)" }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-6xl opacity-20">
                {CATEGORY_ICONS[product.category] || "🛍"}
              </span>
            </div>
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(13,0,20,0.85) 0%, transparent 60%)",
            }}
          />
          {/* Category chip */}
          <div className="absolute bottom-3 right-3">
            <span
              className="text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full"
              style={{
                background: "rgba(168,85,247,0.25)",
                color: "#c084fc",
                border: "1px solid rgba(168,85,247,0.4)",
              }}
            >
              {CATEGORY_LABELS[product.category] || product.category}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="p-5 flex flex-col flex-1">
          <h3
            className="text-white font-black text-xl uppercase leading-tight mb-1"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {product.name}
          </h3>

          {product.description && (
            <p className="text-white/40 text-xs leading-relaxed mb-3 line-clamp-2">
              {product.description}
            </p>
          )}

          {/* Attribute Values */}
          {attributeTypes.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {attributeTypes.map((attr, attrIdx) => (
                <div key={attr.name} className="flex items-center gap-1.5">
                  {getAllAttributeValues(attr.name).slice(0, 3).map((val) => (
                    <span
                      key={`${attr.name}-${val}`}
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/6 text-white/50 border border-white/10"
                    >
                      {val}
                    </span>
                  ))}
                  {getAllAttributeValues(attr.name).length > 3 && (
                    <span className="text-[10px] text-white/30">
                      +{getAllAttributeValues(attr.name).length - 3}
                    </span>
                  )}
                  {attrIdx < attributeTypes.length - 1 && (
                    <span className="text-white/20 text-[10px] mx-1">·</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Variant count hint */}
          {(product.variant_config?.variants.length ?? 0) > 0 && (
            <div className="text-[10px] text-white/30 mb-3">
              {product.variant_config.variants.length} combination{product.variant_config.variants.length !== 1 ? 's' : ''}
            </div>
          )}

          {/* Stock indicator (only when tracking is on) */}
          {product.track_stock && (
            <div className="flex items-center gap-1.5 mb-3 text-[10px]">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  background: inStock ? "#34d399" : "#ef4444",
                }}
              />
              <span
                style={{
                  color: inStock ? "#86efac" : "#fca5a5",
                }}
                className="font-semibold"
              >
                {inStock ? `${product.total_stock} in stock` : "Out of stock"}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/6">
            <span
              className="font-black text-2xl"
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                color: "#c084fc",
              }}
            >
              {parseFloat(product.price).toLocaleString()} DZD
            </span>
            <span
              className="flex items-center gap-1.5 text-xs font-black tracking-widest uppercase px-4 py-2 rounded-xl transition-all duration-200"
              style={{
                background: hovered ? "rgba(168,85,247,0.3)" : "rgba(168,85,247,0.12)",
                color: "#c084fc",
                border: "1px solid rgba(168,85,247,0.35)",
              }}
            >
              View
              <svg
                className="w-3 h-3 group-hover:translate-x-0.5 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Shop Page ────────────────────────────────────────────────────────────
export default function ShopPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setLoading(true);
    const url = filter ? `/api/shop/?category=${filter}` : "/api/shop/";
    fetch(url)
      .then((r) => r.json())
      .then((r) => {
        console.log("Products loaded:", r.products);
        if (r.products && r.products.length > 0) {
          console.log("First product variant_config:", r.products[0].variant_config);
        }
        setProducts(r.products || []);
      })
      .catch((err) => {
        console.error("Error loading products:", err);
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, [filter]);

  const featured = products.filter((p) => p.is_featured && p.is_active);
  const all = products.filter((p) => p.is_active); // Only show active products
  const categories = ["", "jersey", "hoodie", "cap", "accessory", "other"];

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
      `}</style>

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
            <svg
              className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
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
            style={{ filter: "brightness(0) invert(1)", opacity: 0.7 }}
          />
          <span
            className="text-white/40 text-xs font-black tracking-widest uppercase hidden sm:block"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            NBL<span className="text-purple-400">STORE</span>
          </span>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="relative overflow-hidden" style={{ minHeight: "340px" }}>
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(168,85,247,0.15) 0%, transparent 60%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(168,85,247,1) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,1) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(13,0,20,0.5) 0%, rgba(13,0,20,1) 100%)",
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl pointer-events-none"
          style={{
            width: "600px",
            height: "300px",
            background: "rgba(168,85,247,0.15)",
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-12 text-center">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-6 text-xs font-bold tracking-widest uppercase"
            style={{
              background: "rgba(168,85,247,0.2)",
              color: "#c084fc",
              border: "1px solid rgba(168,85,247,0.4)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-purple-400" />
            Official Merch
          </div>
          <h1
            className="font-black text-6xl md:text-8xl uppercase leading-none mb-4"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            <span className="text-white">NBL </span>
            <span
              className="text-transparent bg-clip-text"
              style={{
                backgroundImage: "linear-gradient(135deg, #c084fc, white)",
              }}
            >
              Store
            </span>
          </h1>
          <p className="text-white/40 text-base max-w-md mx-auto">
            Rep the Nebula. Official jerseys, hoodies, caps and accessories.
          </p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="max-w-7xl mx-auto px-6 mb-10">
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className="px-5 py-2 rounded-full text-xs font-black tracking-widest uppercase transition-all duration-200 cursor-pointer"
              style={{
                background:
                  filter === cat ? "rgba(168,85,247,0.3)" : "rgba(255,255,255,0.05)",
                color:
                  filter === cat ? "#c084fc" : "rgba(255,255,255,0.4)",
                border:
                  filter === cat
                    ? "1px solid rgba(168,85,247,0.5)"
                    : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {cat === ""
                ? "All"
                : `${CATEGORY_ICONS[cat]} ${CATEGORY_LABELS[cat]}`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Featured ── */}
      {featured.length > 0 && !filter && (
        <div className="max-w-7xl mx-auto px-6 mb-16">
          <div className="flex items-center gap-4 mb-8">
            <div
              className="h-px flex-1"
              style={{
                background:
                  "linear-gradient(to right, rgba(168,85,247,0.4), transparent)",
              }}
            />
            <h2
              className="text-white font-black text-xl uppercase tracking-widest"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              ⭐ Featured
            </h2>
            <div
              className="h-px flex-1"
              style={{
                background:
                  "linear-gradient(to left, rgba(168,85,247,0.4), transparent)",
              }}
            />
          </div>
          <div
            className={`grid gap-6 ${
              featured.length === 1
                ? "max-w-sm mx-auto"
                : featured.length === 2
                ? "sm:grid-cols-2 max-w-2xl mx-auto"
                : "sm:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {featured.map((p, i) => (
              <div
                key={p.id}
                style={{
                  animation: `fadeSlideUp 0.5s ease-out ${i * 60}ms both`,
                }}
              >
                <ProductCard
                  product={p}
                  onClick={() => navigate(`/shop/${p.id}`)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── All Products ── */}
      <div className="max-w-7xl mx-auto px-6 pb-24">
        {!filter && featured.length > 0 && (
          <div className="flex items-center gap-4 mb-8">
            <div
              className="h-px flex-1"
              style={{
                background:
                  "linear-gradient(to right, rgba(168,85,247,0.4), transparent)",
              }}
            />
            <h2
              className="text-white font-black text-xl uppercase tracking-widest"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              All Products
            </h2>
            <div
              className="h-px flex-1"
              style={{
                background:
                  "linear-gradient(to left, rgba(168,85,247,0.4), transparent)",
              }}
            />
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="text-center">
              <div
                className="w-12 h-12 rounded-full border-2 animate-spin mx-auto mb-4"
                style={{
                  borderColor:
                    "rgba(168,85,247,1) transparent transparent transparent",
                }}
              />
              <p className="text-white/25 text-xs tracking-widest uppercase">
                Loading products…
              </p>
            </div>
          </div>
        ) : all.length === 0 ? (
          <div
            className="text-center py-24 rounded-3xl border border-white/8"
            style={{ background: "rgba(255,255,255,0.02)" }}
          >
            <div className="text-6xl mb-4 opacity-20">🛍</div>
            <h3
              className="text-white font-black text-2xl uppercase mb-3"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              {filter ? "No products in this category" : "Store Coming Soon"}
            </h3>
            <p className="text-white/30 text-sm max-w-sm mx-auto">
              {filter
                ? "Try a different category above."
                : "We're stocking up. Check back soon for official NBLEsport merch."}
            </p>
            {filter && (
              <button
                onClick={() => setFilter("")}
                className="mt-6 text-purple-400 hover:text-purple-300 text-sm font-bold tracking-widest uppercase transition-colors cursor-pointer"
              >
                View All Products →
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {all.map((p, i) => (
              <div
                key={p.id}
                style={{
                  animation: `fadeSlideUp 0.5s ease-out ${i * 50}ms both`,
                }}
              >
                <ProductCard
                  product={p}
                  onClick={() => navigate(`/shop/${p.id}`)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-white/8 py-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="text-white/30 hover:text-white text-xs font-bold tracking-widest uppercase transition-colors flex items-center gap-2 group cursor-pointer"
          >
            <svg
              className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to NBLEsport
          </button>
          <span
            className="font-black text-sm uppercase tracking-widest text-purple-400"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            NBL<span className="text-white">STORE</span>
          </span>
        </div>
      </div>
    </div>
  );
}