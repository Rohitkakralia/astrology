// // import { NextResponse } from "next/server";
// // import fs from "fs";
// // import path from "path";

// // const filePath = path.join(process.cwd(), "public", "cities.json");

// // function readDB() {
// //   try {
// //     const data = fs.readFileSync(filePath, "utf-8");
// //     return JSON.parse(data);
// //   } catch {
// //     return [];
// //   }
// // }

// // function writeDB(data) {
// //   fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
// // }

// // // ── Timezone lookup using timeapi.io (free, no API key) ─────────────────────
// // async function getTimezone(lat, lon) {
// //   try {
// //     const res = await fetch(
// //       `https://timeapi.io/api/TimeZone/coordinate?latitude=${lat}&longitude=${lon}`
// //     );
// //     if (!res.ok) throw new Error("timeapi failed");
// //     const json = await res.json();
// //     if (json.timeZone) return json.timeZone; // e.g. "Asia/Kolkata"
// //   } catch { /* fall through */ }

// //   // Fallback: use WorldTimeAPI (also free, no key)
// //   try {
// //     const res = await fetch(
// //       `https://worldtimeapi.org/api/timezone`
// //     );
// //     // WorldTimeAPI doesn't do coordinate lookup — skip, use rough offset
// //   } catch { /* ignore */ }

// //   // Last resort: rough UTC offset using browser-style offset estimation
// //   // (±15° longitude ≈ ±1 hour offset from UTC)
// //   const offsetHours = Math.round(lon / 15);
// //   const sign = offsetHours >= 0 ? "+" : "-";
// //   const absH = Math.abs(offsetHours);
// //   return `Etc/GMT${offsetHours === 0 ? "" : sign + absH}`;
// // }

// // export async function GET(req) {
// //   const { searchParams } = new URL(req.url);
// //   const query = searchParams.get("city");

// //   if (!query || query.trim().length < 2) {
// //     return NextResponse.json({ success: false, error: "City is required" });
// //   }

// //   const db = readDB();

// //   // ── 1. Search local DB (case-insensitive partial match) ──────────────────
// //   const q = query.toLowerCase().trim();
// //   const found = db.find(
// //     (c) =>
// //       c.city.toLowerCase() === q ||
// //       c.city.toLowerCase().startsWith(q)
// //   );

// //   if (found) {
// //     console.log("Served from DB:", found.city);
// //     return NextResponse.json({ success: true, source: "local", data: found });
// //   }

// //   // ── 2. Fetch from Nominatim with addressdetails=1 ────────────────────────
// //   try {
// //     const nominatimUrl =
// //       `https://nominatim.openstreetmap.org/search` +
// //       `?q=${encodeURIComponent(query)}` +
// //       `&format=json&limit=1&addressdetails=1`;

// //     const res = await fetch(nominatimUrl, {
// //       headers: { "User-Agent": "kundali-app/1.0 (contact@yourdomain.com)" },
// //     });

// //     if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);

// //     const data = await res.json();
// //     if (!data.length) {
// //       return NextResponse.json({ success: false, error: "City not found" });
// //     }

// //     const r = data[0];
// //     const addr = r.address || {};

// //     // Pick the most specific city-level name available
// //     const city =
// //       addr.city ||
// //       addr.town ||
// //       addr.village ||
// //       addr.municipality ||
// //       addr.county ||
// //       r.name ||
// //       query;

// //     const state   = addr.state   || "";
// //     const country = addr.country || "";
// //     const lat     = parseFloat(r.lat);
// //     const lon     = parseFloat(r.lon);

// //     // ── 3. Real timezone from coordinates ─────────────────────────────────
// //     const tz = await getTimezone(lat, lon);

// //     const newEntry = { city, state, country, lat, lon, tz };

// //     // ── 4. Persist to local DB ────────────────────────────────────────────
// //     db.push(newEntry);
// //     writeDB(db);

