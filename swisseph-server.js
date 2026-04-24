//  with the help of degrees in rashis

const http = require("http");
const swisseph = require("swisseph");

/*─────────────────────────────────────────────────────────────
  CONFIG
─────────────────────────────────────────────────────────────*/
const AYANAMSA_MAP = {
  1: swisseph.SE_SIDM_LAHIRI,
  3: swisseph.SE_SIDM_RAMAN,
  5: swisseph.SE_SIDM_KRISHNAMURTI,
};

const HIT_ANGLES = [0, 30, 45, 60, 90, 120, 135, 150, 180];
const HIT_ORB = 5; // ±5 degrees

const PLANETS = [
  { id: swisseph.SE_SUN,       name: "Sun"     },
  { id: swisseph.SE_MOON,      name: "Moon"    },
  { id: swisseph.SE_MARS,      name: "Mars"    },
  { id: swisseph.SE_MERCURY,   name: "Mercury" },
  { id: swisseph.SE_JUPITER,   name: "Jupiter" },
  { id: swisseph.SE_VENUS,     name: "Venus"   },
  { id: swisseph.SE_SATURN,    name: "Saturn"  },
 // { id: swisseph.SE_URANUS,    name: "Uranus"  },
 // { id: swisseph.SE_NEPTUNE,   name: "Neptune" },
  //{ id: swisseph.SE_PLUTO,     name: "Pluto"   },
  { id: swisseph.SE_MEAN_NODE, name: "Rahu"    },
];

const SIGNS = [
  "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
  "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"
];

const SIGN_LORDS = {
  Aries:       "Mars",
  Taurus:      "Venus",
  Gemini:      "Mercury",
  Cancer:      "Moon",
  Leo:         "Sun",
  Virgo:       "Mercury",
  Libra:       "Venus",
  Scorpio:     "Mars",
  Sagittarius: "Jupiter",
  Capricorn:   "Saturn",
  Aquarius:    "Saturn",
  Pisces:      "Jupiter",
};

const SIGN_CO_LORDS = {
  Scorpio:  "Ketu",
  Aquarius: "Rahu",
};

const DASHA_SEQUENCE = [
  "Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"
];

const DASHA_YEARS = {
  Ketu:    7,
  Venus:   20,
  Sun:     6,
  Moon:    10,
  Mars:    7,
  Rahu:    18,
  Jupiter: 16,
  Saturn:  19,
  Mercury: 17,
};

const TOTAL_DASHA_YEARS = 120;

/*─────────────────────────────────────────────────────────────
  NAKSHATRA → DASHA LORD MAPPING
  27 nakshatras, each maps to a dasha lord in the fixed order:
  Ashwini=Ketu, Bharani=Venus, Krittika=Sun, Rohini=Moon,
  Mrigashira=Mars, Ardra=Rahu, Punarvasu=Jupiter, Pushya=Saturn,
  Ashlesha=Mercury, Magha=Ketu, ...repeats 3 times
─────────────────────────────────────────────────────────────*/
const NAKSHATRA_LORDS = [
  "Ketu",    // 0  Ashwini
  "Venus",   // 1  Bharani
  "Sun",     // 2  Krittika
  "Moon",    // 3  Rohini
  "Mars",    // 4  Mrigashira
  "Rahu",    // 5  Ardra
  "Jupiter", // 6  Punarvasu
  "Saturn",  // 7  Pushya
  "Mercury", // 8  Ashlesha
  "Ketu",    // 9  Magha
  "Venus",   // 10 Purva Phalguni
  "Sun",     // 11 Uttara Phalguni
  "Moon",    // 12 Hasta
  "Mars",    // 13 Chitra
  "Rahu",    // 14 Swati
  "Jupiter", // 15 Vishakha
  "Saturn",  // 16 Anuradha
  "Mercury", // 17 Jyeshtha
  "Ketu",    // 18 Mula
  "Venus",   // 19 Purva Ashadha
  "Sun",     // 20 Uttara Ashadha
  "Moon",    // 21 Shravana
  "Mars",    // 22 Dhanishtha
  "Rahu",    // 23 Shatabhisha
  "Jupiter", // 24 Purva Bhadrapada
  "Saturn",  // 25 Uttara Bhadrapada
  "Mercury", // 26 Revati
];

