// ProductPage.tsx - Updated for dynamic variants
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

interface GalleryImage {
  id: number;
  url: string;
  display_order: number;
}

interface CustomField {
  label: string;
  placeholder: string;
  required: boolean;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  category: string;
  banner: string;
  variant_config: VariantConfig;
  images: GalleryImage[];
  custom_fields: CustomField[];
  track_stock: boolean;
  total_stock: number | null;
  is_active: boolean;
  is_featured: boolean;
}

const WILAYA_CHOICES: [string, string][] = [
  ["01","Adrar"],["02","Chlef"],["03","Laghouat"],["04","Oum El Bouaghi"],
  ["05","Batna"],["06","Béjaïa"],["07","Biskra"],["08","Béchar"],
  ["09","Blida"],["10","Bouira"],["11","Tamanrasset"],["12","Tébessa"],
  ["13","Tlemcen"],["14","Tiaret"],["15","Tizi Ouzou"],["16","Alger"],
  ["17","Djelfa"],["18","Jijel"],["19","Sétif"],["20","Saïda"],
  ["21","Skikda"],["22","Sidi Bel Abbès"],["23","Annaba"],["24","Guelma"],
  ["25","Constantine"],["26","Médéa"],["27","Mostaganem"],["28","M'Sila"],
  ["29","Mascara"],["30","Ouargla"],["31","Oran"],["32","El Bayadh"],
  ["33","Illizi"],["34","Bordj Bou Arréridj"],["35","Boumerdès"],
  ["36","El Tarf"],["37","Tindouf"],["38","Tissemsilt"],["39","El Oued"],
  ["40","Khenchela"],["41","Souk Ahras"],["42","Tipaza"],["43","Mila"],
  ["44","Aïn Defla"],["45","Naâma"],["46","Aïn Témouchent"],
  ["47","Ghardaïa"],["48","Relizane"],["49","El M'Ghair"],["50","El Meniaa"],
  ["51","Ouled Djellal"],["52","Bordj Badji Mokhtar"],["53","Béni Abbès"],
  ["54","Timimoun"],["55","Touggourt"],["56","Djanet"],["57","In Salah"],
  ["58","In Guezzam"],
];

// ── Order Form ────────────────────────────────────────────────────────────────