// //     console.log("Fetched from Nominatim:", city, tz);
// //     return NextResponse.json({ success: true, source: "api", data: newEntry });

// //   } catch (err) {
// //     console.error("long-lat API error:", err);
// //     return NextResponse.json({ success: false, error: "Location lookup failed" });
// //   }
// // }

// import { NextResponse } from "next/server";
// import fs from "fs";
// import path from "path";

// const filePath = path.join(process.cwd(), "public", "cities.json");

// function readDB() {
//   try {
//     const data = fs.readFileSync(filePath, "utf-8");
//     return JSON.parse(data);
//   } catch {
//     return [];
//   }
// }

// function writeDB(data) {
//   fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
// }

// // ── Real timezone from coordinates via timeapi.io (free, no key needed) ─────
// async function getTimezone(lat, lon) {
//   try {
//     const res = await fetch(
//       `https://timeapi.io/api/TimeZone/coordinate?latitude=${lat}&longitude=${lon}`
//     );
//     if (!res.ok) throw new Error("timeapi failed");
//     const json = await res.json();
//     if (json.timeZone) return json.timeZone; // e.g. "Asia/Kolkata"
//   } catch { /* fall through to rough fallback */ }

//   // Rough fallback: ±15° longitude ≈ ±1 hour
//   const offsetHours = Math.round(lon / 15);
//   if (offsetHours === 0) return "Etc/GMT";
//   return `Etc/GMT${offsetHours > 0 ? "-" : "+"}${Math.abs(offsetHours)}`; // Etc/GMT sign is inverted
// }

// export async function GET(req) {
//   const { searchParams } = new URL(req.url);
//   const query = searchParams.get("city");

//   if (!query || query.trim().length < 2) {
//     return NextResponse.json({ success: false, error: "City is required" });
//   }

//   const db = readDB();

//   // ── 1. Search local DB (case-insensitive) ────────────────────────────────
//   const q = query.toLowerCase().trim();
//   const found = db.find(
//     (c) => c.city.toLowerCase() === q || c.city.toLowerCase().startsWith(q)
//   );

//   if (found) {
//     console.log("Served from DB:", found.city);
//     return NextResponse.json({ success: true, source: "local", data: found });
//   }

//   // ── 2. Call Nominatim with addressdetails=1 ──────────────────────────────
//   try {
//     const res = await fetch(
//       `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`,
//       { headers: { "User-Agent": "kundali-app/1.0" } }
//     );
//     console.log("got from api");

//     const data = await res.json();
//     if (!data.length) {
//       return NextResponse.json({ success: false, error: "City not found" });
//     }

//     const r    = data[0];
//     const addr = r.address || {};

//     const city    = addr.city || addr.town || addr.village || addr.municipality || addr.county || r.name;
//     const state   = addr.state   || "";
//     const country = addr.country || "";
//     const lat     = parseFloat(r.lat);
//     const lon     = parseFloat(r.lon);

//     // ── 3. Real timezone lookup ──────────────────────────────────────────
//     const tz = await getTimezone(lat, lon);

//     const newEntry = { city, state, country, lat, lon, tz };

//     // ── 4. Save to DB ────────────────────────────────────────────────────
//     db.push(newEntry);
//     writeDB(db);

//     console.log("Fetched from Nominatim:", city, tz);
//     return NextResponse.json({ success: true, source: "api", data: newEntry });

//   } catch (err) {
//     console.error("long-lat error:", err);
//     return NextResponse.json({ success: false, error: "API failed" });
//   }
// }

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// GeoNames IN.txt columns (tab-separated):
// 0  geonameid
// 1  name
// 2  asciiname
// 3  alternatenames
// 4  latitude
// 5  longitude
// 6  feature class
// 7  feature code
// 8  country code
// 10 admin1 code
// 14 population
// 17 timezone

const GEONAMES_PATH = path.join(process.cwd(), "public", "IN.txt");

const PLACE_CODES = new Set([
  "PPL", "PPLA", "PPLA2", "PPLA3", "PPLA4", "PPLC", "PPLG", "PPLS", "PPLX",
]);

