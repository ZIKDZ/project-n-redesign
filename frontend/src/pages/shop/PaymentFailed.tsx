import { useNavigate, useSearchParams } from "react-router-dom"
import { asset } from "../../utils/asset"

export default function PaymentFailed() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const orderId  = params.get("order")

  return (
    <div
      className="min-h-screen bg-[#0d0014] flex items-center justify-center text-white px-6"
      style={{ fontFamily: "'Barlow', sans-serif" }}
    >
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96
                      bg-red-500/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative text-center max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src={asset("images/logo.svg")}
            alt="NBLEsport"
            width={48}
            style={{ filter: "brightness(0) invert(1)", opacity: 0.5 }}
          />
        </div>

        {/* X icon */}
        <div className="w-24 h-24 rounded-full bg-red-500/15 border border-red-500/30
                        flex items-center justify-center mx-auto mb-8">
          <svg className="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        {/* Heading */}
        <h1
          className="font-black text-5xl uppercase mb-3"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Payment{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-rose-300">
            Failed
          </span>
        </h1>

        {orderId && (
          <p className="text-white/30 text-sm mb-4 font-mono">Order #{orderId}</p>
        )}

        <p className="text-white/50 text-base leading-relaxed mb-10">
          Something went wrong with your payment. Your order has been saved — you can
          try again or contact us on Discord and we'll sort it out.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="bg-purple-600 hover:bg-purple-500 text-white font-black px-8 py-3.5
                       rounded-xl text-sm tracking-widest uppercase transition-all
                       hover:shadow-lg hover:shadow-purple-500/30 hover:-translate-y-0.5
                       cursor-pointer"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Try Again
          </button>
          <button
            onClick={() => navigate("/shop")}
            className="bg-white/5 border border-white/10 hover:bg-white/10 text-white/60
                       hover:text-white font-black px-8 py-3.5 rounded-xl text-sm
                       tracking-widest uppercase transition-all cursor-pointer"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Back to Store
          </button>
        </div>

        {/* Support */}
        <p className="text-white/20 text-xs mt-10">
          Need help?{" "}
          <a
            href="https://discord.com/invite/rXannpAynS"
            target="_blank"
            rel="noreferrer"
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Contact us on Discord
          </a>
        </p>
      </div>
    </div>
  )
}
