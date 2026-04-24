// "use client";

// import { useState, useEffect, useRef } from "react";
// import { useRouter } from "next/navigation";

// export default function BirthDetailsForm() {
//   const router = useRouter();

//   const [form, setForm]               = useState({ name: "", dob: "", tob: "", gender: "" });
//   const [query, setQuery]             = useState("");
//   const [suggestions, setSuggestions] = useState([]);
//   const [loading, setLoading]         = useState(false);
//   const [activeIdx, setActiveIdx]     = useState(-1);
//   const [place, setPlace]             = useState(null);
//   const [utc, setUtc]                 = useState(null);
//   const [submitting, setSubmitting]   = useState(false);

//   const debounceRef = useRef(null);
//   const wrapRef     = useRef(null);

//   // Close dropdown when clicking outside
//   useEffect(() => {
//     const fn = (e) => {
//       if (wrapRef.current && !wrapRef.current.contains(e.target)) setSuggestions([]);
//     };
//     document.addEventListener("mousedown", fn);
//     return () => document.removeEventListener("mousedown", fn);
//   }, []);

//   // Recompute UTC whenever date/time/place changes
//   useEffect(() => { computeUTC(form.dob, form.tob, place); }, [form.dob, form.tob, place]);

//   const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

//   // ── City search ────────────────────────────────────────────────────────────
//   const handleCityInput = (e) => {
//     const q = e.target.value;
//     setQuery(q);
//     setPlace(null);
//     setUtc(null);
//     setSuggestions([]);
//     clearTimeout(debounceRef.current);
//     if (q.trim().length < 2) return;
//     debounceRef.current = setTimeout(() => fetchCities(q.trim()), 350);
//   };

//   const fetchCities = async (q) => {
//     setLoading(true);
//     try {
//       const res  = await fetch(`/api/long-lat?city=${encodeURIComponent(q)}`);
//       const json = await res.json();

//       if (json.success && json.data) {
//         // API always returns a single, cleaned result
//         setSuggestions([json.data]);
//       } else {
//         setSuggestions([]);
//       }
//     } catch {
//       setSuggestions([]);
//     }
//     setLoading(false);
//   };

//   // ─────────────────────────────────────────────────────────────────────────
//   // FIX: r here is already the cleaned { city, state, country, lat, lon, tz }
//   // object returned by your API — NOT a raw Nominatim result.
//   // ─────────────────────────────────────────────────────────────────────────
//   const selectPlace = (r) => {
//     const label = [r.city, r.state, r.country].filter(Boolean).join(", ");
//     setQuery(label);
//     setSuggestions([]);
//     setActiveIdx(-1);
//     setPlace({
//       city:    r.city,
//       state:   r.state    || "",
//       country: r.country  || "",
//       lat:     r.lat,
//       lon:     r.lon,
//       tz:      r.tz,
//     });
//   };

//   const handleKeyDown = (e) => {
//     if (!suggestions.length) return;
//     if (e.key === "ArrowDown") {
//       setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
//       e.preventDefault();
//     } else if (e.key === "ArrowUp") {
//       setActiveIdx((i) => Math.max(i - 1, 0));
//       e.preventDefault();
//     } else if (e.key === "Enter" && activeIdx >= 0) {
//       selectPlace(suggestions[activeIdx]);
//       e.preventDefault();
//     } else if (e.key === "Escape") {
//       setSuggestions([]);
//     }
//   };

//   // ── UTC Conversion ─────────────────────────────────────────────────────────
//   const computeUTC = (dob, tob, p) => {
//     if (!dob || !tob || !p?.tz) { setUtc(null); return; }
//     try {
//       const tz  = p.tz;
//       const pad = (n) => String(n).padStart(2, "0");

//       const [y, mo, d] = dob.split("-").map(Number);
//       const [h, mi]    = tob.split(":").map(Number);

//       // Rough UTC = treat local time as UTC for offset sampling
//       const roughUTC = Date.UTC(y, mo - 1, d, h, mi, 0);

//       // Ask Intl what local time that UTC instant is in the target timezone
//       const formatter = new Intl.DateTimeFormat("en-US", {
//         timeZone: tz,
//         year: "numeric", month: "2-digit", day: "2-digit",
//         hour: "2-digit", minute: "2-digit", second: "2-digit",
//         hour12: false,
//       });

//       const parts = {};
//       formatter.formatToParts(new Date(roughUTC)).forEach((x) => (parts[x.type] = x.value));

