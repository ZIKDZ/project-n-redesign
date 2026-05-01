// ProductPage.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { asset } from "../utils/asset";

// ── Types ─────────────────────────────────────────────────────────────────────

interface VariantAttribute {
  name: string
}

interface Variant {
  id: string
  attribute: string
  value: string
  stock: number
}

interface VariantConfig {
  attributes: VariantAttribute[]
  variants: Variant[]
}

interface GalleryImage {
  id: number
  url: string
  display_order: number
}

interface CustomField {
  label: string
  placeholder: string
  required: boolean
}

interface Product {
  id: number
  name: string
  description: string
  price: string
  category: string
  banner: string
  variant_config: VariantConfig
  images: GalleryImage[]
  custom_fields: CustomField[]
  track_stock: boolean
  total_stock: number | null
  is_active: boolean
  is_featured: boolean
}

const WILAYA_CHOICES: [string, string][] = [
  ["01", "Adrar"],
  ["02", "Chlef"],
  ["03", "Laghouat"],
  ["04", "Oum El Bouaghi"],
  ["05", "Batna"],
  ["06", "Béjaïa"],
  ["07", "Biskra"],
  ["08", "Béchar"],
  ["09", "Blida"],
  ["10", "Bouira"],
  ["11", "Tamanrasset"],
  ["12", "Tébessa"],
  ["13", "Tlemcen"],
  ["14", "Tiaret"],
  ["15", "Tizi Ouzou"],
  ["16", "Alger"],
  ["17", "Djelfa"],
  ["18", "Jijel"],
  ["19", "Sétif"],
  ["20", "Saïda"],
  ["21", "Skikda"],
  ["22", "Sidi Bel Abbès"],
  ["23", "Annaba"],
  ["24", "Guelma"],
  ["25", "Constantine"],
  ["26", "Médéa"],
  ["27", "Mostaganem"],
  ["28", "M'Sila"],
  ["29", "Mascara"],
  ["30", "Ouargla"],
  ["31", "Oran"],
  ["32", "El Bayadh"],
  ["33", "Illizi"],
  ["34", "Bordj Bou Arréridj"],
  ["35", "Boumerdès"],
  ["36", "El Tarf"],
  ["37", "Tindouf"],
  ["38", "Tissemsilt"],
  ["39", "El Oued"],
  ["40", "Khenchela"],
  ["41", "Souk Ahras"],
  ["42", "Tipaza"],
  ["43", "Mila"],
  ["44", "Aïn Defla"],
  ["45", "Naâma"],
  ["46", "Aïn Témouchent"],
  ["47", "Ghardaïa"],
  ["48", "Relizane"],
  ["49", "Timimoun"],
  ["50", "Bordj Badji Mokhtar"],
  ["51", "Ouled Djellal"],
  ["52", "Béni Abbès"],
  ["53", "In Salah"],
  ["54", "In Guezzam"],
  ["55", "Touggourt"],
  ["56", "Djanet"],
  ["57", "El M'Ghair"],
  ["58", "El Meniaa"],
  ["59", "Aflou"],
  ["60", "Barika"],
  ["61", "El Kantara"],
  ["62", "Bir El Ater"],
  ["63", "El Abiodh Sidi Cheikh"],
  ["64", "Ksar Chellala"],
  ["65", "Ain Ouessara"],
  ["66", "M'Sila"],
  ["67", "Ksar El Boukhari"],
  ["68", "Bou Saâda"],
  ["69", "El Abiodh Sidi Cheikh"],
]

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Normalise whatever shape variant_config arrives in from the API.
 * Handles both the new flat schema AND the old schema.
 */
function normaliseVariantConfig(raw: any): VariantConfig {
  if (!raw || typeof raw !== "object") {
    return { attributes: [], variants: [] }
  }

  const rawAttrs    = Array.isArray(raw.attributes) ? raw.attributes : []
  const rawVariants = Array.isArray(raw.variants)   ? raw.variants   : []

  // ── New flat schema: variants have {attribute, value, stock} ──
  const isNewSchema = rawVariants.every((v: any) => 
    v?.attribute !== undefined && v?.value !== undefined
  )

  if (isNewSchema || rawVariants.length > 0) {
    // Build attributes list from explicit attributes array
    const explicitAttrNames = rawAttrs
      .map((a: any) => a?.name)
      .filter(Boolean) as string[]

    // Also derive from variants if not in explicit list
    const variantAttrNames = Array.from(
      new Set(rawVariants.map((v: any) => v?.attribute).filter(Boolean))
    ) as string[]

    // Merge: explicit first, then any from variants
    const mergedAttrNames = [
      ...explicitAttrNames,
      ...variantAttrNames.filter(n => !explicitAttrNames.includes(n)),
    ]

    const attributes: VariantAttribute[] = mergedAttrNames.map(name => ({ name }))

    const variants: Variant[] = rawVariants
      .filter((v: any) => v?.attribute && v?.value !== undefined)
      .map((v: any) => ({
        id:        v.id || `var_${Math.random().toString(36).slice(2)}`,
        attribute: String(v.attribute),
        value:     String(v.value),
        stock:     Number(v.stock) || 0,
      }))

    return { attributes, variants }
  }

  // ── Old schema fallback ──
  const attributes: VariantAttribute[] = rawAttrs.map((a: any) => ({ name: a.name }))
  const variants: Variant[] = []

  for (const oldVariant of rawVariants) {
    if (!oldVariant?.values || typeof oldVariant.values !== "object") continue
    for (const [attrName, value] of Object.entries(oldVariant.values)) {
      const already = variants.some(
        v => v.attribute === attrName && v.value === String(value)
      )
      if (!already) {
        variants.push({
          id:        `var_${Math.random().toString(36).slice(2)}`,
          attribute: attrName,
          value:     String(value),
          stock:     Number(oldVariant.stock) || 0,
        })
      }
    }
  }

  return { attributes, variants }
}

