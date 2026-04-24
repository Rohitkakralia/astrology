// app/charts/page.jsx
"use client";
import AstroScriptTable from "@/components/AstroScriptTable";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import D1Chart from "@/components/D1Chart";

// ── Astrology helpers ─────────────────────────────────────────────────────────

const PLANET_SHORT = {
  Sun: "Su", Moon: "Mo", Mars: "Ma", Mercury: "Me", Jupiter: "Ju",
  Venus: "Ve", Saturn: "Sa", Uranus: "Ur", Neptune: "Ne", Pluto: "Pl",
  "Rahu (Mean)": "Ra", "Ketu (Mean)": "Ke", "Rahu (True)": "Ra",
  "Ketu (True)": "Ke", Rahu: "Ra", Ketu: "Ke", Ascendant: "As",
};

const ZODIAC_SIGNS = [
  "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
  "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces",
];
const ZODIAC_SYMBOLS = [
  "♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓",
];

function getPlanetLon(p) {
  const val = p.longitude ?? p.degree;
  return val !== undefined ? Number(val) : null;
}
function getPlanetName(p) {
  return p.name || p.id || "Unknown";
}

function degreeToZodiac(degree) {
  const norm = ((degree % 360) + 360) % 360;
  const si = Math.floor(norm / 30);
  const d = norm % 30;
  let deg = Math.floor(d);
  const mTot = (d - deg) * 60;
  let min = Math.floor(mTot);
  let sec = Math.round((mTot - min) * 60);
  if (sec === 60) { sec = 0; min += 1; }
  if (min === 60) { min = 0; deg += 1; }
  return {
    sign: ZODIAC_SIGNS[si], symbol: ZODIAC_SYMBOLS[si], signIndex: si,
    deg, min, sec, display: `${deg}° ${min}' ${sec}"`,
  };
}

function getPlanetHouse(planet, lagnaSignIdx) {
  if (planet.house !== undefined && planet.house !== null) return Number(planet.house);
  const name = getPlanetName(planet);
  if (name === "Ascendant") return 1;
  const lon = getPlanetLon(planet);
  if (lon === null) return null;
  const ps = Math.floor((((lon % 360) + 360) % 360) / 30);
  return ((ps - lagnaSignIdx + 12) % 12) + 1;
}

function fmtDate(dateStr) {
  const date = new Date(dateStr);
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yy = date.getUTCFullYear();
  return `${dd}-${mm}-${yy}`;
}

const PRINT_CSS = `
@media print {
  body * { visibility: hidden; }
  #pdf-template, #pdf-template * { visibility: visible; }
  #pdf-template {
    position: absolute; top: 0; left: 0; width: 100%;
    padding: 12mm; background: white; font-family: Arial, sans-serif;
  }
  @page { size: A4; margin: 8mm; }
  h1 { font-size: 24px; margin: 0; }
  svg { width: 100% !important; height: auto !important; }
  table { width: 100%; font-size: 8px !important; border-collapse: collapse; }
  th, td { padding: 2px 4px !important; border: 1px solid #999; }
  .no-print { display: none !important; }
}
`;