//       const localH  = parseInt(parts.hour === "24" ? "0" : parts.hour);
//       const localMs = Date.UTC(
//         parseInt(parts.year),
//         parseInt(parts.month) - 1,
//         parseInt(parts.day),
//         localH,
//         parseInt(parts.minute),
//         0
//       );

//       // offsetMs: positive = east of UTC (e.g. +19 800 000 for IST +5:30)
//       const offsetMs  = localMs - roughUTC;
//       const offsetMin = Math.round(offsetMs / 60000);

//       const realUTC    = new Date(roughUTC - offsetMs);
//       const utcDateStr = `${realUTC.getUTCFullYear()}-${pad(realUTC.getUTCMonth() + 1)}-${pad(realUTC.getUTCDate())}`;
//       const utcTimeStr = `${pad(realUTC.getUTCHours())}:${pad(realUTC.getUTCMinutes())}`;

//       const absOff    = Math.abs(offsetMin);
//       const offsetStr = `UTC${offsetMin >= 0 ? "+" : "-"}${pad(Math.floor(absOff / 60))}:${pad(absOff % 60)}`;

//       setUtc({
//         date: utcDateStr,
//         time: utcTimeStr,
//         offsetStr,
//         offsetMin,
//         localStr: `${dob} ${tob}`,
//         tz,
//       });
//     } catch (err) {
//       console.error("UTC conversion error:", err);
//       setUtc(null);
//     }
//   };

//   // ── Submit → /charts ───────────────────────────────────────────────────────
//   const handleSubmit = (e) => {
//     e.preventDefault();
//     if (!form.dob || !form.tob || !place || !utc) return;

//     setSubmitting(true);

//     const payload = {
//       name:         form.name,
//       gender:       form.gender,
//       dob:          form.dob,
//       tob:          form.tob,
//       city:         place.city,
//       state:        place.state,
//       country:      place.country,
//       lat:          place.lat,
//       lon:          place.lon,
//       tz:           place.tz,
//       utcDate:      utc.date,
//       utcTime:      utc.time,
//       utcOffsetStr: utc.offsetStr,
//       utcOffsetMin: utc.offsetMin,
//     };

//     console.log("Payload:", payload);
//     const encoded = btoa(JSON.stringify(payload));
//     router.push(`/charts?data=${encoded}`);
//   };

//   // ── Render ─────────────────────────────────────────────────────────────────
//   return (
//     <div style={{ width: "100%", maxWidth: 560, margin: "0 auto", padding: "2rem 1rem" }}>
//       <style>{css}</style>

//       <div style={{ textAlign: "center", marginBottom: "2rem" }}>
//         <p className="jf-sub">Vedic Astrology · Jyotish</p>
//         <h1 className="jf-title">Birth Details</h1>
//         <div className="jf-hdivider"><span>Enter your janma kundali details</span></div>
//       </div>

//       <form className="jf-card" onSubmit={handleSubmit}>

//         <div className="jf-row">
//           <div className="jf-field">
//             <label className="jf-lbl">Full Name <em>optional</em></label>
//             <input
//               type="text"
//               placeholder="e.g. Arjun Sharma"
//               value={form.name}
//               onChange={(e) => set("name", e.target.value)}
//             />
//           </div>
//         </div>

//         <div className="jf-row2">
//           <div className="jf-field">
//             <label className="jf-lbl">Date of Birth</label>
//             <input type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} required />
//           </div>
//           <div className="jf-field">
//             <label className="jf-lbl">Time of Birth</label>
//             <input type="time" value={form.tob} onChange={(e) => set("tob", e.target.value)} required />
//           </div>
//         </div>

//         <div className="jf-row">
//           <div className="jf-field">
//             <label className="jf-lbl">Place of Birth</label>
//             <div className="jf-city-wrap" ref={wrapRef}>
//               <input
//                 type="text"
//                 placeholder="Type a city name..."
//                 autoComplete="off"
//                 value={query}
//                 onChange={handleCityInput}
//                 onKeyDown={handleKeyDown}
//                 required
//               />
//               {loading && <div className="jf-spinner" />}