const MAX_RESULTS = 8; // how many suggestions to show

// ── 1. Search GeoNames IN.txt — returns array of matches ────────────────────
function searchGeoNames(q) {
  try {
    const lines = fs.readFileSync(GEONAMES_PATH, "utf-8").split("\n");

    const exactMatches    = [];
    const startsMatches   = [];
    const containsMatches = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      const cols = line.split("\t");
      if (cols.length < 18) continue;
      if (!PLACE_CODES.has(cols[7].trim())) continue;

      const name     = cols[1].trim().toLowerCase();
      const ascii    = cols[2].trim().toLowerCase();
      const altnames = cols[3].trim().toLowerCase();

      const isExact    = name === q || ascii === q;
      const isStarts   = !isExact  && (name.startsWith(q) || ascii.startsWith(q));
      const isContains = !isStarts && (name.includes(q) || ascii.includes(q) || altnames.includes(q));

      const entry = {
        city:    cols[1].trim(),
        state:   cols[10].trim(),
        country: "India",
        lat:     parseFloat(cols[4]),
        lon:     parseFloat(cols[5]),
        tz:      cols[17].trim(),
        population: parseInt(cols[14] || "0"),
      };

      if      (isExact)    exactMatches.push(entry);
      else if (isStarts)   startsMatches.push(entry);
      else if (isContains) containsMatches.push(entry);

      // Stop scanning once we have enough
      if (exactMatches.length + startsMatches.length + containsMatches.length >= MAX_RESULTS * 3) break;
    }

    // Sort each tier by population descending, then merge
    const sort = (arr) => arr.sort((a, b) => b.population - a.population);

    const results = [
      ...sort(exactMatches),
      ...sort(startsMatches),
      ...sort(containsMatches),
    ].slice(0, MAX_RESULTS);

    return results;
  } catch {
    return [];
  }
}

// ── 2. Fallback: Nominatim (original logic, returns array) ──────────────────
async function searchNominatim(query) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
    { headers: { "User-Agent": "kundali-app/1.0" } }
  );

  const data = await res.json();
  if (!data.length) return [];

  const results = await Promise.all(
    data.map(async (r) => {
      const addr    = r.address || {};
      const city    = addr.city || addr.town || addr.village || addr.municipality || addr.county || r.name;
      const state   = addr.state   || "";
      const country = addr.country || "";
      const lat     = parseFloat(r.lat);
      const lon     = parseFloat(r.lon);

      let tz = "Asia/Kolkata";
      try {
        const tzRes  = await fetch(`https://timeapi.io/api/TimeZone/coordinate?latitude=${lat}&longitude=${lon}`);
        const tzJson = await tzRes.json();
        if (tzJson.timeZone) tz = tzJson.timeZone;
      } catch { /* keep default */ }

      return { city, state, country, lat, lon, tz };
    })
  );

  return results;
}

// ── Handler ──────────────────────────────────────────────────────────────────
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("city");

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ success: false, error: "City is required" });
  }

  const q = query.trim().toLowerCase();

  // Try GeoNames first
  const geoResults = searchGeoNames(q);
  if (geoResults.length > 0) {
    console.log(`GeoNames: ${geoResults.length} results for "${query}"`);
    return NextResponse.json({ success: true, source: "geonames", data: geoResults });
  }

  // Fall back to Nominatim
  try {
    console.log(`GeoNames miss — trying Nominatim for: "${query}"`);
    const nomResults = await searchNominatim(query);
    if (!nomResults.length) {
      return NextResponse.json({ success: false, error: "City not found" });
    }
    console.log(`Nominatim: ${nomResults.length} results for "${query}"`);
    return NextResponse.json({ success: true, source: "nominatim", data: nomResults });
  } catch (err) {
    console.error("Nominatim error:", err);
    return NextResponse.json({ success: false, error: "City not found" });
  }
}