/*─────────────────────────────────────────────────────────────
  PRECISE YEAR MS
  1 Vedic dasha year = 365.25 days exactly
─────────────────────────────────────────────────────────────*/
const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

function addYears(dateObj, years) {
  return new Date(dateObj.getTime() + years * YEAR_MS);
}

/*─────────────────────────────────────────────────────────────
  HELPERS
─────────────────────────────────────────────────────────────*/
function dateToJD(dateObj) {
  return swisseph.swe_julday(
    dateObj.getUTCFullYear(),
    dateObj.getUTCMonth() + 1,
    dateObj.getUTCDate(),
    dateObj.getUTCHours() +
      dateObj.getUTCMinutes() / 60 +
      dateObj.getUTCSeconds() / 3600,
    swisseph.SE_GREG_CAL
  );
}

function enrichLongitude(longitude) {
  const signIndex    = Math.floor(longitude / 30);
  const degreeInSign = longitude % 30;

  const deg = Math.floor(degreeInSign);
  const min = Math.floor((degreeInSign % 1) * 60);
  const sec = Math.floor((((degreeInSign % 1) * 60) % 1) * 60);

  return {
    longitude,
    sign:             SIGNS[signIndex],
    sign_index:       signIndex,
    degree_in_sign:   degreeInSign,
    degree_formatted: `${deg}°${min}'${sec}"`,
  };
}

function calcHouseData(jd, lat, lon, ayanamsaId) {
  swisseph.swe_set_sid_mode(ayanamsaId, 0, 0);

  const houses   = swisseph.swe_houses(jd, lat, lon, "P");
  const ayanamsa = swisseph.swe_get_ayanamsa_ut(jd);

  const cusps     = houses.house.map(c => ((c - ayanamsa + 360) % 360));
  const ascendant = ((houses.ascendant - ayanamsa + 360) % 360);

  return { ascendant, houseCusps: cusps };
}

function calcPlanet(jd, planetId, ayanamsaId) {
  swisseph.swe_set_sid_mode(ayanamsaId, 0, 0);

  return swisseph.swe_calc_ut(
    jd,
    planetId,
    swisseph.SEFLG_SIDEREAL | swisseph.SEFLG_SPEED
  );
}

function getHouseByCusps(longitude, cusps) {
  for (let i = 0; i < 12; i++) {
    const start = cusps[i];
    const end   = cusps[(i + 1) % 12];

    if (start < end) {
      if (longitude >= start && longitude < end) return i + 1;
    } else {
      if (longitude >= start || longitude < end) return i + 1;
    }
  }
  return null;
}

function normalizeDegree(deg) {
  return ((deg % 360) + 360) % 360;
}