function OrderForm({
  product,
  selectedVariant,
  customValues,
  onCustomValuesChange,
  onSuccess,
}: {
  product: Product;
  selectedVariant: VariantCombination | null;
  customValues: Record<string, string>;
  onCustomValuesChange: (values: Record<string, string>) => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    wilaya: "",
    address: "",
    quantity: 1,
  });

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const inputClass =
    "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm " +
    "placeholder-white/25 focus:outline-none focus:border-purple-500/60 transition-all duration-200";

  const maxQty = product.track_stock
    ? selectedVariant?.stock ?? 99
    : 999;

  const customFieldsValid = (product.custom_fields || []).every(
    f => !f.required || (customValues[f.label] || "").trim() !== ""
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.phone) return;
    if (!customFieldsValid) return;

    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/shop/order/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: product.id,
          product_name: product.name,
          variant_values: selectedVariant?.values || {},
          quantity: form.quantity,
          custom_field_values: customValues,
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          wilaya: form.wilaya,
          address: form.address,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit");
      }
      setStatus("success");
      onSuccess();
    } catch (e: any) {
      setErrorMsg(e.message || "Something went wrong.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="text-center py-10">
        <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3
          className="text-white font-black text-2xl uppercase mb-2"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Order Placed!
        </h3>
        <p className="text-white/40 text-sm max-w-xs mx-auto">
          We've received your order and will get in touch with you shortly to confirm.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-white/50 text-[10px] font-bold tracking-widest uppercase mb-2">
            Full Name *
          </label>
          <input
            type="text"
            required
            placeholder="Your full name"
            value={form.full_name}
            onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-white/50 text-[10px] font-bold tracking-widest uppercase mb-2">
            Email *
          </label>
          <input
            type="email"
            required
            placeholder="your@email.com"
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-white/50 text-[10px] font-bold tracking-widest uppercase mb-2">
            Phone *
          </label>
          <input
            type="tel"
            required
            placeholder="+213 5XX XXX XXX"
            value={form.phone}
            onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-white/50 text-[10px] font-bold tracking-widest uppercase mb-2">
            Wilaya
          </label>
          <select
            value={form.wilaya}
            onChange={e => setForm(p => ({ ...p, wilaya: e.target.value }))}
            className={inputClass + " cursor-pointer"}
            style={{ background: "rgba(26,0,48,0.8)" }}
          >
            <option value="">Select wilaya…</option>
            {WILAYA_CHOICES.map(([val, label]) => (
              <option key={val} value={val} style={{ background: "#1a0030" }}>
                {val} — {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-white/50 text-[10px] font-bold tracking-widest uppercase mb-2">
          Delivery Address
        </label>
        <textarea
          placeholder="Street address, apartment, city…"
          value={form.address}
          onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
          className={inputClass + " resize-none h-20"}
        />
      </div>

      <div>
        <label className="block text-white/50 text-[10px] font-bold tracking-widest uppercase mb-2">
          Quantity
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setForm(p => ({ ...p, quantity: Math.max(1, p.quantity - 1) }))}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white
                       hover:bg-purple-500/15 hover:border-purple-500/40 transition-all
                       text-lg font-bold cursor-pointer"
          >
            −
          </button>
          <span
            className="text-white font-black text-xl w-8 text-center"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {form.quantity}
          </span>
          <button
            type="button"
            onClick={() =>
              setForm(p => ({ ...p, quantity: p.quantity < maxQty ? p.quantity + 1 : p.quantity }))
            }
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white
                       hover:bg-purple-500/15 hover:border-purple-500/40 transition-all
                       text-lg font-bold cursor-pointer"
          >
            +
          </button>
          {product.track_stock && selectedVariant && (
            <span className="text-white/30 text-xs ml-2">
              {selectedVariant.stock} in stock
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between py-3 border-t border-white/8">
        <span className="text-white/50 text-sm font-bold tracking-widest uppercase">Total</span>
        <span
          className="text-purple-300 font-black text-2xl"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          {(parseFloat(product.price) * form.quantity).toLocaleString()} DZD
        </span>
      </div>

      {errorMsg && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          ⚠ {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "loading" || !customFieldsValid}
        className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50
                   disabled:cursor-not-allowed text-white font-black py-4 rounded-xl
                   text-sm tracking-widest uppercase transition-all duration-200
                   hover:shadow-2xl hover:shadow-purple-500/30 hover:-translate-y-0.5 cursor-pointer"
        style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "1rem" }}
      >
        {status === "loading" ? "Placing Order…" : "Place Order"}
      </button>
      <p className="text-white/20 text-xs text-center">
        Our team will contact you to confirm payment and delivery details.
      </p>
    </form>
  );
}

// ── Personalisation Section ────────────────────────────────────────────────────

function PersonalisationSection({
  product,
  customValues,
  onCustomValuesChange,
}: {
  product: Product;
  customValues: Record<string, string>;
  onCustomValuesChange: (values: Record<string, string>) => void;
}) {
  const inputClass =
    "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm " +
    "placeholder-white/25 focus:outline-none focus:border-purple-500/60 transition-all duration-200";

  if (!product.custom_fields || product.custom_fields.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-8">
      <div className="flex items-center gap-2">
        <span className="text-purple-400/70 text-sm">✏</span>
        <span className="text-white/50 text-[10px] font-bold tracking-widest uppercase">
          Personalisation
        </span>
      </div>

      <div
        className="rounded-2xl border border-purple-500/20 p-4 space-y-3"
        style={{ background: "rgba(168,85,247,0.05)" }}
      >
        {product.custom_fields.map(field => (
          <div key={field.label}>
            <label className="block text-white/50 text-[10px] font-bold tracking-widest uppercase mb-2">
              {field.label}
              {field.required && (
                <span className="text-purple-400 ml-1">*</span>
              )}
            </label>
            <input
              type="text"
              required={field.required}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}…`}
              value={customValues[field.label] || ""}
              onChange={e =>
                onCustomValuesChange({
                  ...customValues,
                  [field.label]: e.target.value,
                })
              }
              className={inputClass}
              style={{ textTransform: "uppercase" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Product Page ─────────────────────────────────────────────────────────

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [selectedVariant, setSelectedVariant] = useState<Record<string, string>>({});
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/shop/${id}/`)
      .then(r => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data: Product) => {
        setProduct(data);
        setSelectedImage(data.banner || data.images?.[0]?.url || "");
        setCustomValues(
          Object.fromEntries((data.custom_fields || []).map(f => [f.label, ""]))
        );
        // Initialize selected variant with empty values
        setSelectedVariant(
          Object.fromEntries((data.variant_config?.attributes || []).map(a => [a.name, ""]))
        );
        setTimeout(() => setRevealed(true), 80);
      })
      .catch(() => navigate("/shop", { replace: true }))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0014] flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-full border-2 animate-spin mx-auto mb-4"
            style={{ borderColor: "rgba(168,85,247,1) transparent transparent transparent" }}
          />
          <p className="text-white/25 text-xs tracking-widest uppercase">Loading product…</p>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const allImages = [
    ...(product.banner ? [{ id: -1, url: product.banner, display_order: -1 }] : []),
    ...(product.images || []),
  ];

  // Find matching variant combination
  const matchingVariant = product.variant_config?.variants.find(v =>
    Object.entries(selectedVariant).every(([key, val]) => v.values[key] === val)
  ) || null;

  const inStock = !product.track_stock
    ? true
    : matchingVariant
    ? matchingVariant.stock > 0
    : (product.total_stock ?? 0) > 0;

  return (
    <div
      className="min-h-screen bg-[#0d0014] text-white overflow-x-hidden"
      style={{ fontFamily: "'Barlow', sans-serif" }}
    >
      <style>{`
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Navbar */}
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
            onClick={() => navigate("/shop")}
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors
                       text-xs font-bold tracking-wider uppercase group cursor-pointer"
          >
            <svg
              className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Store
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

      {/* Main content */}
      <div
        className="max-w-7xl mx-auto px-6 pt-28 pb-24"
        style={{
          opacity: revealed ? 1 : 0,
          transform: revealed ? "none" : "translateY(20px)",
          transition: "opacity 0.7s ease-out, transform 0.7s ease-out",
        }}
      >
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left: image gallery */}
          <div className="space-y-4">
            <div
              className="relative rounded-3xl overflow-hidden border border-white/10"
              style={{ aspectRatio: "4/3", background: "rgba(168,85,247,0.06)" }}
            >
              {selectedImage ? (
                <img
                  key={selectedImage}
                  src={selectedImage}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  style={{ animation: "fadeIn 0.3s ease-out" }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-8xl opacity-10">🛍</span>
                </div>
              )}

              {product.is_featured && (
                <div className="absolute top-4 left-4">
                  <span className="inline-flex items-center gap-1 text-[10px] font-black tracking-widest
                                   uppercase px-3 py-1.5 rounded-full bg-yellow-500/20 text-yellow-400
                                   border border-yellow-500/35">
                    ⭐ Featured
                  </span>
                </div>
              )}

              {!inStock && (
                <div className="absolute top-4 right-4">
                  <span className="inline-flex items-center gap-1 text-[10px] font-black tracking-widest
                                   uppercase px-3 py-1.5 rounded-full bg-red-500/25 text-red-300
                                   border border-red-500/40 backdrop-blur-sm">
                    Out of Stock
                  </span>
                </div>
              )}
            </div>

            {allImages.length > 1 && (
              <div className="flex gap-3 flex-wrap">
                {allImages.map(img => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(img.url)}
                    className="w-20 h-20 rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer shrink-0"
                    style={{
                      borderColor: selectedImage === img.url ? "rgba(168,85,247,0.8)" : "rgba(255,255,255,0.1)",
                      boxShadow: selectedImage === img.url ? "0 0 12px rgba(168,85,247,0.4)" : "none",
                    }}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: product info + order form */}
          <div className="lg:sticky lg:top-28">
            {/* Category + stock badges */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span
                className="text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-full"
                style={{ background: "rgba(168,85,247,0.2)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.4)" }}
              >
                {product.category}
              </span>

              {product.track_stock && !inStock && (
                <span className="text-[10px] font-black tracking-widest uppercase px-3 py-1.5
                                 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
                  Out of Stock
                </span>
              )}

              {!product.track_stock && (
                <span className="text-[10px] font-black tracking-widest uppercase px-3 py-1.5
                                 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/25">
                  ∞ Always Available
                </span>
              )}

              {(product.custom_fields || []).length > 0 && (
                <span className="text-[10px] font-black tracking-widest uppercase px-3 py-1.5
                                 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25
                                 flex items-center gap-1">
                  ✏ Personalised
                </span>
              )}
            </div>

            {/* Product name */}
            <h1
              className="font-black text-5xl md:text-6xl uppercase leading-none mb-4"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              {product.name}
            </h1>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6">
              <span
                className="font-black text-4xl"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "#c084fc" }}
              >
                {parseFloat(product.price).toLocaleString()} DZD
              </span>
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-white/55 text-base leading-relaxed mb-8">
                {product.description}
              </p>
            )}

            {/* Variant Attributes */}
            {(product.variant_config?.attributes || []).length > 0 && (
              <div className="space-y-5 mb-8">
                {product.variant_config.attributes.map(attr => (
                  <div key={attr.name}>
                    <label className="block text-white/50 text-[10px] font-bold tracking-widest uppercase mb-3">
                      {attr.name}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {attr.values.map(value => {
                        const variantWithValue = product.variant_config.variants.find(v =>
                          v.values[attr.name] === value &&
                          Object.entries(selectedVariant).every(([k, v]) =>
                            k === attr.name || v === "" || v === product.variant_config.variants.find(var_ =>
                              var_.values[k] === v && var_.values[attr.name] === value
                            )?.values[k]
                          )
                        );
                        const active = selectedVariant[attr.name] === value;
                        const noStock = product.track_stock && (!variantWithValue || variantWithValue.stock === 0);

                        return (
                          <button
                            key={value}
                            onClick={() =>
                              setSelectedVariant(prev => ({
                                ...prev,
                                [attr.name]: active ? "" : value,
                              }))
                            }
                            disabled={noStock}
                            className="px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider
                                       transition-all duration-200 cursor-pointer
                                       disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{
                              background: active ? "rgba(168,85,247,0.35)" : "rgba(255,255,255,0.06)",
                              color: active ? "#c084fc" : "rgba(255,255,255,0.6)",
                              border: active ? "1px solid rgba(168,85,247,0.6)" : "1px solid rgba(255,255,255,0.1)",
                            }}
                          >
                            {value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Stock indicator */}
            {product.track_stock && matchingVariant && (
              <div
                className="flex items-center gap-2 mb-6 px-4 py-2.5 rounded-xl border"
                style={{
                  background:
                    matchingVariant.stock > 5 ? "rgba(52,211,153,0.1)" : matchingVariant.stock > 0 ? "rgba(251,191,36,0.1)" : "rgba(248,113,113,0.1)",
                  borderColor:
                    matchingVariant.stock > 5 ? "rgba(52,211,153,0.25)" : matchingVariant.stock > 0 ? "rgba(251,191,36,0.25)" : "rgba(248,113,113,0.25)",
                  color: matchingVariant.stock > 5 ? "#34d399" : matchingVariant.stock > 0 ? "#fbbf24" : "#f87171",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "currentColor" }} />
                <span className="text-xs font-bold tracking-wider">
                  {matchingVariant.stock > 5
                    ? `${matchingVariant.stock} in stock`
                    : matchingVariant.stock > 0
                    ? `Only ${matchingVariant.stock} left!`
                    : "Out of stock"}
                </span>
              </div>
            )}

            {/* Personalisation section */}
            <PersonalisationSection
              product={product}
              customValues={customValues}
              onCustomValuesChange={setCustomValues}
            />

            {/* Order form card */}
            <div
              className="rounded-3xl border border-white/10 p-6"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <h3
                className="text-white font-black text-lg uppercase mb-5"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                {orderSuccess ? "Order Confirmed" : "Order Now"}
              </h3>
              <OrderForm
                product={product}
                selectedVariant={matchingVariant}
                customValues={customValues}
                onCustomValuesChange={setCustomValues}
                onSuccess={() => setOrderSuccess(true)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/8 py-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <button
            onClick={() => navigate("/shop")}
            className="text-white/30 hover:text-white text-xs font-bold tracking-widest uppercase
                       transition-colors flex items-center gap-2 group cursor-pointer"
          >
            <svg
              className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Store
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