// ── CuspKundaliSVG ────────────────────────────────────────────────────────────
function CuspKundaliSVG({ planets = [], houseCusps = [], lagnaSignIdx = 0 }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    svg.innerHTML = "";
    const NS = "http://www.w3.org/2000/svg";
    const W = 560, H = 340;

    const el = (tag, attrs, text) => {
      const e = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
      if (text !== undefined) e.textContent = text;
      return e;
    };

    svg.appendChild(el("rect", { x: 0, y: 0, width: W, height: H, fill: "#fffef9" }));

    const housePlanets = {};
    for (let i = 1; i <= 12; i++) housePlanets[i] = [];
    for (const p of planets) {
      const name = getPlanetName(p);
      if (name === "Ascendant") continue;
      const house = getPlanetHouse(p, lagnaSignIdx);
      if (house !== null && house >= 1 && house <= 12) housePlanets[house].push(p);
    }

    svg.appendChild(el("rect", { x: 5, y: 5, width: W - 10, height: H - 10, fill: "#fffef9", stroke: "#8b6914", "stroke-width": "2.5" }));

    const L = 5, T5 = 5, R = W - 5, B5 = H - 5;
    const bW = R - L, bH = B5 - T5;
    const Tmx = L + bW / 2, Tmy = T5;
    const Rmx = R, Rmy = T5 + bH / 2;
    const Bmx = L + bW / 2, Bmy = B5;
    const Lmx = L, Lmy = T5 + bH / 2;
    const P1x = L + bW / 4, P1y = T5 + bH / 4;
    const P2x = L + (bW * 3) / 4, P2y = T5 + bH / 4;
    const P3x = L + (bW * 3) / 4, P3y = T5 + (bH * 3) / 4;
    const P4x = L + bW / 4, P4y = T5 + (bH * 3) / 4;
    const Ccx = L + bW / 2, Ccy = T5 + bH / 2;

    const allLines = [
      [L, T5, R, B5], [R, T5, L, B5],
      [Lmx, Lmy, Tmx, Tmy], [Tmx, Tmy, Rmx, Rmy],
      [Rmx, Rmy, Bmx, Bmy], [Bmx, Bmy, Lmx, Lmy],
    ];
    for (const [x1, y1, x2, y2] of allLines) {
      svg.appendChild(el("line", { x1, y1, x2, y2, stroke: "#8b6914", "stroke-width": "1.4" }));
    }

    const tri = (x1, y1, x2, y2, x3, y3) => [(x1 + x2 + x3) / 3, (y1 + y2 + y3) / 3];
    const centres = {
      0: tri(Tmx, Tmy, P1x, P1y, P2x, P2y),
      1: tri(Tmx, Tmy, R, T5, P2x, P2y),
      2: tri(R, T5, Rmx, Rmy, P2x, P2y),
      3: tri(Rmx, Rmy, P2x, P2y, P3x, P3y),
      4: tri(Rmx, Rmy, R, B5, P3x, P3y),
      5: tri(R, B5, Bmx, Bmy, P3x, P3y),
      6: tri(Bmx, Bmy, P3x, P3y, P4x, P4y),
      7: tri(Bmx, Bmy, L, B5, P4x, P4y),
      8: tri(L, B5, Lmx, Lmy, P4x, P4y),
      9: tri(Lmx, Lmy, P1x, P1y, P4x, P4y),
      10: tri(L, T5, Lmx, Lmy, P1x, P1y),
      11: tri(L, T5, Tmx, Tmy, P1x, P1y),
    };

    for (let house = 1; house <= 12; house++) {
      const visualIdx = house === 1 ? 0 : 13 - house;
      const [bx, by] = centres[visualIdx];
      const cuspLon = houseCusps[house - 1] || 0;
      const signIdx = Math.floor(cuspLon / 30) % 12;
      const signNumber = signIdx + 1;
      const deg = Math.floor(cuspLon % 30);
      const min = Math.floor(((cuspLon % 30) - deg) * 60);
      const cuspStr = `${deg}°${String(min).padStart(2, "0")}'`;
      const isLagna = house === 1;
      const planetsInHouse = housePlanets[house] || [];

      // ONE number per box: sign number inside a small rect
      const boxW = 22, boxH = 18;
      svg.appendChild(el("rect", { x: bx - boxW / 2, y: by - 26, width: boxW, height: boxH, fill: isLagna ? "#fff0f0" : "#f5f0e8", stroke: isLagna ? "#cc2200" : "#8b6914", "stroke-width": "1", rx: "3" }));
      svg.appendChild(el("text", { x: bx, y: by - 13, "text-anchor": "middle", "font-size": "16", fill: isLagna ? "#cc2200" : "#333", "font-weight": "700", "font-family": "Arial Black, sans-serif" }, String(signNumber)));
      svg.appendChild(el("text", { x: bx - 17, y: by - 14, "text-anchor": "middle", "font-size": "11", fill: "#aaa080" }, ZODIAC_SYMBOLS[signIdx]));
      svg.appendChild(el("text", { x: bx, y: by + 2, "text-anchor": "middle", "font-size": "10", fill: "#8b6914", "font-family": "monospace" }, cuspStr));

      if (planetsInHouse.length > 0) {
        const labels = planetsInHouse.map((p) => {
          const nm = getPlanetName(p);
          return (PLANET_SHORT[nm] || nm.slice(0, 2)) + (p.is_retrograde ? "℞" : "");
        });
        const line1 = labels.slice(0, 3).join(" ");
        const line2 = labels.slice(3).join(" ");
        svg.appendChild(el("text", { x: bx, y: by + 19, "text-anchor": "middle", "font-size": "11", fill: "#1a1a2e", "font-weight": "600", "font-family": "monospace" }, line1));
        if (line2) svg.appendChild(el("text", { x: bx, y: by + 29, "text-anchor": "middle", "font-size": "11", fill: "#1a1a2e", "font-weight": "600", "font-family": "monospace" }, line2));
      }
    }

    svg.appendChild(el("text", { x: Ccx, y: Ccy - 6, "text-anchor": "middle", "font-size": "10.5", fill: "#8b6914", "font-family": "Georgia, serif", opacity: "0.8" }, "KP CUSP"));
    svg.appendChild(el("text", { x: Ccx, y: Ccy + 6, "text-anchor": "middle", "font-size": "10.5", fill: "#8b6914", "font-family": "Georgia, serif", opacity: "0.8" }, "KUNDALI"));
  }, [planets, houseCusps, lagnaSignIdx]);

  return <svg ref={svgRef} viewBox="0 0 560 340" width="100%" className="block" />;
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3">
      <div className="w-6 h-6 rounded-full border-2 border-amber-200 border-t-amber-600 animate-spin" />
      <p className="text-sm text-amber-700 tracking-widest uppercase">{label}</p>
    </div>
  );
}

