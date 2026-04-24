"use client";
import React, { useEffect, useMemo } from "react";

const RASHI_ORDER = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const RASHI_SHORT = {
  Aries: "Ar", Taurus: "Ta", Gemini: "Ge", Cancer: "Cn",
  Leo: "Le", Virgo: "Vi", Libra: "Li", Scorpio: "Sc",
  Sagittarius: "Sg", Capricorn: "Cp", Aquarius: "Aq", Pisces: "Pi",
};

function toRoman(num) {
  const map = [
    [12,"XII"],[11,"XI"],[10,"X"],[9,"IX"],[8,"VIII"],
    [7,"VII"],[6,"VI"],[5,"V"],[4,"IV"],[3,"III"],[2,"II"],[1,"I"],
  ];
  for (const [n, r] of map) if (num >= n) return r;
  return String(num);
}

function signFromLongitude(lon) {
  const idx = Math.floor(((lon % 360) + 360) % 360 / 30);
  return RASHI_ORDER[idx];
}

function degInSign(lon) {
  return ((lon % 360) + 360) % 360 % 30;
}

function formatDeg(decimal) {
  const total = Math.abs(decimal);
  const d = Math.floor(total);
  const m = Math.floor((total - d) * 60);
  const s = Math.round(((total - d) * 60 - m) * 60);
  return `${d}°${String(m).padStart(2,"0")}'${String(s).padStart(2,"0")}"`;
}

function getConclusion(strength) {
  if (strength < 27) return "SHORT";
  if (strength > 33) return "EXCESS";
  return "AVERAGE";
}