// ── OrderForm ─────────────────────────────────────────────────────────────────

function OrderForm({
  product,
  selectedVariantValues,
  customValues,
  onCustomValuesChange,
  onSuccess,
}: {
  product: Product
  selectedVariantValues: Record<string, string>
  customValues: Record<string, string>
  onCustomValuesChange: (values: Record<string, string>) => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({
    full_name: "",
    email:     "",
    phone:     "",
    wilaya:    "",
    baladiya:  "",
    address:   "",
    quantity:  1,
  })

  const [status, setStatus]     = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  const inputClass =
    "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm " +
    "placeholder-white/25 focus:outline-none focus:border-purple-500/60 transition-all duration-200"

  // Resolve the active variant for stock/qty purposes
  const activeVariant: Variant | null = (() => {
    const entries = Object.entries(selectedVariantValues).filter(([, v]) => v)
    if (entries.length === 0) return null
    const [lastAttr, lastVal] = entries[entries.length - 1]
    return (
      product.variant_config?.variants?.find(
        v => v.attribute === lastAttr && v.value === lastVal
      ) ?? null
    )
  })()

  const maxQty = product.track_stock ? (activeVariant?.stock ?? 99) : 999

  const customFieldsValid = (product.custom_fields || []).every(
    f => !f.required || (customValues[f.label] || "").trim() !== ""
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Email is now optional, only check full_name and phone
    if (!form.full_name || !form.phone) return
    if (!customFieldsValid) return

    setStatus("loading")
    setErrorMsg("")
    try {
      const res = await fetch("/api/shop/order/", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id:          product.id,
          product_name:        product.name,
          variant_values:      selectedVariantValues,
          quantity:            form.quantity,
          custom_field_values: customValues,
          full_name:           form.full_name,
          email:               form.email,
          phone:               form.phone,
          wilaya:              form.wilaya,
          baladiya:            form.baladiya,
          address:             form.address,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to submit")
      }
      setStatus("success")
      onSuccess()
    } catch (e: any) {
      setErrorMsg(e.message || "Something went wrong.")
      setStatus("error")
    }
  }

  if (status === "success") {
    return (
      <div className="text-center py-10">
        <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30
                        flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={2}>
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
    )
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
            Phone *
          </label>
          <input
            type="tel"
            required
            placeholder="05 XX XX XX XX"
            value={form.phone}
            onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-white/50 text-[10px] font-bold tracking-widest uppercase mb-2">
            Email (Optional)
          </label>
          <input
            type="email"
            placeholder="your@email.com"
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-white/50 text-[10px] font-bold tracking-widest uppercase mb-2">
            Wilaya *
          </label>
          <select
            required
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
        <div>
          <label className="block text-white/50 text-[10px] font-bold tracking-widest uppercase mb-2">
            Baladiya *
          </label>
          <input
            type="text"
            required
            placeholder="Enter your baladiya"
            value={form.baladiya}
            onChange={e => setForm(p => ({ ...p, baladiya: e.target.value }))}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="block text-white/50 text-[10px] font-bold tracking-widest uppercase mb-2">
          Delivery Address *
        </label>
        <textarea
          required
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
          {product.track_stock && activeVariant && (
            <span className="text-white/30 text-xs ml-2">
              {activeVariant.stock} in stock
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
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20
                      rounded-xl px-4 py-3">
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
  )
}

// ── PersonalisationSection ────────────────────────────────────────────────────

function PersonalisationSection({
  product,
  customValues,
  onCustomValuesChange,
}: {
  product: Product
  customValues: Record<string, string>
  onCustomValuesChange: (values: Record<string, string>) => void
}) {
  const inputClass =
    "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm " +
    "placeholder-white/25 focus:outline-none focus:border-purple-500/60 transition-all duration-200"

  if (!product.custom_fields || product.custom_fields.length === 0) return null

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
              {field.required && <span className="text-purple-400 ml-1">*</span>}
            </label>
            <input
              type="text"
              required={field.required}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}…`}
              value={customValues[field.label] || ""}
              onChange={e =>
                onCustomValuesChange({ ...customValues, [field.label]: e.target.value })
              }
              className={inputClass}
              style={{ textTransform: "uppercase" }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main ProductPage ──────────────────────────────────────────────────────────

export default function ProductPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [product, setProduct]             = useState<Product | null>(null)
  const [variantConfig, setVariantConfig] = useState<VariantConfig>({ attributes: [], variants: [] })
  const [loading, setLoading]             = useState(true)
  const [scrolled, setScrolled]           = useState(false)
  const [selectedImage, setSelectedImage] = useState<string>("")
  const [selectedVariantValues, setSelectedVariantValues] =
    useState<Record<string, string>>({})
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [revealed, setRevealed]         = useState(false)
  const [customValues, setCustomValues] = useState<Record<string, string>>({})

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`/api/shop/${id}/`)
      .then(r => {
        if (!r.ok) throw new Error("Not found")
        return r.json()
      })
      .then((data: Product) => {
        setProduct(data)
        setSelectedImage(data.banner || data.images?.[0]?.url || "")
        setCustomValues(
          Object.fromEntries((data.custom_fields || []).map(f => [f.label, ""]))
        )

        // Normalise variant config
        const normConfig = normaliseVariantConfig(data.variant_config)
        setVariantConfig(normConfig)

        // Init selections with all attributes
        const initialSelections: Record<string, string> = {}
        normConfig.attributes.forEach(a => {
          initialSelections[a.name] = ""
        })
        setSelectedVariantValues(initialSelections)

        setTimeout(() => setRevealed(true), 80)
      })
      .catch(err => {
        console.error("Error loading product:", err)
        navigate("/shop", { replace: true })
      })
      .finally(() => setLoading(false))
  }, [id, navigate])

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
    )
  }

  if (!product) return null

  const allImages = [
    ...(product.banner ? [{ id: -1, url: product.banner, display_order: -1 }] : []),
    ...(product.images || []),
  ]

  // Get unique values per attribute from the normalised flat variants list
  const getValuesForAttribute = (attrName: string): string[] => {
    const seen   = new Set<string>()
    const result: string[] = []
    for (const v of variantConfig.variants) {
      if (v.attribute === attrName && !seen.has(v.value)) {
        seen.add(v.value)
        result.push(v.value)
      }
    }
    return result
  }

  // Find the flat variant for a specific attribute + value
  const getVariantForSelection = (attrName: string, value: string): Variant | undefined =>
    variantConfig.variants.find(v => v.attribute === attrName && v.value === value)

  // Overall in-stock check
  const checkInStock = (): boolean => {
    if (!product.track_stock) return true
    const entries = Object.entries(selectedVariantValues).filter(([, v]) => v)
    if (entries.length === 0) return (product.total_stock ?? 0) > 0
    return entries.every(([attr, val]) => {
      const variant = getVariantForSelection(attr, val)
      return variant ? variant.stock > 0 : true
    })
  }

  const inStock = checkInStock()

  const handleVariantSelect = (attrName: string, value: string) => {
    setSelectedVariantValues(prev => ({
      ...prev,
      [attrName]: prev[attrName] === value ? "" : value,
    }))
  }

  const hasVariants =
    variantConfig.attributes.length > 0 && variantConfig.variants.length > 0

  return (
    <div
      className="min-h-screen bg-[#0d0014] text-white overflow-x-hidden"
      style={{ fontFamily: "'Barlow', sans-serif" }}
    >
      <style>{`
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px); }
                             to   { opacity: 1; transform: translateY(0);    } }
            
        /* Variant button hover animation */
        .variant-btn {
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
            
        .variant-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(168, 85, 247, 0.15);
        }
            
        .variant-btn:active:not(:disabled) {
          transform: translateY(0px);
        }
            
        /* Stock indicator animation */
        .stock-indicator {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>

      {/* Navbar */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background:     scrolled ? "rgba(13,0,20,0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(14px)"         : "none",
          boxShadow:      scrolled ? "0 1px 0 rgba(255,255,255,0.06)" : "none",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/shop")}
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors
                       text-xs font-bold tracking-wider uppercase group cursor-pointer"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
          opacity:    revealed ? 1 : 0,
          transform:  revealed ? "none" : "translateY(20px)",
          transition: "opacity 0.7s ease-out, transform 0.7s ease-out",
        }}
      >
        <div className="grid lg:grid-cols-2 gap-12 items-start">

          {/* ── Left: image gallery ── */}
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
                  <span className="inline-flex items-center gap-1 text-[10px] font-black
                                   tracking-widest uppercase px-3 py-1.5 rounded-full
                                   bg-yellow-500/20 text-yellow-400 border border-yellow-500/35">
                    ⭐ Featured
                  </span>
                </div>
              )}

              {!inStock && (
                <div className="absolute top-4 right-4">
                  <span className="inline-flex items-center gap-1 text-[10px] font-black
                                   tracking-widest uppercase px-3 py-1.5 rounded-full
                                   bg-red-500/25 text-red-300 border border-red-500/40
                                   backdrop-blur-sm">
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
                    className="w-20 h-20 rounded-xl overflow-hidden border-2 transition-all
                               duration-200 cursor-pointer shrink-0"
                    style={{
                      borderColor: selectedImage === img.url
                        ? "rgba(168,85,247,0.8)"
                        : "rgba(255,255,255,0.1)",
                      boxShadow: selectedImage === img.url
                        ? "0 0 12px rgba(168,85,247,0.4)"
                        : "none",
                    }}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Right: product info + order form ── */}
          <div className="lg:sticky lg:top-28">

            {/* Badges */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span
                className="text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-full"
                style={{
                  background: "rgba(168,85,247,0.2)",
                  color:      "#c084fc",
                  border:     "1px solid rgba(168,85,247,0.4)",
                }}
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
                                 rounded-full bg-purple-500/15 text-purple-300
                                 border border-purple-500/25 flex items-center gap-1">
                  ✏ Personalised
                </span>
              )}
            </div>

            {/* Name */}
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

            {/* ── Variant selectors ── */}
            {hasVariants && (
              <div className="space-y-5 mb-8">
                {variantConfig.attributes.map(attr => {
                  const values = getValuesForAttribute(attr.name)
                  if (values.length === 0) return null

                  return (
                    <div key={attr.name}>
                      <label className="block text-white/50 text-[10px] font-bold
                                        tracking-widest uppercase mb-3">
                        {attr.name}
                        {selectedVariantValues[attr.name] && (
                          <span className="text-purple-400 ml-2 normal-case font-bold">
                            — {selectedVariantValues[attr.name]}
                          </span>
                        )}
                      </label>

                      <div className="flex flex-wrap gap-2">
                        {values.map(value => {
                          const variant = getVariantForSelection(attr.name, value)
                          const active  = selectedVariantValues[attr.name] === value
                          const noStock = product.track_stock &&
                            (!variant || variant.stock === 0)

                          return (
                            <button
                              key={value}
                              onClick={() => handleVariantSelect(attr.name, value)}
                              disabled={noStock}
                              className="variant-btn px-5 py-2.5 rounded-xl text-sm font-black uppercase
                                         tracking-wider cursor-pointer
                                         disabled:opacity-30 disabled:cursor-not-allowed"
                              style={{
                                background: active
                                  ? "rgba(168,85,247,0.35)"
                                  : "rgba(255,255,255,0.06)",
                                color: active ? "#c084fc" : "rgba(255,255,255,0.6)",
                                border: active
                                  ? "1px solid rgba(168,85,247,0.6)"
                                  : "1px solid rgba(255,255,255,0.1)",
                              }}
                            >
                              {value}
                              {product.track_stock &&
                                variant &&
                                variant.stock > 0 &&
                                variant.stock <= 3 && (
                                  <span className="ml-1.5 text-[9px] text-yellow-400/80">
                                    ({variant.stock} left)
                                  </span>
                                )}
                            </button>
                          )
                        })}
                      </div>

                      {/* Per-value stock indicator */}
                      {selectedVariantValues[attr.name] && (() => {
                        const v = getVariantForSelection(
                          attr.name,
                          selectedVariantValues[attr.name]
                        )
                        if (!product.track_stock || !v) return null
                        const color =
                          v.stock > 5 ? "#34d399" :
                          v.stock > 0 ? "#fbbf24" : "#f87171"
                        return (
                          <div
                            className="stock-indicator mt-2 inline-flex items-center gap-2 px-3 py-1.5
                                       rounded-xl border text-xs font-bold"
                            style={{
                              background:  `${color}15`,
                              borderColor: `${color}30`,
                              color,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ background: color }}
                            />
                            {v.stock > 5
                              ? `${v.stock} in stock`
                              : v.stock > 0
                              ? `Only ${v.stock} left!`
                              : "Out of stock"}
                          </div>
                        )
                      })()}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Personalisation */}
            <PersonalisationSection
              product={product}
              customValues={customValues}
              onCustomValuesChange={setCustomValues}
            />

            {/* Order form */}
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
                selectedVariantValues={selectedVariantValues}
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
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
  )
}