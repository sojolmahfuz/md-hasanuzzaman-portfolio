/* =========================================================
   Content renderer — loads data/content.json (managed from
   the admin dashboard) and renders the dynamic sections.
   The static HTML in index.html acts as a fallback.
   ========================================================= */
(() => {
  "use strict";

  const ICONS = {
    network: '<svg viewBox="0 0 48 48"><circle cx="24" cy="10" r="4"/><circle cx="10" cy="36" r="4"/><circle cx="38" cy="36" r="4"/><circle cx="24" cy="26" r="3"/><path d="M24 14v9M21.5 28L13 33M26.5 28L35 33M14 36h20"/></svg>',
    shield: '<svg viewBox="0 0 48 48"><path d="M24 4l16 6v12c0 10-7 18-16 22C15 40 8 32 8 22V10l16-6z"/><path d="M17 24l5 5 9-10"/></svg>',
    monitor: '<svg viewBox="0 0 48 48"><rect x="6" y="8" width="36" height="24" rx="3"/><path d="M16 40h16M24 32v8"/><path d="M14 20h4l3-6 4 12 3-6h6"/></svg>',
    lock: '<svg viewBox="0 0 48 48"><rect x="10" y="20" width="28" height="22" rx="3"/><path d="M16 20v-6a8 8 0 0116 0v6"/><circle cx="24" cy="30" r="3"/><path d="M24 33v4"/></svg>',
    cloud: '<svg viewBox="0 0 48 48"><path d="M14 36h22a8 8 0 000-16 12 12 0 00-23-2A9 9 0 0014 36z"/></svg>',
    cpu: '<svg viewBox="0 0 48 48"><rect x="12" y="12" width="24" height="24" rx="3"/><rect x="19" y="19" width="10" height="10"/><path d="M18 6v6M24 6v6M30 6v6M18 36v6M24 36v6M30 36v6M6 18h6M6 24h6M6 30h6M36 18h6M36 24h6M36 30h6"/></svg>',
    code: '<svg viewBox="0 0 48 48"><path d="M16 14L6 24l10 10M32 14l10 10-10 10M27 8l-6 32"/></svg>',
    brain: '<svg viewBox="0 0 48 48"><path d="M18 8a6 6 0 00-6 6 6 6 0 00-4 10 6 6 0 004 10 6 6 0 0012 0V12a4 4 0 00-6-4zM30 8a6 6 0 016 6 6 6 0 014 10 6 6 0 01-4 10 6 6 0 01-12 0"/></svg>',
  };
  window.SITE_ICONS = ICONS;

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // Escape, then allow **bold** markup
  const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const plain = (s) => String(s ?? "").replace(/\*\*/g, "");
  const safeUrl = (u) => (/^(https?:|mailto:|tel:|\.?\/|[\w-]+\.(jpg|jpeg|png|webp|gif|svg))/i.test(String(u || "").trim()) ? String(u).trim() : "");
  const $ = (id) => document.getElementById(id);
  const set = (id, html) => { const el = $(id); if (el) el.innerHTML = html; };

  function render(d) {
    const p = d.profile || {};
    const research = d.research || [];
    const edu = d.education || [];
    const lead = d.leadership || { items: [] };
    const m = d.metrics || {};
    const pubs = d.publications || [];

    // ----- Meta / hero -----
    if (p.name) {
      document.title = `${p.name} | ${p.title || ""}, ${p.university || ""}`;
      const n = $("heroName"); if (n) { n.textContent = p.name; n.dataset.text = p.name; }
      set("footName", esc(p.name));
    }
    set("statusText", esc(p.statusText));
    set("heroDesc", rich(p.heroDesc));
    const photo = $("heroPhoto");
    if (photo && safeUrl(p.photo)) { photo.src = safeUrl(p.photo); photo.alt = `Portrait of ${p.name}`; }
    $("statPubs") && ($("statPubs").dataset.count = pubs.length);
    $("statCites") && ($("statCites").dataset.count = +m.citations || 0);
    $("statAreas") && ($("statAreas").dataset.count = research.length);

    // ----- About -----
    set("aboutParas", (p.about || []).map((t) => `<p>${rich(t)}</p>`).join(""));
    const degrees = edu.map((e) => plain(e.degree).replace(/\s*\(.*?\)/, "") + (e.current ? " (in progress)" : ""));
    set("terminalOut",
      `<span class="t-p">$</span> whoami\n<span class="t-o">{\n` +
      `  "name"     : "${esc(p.name)}",\n` +
      `  "position" : "${esc(p.title)}, CSE",\n` +
      `  "org"      : "${esc(p.university)}",\n` +
      `  "degree"   : [${degrees.map((x) => `"${esc(x)}"`).join(", ")}],\n` +
      `  "focus"    : [${research.map((r) => `"${esc(r.title.toLowerCase())}"`).join(", ")}]\n` +
      `}</span>\n<span class="t-p">$</span> <span class="caret">▋</span>`);

    const card = (ico, label, val) => `<div class="info-card reveal"><div class="info-ico"><svg viewBox="0 0 24 24"><path d="${ico}"/></svg></div><div><h4>${label}</h4><p>${val}</p></div></div>`;
    set("infoCards",
      card("M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6", "Position", esc(`${p.title}, CSE`)) +
      card("M12 2l9 4.5-9 4.5-9-4.5L12 2zM3 11l9 4.5 9-4.5M3 15.5L12 20l9-4.5", "Institution", esc(p.university)) +
      card("M22 10L12 5 2 10l10 5 10-5zM6 12v5c3 2 9 2 12 0v-5", "Highest Degree", esc(p.highestDegree)) +
      card("M4 4h16v16H4zM4 9h16M9 4v16", "Email", `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>`));

    // ----- Research -----
    set("researchGrid", research.map((r, i) => `
      <article class="r-card tilt reveal">
        <div class="r-num mono">R.${String(i + 1).padStart(2, "0")}</div>
        <div class="r-ico">${ICONS[r.icon] || ICONS.network}</div>
        <h3>${esc(r.title)}</h3>
        <p>${rich(r.desc)}</p>
        <ul class="chips mono">${(r.tags || []).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
      </article>`).join(""));

    // ----- Education -----
    set("timeline", edu.map((e) => `
      <div class="tl-item reveal">
        <div class="tl-node${e.current ? " pulse" : ""}"></div>
        <div class="tl-card">
          <span class="tl-badge mono${e.current ? " live" : ""}">${esc(e.badge)}</span>
          <h3>${esc(e.degree)}</h3>
          <p class="tl-org">${esc(e.org)}</p>
          <p>${rich(e.desc)}</p>
        </div>
      </div>`).join(""));

    // ----- Leadership -----
    set("leadIntro", rich(lead.intro));
    set("leadItems", (lead.items || []).map((t, i) => `<div class="lead-item"><span class="mono">${String(i + 1).padStart(2, "0")}</span>${esc(t)}</div>`).join(""));

    // ----- Metrics -----
    const py = m.perYear || [];
    const max = Math.max(1, ...py.map((y) => +y.count || 0));
    set("metrics", `
      <div class="metric"><span class="m-val" data-count="${+m.citations || 0}">0</span><span class="m-lbl mono">Citations</span></div>
      <div class="metric"><span class="m-val" data-count="${+m.hIndex || 0}">0</span><span class="m-lbl mono">h-index</span></div>
      <div class="metric"><span class="m-val" data-count="${+m.i10Index || 0}">0</span><span class="m-lbl mono">i10-index</span></div>
      <div class="metric chart-metric">
        <span class="m-lbl mono">Citations / Year</span>
        <div class="bars">${py.map((y) => `<div class="bar" style="--p:${((+y.count || 0) / max).toFixed(3)}"><i>${esc(y.count)}</i><span>${esc(y.year)}</span></div>`).join("")}</div>
      </div>`);

    // ----- Publications -----
    set("pubList", pubs.map((x) => {
      const link = safeUrl(x.link);
      const title = link ? `<a href="${esc(link)}" target="_blank" rel="noopener">${esc(x.title)}</a>` : esc(x.title);
      const c = +x.citations || 0;
      return `
      <article class="pub reveal">
        <div class="pub-year mono">${esc(x.year) || "—"}</div>
        <div class="pub-body">
          <h3>${title}</h3>
          <p class="pub-authors">${rich(x.authors).replace(/<strong>/g, "<b>").replace(/<\/strong>/g, "</b>")}</p>
          <p class="pub-venue mono">${esc(x.venue)}</p>
        </div>
        <div class="pub-meta">${x.type ? `<span class="pub-type mono">${esc(x.type)}</span>` : ""}${c ? `<span class="pub-cite mono">${c} citation${c > 1 ? "s" : ""}</span>` : ""}</div>
      </article>`;
    }).join(""));

    // ----- Contact -----
    const tel = String(p.phone || "").replace(/[^\d+]/g, "");
    const ci = (href, ico, label, val, ext) => `
      <${href ? `a href="${esc(href)}"${ext ? ' target="_blank" rel="noopener"' : ""}` : "div"} class="c-item">
        <div class="c-ico"><svg viewBox="0 0 24 24">${ico}</svg></div>
        <div><span class="mono">${label}</span><p>${esc(val)}</p></div>
      </${href ? "a" : "div"}>`;
    set("contactInfo",
      ci(`mailto:${p.email}`, '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', "EMAIL", p.email) +
      ci(`tel:${tel}`, '<path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z"/>', "PHONE", p.phone) +
      (safeUrl(p.scholar) ? ci(safeUrl(p.scholar), '<path d="M12 3L1 9l11 6 9-4.9V17h2V9L12 3zM5 13.2v4L12 21l7-3.8v-4L12 17l-7-3.8z"/>', "GOOGLE SCHOLAR", "scholar.google.com", true) : "") +
      ci("", '<path d="M12 22s-8-7.5-8-13a8 8 0 0116 0c0 5.5-8 13-8 13z"/><circle cx="12" cy="9" r="3"/>', "OFFICE", p.office));
    document.querySelectorAll('a[href*="scholar.google.com"]').forEach((a) => { if (safeUrl(p.scholar)) a.href = safeUrl(p.scholar); });
    window.SITE_EMAIL = p.email;
  }

  window.SITE = null;
  let localDraft = null;
  try {
    const raw = localStorage.getItem("cub_content_draft");
    if (raw) localDraft = JSON.parse(raw);
  } catch (_) {}

  if (localDraft) {
    window.SITE = localDraft;
    render(localDraft);
  }

  // 1. Try Supabase cloud database first (real-time live content worldwide)
  // 2. Fall back to local data/content.json
  window.contentReady = (async () => {
    let loadedData = null;

    if (window.CUB_SUPABASE && typeof window.CUB_SUPABASE.fetchContent === "function") {
      try {
        const cloudData = await window.CUB_SUPABASE.fetchContent();
        if (cloudData) {
          loadedData = cloudData;
        }
      } catch (err) {
        console.info("[Render] Supabase check notice:", err.message);
      }
    }

    if (!loadedData) {
      try {
        const r = await fetch(`data/content.json?v=${Date.now()}`, { cache: "no-store" });
        if (r.ok) {
          loadedData = await r.json();
        }
      } catch (e) {
        if (!localDraft) console.info("Using static fallback content:", e.message);
      }
    }

    if (loadedData && !localDraft) {
      window.SITE = loadedData;
      render(loadedData);
    }
    return loadedData;
  })();
})();