//               {suggestions.length > 0 && (
//                 <div className="jf-sugs">
//                   {suggestions.map((r, i) => {
//                     // r is already the clean API shape: { city, state, country, lat, lon, tz }
//                     const meta = [r.state, r.country].filter(Boolean).join(", ");
//                     return (
//                       <div
//                         key={i}
//                         className={`jf-sug${activeIdx === i ? " hi" : ""}`}
//                         onMouseDown={() => selectPlace(r)}
//                       >
//                         <span className="jf-sug-city">{r.city}</span>
//                         {meta && <span className="jf-sug-meta">{meta}</span>}
//                       </div>
//                     );
//                   })}
//                 </div>
//               )}
//             </div>

//             {place && (
//               <div className="jf-info-row">
//                 <div className="jf-pill">
//                   <span className="jf-pill-lbl">Coordinates</span>
//                   <span className="jf-pill-val">
//                     {place.lat.toFixed(4)}, {place.lon.toFixed(4)}
//                   </span>
//                 </div>
//                 <div className="jf-pill">
//                   <span className="jf-pill-lbl">Timezone</span>
//                   <span className="jf-pill-val">{place.tz}</span>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>

//         {utc && (
//           <div className="jf-utc-box">
//             <div className="jf-utc-title">⟳ Converted to UTC</div>
//             <div className="jf-utc-grid">
//               <div className="jf-utc-cell">
//                 <span className="jf-utc-lbl">UTC Date</span>
//                 <span className="jf-utc-val">{utc.date}</span>
//               </div>
//               <div className="jf-utc-cell">
//                 <span className="jf-utc-lbl">UTC Time</span>
//                 <span className="jf-utc-val">{utc.time}</span>
//               </div>
//               <div className="jf-utc-cell">
//                 <span className="jf-utc-lbl">Offset</span>
//                 <span className="jf-utc-val">{utc.offsetStr}</span>
//               </div>
//             </div>
//             <div className="jf-utc-footer">
//               <span className="jf-utc-footer-lbl">Local:</span>
//               <span className="jf-utc-footer-val">{utc.localStr}</span>
//               <span className="jf-utc-footer-tz">{utc.tz}</span>
//             </div>
//           </div>
//         )}

//         <div className="jf-divline" />

//         <div className="jf-field">
//           <label className="jf-lbl">Gender <em>optional</em></label>
//           <div className="jf-g-row">
//             {[
//               { val: "male",   icon: "♂", label: "Male"   },
//               { val: "female", icon: "♀", label: "Female" },
//               { val: "other",  icon: "◈", label: "Other"  },
//             ].map((g) => (
//               <label key={g.val} className={`jf-g-btn${form.gender === g.val ? " sel" : ""}`}>
//                 <input
//                   type="radio"
//                   name="gender"
//                   value={g.val}
//                   checked={form.gender === g.val}
//                   onChange={() => set("gender", g.val)}
//                 />
//                 {g.icon} {g.label}
//               </label>
//             ))}
//           </div>
//         </div>

//         <button
//           type="submit"
//           className="jf-submit"
//           disabled={!form.dob || !form.tob || !place || !utc || submitting}
//         >
//           {submitting ? (
//             <><div className="jf-btn-spinner" /> Calculating...</>
//           ) : (
//             <>
//               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
//                 <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
//               </svg>
//               Calculate Kundali
//             </>
//           )}
//         </button>
//       </form>
//     </div>
//   );
// }

