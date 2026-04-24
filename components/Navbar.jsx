"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Charts",    href: "/charts"    },
  { label: "Dashas",    href: "/dashas"    },
  { label: "Transits",  href: "/transits"  },
  { label: "Reports",   href: "/reports"   },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header style={{ fontFamily: "'EB Garamond', serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=EB+Garamond:wght@400&display=swap');

        .jy-nav {
          background: #0e0b1e;
          border-bottom: 1px solid rgba(200,160,60,0.2);
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1.5rem;
        }
        .jy-logo {
          display: flex; align-items: center; gap: 8px;
          text-decoration: none; flex-shrink: 0;
        }
        .jy-logo-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 18px; font-weight: 600;
          color: #e8c97a; letter-spacing: 0.05em;
        }
        .jy-links {
          display: flex; align-items: center; gap: 0.2rem;
        }
        .jy-link {
          padding: 0.4rem 0.85rem;
          font-family: 'EB Garamond', serif;
          font-size: 15px;
          color: rgba(220,200,150,0.6);
          text-decoration: none;
          border-radius: 4px;
          transition: color 0.2s, background 0.2s;
          white-space: nowrap;
        }
        .jy-link:hover  { color: #e8c97a; background: rgba(200,160,60,0.07); }
        .jy-link.active { color: #e8c97a; }
        .jy-btn {
          padding: 0 0.9rem; height: 32px;
          background: transparent;
          border: 1px solid rgba(200,160,60,0.4);
          border-radius: 4px; color: #e8c97a;
          font-family: 'EB Garamond', serif; font-size: 14px;
          cursor: pointer; white-space: nowrap;
          transition: background 0.2s, border-color 0.2s;
        }
        .jy-btn:hover { background: rgba(200,160,60,0.1); border-color: rgba(200,160,60,0.7); }
        .jy-burger {
          display: none; flex-direction: column; gap: 5px;
          cursor: pointer; background: none; border: none; padding: 4px;
        }
        .jy-burger span {
          display: block; width: 22px; height: 1.5px;
          background: rgba(200,160,60,0.7); transition: all 0.25s;
        }
        .jy-burger.open span:nth-child(1) { transform: translateY(6.5px) rotate(45deg); }
        .jy-burger.open span:nth-child(2) { opacity: 0; }
        .jy-burger.open span:nth-child(3) { transform: translateY(-6.5px) rotate(-45deg); }
        .jy-drawer {
          display: none; flex-direction: column;
          background: #0e0b1e;
          border-top: 1px solid rgba(200,160,60,0.12);
          padding: 0.75rem 1.5rem 1rem; gap: 0.15rem;
        }
        .jy-drawer.open { display: flex; }
        .jy-drawer .jy-link { font-size: 16px; padding: 0.55rem 0.5rem; }
        .jy-drawer .jy-btn  { margin-top: 0.5rem; width: 100%; height: 38px; font-size: 15px; }

        @media (max-width: 640px) {
          .jy-links, .jy-right-btn { display: none !important; }
          .jy-burger { display: flex !important; }
        }
      `}</style>

      <nav className="jy-nav">
        <Link href="/" className="jy-logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="12" stroke="rgba(200,160,60,0.3)" strokeWidth="1" />
            <circle cx="14" cy="14" r="2"  fill="#e8c97a" />
            <circle cx="14" cy="3"  r="1.2" fill="rgba(200,160,60,0.7)" />
            <circle cx="25" cy="14" r="1.2" fill="rgba(200,120,60,0.8)" />
            <circle cx="14" cy="25" r="1.2" fill="rgba(200,160,60,0.5)" />
            <circle cx="3"  cy="14" r="1.2" fill="rgba(200,160,60,0.5)" />
          </svg>
          <span className="jy-logo-title">Jyotish</span>
        </Link>

        <div className="jy-links">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`jy-link${pathname === l.href ? " active" : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button className="jy-btn jy-right-btn">+ New Chart</button>
          <button
            className={`jy-burger${open ? " open" : ""}`}
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      <div className={`jy-drawer${open ? " open" : ""}`}>
        {NAV_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`jy-link${pathname === l.href ? " active" : ""}`}
            onClick={() => setOpen(false)}
          >
            {l.label}
          </Link>
        ))}
        <button className="jy-btn">+ New Chart</button>
      </div>
    </header>
  );
}