export default function AstroScriptTable({ data }) {
  if (!data || !data.astro_script) return null;

  const planetPositions = data.planet_position || [];
  const projectionHits  = data.projection_hits || [];
  const houseCusps      = data.house_cusps      || [];

  useEffect(() => {
    console.log("AstroScriptTable data:", data);
  }, [data]);

  // ─── 1. BUILD HOUSE INFO ───────────────────────────────────────────────────
  const houseInfoList = useMemo(() => {
    return houseCusps.map((lon, idx) => {
      const sign  = signFromLongitude(lon);
      const degIn = degInSign(lon);

      let strength;
      if (idx < houseCusps.length - 1) {
        strength = houseCusps[idx + 1] - lon;
      } else {
        strength = 360 - lon + houseCusps[0];
      }

      return {
        house:           idx + 1,
        longitude:       parseFloat(lon),
        sign,
        degreeInSign:    degIn,
        degreeFormatted: formatDeg(degIn),
        box:             data.lordships?.[idx + 1]?.box || "",
        strength:        Math.round(strength),
        conclusion:      getConclusion(strength),
      };
    });
  }, [houseCusps, data.lordships]);

  // ─── 2. GROUP HOUSES BY SIGN ──────────────────────────────────────────────
  const housesBySign = useMemo(() => {
    const map = {};
    RASHI_ORDER.forEach((s) => { map[s] = []; });
    houseInfoList.forEach((h) => {
      if (map[h.sign]) map[h.sign].push(h);
    });
    return map;
  }, [houseInfoList]);

  // ─── 3. GROUP PLANETS BY SIGN ─────────────────────────────────────────────
  const groupedBySign = useMemo(() => {
    const map = {};
    RASHI_ORDER.forEach((s) => { map[s] = []; });
    data.astro_script.forEach((row) => {
      if (map[row.sign] !== undefined) map[row.sign].push(row);
    });
    RASHI_ORDER.forEach((s) => {
      map[s].sort((a, b) => (a.house || 0) - (b.house || 0));
    });
    return map;
  }, [data.astro_script]);

  // ─── 4. PLANET DEGREE MAP ─────────────────────────────────────────────────
  const planetDegMap = useMemo(() => {
    const map = {};
    planetPositions.forEach((p) => { map[p.name] = p.degree_formatted || ""; });
    return map;
  }, [planetPositions]);

  // ─── 5. HIT MAP ───────────────────────────────────────────────────────────
  const hitMap = useMemo(() => {
    const map = { houses: {}, planets: {} };
    projectionHits.forEach((source) => {
      const src = source.source_planet;
      source.projections.forEach((proj) => {
        const angle = proj.angle;
        proj.hit_houses?.forEach((h) => {
          if (!map.houses[h.house]) map.houses[h.house] = [];
          map.houses[h.house].push(`${src.slice(0, 2)} ${angle}`);
        });
        proj.hit_planets?.forEach((p) => {
          if (!map.planets[p.planet]) map.planets[p.planet] = [];
          map.planets[p.planet].push(`${src.slice(0, 2)} ${angle}`);
        });
      });
    });
    return map;
  }, [projectionHits]);

  // ─── 6. LORDSHIP BOX MAP ──────────────────────────────────────────────────
  const houseBoxMap = useMemo(() => {
    const map = {};
    if (data.lordships) {
      Object.entries(data.lordships).forEach(([houseNum, info]) => {
        map[parseInt(houseNum)] = info.box || info.meaning || "";
      });
    }
    return map;
  }, [data.lordships]);

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="w-full overflow-x-auto mt-6 text-black mb-6">
      <h2 className="text-center font-bold text-base mb-2 tracking-wide">
        Astro Details
      </h2>

      <table
        className="min-w-full text-xs border-collapse"
        style={{ border: "1px solid #000" }}
      >
        {/* ── HEADER ── */}
        <thead>
          <tr style={{ background: "#e5e7eb" }}>
            <th style={th}>A<br /><span style={thSub}>Hit From</span></th>
            <th style={{ ...th, width: 20 }}>R</th>
            <th style={th}>C<br /><span style={thSub}>Planets</span></th>
            <th style={th}>D<br /><span style={thSub}>Deg</span></th>
            <th style={{ ...th, background: "#d1d5db", textAlign: "center" }}>
              E<br /><span style={thSub}>Deg / Sign / Deg / Box</span>
            </th>
            <th style={{ ...th, background: "#fef9c3" }}>
              J<br /><span style={thSub}>Strength</span>
            </th>
            <th style={{ ...th, background: "#fef9c3" }}>
              K<br /><span style={thSub}>Conclusion</span>
            </th>
            <th style={th}>I<br /><span style={thSub}>Hit From</span></th>
          </tr>
        </thead>

        {/* ── BODY ── */}
        <tbody>
          {RASHI_ORDER.map((sign) => {
            const planets = groupedBySign[sign] || [];
            const houses  = housesBySign[sign]  || [];

            // ── SKIP signs with no planets AND no houses ──────────────────
            if (planets.length === 0 && houses.length === 0) return null;

            const rowCount = Math.max(planets.length, houses.length, 1);
            const hasHouses = houses.length > 0;

            return Array.from({ length: rowCount }).map((_, rowIdx) => {
              const planet    = planets[rowIdx] || null;
              const houseInfo = houses[rowIdx]  || null;

              const planetHits   = planet    ? hitMap.planets[planet.planet]  || [] : [];
              const houseHits    = houseInfo ? hitMap.houses[houseInfo.house] || [] : [];
              const degFormatted = planet    ? planetDegMap[planet.planet] || "" : "";

              const isFirstRow = rowIdx === 0;

              const conclusionColor =
                houseInfo?.conclusion === "SHORT"   ? "#ef4444" :
                houseInfo?.conclusion === "EXCESS"  ? "#f97316" :
                houseInfo?.conclusion === "AVERAGE" ? "#22c55e" : "";

              return (
                <tr key={`${sign}-${rowIdx}`} style={{ verticalAlign: "top" }}>

                  {/* A — planet hit from */}
                  <td style={td}>
                    {planetHits.length > 0
                      ? planetHits.map((h, i) => <div key={i}>{h}</div>)
                      : ""}
                  </td>

                  {/* R — retrograde */}
                  <td style={{ ...td, textAlign: "center" }}>
                    {planet?.retrograde ? "R" : ""}
                  </td>

                  {/* C — planet name + traits */}
                  <td style={td}>
                    {planet ? (
                      <>
                        <span style={{ fontWeight: 600 }}>
                          {planet.planet_number != null ? `${planet.planet_number} ` : ""}
                          {planet.planet}
                        </span>
                        {planet.traits
                          ? <span style={{ color: "#6b7280" }}> ({planet.traits})</span>
                          : null}
                      </>
                    ) : ""}
                  </td>

                  {/* D — planet degree */}
                  <td style={{ ...td, textAlign: "center", whiteSpace: "nowrap" }}>
                    {degFormatted ? `${degFormatted}` : ""}
                  </td>

                  {/* ── E — Sign / Houses / Rashi-only fallback ─────────── */}
                  {isFirstRow && (
                    <td
                      rowSpan={rowCount}
                      style={{
                        ...td,
                        textAlign: "center",
                        fontWeight: 700,
                        background: "#f3f4f6",
                        verticalAlign: "middle",
                        minWidth: 40,
                        paddingLeft: 0,
                        paddingRight: 0,
                      }}
                    >
                      {hasHouses ? (
                        /* Normal case — one or more house cusps fall in this sign */
                        houses.map((hInfo, hIdx) => (
                          <div
                            key={hIdx}
                            style={{
                              marginTop: hIdx === 0 ? 0 : 4,
                              paddingTop: hIdx === 0 ? 0 : 4,
                              borderTop: hIdx === 0 ? "none" : "1px dashed #9ca3af",
                              fontSize: 14,
                              fontWeight: 400,
                              color: "#374151",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {hInfo.degreeFormatted} /{" "}
                            <span style={{ fontWeight: 700 }}>
                              {RASHI_SHORT[sign]}
                            </span>{" "}
                            / {formatDeg(hInfo.longitude)}
                            <span style={{ fontWeight: 700 }}>
                              {" "}/ {toRoman(hInfo.house)}
                            </span>{" "}
                            {houseBoxMap[hInfo.house] || hInfo.box || ""}
                          </div>
                        ))
                      ) : (
                        /* ── FIX: No house cusp in this sign — show rashi name only ── */
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "#374151",
                            padding: "4px 8px",
                          }}
                        >
                          {RASHI_SHORT[sign]}
                        </div>
                      )}
                    </td>
                  )}

                  {/* J — Strength (empty when no house in this sign) */}
                  <td style={{ ...td, textAlign: "center", background: "#fefce8" }}>
                    {houseInfo ? houseInfo.strength : ""}
                  </td>

                  {/* K — Conclusion (empty when no house in this sign) */}
                  <td style={{
                    ...td,
                    textAlign: "center",
                    background: "#fefce8",
                    fontWeight: 600,
                    color: conclusionColor,
                  }}>
                    {houseInfo ? houseInfo.conclusion : ""}
                  </td>

                  {/* I — house hit from */}
                  <td style={td}>
                    {houseHits.length > 0
                      ? houseHits.map((h, i) => <div key={i}>{h}</div>)
                      : ""}
                  </td>

                </tr>
              );
            });
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── INLINE STYLES ────────────────────────────────────────────────────────────
const td = {
  border: "1px solid #000",
  padding: "3px 5px",
  fontSize: 11,
  lineHeight: 1.4,
};

const th = {
  border: "1px solid #000",
  padding: "4px 5px",
  fontSize: 11,
  fontWeight: 600,
  textAlign: "left",
  lineHeight: 1.4,
};

const thSub = {
  fontWeight: 400,
  color: "#4b5563",
};