// ── SectionCard ───────────────────────────────────────────────────────────────
function SectionCard({ title, children, className = "" }) {
  return (
    <div className={`relative bg-white border border-amber-200/60 rounded-xl overflow-hidden shadow-sm ${className}`}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
      {title && (
        <div className="px-5 pt-4 pb-0">
          <p className="text-[10px] tracking-[0.18em] uppercase text-amber-700/60 font-semibold mb-3">{title}</p>
        </div>
      )}
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────
function Row({ label, value, mono = true, last = false }) {
  return (
    <div className={`flex justify-between items-center py-3 gap-4 ${!last ? "border-b border-amber-100" : ""}`}>
      <span className="text-sm text-amber-700/70 shrink-0 font-medium">{label}</span>
      <span className={`text-sm font-semibold text-amber-950/80 text-right break-all ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

// ── TimeLineTable ─────────────────────────────────────────────────────────────
function TimeLineTable({ dashaData }) {
  if (!dashaData) return null;
  const {
    mahadasha_timeline = [], antardasha_timeline = [],
    current_mahadasha, current_adl, occupants = {},
  } = dashaData;

  const planetToOccupantHouses = {};
  for (const [houseStr, names] of Object.entries(occupants)) {
    for (const name of names) {
      if (!planetToOccupantHouses[name]) planetToOccupantHouses[name] = [];
      planetToOccupantHouses[name].push(Number(houseStr));
    }
  }

  const planetToLordHouses = {};
  for (const [planet, houses] of Object.entries(dashaData.planet_lordships || {})) {
    planetToLordHouses[planet] = houses.map((h) => h.house);
  }

  const adlEndMap = {};
  for (const ad of antardasha_timeline) adlEndMap[ad.lord] = ad.end;

  const currentADLord = current_adl?.lord ?? null;

  return (
    <div className="bg-white border border-amber-200/60 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-amber-100">
        <p className="text-sm font-bold text-stone-800 tracking-wide">Dasha</p>
        {current_mahadasha && (
          <p className="text-xs text-amber-700/70 mt-1 leading-relaxed">
            Current MD:&nbsp;
            <span className="font-bold text-amber-800">{current_mahadasha.lord}</span>{" "}
            ({fmtDate(current_mahadasha.start)} → {fmtDate(current_mahadasha.end)})
            {current_adl && (
              <span className="ml-2">
                · Current AD:&nbsp;
                <span className="font-bold text-amber-800">{current_adl.lord}</span>{" "}
                (→ {fmtDate(current_adl.end)})
              </span>
            )}
          </p>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-stone-100">
              {["Planet", "Occupant", "Lordship", "ADL upto", "MD upto"].map((h, i) => (
                <th key={h} className={`py-2 px-3 text-xs tracking-wider font-bold border border-stone-200 ${i === 0 ? "text-left text-red-700" : "text-center text-red-700"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mahadasha_timeline.map((md, i) => {
              const isCurrent = current_mahadasha?.lord === md.lord &&
                new Date(md.start).getTime() === new Date(current_mahadasha.start).getTime();
              const occupantHouses = planetToOccupantHouses[md.lord] ?? [];
              const occupantStr = occupantHouses.length ? occupantHouses.sort((a, b) => a - b).join(", ") : "—";
              const lordHouses = planetToLordHouses[md.lord] ?? [];
              const lordshipStr = lordHouses.length ? lordHouses.sort((a, b) => a - b).join(", ") : "—";
              const adlEnd = adlEndMap[md.lord] ?? null;
              const adlStr = adlEnd ? fmtDate(adlEnd) : "—";
              const isCurrentAD = md.lord === currentADLord;

              return (
                <tr key={i} className={`border-b border-stone-100 ${isCurrent ? "bg-amber-50" : i % 2 === 0 ? "bg-white" : "bg-stone-50/40"}`}>
                  <td className="py-2 px-3 border border-stone-100">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-semibold ${isCurrent ? "text-amber-800" : "text-stone-800"}`}>{md.lord}</span>
                      {isCurrent && <span className="text-[8px] font-bold text-amber-700 bg-amber-100 border border-amber-300 rounded px-1 py-0.5">NOW</span>}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-center font-mono text-xs text-stone-700 border border-stone-100">{occupantStr}</td>
                  <td className="py-2 px-3 text-center font-mono text-xs text-stone-700 border border-stone-100">{lordshipStr}</td>
                  <td className="py-2 px-3 text-center font-mono text-amber-700/80 text-xs border border-stone-100">
                    <div className="flex items-center justify-center gap-1">
                      {adlStr}
                      {isCurrentAD && <span className="text-[8px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded px-1 py-0.5">AD</span>}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-center font-mono text-amber-700/80 text-xs border border-stone-100">{fmtDate(md.end)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 border-t border-amber-100 bg-stone-50/50">
        <p className="text-[10px] text-amber-700/60 leading-relaxed">
          <strong>Occupant</strong> = house(s) where planet sits ·
          <strong> Lordship</strong> = house(s) ruled by planet ·
          <strong> ADL upto</strong> = antardasha end within current MD (<span className="text-blue-600 font-bold">AD</span> = currently running) ·
          <strong> MD upto</strong> = end of that planet's mahadasha
        </p>
      </div>
    </div>
  );
}

// ── PlanetRow ─────────────────────────────────────────────────────────────────
function PlanetRow({ planet, lagnaSignIdx, last = false }) {
  const name = getPlanetName(planet);
  const degree = getPlanetLon(planet);
  const zodiac = degree !== null ? degreeToZodiac(degree) : null;
  const isRetro = planet.is_retrograde ?? false;
  const isLagna = name === "Ascendant";
  const house = isLagna ? 1 : getPlanetHouse(planet, lagnaSignIdx);
  return (
    <div className={`flex items-center gap-3 py-2.5 ${!last ? "border-b border-amber-100" : ""}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isLagna ? "bg-amber-100 text-amber-700" : "bg-stone-100 text-stone-500"}`}>
        {PLANET_SHORT[name] || name.slice(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-stone-800">{name}</span>
          {isRetro && <span className="text-[9px] font-bold text-orange-700 bg-orange-50 border border-orange-200 rounded px-1 py-0.5">℞ RETRO</span>}
          {house !== null && (
            <span className={`text-[9px] font-medium rounded px-1 py-0.5 ${isLagna ? "text-amber-800 bg-amber-100 border border-amber-300" : "text-stone-500 bg-stone-100 border border-stone-200"}`}>
              H{house}
            </span>
          )}
        </div>
        {zodiac && <p className="text-[10px] text-amber-700/70 mt-0.5">{zodiac.symbol} {zodiac.sign} {zodiac.display}</p>}
      </div>
      {degree !== null && (
        <span className="font-mono text-[10px] text-amber-700/50 shrink-0">{Number(degree).toFixed(4)}°</span>
      )}
    </div>
  );
}

// ── PdfTimeLineTable ──────────────────────────────────────────────────────────
function PdfTimeLineTable({ dashaData }) {
  if (!dashaData) return null;
  const { mahadasha_timeline = [], antardasha_timeline = [], occupants = {}, planet_lordships = {} } = dashaData;
  const planetToOccupantHouses = {};
  for (const [houseStr, names] of Object.entries(occupants)) {
    for (const name of names) {
      if (!planetToOccupantHouses[name]) planetToOccupantHouses[name] = [];
      planetToOccupantHouses[name].push(Number(houseStr));
    }
  }
  const adlEndMap = {};
  for (const ad of antardasha_timeline) adlEndMap[ad.lord] = ad.end;

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8px", tableLayout: "fixed" }}>
      <thead>
        <tr>
          {["Planet", "Occupant", "Lordship", "ADL upto", "MD upto"].map((h) => (
            <th key={h} style={{ border: "1px solid #000", padding: "3px", textAlign: "center", fontWeight: "bold", background: "#f3f3f3" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {mahadasha_timeline.slice(0, 9).map((md, i) => {
          const occupantStr = planetToOccupantHouses[md.lord]?.sort((a, b) => a - b).join(", ") || "-";
          const lordshipStr = planet_lordships[md.lord]?.map((h) => h.house).sort((a, b) => a - b).join(", ") || "-";
          return (
            <tr key={i}>
              <td style={cellStyle}>{md.lord}</td>
              <td style={cellStyle}>{occupantStr}</td>
              <td style={cellStyle}>{lordshipStr}</td>
              <td style={cellStyle}>{adlEndMap[md.lord] ? fmtDate(adlEndMap[md.lord]) : "-"}</td>
              <td style={cellStyle}>{fmtDate(md.end)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const cellStyle = { border: "1px solid #000", padding: "2px", textAlign: "center", fontSize: "8px" };

// ── ErrorScreen ───────────────────────────────────────────────────────────────
function ErrorScreen({ message, onBack }) {
  return (
    <div className="max-w-md mx-auto mt-20 px-4 text-center">
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
        <p className="text-sm text-red-600 leading-relaxed">{message}</p>
      </div>
      <button onClick={onBack} className="text-sm tracking-widest uppercase text-amber-700 border border-amber-300 px-4 py-2 rounded hover:bg-amber-50 transition-colors">
        ← Go Back
      </button>
    </div>
  );
}

// ── DownloadPDFButton ─────────────────────────────────────────────────────────
function DownloadPDFButton() {
  return (
    <button onClick={() => window.print()} className="no-print text-white bg-amber-700 px-4 py-2 rounded text-sm">
      Download PDF
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ChartsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);
  const [planets, setPlanets] = useState([]);
  const [houseCusps, setHouseCusps] = useState([]);
  const [dashaData, setDashaData] = useState(null);
  const [planetsLoading, setPlanetsLoading] = useState(false);
  const [planetsError, setPlanetsError] = useState(null);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = PRINT_CSS;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    try {
      const encoded = searchParams.get("data");
      if (!encoded) throw new Error("No birth data found. Please go back and fill the form.");
      setPayload(JSON.parse(atob(encoded)));
    } catch (err) {
      setError(err.message || "Invalid birth data.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!payload) return;
    async function fetchPlanets() {
      setPlanetsLoading(true);
      setPlanetsError(null);
      try {
        const offsetMin = payload.utcOffsetMin;
        const sign = offsetMin >= 0 ? "+" : "-";
        const absMin = Math.abs(offsetMin);
        const offH = String(Math.floor(absMin / 60)).padStart(2, "0");
        const offM = String(absMin % 60).padStart(2, "0");
        const localTimeFull = [
          (payload.tob.split(":")[0] || "00").padStart(2, "0"),
          (payload.tob.split(":")[1] || "00").padStart(2, "0"),
          "00",
        ].join(":");
        const isoDatetime = `${payload.dob}T${localTimeFull}${sign}${offH}:${offM}`;
        const url = `/api/planets?ayanamsa=1&coordinates=${encodeURIComponent(`${payload.lat},${payload.lon}`)}&datetime=${encodeURIComponent(isoDatetime)}`;
        const res = await fetch(url);
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json?.errors?.join(", ") || json?.error || "Failed to fetch planetary positions");
        const positions = json.data?.planet_position ?? json.data?.planets ?? json.data ?? [];
        setPlanets(Array.isArray(positions) ? positions : []);
        const cusps = json.data?.house_cusps ?? [];
        setHouseCusps(Array.isArray(cusps) ? cusps : []);
        setDashaData(json.data ?? null);
      } catch (err) {
        setPlanetsError(err.message);
      } finally {
        setPlanetsLoading(false);
      }
    }
    fetchPlanets();
  }, [payload]);

  if (error) return <ErrorScreen message={error} onBack={() => router.push("/")} />;
  if (!payload) return null;

  const initials = payload.name
    ? payload.name.trim().split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const lagnaSignIdx = Math.floor(((((houseCusps?.[0] ?? 0) % 360) + 360) % 360) / 30);

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: "#faf7f2",
        backgroundImage: `radial-gradient(ellipse 80% 40% at 50% -5%, rgba(200,160,60,0.08) 0%, transparent 60%)`,
      }}
    >
      <style>{PRINT_CSS}</style>

      <div className="w-full px-4 sm:px-6 py-6 pb-16 max-w-[1600px] mx-auto">

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 mb-6 pb-5 border-b border-amber-200/60">
          <div className="w-14 h-14 rounded-full border-2 border-amber-400 flex items-center justify-center text-sm font-bold tracking-wide bg-amber-50 text-amber-800 shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-stone-800 tracking-wide truncate">{payload.name || "—"}</p>
            <p className="text-sm text-amber-700/60 italic mt-0.5">{payload.city}, {payload.country} · {payload.gender || "—"}</p>
          </div>
          <div className="flex items-center gap-2 no-print">
            <DownloadPDFButton />
            <button onClick={() => router.push("/")} className="text-sm tracking-widest uppercase text-amber-700 border border-amber-300 px-3 py-2 rounded-md hover:bg-amber-50 transition-all">
              ← Back
            </button>
          </div>
        </div>

        {planetsLoading ? (
          <SectionCard title="Loading Charts">
            <Spinner label="Fetching planetary data…" />
          </SectionCard>
        ) : planetsError ? (
          <SectionCard title="Error">
            <div className="flex items-start gap-2 py-2">
              <span className="text-orange-500 shrink-0">⚠</span>
              <p className="text-sm text-orange-600/80 leading-relaxed">{planetsError}</p>
            </div>
          </SectionCard>
        ) : (
          <div className="space-y-4">

            {/* ── BASIC DETAILS BAR ─────────────────────────────────────── */}
            <div className="bg-white border border-amber-200/60 rounded-xl shadow-sm px-5 py-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-2">
                {[
                  { label: "Name",    value: payload.name },
                  { label: "DOB",     value: payload.dob },
                  { label: "TOB",     value: payload.tob },
                  { label: "City",    value: payload.city },
                  { label: "Country", value: payload.country },
                  { label: "Coords",  value: `${payload.lat}°N  ${payload.lon}°E` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col min-w-0">
                    <span className="text-[9px] tracking-widest uppercase text-amber-600/60 font-semibold">{label}</span>
                    <span className="text-xs font-semibold text-stone-800 truncate mt-0.5">{value || "—"}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── ROW 1: BOTH CHARTS SIDE BY SIDE ───────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Cusp Kundali */}
              <div className="bg-white border border-amber-200/60 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 pt-3 pb-1 border-b border-amber-100 flex items-center gap-3">
                  <p className="text-xs font-bold text-red-700 tracking-wide">Cusp Kundli</p>
                  <p className="text-[10px] text-amber-700/40">
                    {ZODIAC_SYMBOLS[lagnaSignIdx]} {ZODIAC_SIGNS[lagnaSignIdx]} Lagna · ℞ = retrograde
                  </p>
                </div>
                <div className="px-3 pb-3 pt-2 flex justify-center">
                  <div style={{ width: "100%", maxWidth: 440 }}>
                    <CuspKundaliSVG planets={planets} houseCusps={houseCusps} lagnaSignIdx={lagnaSignIdx} />
                  </div>
                </div>
              </div>

              {/* Lagan Kundali (D1 Chart) */}
              <div className="bg-white border border-amber-200/60 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 pt-3 pb-1 border-b border-amber-100 flex items-center gap-3">
                  <p className="text-xs font-bold text-red-700 tracking-wide">Lagan Kundali</p>
                  <p className="text-[10px] text-amber-700/40">D1 · Natal positions</p>
                </div>
                <div className="px-3 pb-3 pt-2 flex justify-center">
                  <div style={{ width: "100%", maxWidth: 440 }}>
                    <D1Chart data={dashaData} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── ROW 2: TIMELINE TABLE + PLANETARY DEGREES ─────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 items-start">
              {/* Timeline Table — takes bulk of width */}
              <TimeLineTable dashaData={dashaData} />

              {/* Planetary Degrees — compact right column */}
              <SectionCard title={`Planetary Positions · ${planets.length} bodies`}>
                <div className="max-h-[520px] overflow-y-auto pr-1">
                  {planets.map((planet, i) => (
                    <PlanetRow
                      key={planet.id ?? getPlanetName(planet) ?? i}
                      planet={planet}
                      lagnaSignIdx={lagnaSignIdx}
                      last={i === planets.length - 1}
                    />
                  ))}
                </div>
              </SectionCard>
            </div>

            {/* ── ROW 3: ASTRO DETAILS TABLE ─────────────────────────────── */}
            <div className="bg-white border border-amber-200/60 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 pt-4 pb-1 border-b border-amber-100">
                <p className="text-[10px] tracking-[0.18em] uppercase text-amber-700/60 font-semibold">Astro Script Details</p>
              </div>
              <div className="px-5 pb-5 pt-3">
                <AstroScriptTable data={dashaData} />
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ── PDF TEMPLATE (print only) ────────────────────────────────────── */}
      <div id="pdf-template" className="hidden print:block">
        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: "10px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>MD Astrology</h1>
        </div>

        {/* Header row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", border: "1px solid #000", fontSize: "12px", marginBottom: "15px" }}>
          <div style={{ padding: "6px", borderRight: "1px solid #000" }}>{payload.name}</div>
          <div style={{ padding: "6px", borderRight: "1px solid #000", textAlign: "center" }}>{payload.dob} {payload.tob}</div>
          <div style={{ padding: "6px", textAlign: "center" }}>{payload.city}</div>
        </div>

        {/* Charts row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px", alignItems: "flex-start" }}>
          <div>
            <div style={{ textAlign: "center", fontWeight: "bold", marginBottom: "6px" }}>Cusp Kundli</div>
            <CuspKundaliSVG planets={planets} houseCusps={houseCusps} lagnaSignIdx={lagnaSignIdx} />
          </div>
          <div>
            <div style={{ textAlign: "center", fontWeight: "bold", marginBottom: "6px" }}>Lagan Kundali</div>
            <D1Chart data={dashaData} />
          </div>
        </div>

        <AstroScriptTable data={dashaData} />
      </div>
    </div>
  );
}