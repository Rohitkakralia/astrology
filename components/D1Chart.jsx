"use client";
import React, { useRef, useEffect } from "react";

const RASHI_SHORT = ["Ar","Ta","Ge","Cn","Le","Vi","Li","Sc","Sg","Cp","Aq","Pi"];
const ZODIAC_SYMBOLS = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
const PLANET_SHORT = {
  Sun:"Su", Moon:"Mo", Mars:"Ma", Mercury:"Me",
  Jupiter:"Ju", Venus:"Ve", Saturn:"Sa",
  Rahu:"Ra", Ketu:"Ke", Ascendant:"As", Lagna:"As",
};

function signIndexOf(lon) {
  return Math.floor((((parseFloat(lon) % 360) + 360) % 360) / 30);
}

function degMinStr(lon) {
  const d = (((parseFloat(lon) % 360) + 360) % 360) % 30;
  const deg = Math.floor(d);
  const min = Math.floor((d - deg) * 60);
  return `${deg}°${String(min).padStart(2,"0")}'`;
}

function getPlanetHouse(planetLon, houseCusps) {
  const lon = (parseFloat(planetLon) % 360 + 360) % 360;
  for (let i = 0; i < 12; i++) {
    const start = (parseFloat(houseCusps[i]) % 360 + 360) % 360;
    const end   = (parseFloat(houseCusps[(i + 1) % 12]) % 360 + 360) % 360;
    if (start < end) {
      if (lon >= start && lon < end) return i + 1;
    } else {
      if (lon >= start || lon < end) return i + 1;
    }
  }
  return 1;
}

function centroid(x1,y1, x2,y2, x3,y3) {
  return [(x1+x2+x3)/3, (y1+y2+y3)/3];
}

