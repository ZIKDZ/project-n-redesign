import { useNavigate, useLocation } from "react-router-dom";
import { asset } from '../utils/asset'

const SOCIALS = [
  {
    name: "X",
    href: "https://x.com/nebulaespo13559",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/nblesport/",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    name: "Discord",
    href: "https://discord.com/invite/rXannpAynS",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
      </svg>
    ),
  },
  {
    name: "TikTok",
    href: "https://www.tiktok.com/@nbl.esports",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.78a4.85 4.85 0 0 1-1.01-.09z" />
      </svg>
    ),
  },
  {
    name: "Kick",
    href: "https://kick.com/nblesports",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M2 2h4v7l5-7h5l-6 8 6 8h-5l-5-7v7H2V2z" />
      </svg>
    ),
  },
];

// href starting with "#" = anchor on the landing page
// href starting with "/" = internal route
// anything else = external link
const LINK_COLUMNS = [
  {
    title: "Organization",
    links: [
      { label: "Our Esports", href: "#esports" },
      { label: "About Us", href: "#about" },
      { label: "News", href: "#news" },
      { label: "Match Schedule", href: "#schedule" },
    ],
  },
  {
    title: "Get Involved",
    links: [
      { label: "Join the Team", href: "#join" },
      { label: "Tournaments", href: "/tournaments" },
      { label: "Shop", href: "/shop" },
      { label: "Discord Community", href: "https://discord.com/invite/rXannpAynS" },
    ],
  },
];

function SocialButton({ name, href, icon }: { name: string; href: string; icon: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={name}
      className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-purple-500/50 hover:bg-purple-500/10 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
    >
      {icon}
    </a>
  );
}

export default function Footer() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLinkClick = (e: React.MouseEvent, href: string) => {
    // External links: let the browser handle it normally
    if (href.startsWith("http")) return;

    e.preventDefault();

    // Hash anchor (only exists on Landing page "/")
    if (href.startsWith("#")) {
      if (location.pathname === "/") {
        // already on landing — just scroll
        document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
      } else {
        // navigate home first, then scroll once it's mounted
        navigate("/");
        setTimeout(() => {
          document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
        }, 150);
      }
      return;
    }

    // Internal route (e.g. /shop, /tournaments)
    navigate(href);
  };

  return (
    <footer className="relative border-t border-white/10 pt-20 pb-8 overflow-hidden">
      <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-[1.4fr_1fr_1fr_1.2fr] gap-12 pb-14">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <img
                src={asset("images/logo.svg")}
                alt="NBL"
                width={38}
                height={38}
                style={{ filter: "brightness(0) invert(1)" }}
              />
              <span
                className="block text-white font-black tracking-wider text-xl"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                NBL<span className="text-purple-400">ESPORT</span>
              </span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-sm mb-6">
              An Algerian esports organization scouting talent, building champions,
              and creating opportunities across competitive gaming.
            </p>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-purple-300 text-xs font-bold tracking-widest uppercase">
                Season 2026 Active
              </span>
            </div>
          </div>

          {/* Link columns */}
          {LINK_COLUMNS.map(col => (
            <div key={col.title}>
              <h4 className="text-white font-bold text-sm tracking-widest uppercase mb-5">
                {col.title}
              </h4>
              <ul className="flex flex-col gap-3">
                {col.links.map(link => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      onClick={(e) => handleLinkClick(e, link.href)}
                      target={link.href.startsWith("http") ? "_blank" : undefined}
                      rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="text-gray-400 hover:text-purple-300 text-sm transition-colors duration-200 cursor-pointer"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Social / community */}
          <div>
            <h4 className="text-white font-bold text-sm tracking-widest uppercase mb-5">
              Stay Connected
            </h4>
            <p className="text-gray-400 text-sm mb-5 leading-relaxed">
              Follow along for match updates, roster news, and behind-the-scenes content.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              {SOCIALS.map(s => (
                <SocialButton key={s.name} {...s} />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-gray-500 text-xs tracking-widest text-center md:text-left">
            © 2026 NBLEsport. All rights reserved.
          </span>
          <span className="text-gray-500 text-xs tracking-widest">
            @NBLEsport
          </span>
        </div>
      </div>
    </footer>
  );
}