// const css = `
//   @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=EB+Garamond:wght@400&display=swap');
//   .jf-sub { font-family:'EB Garamond',serif; font-size:11px; letter-spacing:.25em; text-transform:uppercase; color:rgba(200,160,60,0.5); margin-bottom:.5rem; }
//   .jf-title { font-family:'Cormorant Garamond',serif; font-size:28px; font-weight:600; color:#e8c97a; letter-spacing:.04em; }
//   .jf-hdivider { display:flex; align-items:center; gap:.75rem; margin:.9rem 0 0; }
//   .jf-hdivider::before,.jf-hdivider::after { content:''; flex:1; height:1px; background:rgba(200,160,60,0.18); }
//   .jf-hdivider span { font-size:13px; color:rgba(200,160,60,0.35); font-family:'EB Garamond',serif; font-style:italic; }
//   .jf-card { background:#13102a; border:1px solid rgba(200,160,60,0.15); border-radius:10px; padding:1.75rem; }
//   .jf-row { margin-bottom:1rem; }
//   .jf-row2 { display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem; }
//   .jf-field { display:flex; flex-direction:column; gap:6px; }
//   .jf-lbl { font-family:'EB Garamond',serif; font-size:12px; letter-spacing:.15em; text-transform:uppercase; color:rgba(200,160,60,0.5); }
//   .jf-lbl em { font-size:10px; color:rgba(200,160,60,0.28); letter-spacing:.08em; text-transform:none; margin-left:4px; }
//   .jf-card input { background:#0e0b1e; border:1px solid rgba(200,160,60,0.18); border-radius:5px; color:rgba(230,210,160,0.9); font-family:'EB Garamond',serif; font-size:15px; padding:.6rem .75rem; outline:none; width:100%; box-sizing:border-box; transition:border-color .2s; appearance:none; }
//   .jf-card input::placeholder { color:rgba(200,160,60,0.22); }
//   .jf-card input:focus { border-color:rgba(200,160,60,0.5); background:#110e25; }
//   .jf-city-wrap { position:relative; }
//   .jf-spinner { position:absolute; right:.75rem; top:50%; transform:translateY(-50%); width:14px; height:14px; border:1.5px solid rgba(200,160,60,0.2); border-top-color:rgba(200,160,60,0.7); border-radius:50%; animation:jf-spin .7s linear infinite; }
//   @keyframes jf-spin { to { transform:translateY(-50%) rotate(360deg); } }
//   .jf-sugs { position:absolute; top:calc(100% + 4px); left:0; right:0; background:#1a1535; border:1px solid rgba(200,160,60,0.25); border-radius:6px; z-index:100; max-height:210px; overflow-y:auto; }
//   .jf-sugs::-webkit-scrollbar { width:4px; } .jf-sugs::-webkit-scrollbar-thumb { background:rgba(200,160,60,0.2); border-radius:2px; }
//   .jf-sug { padding:.55rem .85rem; font-family:'EB Garamond',serif; cursor:pointer; border-bottom:1px solid rgba(200,160,60,0.07); display:flex; flex-direction:column; gap:2px; transition:background .15s; }
//   .jf-sug:last-child { border-bottom:none; }
//   .jf-sug:hover,.jf-sug.hi { background:rgba(200,160,60,0.08); }
//   .jf-sug-city { font-size:14px; color:rgba(220,200,150,0.8); }
//   .jf-sug-meta { font-size:11px; color:rgba(200,160,60,0.38); }
//   .jf-info-row { display:grid; grid-template-columns:1fr 1fr; gap:.6rem; margin-top:6px; }
//   .jf-pill { background:#0e0b1e; border:1px solid rgba(200,160,60,0.15); border-radius:5px; padding:.45rem .7rem; display:flex; flex-direction:column; gap:2px; }
//   .jf-pill-lbl { font-family:'EB Garamond',serif; font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:rgba(200,160,60,0.35); }
//   .jf-pill-val { font-family:'EB Garamond',serif; font-size:13px; color:rgba(200,160,60,0.75); }
//   .jf-utc-box { background:#0a0818; border:1px solid rgba(200,160,60,0.2); border-radius:8px; padding:1rem 1.1rem; margin-top:1rem; }
//   .jf-utc-title { font-family:'EB Garamond',serif; font-size:11px; letter-spacing:.18em; text-transform:uppercase; color:rgba(200,160,60,0.4); margin-bottom:.6rem; }
//   .jf-utc-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:.5rem; }
//   .jf-utc-cell { display:flex; flex-direction:column; gap:3px; }
//   .jf-utc-lbl { font-family:'EB Garamond',serif; font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:rgba(200,160,60,0.3); }
//   .jf-utc-val { font-family:'Cormorant Garamond',serif; font-size:17px; font-weight:600; color:#e8c97a; letter-spacing:.04em; }
//   .jf-utc-footer { margin-top:.65rem; padding-top:.65rem; border-top:1px solid rgba(200,160,60,0.1); display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; }
//   .jf-utc-footer-lbl { font-family:'EB Garamond',serif; font-size:12px; color:rgba(200,160,60,0.35); }
//   .jf-utc-footer-val { font-family:'EB Garamond',serif; font-size:13px; color:rgba(200,160,60,0.65); }
//   .jf-utc-footer-tz { font-family:'EB Garamond',serif; font-size:12px; color:rgba(200,160,60,0.35); margin-left:auto; }
//   .jf-divline { height:1px; background:rgba(200,160,60,0.1); margin:1.25rem 0; }
//   .jf-g-row { display:grid; grid-template-columns:repeat(3,1fr); gap:.5rem; margin-top:2px; }
//   .jf-g-btn { display:flex; align-items:center; justify-content:center; gap:6px; padding:.55rem .5rem; border:1px solid rgba(200,160,60,0.18); border-radius:5px; font-family:'EB Garamond',serif; font-size:14px; color:rgba(200,160,60,0.45); cursor:pointer; transition:all .2s; background:#0e0b1e; }
//   .jf-g-btn input { display:none; }
//   .jf-g-btn:hover { border-color:rgba(200,160,60,0.35); color:rgba(200,160,60,0.7); }
//   .jf-g-btn.sel { border-color:rgba(200,160,60,0.55); background:rgba(200,160,60,0.07); color:#e8c97a; }
//   .jf-submit { width:100%; height:46px; margin-top:1.5rem; background:rgba(200,160,60,0.1); border:1px solid rgba(200,160,60,0.4); border-radius:6px; color:#e8c97a; font-family:'Cormorant Garamond',serif; font-size:17px; font-weight:600; letter-spacing:.1em; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:all .2s; }
//   .jf-submit:hover:not(:disabled) { background:rgba(200,160,60,0.17); border-color:rgba(200,160,60,0.65); }
//   .jf-submit:disabled { opacity:0.4; cursor:not-allowed; }
//   .jf-submit svg { width:16px; height:16px; }
//   .jf-btn-spinner { width:14px; height:14px; border:1.5px solid rgba(200,160,60,0.3); border-top-color:#e8c97a; border-radius:50%; animation:jf-spin2 .7s linear infinite; flex-shrink:0; }
//   @keyframes jf-spin2 { to { transform:rotate(360deg); } }
//   @media(max-width:480px) { .jf-row2,.jf-utc-grid,.jf-info-row { grid-template-columns:1fr; } }
// `;
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function BirthDetailsForm() {
  const router = useRouter();

  const [form, setForm]               = useState({ name: "", dob: "", tob: "", gender: "" });
  const [query, setQuery]             = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [activeIdx, setActiveIdx]     = useState(-1);
  const [place, setPlace]             = useState(null);
  const [utc, setUtc]                 = useState(null);
  const [submitting, setSubmitting]   = useState(false);

  const debounceRef = useRef(null);
  const wrapRef     = useRef(null);

  useEffect(() => {
    const fn = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setSuggestions([]); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  useEffect(() => { computeUTC(form.dob, form.tob, place); }, [form.dob, form.tob, place]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── City search ────────────────────────────────────────────────────────────
  const handleCityInput = (e) => {
    const q = e.target.value;
    setQuery(q);
    setPlace(null);
    setUtc(null);
    setSuggestions([]);
    clearTimeout(debounceRef.current);
    if (q.trim().length < 2) return;
    debounceRef.current = setTimeout(() => fetchCities(q.trim()), 350);
  };

  // API now returns data as an array
  const fetchCities = async (q) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/long-lat?city=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setSuggestions(json.data);
      } else {
        setSuggestions([]);
      }
    } catch {
      setSuggestions([]);
    }
    setLoading(false);
  };

  // r is { city, state, country, lat, lon, tz }
  const selectPlace = (r) => {
    setQuery(`${r.city}, ${r.country}`);
    setSuggestions([]);
    setActiveIdx(-1);
    setPlace({
      city:    r.city,
      country: r.country,
      lat:     r.lat,
      lon:     r.lon,
      tz:      r.tz,
    });
  };

  const handleKeyDown = (e) => {
    if (!suggestions.length) return;
    if (e.key === "ArrowDown")  { setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)); e.preventDefault(); }
    else if (e.key === "ArrowUp")   { setActiveIdx(i => Math.max(i - 1, 0)); e.preventDefault(); }
    else if (e.key === "Enter" && activeIdx >= 0) { selectPlace(suggestions[activeIdx]); e.preventDefault(); }
    else if (e.key === "Escape")    { setSuggestions([]); }
  };

  // ── UTC Conversion ─────────────────────────────────────────────────────────
  const computeUTC = (dob, tob, p) => {
    if (!dob || !tob || !p?.tz) { setUtc(null); return; }
    try {
      const tz = p.tz;
      const pad = (n) => String(n).padStart(2, "0");

      const [y, mo, d] = dob.split("-").map(Number);
      const [h, mi] = tob.split(":").map(Number);

      const roughUTC = Date.UTC(y, mo - 1, d, h, mi, 0);

      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hour12: false,
      });

      const parts = {};
      formatter.formatToParts(new Date(roughUTC)).forEach(x => (parts[x.type] = x.value));
      const localH = parseInt(parts.hour === "24" ? "0" : parts.hour);
      const localMs = Date.UTC(
        parseInt(parts.year), parseInt(parts.month) - 1, parseInt(parts.day),
        localH, parseInt(parts.minute), 0
      );

      const offsetMs  = localMs - roughUTC;
      const offsetMin = Math.round(offsetMs / 60000);

      const realUTC    = new Date(roughUTC - offsetMs);
      const utcDateStr = `${realUTC.getUTCFullYear()}-${pad(realUTC.getUTCMonth() + 1)}-${pad(realUTC.getUTCDate())}`;
      const utcTimeStr = `${pad(realUTC.getUTCHours())}:${pad(realUTC.getUTCMinutes())}`;

      const absOff    = Math.abs(offsetMin);
      const offsetStr = `UTC${offsetMin >= 0 ? "+" : "-"}${pad(Math.floor(absOff / 60))}:${pad(absOff % 60)}`;

      setUtc({
        date: utcDateStr,
        time: utcTimeStr,
        offsetStr,
        offsetMin,
        localStr: `${dob} ${tob}`,
        tz,
      });
    } catch (err) {
      console.error("UTC conversion error:", err);
      setUtc(null);
    }
  };

  // ── Submit → /charts ───────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.dob || !form.tob || !place || !utc) return;

    setSubmitting(true);

    const payload = {
      name:    form.name,
      gender:  form.gender,
      dob:     form.dob,
      tob:     form.tob,
      city:    place.city,
      country: place.country,
      lat:     place.lat,
      lon:     place.lon,
      tz:      place.tz,
      utcDate:      utc.date,
      utcTime:      utc.time,
      utcOffsetStr: utc.offsetStr,
      utcOffsetMin: utc.offsetMin,
    };
    console.log(payload);
    const encoded = btoa(JSON.stringify(payload));
    router.push(`/charts?data=${encoded}`);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ width: "100%", maxWidth: 560, margin: "0 auto", padding: "2rem 1rem" }}>
      <style>{css}</style>

      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <p className="jf-sub">Vedic Astrology · Jyotish</p>
        <h1 className="jf-title">Birth Details</h1>
        <div className="jf-hdivider"><span>Enter your janma kundali details</span></div>
      </div>

      <form className="jf-card" onSubmit={handleSubmit}>

        <div className="jf-row">
          <div className="jf-field">
            <label className="jf-lbl">Full Name <em>optional</em></label>
            <input type="text" placeholder="e.g. Arjun Sharma" value={form.name} onChange={e => set("name", e.target.value)} />
          </div>
        </div>

        <div className="jf-row2">
          <div className="jf-field">
            <label className="jf-lbl">Date of Birth</label>
            <input type="date" value={form.dob} onChange={e => set("dob", e.target.value)} required />
          </div>
          <div className="jf-field">
            <label className="jf-lbl">Time of Birth</label>
            <input type="time" value={form.tob} onChange={e => set("tob", e.target.value)} required />
          </div>
        </div>

        <div className="jf-row">
          <div className="jf-field">
            <label className="jf-lbl">Place of Birth</label>
            <div className="jf-city-wrap" ref={wrapRef}>
              <input
                type="text" placeholder="Type a city name..." autoComplete="off"
                value={query} onChange={handleCityInput} onKeyDown={handleKeyDown} required
              />
              {loading && <div className="jf-spinner" />}
              {suggestions.length > 0 && (
                <div className="jf-sugs">
                  {suggestions.map((r, i) => {
                    const meta = [r.state, r.country].filter(Boolean).join(", ");
                    return (
                      <div key={i} className={`jf-sug${activeIdx === i ? " hi" : ""}`} onMouseDown={() => selectPlace(r)}>
                        <span className="jf-sug-city">{r.city}</span>
                        {meta && <span className="jf-sug-meta">{meta}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {place && (
              <div className="jf-info-row">
                <div className="jf-pill">
                  <span className="jf-pill-lbl">Coordinates</span>
                  <span className="jf-pill-val">{place.lat.toFixed(4)}, {place.lon.toFixed(4)}</span>
                </div>
                <div className="jf-pill">
                  <span className="jf-pill-lbl">Timezone</span>
                  <span className="jf-pill-val">{place.tz}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {utc && (
          <div className="jf-utc-box">
            <div className="jf-utc-title">⟳ Converted to UTC</div>
            <div className="jf-utc-grid">
              <div className="jf-utc-cell">
                <span className="jf-utc-lbl">UTC Date</span>
                <span className="jf-utc-val">{utc.date}</span>
              </div>
              <div className="jf-utc-cell">
                <span className="jf-utc-lbl">UTC Time</span>
                <span className="jf-utc-val">{utc.time}</span>
              </div>
              <div className="jf-utc-cell">
                <span className="jf-utc-lbl">Offset</span>
                <span className="jf-utc-val">{utc.offsetStr}</span>
              </div>
            </div>
            <div className="jf-utc-footer">
              <span className="jf-utc-footer-lbl">Local:</span>
              <span className="jf-utc-footer-val">{utc.localStr}</span>
              <span className="jf-utc-footer-tz">{utc.tz}</span>
            </div>
          </div>
        )}

        <div className="jf-divline" />

        <div className="jf-field">
          <label className="jf-lbl">Gender <em>optional</em></label>
          <div className="jf-g-row">
            {[{val:"male",icon:"♂",label:"Male"},{val:"female",icon:"♀",label:"Female"},{val:"other",icon:"◈",label:"Other"}].map(g => (
              <label key={g.val} className={`jf-g-btn${form.gender === g.val ? " sel" : ""}`}>
                <input type="radio" name="gender" value={g.val} checked={form.gender === g.val} onChange={() => set("gender", g.val)} />
                {g.icon} {g.label}
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="jf-submit"
          disabled={!form.dob || !form.tob || !place || !utc || submitting}
        >
          {submitting ? (
            <><div className="jf-btn-spinner" /> Calculating...</>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              Calculate Kundali
            </>
          )}
        </button>
      </form>
    </div>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=EB+Garamond:wght@400&display=swap');
  .jf-sub { font-family:'EB Garamond',serif; font-size:11px; letter-spacing:.25em; text-transform:uppercase; color:rgba(200,160,60,0.5); margin-bottom:.5rem; }
  .jf-title { font-family:'Cormorant Garamond',serif; font-size:28px; font-weight:600; color:#e8c97a; letter-spacing:.04em; }
  .jf-hdivider { display:flex; align-items:center; gap:.75rem; margin:.9rem 0 0; }
  .jf-hdivider::before,.jf-hdivider::after { content:''; flex:1; height:1px; background:rgba(200,160,60,0.18); }
  .jf-hdivider span { font-size:13px; color:rgba(200,160,60,0.35); font-family:'EB Garamond',serif; font-style:italic; }
  .jf-card { background:#13102a; border:1px solid rgba(200,160,60,0.15); border-radius:10px; padding:1.75rem; }
  .jf-row { margin-bottom:1rem; }
  .jf-row2 { display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem; }
  .jf-field { display:flex; flex-direction:column; gap:6px; }
  .jf-lbl { font-family:'EB Garamond',serif; font-size:12px; letter-spacing:.15em; text-transform:uppercase; color:rgba(200,160,60,0.5); }
  .jf-lbl em { font-size:10px; color:rgba(200,160,60,0.28); letter-spacing:.08em; text-transform:none; margin-left:4px; }
  .jf-card input { background:#0e0b1e; border:1px solid rgba(200,160,60,0.18); border-radius:5px; color:rgba(230,210,160,0.9); font-family:'EB Garamond',serif; font-size:15px; padding:.6rem .75rem; outline:none; width:100%; box-sizing:border-box; transition:border-color .2s; appearance:none; }
  .jf-card input::placeholder { color:rgba(200,160,60,0.22); }
  .jf-card input:focus { border-color:rgba(200,160,60,0.5); background:#110e25; }
  .jf-city-wrap { position:relative; }
  .jf-spinner { position:absolute; right:.75rem; top:50%; transform:translateY(-50%); width:14px; height:14px; border:1.5px solid rgba(200,160,60,0.2); border-top-color:rgba(200,160,60,0.7); border-radius:50%; animation:jf-spin .7s linear infinite; }
  @keyframes jf-spin { to { transform:translateY(-50%) rotate(360deg); } }
  .jf-sugs { position:absolute; top:calc(100% + 4px); left:0; right:0; background:#1a1535; border:1px solid rgba(200,160,60,0.25); border-radius:6px; z-index:100; max-height:210px; overflow-y:auto; }
  .jf-sugs::-webkit-scrollbar { width:4px; } .jf-sugs::-webkit-scrollbar-thumb { background:rgba(200,160,60,0.2); border-radius:2px; }
  .jf-sug { padding:.55rem .85rem; font-family:'EB Garamond',serif; cursor:pointer; border-bottom:1px solid rgba(200,160,60,0.07); display:flex; flex-direction:column; gap:2px; transition:background .15s; }
  .jf-sug:last-child { border-bottom:none; }
  .jf-sug:hover,.jf-sug.hi { background:rgba(200,160,60,0.08); }
  .jf-sug-city { font-size:14px; color:rgba(220,200,150,0.8); }
  .jf-sug-meta { font-size:11px; color:rgba(200,160,60,0.38); }
  .jf-info-row { display:grid; grid-template-columns:1fr 1fr; gap:.6rem; margin-top:6px; }
  .jf-pill { background:#0e0b1e; border:1px solid rgba(200,160,60,0.15); border-radius:5px; padding:.45rem .7rem; display:flex; flex-direction:column; gap:2px; }
  .jf-pill-lbl { font-family:'EB Garamond',serif; font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:rgba(200,160,60,0.35); }
  .jf-pill-val { font-family:'EB Garamond',serif; font-size:13px; color:rgba(200,160,60,0.75); }
  .jf-utc-box { background:#0a0818; border:1px solid rgba(200,160,60,0.2); border-radius:8px; padding:1rem 1.1rem; margin-top:1rem; }
  .jf-utc-title { font-family:'EB Garamond',serif; font-size:11px; letter-spacing:.18em; text-transform:uppercase; color:rgba(200,160,60,0.4); margin-bottom:.6rem; }
  .jf-utc-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:.5rem; }
  .jf-utc-cell { display:flex; flex-direction:column; gap:3px; }
  .jf-utc-lbl { font-family:'EB Garamond',serif; font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:rgba(200,160,60,0.3); }
  .jf-utc-val { font-family:'Cormorant Garamond',serif; font-size:17px; font-weight:600; color:#e8c97a; letter-spacing:.04em; }
  .jf-utc-footer { margin-top:.65rem; padding-top:.65rem; border-top:1px solid rgba(200,160,60,0.1); display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; }
  .jf-utc-footer-lbl { font-family:'EB Garamond',serif; font-size:12px; color:rgba(200,160,60,0.35); }
  .jf-utc-footer-val { font-family:'EB Garamond',serif; font-size:13px; color:rgba(200,160,60,0.65); }
  .jf-utc-footer-tz { font-family:'EB Garamond',serif; font-size:12px; color:rgba(200,160,60,0.35); margin-left:auto; }
  .jf-divline { height:1px; background:rgba(200,160,60,0.1); margin:1.25rem 0; }
  .jf-g-row { display:grid; grid-template-columns:repeat(3,1fr); gap:.5rem; margin-top:2px; }
  .jf-g-btn { display:flex; align-items:center; justify-content:center; gap:6px; padding:.55rem .5rem; border:1px solid rgba(200,160,60,0.18); border-radius:5px; font-family:'EB Garamond',serif; font-size:14px; color:rgba(200,160,60,0.45); cursor:pointer; transition:all .2s; background:#0e0b1e; }
  .jf-g-btn input { display:none; }
  .jf-g-btn:hover { border-color:rgba(200,160,60,0.35); color:rgba(200,160,60,0.7); }
  .jf-g-btn.sel { border-color:rgba(200,160,60,0.55); background:rgba(200,160,60,0.07); color:#e8c97a; }
  .jf-submit { width:100%; height:46px; margin-top:1.5rem; background:rgba(200,160,60,0.1); border:1px solid rgba(200,160,60,0.4); border-radius:6px; color:#e8c97a; font-family:'Cormorant Garamond',serif; font-size:17px; font-weight:600; letter-spacing:.1em; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:all .2s; }
  .jf-submit:hover:not(:disabled) { background:rgba(200,160,60,0.17); border-color:rgba(200,160,60,0.65); }
  .jf-submit:disabled { opacity:0.4; cursor:not-allowed; }
  .jf-submit svg { width:16px; height:16px; }
  .jf-btn-spinner { width:14px; height:14px; border:1.5px solid rgba(200,160,60,0.3); border-top-color:#e8c97a; border-radius:50%; animation:jf-spin2 .7s linear infinite; flex-shrink:0; }
  @keyframes jf-spin2 { to { transform:rotate(360deg); } }
  @media(max-width:480px) { .jf-row2,.jf-utc-grid,.jf-info-row { grid-template-columns:1fr; } }
`;