export default function D1Chart({ data }) {
  const svgRef = useRef(null);
  const houseCusps     = data?.house_cusps     || [];
  const planetPosition = data?.planet_position || [];

  useEffect(() => {
    if (!svgRef.current || houseCusps.length < 12) return;
    const svg = svgRef.current;
    svg.innerHTML = "";
    const NS = "http://www.w3.org/2000/svg";

    // Rectangular canvas matching CuspKundaliSVG proportions
    const W = 560, H = 340;

    const mk = (tag, attrs, text) => {
      const e = document.createElementNS(NS, tag);
      for (const [k,v] of Object.entries(attrs)) e.setAttribute(k, String(v));
      if (text !== undefined) e.textContent = text;
      return e;
    };

    svg.appendChild(mk("rect",{ x:0, y:0, width:W, height:H, fill:"#fffef9" }));

    const L=5, T=5, R=W-5, B=H-5;
    const bW=R-L, bH=B-T;
    const Tmx=L+bW/2,   Tmy=T;
    const Rmx=R,         Rmy=T+bH/2;
    const Bmx=L+bW/2,   Bmy=B;
    const Lmx=L,         Lmy=T+bH/2;
    const P1x=L+bW/4,   P1y=T+bH/4;
    const P2x=L+bW*3/4, P2y=T+bH/4;
    const P3x=L+bW*3/4, P3y=T+bH*3/4;
    const P4x=L+bW/4,   P4y=T+bH*3/4;
    const Ccx=L+bW/2,   Ccy=T+bH/2;

    // Border
    svg.appendChild(mk("rect",{
      x:L, y:T, width:bW, height:bH,
      fill:"#fffef9", stroke:"#8b6914", "stroke-width":"2.5",
    }));

    // Inner lines
    [
      [L,T,R,B],[R,T,L,B],
      [Lmx,Lmy,Tmx,Tmy],[Tmx,Tmy,Rmx,Rmy],
      [Rmx,Rmy,Bmx,Bmy],[Bmx,Bmy,Lmx,Lmy],
    ].forEach(([x1,y1,x2,y2]) =>
      svg.appendChild(mk("line",{x1,y1,x2,y2,stroke:"#8b6914","stroke-width":"1.4"}))
    );

    // House centres — same triangle mapping as CuspKundaliSVG
    const HOUSE_CENTRES = {
      1:  centroid(Tmx,Tmy, P1x,P1y, P2x,P2y),
      12: centroid(Tmx,Tmy, R,T,     P2x,P2y),
      11: centroid(R,T,     Rmx,Rmy, P2x,P2y),
      10: centroid(Rmx,Rmy, P2x,P2y, P3x,P3y),
      9:  centroid(Rmx,Rmy, R,B,     P3x,P3y),
      8:  centroid(R,B,     Bmx,Bmy, P3x,P3y),
      7:  centroid(Bmx,Bmy, P3x,P3y, P4x,P4y),
      6:  centroid(Bmx,Bmy, L,B,     P4x,P4y),
      5:  centroid(L,B,     Lmx,Lmy, P4x,P4y),
      4:  centroid(Lmx,Lmy, P1x,P1y, P4x,P4y),
      3:  centroid(L,T,     Lmx,Lmy, P1x,P1y),
      2:  centroid(L,T,     Tmx,Tmy, P1x,P1y),
    };

    // Build planet lists per house
    const housePlanets = {};
    for (let i=1; i<=12; i++) housePlanets[i]=[];
    housePlanets[1].push({ label:"As", retro:false });

    planetPosition.forEach((p) => {
      const lon   = parseFloat(p.longitude ?? p.lon ?? p.absolute_longitude ?? 0);
      const house = getPlanetHouse(lon, houseCusps);
      const label = PLANET_SHORT[p.name] || p.name.slice(0,2);
      const retro = !!(p.retrograde || p.is_retrograde);
      housePlanets[house].push({ label, retro });
    });

    // Render each house
    for (let house=1; house<=12; house++) {
      const [bx, by] = HOUSE_CENTRES[house];
      const cuspLon  = parseFloat(houseCusps[house-1] ?? 0);
      const signIdx  = signIndexOf(cuspLon);
      const cuspStr  = degMinStr(cuspLon);
      const ps       = housePlanets[house] || [];

      // House number in a box (matches Cusp chart style)
      const isLagna = house === 1;
      const boxW = 22, boxH = 18;
      svg.appendChild(mk("rect",{
        x: bx - boxW/2, y: by - 26,
        width: boxW, height: boxH,
        fill: isLagna ? "#fff0f0" : "#f5f0e8",
        stroke: isLagna ? "#cc2200" : "#8b6914",
        "stroke-width": "1", rx: "3",
      }));
      svg.appendChild(mk("text",{
        x:bx, y:by-13,
        "text-anchor":"middle", "font-size":"16",
        fill: isLagna ? "#cc2200" : "#333",
        "font-weight":"700", "font-family":"Arial Black, sans-serif",
      }, String(house)));

      // Zodiac symbol
      svg.appendChild(mk("text",{
        x:bx-17, y:by-14,
        "text-anchor":"middle", "font-size":"11", fill:"#aaa080",
      }, ZODIAC_SYMBOLS[signIdx]));

      // Sign short + cusp degree
      svg.appendChild(mk("text",{
        x:bx, y:by+2,
        "text-anchor":"middle", "font-size":"10",
        fill:"#8b6914", "font-family":"monospace",
      }, RASHI_SHORT[signIdx]));
      svg.appendChild(mk("text",{
        x:bx, y:by+12,
        "text-anchor":"middle", "font-size":"7.5",
        fill:"#8b6914", "font-family":"monospace",
      }, cuspStr));

      // Planets
      if (ps.length > 0) {
        const line1 = ps.slice(0,3).map(p => p.label+(p.retro?"℞":"")).join(" ");
        const line2 = ps.slice(3).map(p => p.label+(p.retro?"℞":"")).join(" ");
        svg.appendChild(mk("text",{
          x:bx, y:by+24,
          "text-anchor":"middle", "font-size":"11",
          fill:"#1a1a2e", "font-weight":"600", "font-family":"monospace",
        }, line1));
        if (line2) {
          svg.appendChild(mk("text",{
            x:bx, y:by+34,
            "text-anchor":"middle", "font-size":"11",
            fill:"#1a1a2e", "font-weight":"600", "font-family":"monospace",
          }, line2));
        }
      }
    }

    // Center label
    svg.appendChild(mk("text",{
      x:Ccx, y:Ccy-6,
      "text-anchor":"middle", "font-size":"15",
      fill:"#8b6914", "font-family":"Georgia, serif", opacity:"0.8",
    }, "D1 LAGNA"));
    svg.appendChild(mk("text",{
      x:Ccx, y:Ccy+6,
      "text-anchor":"middle", "font-size":"10.5",
      fill:"#8b6914", "font-family":"Georgia, serif", opacity:"0.8",
    }, "CHART"));

  }, [houseCusps, planetPosition]);

  if (!data) return null;

  return (
    // Line ~180 — change viewBox from square to rectangle:
<svg
  ref={svgRef}
  viewBox="0 0 560 340"   // ← was "0 0 600 600"
  width="100%"
  className="block"
/>
  );
}