function angularDistance(a, b) {
  let diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/*─────────────────────────────────────────────────────────────
  OCCUPANTS
─────────────────────────────────────────────────────────────*/
function getOccupants(planetPositions) {
  const occupants = {};
  for (let i = 1; i <= 12; i++) occupants[i] = [];

  for (const p of planetPositions) {
    if (p.house) occupants[p.house].push(p.name);
  }
  return occupants;
}

/*─────────────────────────────────────────────────────────────
  HOUSE LORDSHIPS
─────────────────────────────────────────────────────────────*/
function getLordships(houseCusps) {
  const lordships = {};

  houseCusps.forEach((cusp, idx) => {
    const sign = SIGNS[Math.floor(cusp / 30)];

    lordships[idx + 1] = {
      sign,
      lord:     SIGN_LORDS[sign],
      co_lord:  SIGN_CO_LORDS[sign] || null,
    };
  });

  return lordships;
}

/*─────────────────────────────────────────────────────────────
  PLANET LORDSHIPS
─────────────────────────────────────────────────────────────*/
function getPlanetLordships(lordships, planetPositions) {
  const result = {
    Sun:       [],
    Moon:      [],
    Mars:      [],
    Mercury:   [],
    Jupiter:   [],
    Venus:     [],
    Saturn:    [],
    Rahu:      [],
    Ketu:      [],
    Uranus:    [],
    Neptune:   [],
    Pluto:     [],
    Ascendant: [],
  };

  for (const [houseNum, { sign, lord }] of Object.entries(lordships)) {
    if (result[lord] !== undefined) {
      result[lord].push({ house: Number(houseNum), sign });
    }
  }

  const rahu = planetPositions.find(p => p.name === "Rahu");
  const ketu = planetPositions.find(p => p.name === "Ketu");

  if (rahu) {
    const rahuActsLike = SIGN_LORDS[rahu.sign];
    result.Rahu = result[rahuActsLike] ? [...result[rahuActsLike]] : [];
  }

  if (ketu) {
    const ketuActsLike = SIGN_LORDS[ketu.sign];
    result.Ketu = result[ketuActsLike] ? [...result[ketuActsLike]] : [];
  }

  return result;
}

/*─────────────────────────────────────────────────────────────
  DASHA LOGIC
  FIX: nakshatra size = 360/27 = 13.3333...°
       nakIndex = floor(moonLongitude / nakSize)  ← 0-based, 0–26
       This is the ONLY correct way — no +1 offset here.
─────────────────────────────────────────────────────────────*/
function getBirthMahadasha(moonLongitude) {
  const nakSize  = 360 / 27;                          // 13.3333...°
  const nakIndex = Math.floor(moonLongitude / nakSize); // 0-based: 0–26

  const lord       = NAKSHATRA_LORDS[nakIndex];
  const elapsed    = (moonLongitude % nakSize) / nakSize; // 0–1 fraction through nakshatra
  const balancePct = 1 - elapsed;

  return {
    nakshatraIndex: nakIndex + 1,                          // 1-based for display
    mahadashaLord:  lord,
    balanceYears:   +(DASHA_YEARS[lord] * balancePct).toFixed(6),
  };
}

function generateMahadashaTimeline(startLord, balanceYears, birthDate) {
  const timeline   = [];
  const startIndex = DASHA_SEQUENCE.indexOf(startLord);
  let   current    = new Date(birthDate);

  for (let i = 0; i < 9; i++) {
    const lord  = DASHA_SEQUENCE[(startIndex + i) % 9];
    const years = i === 0 ? balanceYears : DASHA_YEARS[lord];
    const end   = addYears(current, years);

    timeline.push({
      lord,
      start: current.toISOString(),
      end:   end.toISOString(),
    });

    current = end;
  }

  return timeline;
}

function getCurrentMahadasha(mdTimeline) {
  const now = new Date();
  return mdTimeline.find(md =>
    now >= new Date(md.start) && now <= new Date(md.end)
  );
}

/*─────────────────────────────────────────────────────────────
  ANTARDASHA
  FIX 1: Formula = (MD lord years × AD lord years) / 120
  FIX 2: mdEnd parameter removed entirely — each AD duration
          is absolute, never clamped to MD end.
          This prevents the last AD from being warped when
          the current MD is a balance (partial) MD.
─────────────────────────────────────────────────────────────*/
function generateAntardasha(mdLord, mdStart) {
  const startIndex = DASHA_SEQUENCE.indexOf(mdLord);
  const msStart    = new Date(mdStart).getTime();

  const ads    = [];
  let current  = msStart;

  for (let i = 0; i < 9; i++) {
    const adLord  = DASHA_SEQUENCE[(startIndex + i) % 9];
    const adYears = (DASHA_YEARS[mdLord] * DASHA_YEARS[adLord]) / TOTAL_DASHA_YEARS;
    const adMs    = adYears * YEAR_MS;
    const end     = current + adMs;

    ads.push({
      lord:  adLord,
      start: new Date(current).toISOString(),
      end:   new Date(end).toISOString(),
    });

    current = end;
  }

  return ads;
}

function getCurrentADL(antardashas) {
  const now = new Date();
  return antardashas.find(ad =>
    now >= new Date(ad.start) && now <= new Date(ad.end)
  );
}
/*─────────────────────────────────────────────
  ROUND DEGREE BASED ON MINUTES
─────────────────────────────────────────────*/
function getRoundedDegreeInSign(longitude) {
  const degreeInSign = longitude % 30;

  const deg = Math.floor(degreeInSign);
  const min = Math.floor((degreeInSign - deg) * 60);

  return min < 30 ? deg : deg + 1;
}

function getSignsInRange(startDeg, endDeg) {
  const signs = [];

  if (startDeg <= endDeg) {
    for (let deg = startDeg; deg <= endDeg; deg++) {
      const signIndex = Math.floor(deg / 30);
      if (!signs.includes(signIndex)) {
        signs.push(signIndex);
      }
    }
  } else {
    // Wrap-around case (e.g. 358° to 4°)
    for (let deg = startDeg; deg < 360; deg++) {
      const signIndex = Math.floor(deg / 30);
      if (!signs.includes(signIndex)) {
        signs.push(signIndex);
      }
    }

    for (let deg = 0; deg <= endDeg; deg++) {
      const signIndex = Math.floor(deg / 30);
      if (!signs.includes(signIndex)) {
        signs.push(signIndex);
      }
    }
  }

  return signs;
}

function isDegreeInRange(value, start, end) {
  if (start <= end) {
    return value >= start && value <= end;
  }

  // Wrap-around case (e.g. 358° → 4°)
  return value >= start || value <= end;
}
/*─────────────────────────────────────────────
  MAIN PROJECTION HIT LOGIC
─────────────────────────────────────────────*/
function calculateProjectionHits(planetPositions, houseCusps) {
  const results = [];

  for (const sourcePlanet of planetPositions) {
    if (sourcePlanet.name === "Ascendant" || sourcePlanet.name === "Rahu" || sourcePlanet.name === "Ketu") continue;

    const baseLongitude = sourcePlanet.longitude;

    const projections = [];

    for (const angle of HIT_ANGLES) {
      const projectedLongitude = normalizeDegree(
  baseLongitude + angle
);

      const rangeStart = normalizeDegree(
        projectedLongitude - HIT_ORB
      );

      const rangeEnd = normalizeDegree(
        projectedLongitude + HIT_ORB
      );

      const hitPlanets = [];
      const hitHouses = [];

      /* CHECK PLANETS */
      const validSigns = getSignsInRange(rangeStart, rangeEnd);

/* CHECK PLANETS */
for (const targetPlanet of planetPositions) {
  if (targetPlanet.name === sourcePlanet.name ) continue;

  const diff = angularDistance(
    projectedLongitude,
    targetPlanet.longitude
  );

  if (diff <= HIT_ORB) {
    hitPlanets.push({
      planet: targetPlanet.name,
      sign: targetPlanet.sign,
      longitude: targetPlanet.longitude.toFixed(4),
      degree_formatted: targetPlanet.degree_formatted,
      orb: diff.toFixed(2),
    });
  }
}
      /* CHECK HOUSE CUSPS */
      houseCusps.forEach((cuspLon, idx) => {
        const diff = angularDistance(
          projectedLongitude,
          cuspLon
        );

        if (diff <= HIT_ORB) {
          hitHouses.push({
            house: idx + 1,
            cusp_longitude: cuspLon.toFixed(4),
            cusp_degree: enrichLongitude(cuspLon).degree_formatted,
            orb: diff.toFixed(2),
          });
        }
      });

      projections.push({
        angle,
        projected_longitude: projectedLongitude.toFixed(4),
        projected_degree: enrichLongitude(projectedLongitude).degree_formatted,
        range: `${rangeStart.toFixed(2)}° - ${rangeEnd.toFixed(2)}°`,
        hit_planets: hitPlanets,
        hit_houses: hitHouses,
      });
    }

    results.push({
      source_planet: sourcePlanet.name,
      source_longitude: sourcePlanet.longitude.toFixed(4),
      source_degree: sourcePlanet.degree_formatted,
      projections,
    });
  }

  return results;
}
/*─────────────────────────────────────────────────────────────
  MAIN CALCULATE
─────────────────────────────────────────────────────────────*/
function calculate(ayanamsa, coordinates, datetime) {
  const ayanamsaId = AYANAMSA_MAP[Number(ayanamsa)];
  if (!ayanamsaId) throw new Error("Invalid ayanamsa");

  const [lat, lon] = coordinates.split(",").map(Number);
  const birthDate  = new Date(datetime);
  const jd         = dateToJD(birthDate);

  const { ascendant, houseCusps } = calcHouseData(jd, lat, lon, ayanamsaId);

  const planetPositions = [];

  planetPositions.push({
    id:            "ascendant",
    name:          "Ascendant",
    ...enrichLongitude(ascendant),
    house:         1,
    is_retrograde: false,
  });

  let rahuLon = null;

  for (const planet of PLANETS) {
    const res = calcPlanet(jd, planet.id, ayanamsaId);

    if (planet.name === "Rahu") rahuLon = res.longitude;

    planetPositions.push({
      id:            String(planet.id),
      name:          planet.name,
      ...enrichLongitude(res.longitude),
      house:         getHouseByCusps(res.longitude, houseCusps),
      is_retrograde: (res.longitudeSpeed || 0) < 0,
    });
  }

  if (rahuLon !== null) {
    const ketuLon = (rahuLon + 180) % 360;
    planetPositions.push({
      id:            "ketu",
      name:          "Ketu",
      ...enrichLongitude(ketuLon),
      house:         getHouseByCusps(ketuLon, houseCusps),
      is_retrograde: false,
    });
  }

  const occupants       = getOccupants(planetPositions);
  const lordships       = getLordships(houseCusps);
  const planetLordships = getPlanetLordships(lordships, planetPositions);

  for (const p of planetPositions) {
    p.lords_houses = planetLordships[p.name] !== undefined
      ? planetLordships[p.name]
      : [];
  }

  const moon   = planetPositions.find(p => p.name === "Moon");
  const mdInfo = getBirthMahadasha(moon.longitude);

  /*── DEBUG (remove in production) ──────────────────────────
  console.log("Moon sidereal lon :", moon.longitude);
  console.log("Nakshatra index   :", mdInfo.nakshatraIndex);
  console.log("Birth MD lord     :", mdInfo.mahadashaLord);
  console.log("Balance years     :", mdInfo.balanceYears);
  ───────────────────────────────────────────────────────────*/

  const mdTimeline = generateMahadashaTimeline(
    mdInfo.mahadashaLord,
    mdInfo.balanceYears,
    birthDate
  );

  const currentMD = getCurrentMahadasha(mdTimeline);

  // FIX: pass only mdLord + mdStart, NOT mdEnd
  const antardashas = generateAntardasha(
    currentMD.lord,
    currentMD.start
  );

  const currentADL = getCurrentADL(antardashas);
  const projectionHits = calculateProjectionHits(
  planetPositions,
  houseCusps
);
  return {
    planet_position:     planetPositions,
    house_cusps:         houseCusps,
    occupants,
    lordships,
    planet_lordships:    planetLordships,
    birth_mahadasha:     mdInfo,
    mahadasha_timeline:  mdTimeline,
    current_mahadasha:   currentMD,
    antardasha_timeline: antardashas,
    current_adl:         currentADL,
    projection_hits: projectionHits,
  };
}



/*─────────────────────────────────────────────────────────────
  HTTP SERVER
─────────────────────────────────────────────────────────────*/
const PORT = 3001;

http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const url = new URL(req.url, `http://localhost:${PORT}`);

  try {
    const data = calculate(
      url.searchParams.get("ayanamsa"),
      url.searchParams.get("coordinates"),
      url.searchParams.get("datetime")
    );

    res.end(JSON.stringify({ success: true, data }, null, 2));
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: err.message }));
  }
}).listen(PORT, () => {
  console.log(`✓ Swiss Ephemeris server running at http://localhost:${PORT}`);
});
