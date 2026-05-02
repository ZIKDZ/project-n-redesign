// ── Types ─────────────────────────────────────────────────────────────────────

export type VariantAttribute = {
  name: string
}

export type Variant = {
  id: string
  attribute: string
  value: string
  stock: number
}

export type VariantConfig = {
  attributes: VariantAttribute[]
  variants: Variant[]
}

export type CustomField = {
  label: string
  placeholder: string
  required: boolean
}

export type GalleryImage = { id: number; url: string; display_order: number }

export type StagedImage = { file: File; previewUrl: string; key: string }

export type PaymentMethod = 'cod' | 'online' | 'both'

export type Product = {
  id: number
  name: string
  description: string
  price: string
  category: string
  banner: string
  variant_config: VariantConfig
  custom_fields: CustomField[]
  images: GalleryImage[]
  track_stock: boolean
  payment_method: PaymentMethod
  total_stock: number | null
  is_active: boolean
  is_featured: boolean
  display_order: number
}

export type Order = {
  id: number
  product_id: number | null
  product_name: string
  product_banner: string
  // Unit price of the product at order time (from linked product)
  price: string
  variant_values: Record<string, string>
  variant_display: string
  quantity: number
  custom_field_values: Record<string, string>
  full_name: string
  email: string
  phone: string
  wilaya: string
  wilaya_label: string
  baladiya: string
  address: string
  // Coupon / pricing
  coupon_code: string       // empty string if no coupon
  discount_amount: string   // "0.00" if no discount
  total_amount: string      // "0.00" for orders created before this feature
  status: string
  notes: string
  submitted_at: string
}

// ── Shared constants ──────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<string, string> = {
  jersey:    'Jersey',
  hoodie:    'Hoodie',
  cap:       'Cap',
  accessory: 'Accessory',
  other:     'Other',
}

export const PAYMENT_METHOD_CONFIG: Record<PaymentMethod, {
  label: string
  short: string
  description: string
  color: string
  bg: string
  border: string
  icon: string
}> = {
  cod: {
    label:       'Cash on Delivery',
    short:       'COD',
    description: 'Customer pays in cash upon receiving the order.',
    color:       '#34d399',
    bg:          'rgba(52,211,153,0.15)',
    border:      'rgba(52,211,153,0.3)',
    icon:        '💵',
  },
  online: {
    label:       'CIB / eDahabia',
    short:       'CIB',
    description: 'Customer pays online via Chargily (CIB or eDahabia card).',
    color:       '#60a5fa',
    bg:          'rgba(96,165,250,0.15)',
    border:      'rgba(96,165,250,0.3)',
    icon:        '💳',
  },
  both: {
    label:       'Both — customer chooses',
    short:       'COD + CIB',
    description: 'Customer picks cash or card at checkout.',
    color:       '#c084fc',
    bg:          'rgba(192,132,252,0.15)',
    border:      'rgba(192,132,252,0.3)',
    icon:        '🔀',
  },
}

export const PAGE_SIZE = 8

export const inputCls =
  'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs ' +
  'focus:outline-none focus:border-purple-500/60 w-full placeholder-white/20'

export const selectCls =
  'bg-[#1a0030] border border-white/10 rounded-lg px-3 py-2 text-white text-xs ' +
  'focus:outline-none focus:border-purple-500/60 w-full cursor-pointer'

export const labelCls = 'block text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1'