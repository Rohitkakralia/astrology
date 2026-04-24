// app/api/planets/route.js
// Lightweight proxy — forwards requests to the standalone swisseph server.
// swisseph native addon is NOT imported here, so Next.js never crashes.

const SWISSEPH_SERVER = "http://localhost:3001";

const VALID_AYANAMSA  = ["1", "3", "5"];
const VALID_LANGUAGES = ["en", "hi", "ta", "te", "ml"];

function validateParams({ ayanamsa, coordinates, datetime, la }) {
  const errors = [];
  if (!ayanamsa) {
    errors.push("ayanamsa is required");
  } else if (!VALID_AYANAMSA.includes(String(ayanamsa))) {
    errors.push("ayanamsa must be 1 (Lahiri), 3 (Raman), or 5 (KP)");
  }
  if (!coordinates) {
    errors.push("coordinates is required (eg: 29.1967,73.2046)");
  } else {
    const parts = coordinates.split(",");
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
      errors.push("coordinates format invalid. Use: latitude,longitude");
    }
  }
  if (!datetime) {
    errors.push("datetime is required (ISO 8601)");
  } else if (isNaN(Date.parse(decodeURIComponent(datetime)))) {
    errors.push("datetime is not a valid ISO 8601 string");
  }
  if (la && !VALID_LANGUAGES.includes(la)) {
    errors.push(`la must be one of: ${VALID_LANGUAGES.join(", ")}`);
  }
  return errors;
}

// ── Astro Script Helpers ─────────────────────────────────────

const HOUSE_CONTEXT = {
  1: "Appearance, Personality",
  2: "Money, Family, Possessions",
  3: "Communication, Siblings",
  4: "Home, Values, Education",
  5: "Creativity, Children",
  6: "Service, Health",
  7: "Partner, Interaction",
  8: "Fear, Transformation",
  9: "Dharma, Spirituality",
  10: "Career, Karma",
  11: "Gains, Networking",
  12: "Loss, Foreign, Isolation"
};

const SIGN_MINDSET = {
  Aries: "Emergency, Protector",
  Taurus: "Persistent, Practical",
  Gemini: "Communication, Social",
  Cancer: "Caretaker, Emotional",
  Leo: "Royal, Leadership",
  Virgo: "Planner, Analytical",
  Libra: "Balance, Harmony",
  Scorpio: "Intense, Secretive",
  Sagittarius: "Explorer, Freedom",
  Capricorn: "Strategy, Discipline",
  Aquarius: "Humanitarian",
  Pisces: "Spiritual, Creative"
};

function getPlanetHouseMap(occupants) {
  const map = {};
  for (let house in occupants) {
    occupants[house].forEach(p => {
      map[p] = parseInt(house);
    });
  }
  return map;
}

function getAspects(planets) {
  const aspects = {};

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      let diff = Math.abs(planets[i].longitude - planets[j].longitude);
      if (diff > 180) diff = 360 - diff;

      const check = (angle, orb = 3) => Math.abs(diff - angle) < orb;

      if (check(180) || check(120) || check(90) || check(60)) {
        if (!aspects[planets[i].name]) aspects[planets[i].name] = [];
        if (!aspects[planets[j].name]) aspects[planets[j].name] = [];

        aspects[planets[i].name].push(`${planets[j].name} ${Math.round(diff)}`);
        aspects[planets[j].name].push(`${planets[i].name} ${Math.round(diff)}`);
      }
    }
  }

  return aspects;
}

function buildAstroScript(data) {
  const {
    planet_position,
    planet_lordships,
    occupants,
    antardasha_timeline
  } = data;

  const planetHouseMap = getPlanetHouseMap(occupants);
  const aspects = getAspects(planet_position);

  return planet_position.map(p => {
    const house = planetHouseMap[p.name] || null;

    const timeline = antardasha_timeline.find(d => d.lord === p.name);

    return {
      planet: p.name,
      degree: p.longitude.toFixed(2),
      sign: p.sign,
      mindset: SIGN_MINDSET[p.sign] || "",
      house,
      lordship: (planet_lordships[p.name] || []).map(l => l.house),
      box: house ? HOUSE_CONTEXT[house] : "",
      adl_start: timeline?.start || null,
      adl_end: timeline?.end || null,
      hit_from: aspects[p.name] || []
    };
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const ayanamsa    = searchParams.get("ayanamsa");
  const coordinates = searchParams.get("coordinates");
  const datetime    = searchParams.get("datetime");
  const la          = searchParams.get("la");

  const errors = validateParams({ ayanamsa, coordinates, datetime, la });
  console.log("req : ", ayanamsa, coordinates, datetime, la);
  if (errors.length > 0) {
    return Response.json({ success: false, errors }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({
      ayanamsa,
      coordinates,
      datetime: decodeURIComponent(datetime),
    });

    const upstream = await fetch(`${SWISSEPH_SERVER}/?${params.toString()}`, {
      cache: "no-store",
    });

    const json = await upstream.json();

    console.log("response from swiss: ", json);
    if (!upstream.ok || !json.success) {
      return Response.json(
        { success: false, error: json.error || "Swisseph server error" },
        { status: upstream.status || 500 }
      );
    }
// Build Astro Script
const astroScript = buildAstroScript(json.data);

// Attach without breaking existing format
const enhancedData = {
  ...json.data,
  astro_script: astroScript
};

return Response.json({ success: true, data: enhancedData });
  } catch (err) {
    if (err.cause?.code === "ECONNREFUSED") {
      return Response.json(
        {
          success: false,
          error:
            "Swiss Ephemeris server is not running. " +
            "Please open a second terminal and run: node swisseph-server.js",
        },
        { status: 503 }
      );
    }
    console.error("[api/planets] error:", err.message);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}