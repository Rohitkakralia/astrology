import swisseph from 'swisseph';
import path from 'path';

// Point to ephemeris data files (download from https://www.astro.com/swisseph/)
swisseph.swe_set_ephe_path(path.join(process.cwd(), 'ephe'));

const PLANETS = [
  { id: swisseph.SE_SUN,     name: 'Sun'     },
  { id: swisseph.SE_MOON,    name: 'Moon'    },
  { id: swisseph.SE_MARS,    name: 'Mars'    },
  { id: swisseph.SE_MERCURY, name: 'Mercury' },
  { id: swisseph.SE_JUPITER, name: 'Jupiter' },
  { id: swisseph.SE_VENUS,   name: 'Venus'   },
  { id: swisseph.SE_SATURN,  name: 'Saturn'  },
  { id: swisseph.SE_TRUE_NODE, name: 'Rahu'  }, // True Node = Rahu
];

const SIGNS = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'
];

function longitudeToSign(lon) {
  const normalized = ((lon % 360) + 360) % 360;
  const signIndex  = Math.floor(normalized / 30);
  const degree     = normalized % 30;
  return {
    longitude: normalized,
    sign:      SIGNS[signIndex],
    signIndex: signIndex + 1,       // 1–12
    degree:    parseFloat(degree.toFixed(4)),
  };
}

function toJulianDay(year, month, day, utcH = 0, utcM = 0, utcS = 0) {
  let y = year;
  let m = month;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  const dayFrac = (utcH + utcM / 60 + utcS / 3600) / 24;
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day + dayFrac + B - 1524.5
  );
}

export async function POST(req) {
  try {
    const payload = await req.json();
    const { dob, tob, tz, lat, lon } = payload;

    // ── Recompute correct UTC ────────────────────────────────────────────────
    const [y, mo, d]       = dob.split("-").map(Number);
    const [hLocal, mLocal] = tob.split(":").map(Number);
    const localAsUTC       = Date.UTC(y, mo - 1, d, hLocal, mLocal, 0);

    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false,
    }).formatToParts(new Date(localAsUTC));

    const pv = {};
    parts.forEach(x => (pv[x.type] = x.value));
    const tzH      = parseInt(pv.hour === "24" ? "0" : pv.hour);
    const tzWallMs = Date.UTC(parseInt(pv.year), parseInt(pv.month) - 1, parseInt(pv.day), tzH, parseInt(pv.minute), 0);
    const offsetMin = Math.round((tzWallMs - localAsUTC) / 60000);
    const trueUTCms = localAsUTC - offsetMin * 60000;
    const utcDate   = new Date(trueUTCms);

    const utcH = utcDate.getUTCHours();
    const utcM = utcDate.getUTCMinutes();
    const utcS = utcDate.getUTCSeconds();

    // ── Julian Day ───────────────────────────────────────────────────────────
    const JD = toJulianDay(
      utcDate.getUTCFullYear(),
      utcDate.getUTCMonth() + 1,
      utcDate.getUTCDate(),
      utcH, utcM, utcS
    );

    // ── Ayanamsa (Lahiri — standard for Jyotish) ─────────────────────────────
    swisseph.swe_set_sid_mode(swisseph.SE_SIDM_LAHIRI, 0, 0);
    const ayanamsa = swisseph.swe_get_ayanamsa_ut(JD);

    // ── Planet positions ─────────────────────────────────────────────────────
    const flag    = swisseph.SEFLG_SWIEPH | swisseph.SEFLG_SPEED;
    const planets = {};

    for (const planet of PLANETS) {
      const result = swisseph.swe_calc_ut(JD, planet.id, flag);

      if (result.rflag < 0) {
        planets[planet.name] = { error: result.serr };
        continue;
      }

      // Tropical longitude → subtract ayanamsa → sidereal (Vedic)
      const tropicalLon  = result.longitude;
      const siderealLon  = ((tropicalLon - ayanamsa) % 360 + 360) % 360;
      const posInfo      = longitudeToSign(siderealLon);

      planets[planet.name] = {
        ...posInfo,
        speed:       parseFloat(result.longitudeSpeed.toFixed(6)), // deg/day
        isRetrograde: result.longitudeSpeed < 0,
        tropical:    parseFloat(tropicalLon.toFixed(6)),
      };
    }

    // Ketu = exactly opposite Rahu
    if (planets['Rahu'] && !planets['Rahu'].error) {
      const ketuLon = (planets['Rahu'].longitude + 180) % 360;
      planets['Ketu'] = {
        ...longitudeToSign(ketuLon),
        speed:        planets['Rahu'].speed,
        isRetrograde: true, // Ketu is always retrograde
        tropical:     (planets['Rahu'].tropical + 180) % 360,
      };
    }

    // ── Ascendant (Lagna) — Whole Sign ───────────────────────────────────────
    const houses = swisseph.swe_houses(JD, lat, lon, 'W'); // 'W' = Whole Sign
    const tropicalAsc  = houses.ascendant;
    const siderealAsc  = ((tropicalAsc - ayanamsa) % 360 + 360) % 360;
    const ascInfo      = longitudeToSign(siderealAsc);

    // ── Build D1 house assignments (Whole Sign) ───────────────────────────────
    // In Whole Sign, Lagna sign = house 1, next sign = house 2, etc.
    const lagnaSignIndex = ascInfo.signIndex; // 1–12
    const houseSignMap   = {};
    for (let h = 1; h <= 12; h++) {
      houseSignMap[h] = SIGNS[((lagnaSignIndex - 1 + h - 1) % 12)];
    }

    // Assign each planet to its house
    const planetHouses = {};
    for (const [name, data] of Object.entries(planets)) {
      if (data.error) continue;
      const planetSignIdx = data.signIndex; // 1–12
      // house = (planetSign - lagnaSign + 12) % 12 + 1
      planetHouses[name] = ((planetSignIdx - lagnaSignIndex + 12) % 12) + 1;
    }

    return Response.json({
      JD:        JD.toFixed(6),
      ayanamsa:  ayanamsa.toFixed(6),
      ascendant: { ...ascInfo, tropical: parseFloat(tropicalAsc.toFixed(6)) },
      planets,
      houses:    houseSignMap,
      planetHouses,
    });

  } catch (err) {
    console.error('Charts API error:', err);
    return Response.json({ message: err.message }, { status: 500 });
  }
}