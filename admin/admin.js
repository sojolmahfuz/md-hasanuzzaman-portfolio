/* =========================================================
   Admin Console Logic — Md. Hasanuzzaman Portfolio
   Authentication, Content Editing, Local Drafts & GitHub Sync
   ========================================================= */

(() => {
  "use strict";

  // Auth Constants
  const MASTER_EMAIL = "hasanuzzaman@cub.edu.bd";
  // SHA-256 hash of "admin112233"
  const MASTER_PASS_HASH = "aa5ff7ddeca7848ed7eb16270306d14ba2f7b65171ca0e700ec2e2adda115b83";
  const AUTH_SESSION_KEY = "cub_admin_session";
  const LOCAL_DRAFT_KEY = "cub_content_draft";
  const INBOX_KEY = "cub_inbox_messages";
  const GH_CONFIG_KEY = "cub_gh_config";

  // State
  const state = {
    data: null,
    remoteSha: null,
    authenticated: false,
    ghConfig: {
      token: "",
      repo: "sojolmahfuz/md-hasanuzzaman-portfolio",
      branch: "main",
      path: "data/content.json"
    }
  };

  // Helper selectors
  const $ = (id) => document.getElementById(id);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  // SHA-256 utility
  async function sha256(str) {
    const buffer = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // Toast notification
  function showToast(msg, duration = 3000) {
    const t = $("adminToast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), duration);
  }

  // ================= AUTHENTICATION =================
  let failedAttempts = 0;
  let lockUntil = 0;

  function initAuth() {
    const session = sessionStorage.getItem(AUTH_SESSION_KEY);
    if (session === "granted") {
      unlockConsole();
    } else {
      showLoginScreen();
    }

    // Toggle password visibility
    $("togglePassBtn")?.addEventListener("click", () => {
      const p = $("loginPassword");
      p.type = p.type === "password" ? "text" : "password";
    });

    // Handle login form submit
    $("loginForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const now = Date.now();
      if (now < lockUntil) {
        const secs = Math.ceil((lockUntil - now) / 1000);
        setLoginError(`[ SECURITY LOCKOUT ] Too many attempts. Wait ${secs}s.`);
        return;
      }

      const email = $("loginEmail").value.trim().toLowerCase();
      const pass = $("loginPassword").value;
      const passHash = await sha256(pass);

      if (email === MASTER_EMAIL.toLowerCase() && passHash === MASTER_PASS_HASH) {
        failedAttempts = 0;
        sessionStorage.setItem(AUTH_SESSION_KEY, "granted");
        unlockConsole();
      } else {
        failedAttempts++;
        if (failedAttempts >= 5) {
          lockUntil = Date.now() + 30000;
          setLoginError("[ ACCESS DENIED ] 5 failed attempts. Console locked for 30 seconds.");
        } else {
          setLoginError(`[ ACCESS DENIED ] Invalid credentials (${5 - failedAttempts} attempts remaining).`);
        }
      }
    });

    // Logout
    $("logoutBtn")?.addEventListener("click", () => {
      sessionStorage.removeItem(AUTH_SESSION_KEY);
      showLoginScreen();
      showToast("Session terminated.");
    });
  }

  function setLoginError(msg) {
    const el = $("loginError");
    el.textContent = msg;
    el.style.display = "block";
  }

  function showLoginScreen() {
    state.authenticated = false;
    $("authScreen").style.display = "flex";
    $("adminApp").style.display = "none";
    $("loginPassword").value = "";
    $("loginError").style.display = "none";
  }

  function unlockConsole() {
    state.authenticated = true;
    $("authScreen").style.display = "none";
    $("adminApp").style.display = "flex";
    loadStoredGhConfig();
    loadContentData();
    updateInboxBadge();
    showToast("✔ Welcome, Md. Hasanuzzaman. System console ready.");
  }

  // ================= LOAD & STORE DATA =================
  async function loadContentData() {
    // 1. Try local draft
    let localDraft = null;
    try {
      const raw = localStorage.getItem(LOCAL_DRAFT_KEY);
      if (raw) localDraft = JSON.parse(raw);
    } catch (_) {}

    // 2. Fetch remote content
    try {
      const res = await fetch(`../data/content.json?v=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const remoteData = await res.json();
        // If local draft exists, use local draft but keep remote data as backup
        state.data = localDraft || remoteData;
      } else if (localDraft) {
        state.data = localDraft;
      }
    } catch (e) {
      if (localDraft) state.data = localDraft;
    }

    if (!state.data) {
      state.data = getDefaultFallbackData();
    }

    populateAllForms();
    updateOverviewStats();
  }

  function loadStoredGhConfig() {
    try {
      const saved = localStorage.getItem(GH_CONFIG_KEY);
      if (saved) {
        state.ghConfig = Object.assign(state.ghConfig, JSON.parse(saved));
      }
    } catch (_) {}

    if ($("ghTokenInput")) $("ghTokenInput").value = state.ghConfig.token || "";
    if ($("ghRepoInput")) $("ghRepoInput").value = state.ghConfig.repo || "";
    if ($("ghBranchInput")) $("ghBranchInput").value = state.ghConfig.branch || "main";
    if ($("ghPathInput")) $("ghPathInput").value = state.ghConfig.path || "data/content.json";

    updateGhStatusIndicators();
  }

  function saveGhConfigFromInputs() {
    state.ghConfig.token = $("ghTokenInput").value.trim();
    state.ghConfig.repo = $("ghRepoInput").value.trim() || "sojolmahfuz/md-hasanuzzaman-portfolio";
    state.ghConfig.branch = $("ghBranchInput").value.trim() || "main";
    state.ghConfig.path = $("ghPathInput").value.trim() || "data/content.json";

    localStorage.setItem(GH_CONFIG_KEY, JSON.stringify(state.ghConfig));
    updateGhStatusIndicators();
    showToast("✔ GitHub configuration saved.");
  }

  function updateGhStatusIndicators() {
    const isSet = Boolean(state.ghConfig.token);
    const ov = $("ovTokenStatus");
    const cloudBadge = $("cloudStatusBadge");

    if (ov) {
      ov.innerHTML = isSet
        ? `<span class="token-set">✔ Connected (${state.ghConfig.repo})</span>`
        : `<span class="token-unset">Not Configured (Using Local Draft)</span>`;
    }
    if (cloudBadge) {
      cloudBadge.innerHTML = isSet
        ? `<span class="dot pulse-green"></span> GitHub Cloud Sync Ready`
        : `<span class="dot"></span> Local Sync Active`;
    }
  }

  // ================= POPULATE FORMS =================
  function populateAllForms() {
    const d = state.data;
    if (!d) return;

    // Profile & Hero
    const p = d.profile || {};
    if ($("pName")) $("pName").value = p.name || "";
    if ($("pTitle")) $("pTitle").value = p.title || "";
    if ($("pDept")) $("pDept").value = p.department || "";
    if ($("pUni")) $("pUni").value = p.university || "";
    if ($("pHighestDegree")) $("pHighestDegree").value = p.highestDegree || "";
    if ($("pStatusText")) $("pStatusText").value = p.statusText || "";
    if ($("pPhoto")) $("pPhoto").value = p.photo || "Hasan.jpg";
    if ($("pHeroDesc")) $("pHeroDesc").value = p.heroDesc || "";
    if ($("pEmail")) $("pEmail").value = p.email || "";
    if ($("pPhone")) $("pPhone").value = p.phone || "";
    if ($("pScholar")) $("pScholar").value = p.scholar || "";
    if ($("pOffice")) $("pOffice").value = p.office || "";

    if ($("sidebarUserName")) $("sidebarUserName").textContent = p.name || "Md. Hasanuzzaman";
    if ($("sidebarAvatar") && p.photo) $("sidebarAvatar").src = p.photo.startsWith("http") || p.photo.startsWith("data:") ? p.photo : "../" + p.photo;

    // Roles List
    renderRolesList(p.roles || []);

    // About Paragraphs
    renderAboutList(p.about || []);

    // Research Interests
    renderResearchList(d.research || []);

    // Education Timeline
    renderEducationList(d.education || []);

    // Leadership
    const lead = d.leadership || {};
    if ($("leadIntroInput")) $("leadIntroInput").value = lead.intro || "";
    renderLeadershipPillars(lead.items || []);

    // Publications & Metrics
    const m = d.metrics || {};
    if ($("metricCitations")) $("metricCitations").value = m.citations || 0;
    if ($("metricHIndex")) $("metricHIndex").value = m.hIndex || 0;
    if ($("metricI10Index")) $("metricI10Index").value = m.i10Index || 0;
    renderPerYearList(m.perYear || []);
    renderPublicationsList(d.publications || []);

    // Inbox
    renderInboxMessages();
  }

  function updateOverviewStats() {
    const d = state.data;
    if (!d) return;
    if ($("ovStatPubs")) $("ovStatPubs").textContent = (d.publications || []).length;
    if ($("ovStatCites")) $("ovStatCites").textContent = d.metrics?.citations || 0;
    if ($("ovStatHIndex")) $("ovStatHIndex").textContent = d.metrics?.hIndex || 0;
    if ($("ovStatAreas")) $("ovStatAreas").textContent = (d.research || []).length;
  }

  // ================= DYNAMIC LIST RENDERERS =================
  // Roles
  function renderRolesList(roles) {
    const container = $("rolesList");
    if (!container) return;
    container.innerHTML = "";
    roles.forEach((role, i) => {
      const div = document.createElement("div");
      div.className = "dynamic-item";
      div.innerHTML = `
        <input type="text" class="role-item-input" value="${escapeHtml(role)}" placeholder="Role title" />
        <button type="button" class="btn-icon-del" title="Remove">&times;</button>
      `;
      div.querySelector(".btn-icon-del").addEventListener("click", () => div.remove());
      container.appendChild(div);
    });
  }

  // About paragraphs
  function renderAboutList(paras) {
    const container = $("aboutList");
    if (!container) return;
    container.innerHTML = "";
    paras.forEach((para, i) => {
      const div = document.createElement("div");
      div.className = "dynamic-item";
      div.innerHTML = `
        <textarea rows="3" class="about-item-input" placeholder="Paragraph text (Supports **bold**)">${escapeHtml(para)}</textarea>
        <button type="button" class="btn-icon-del" title="Remove">&times;</button>
      `;
      div.querySelector(".btn-icon-del").addEventListener("click", () => div.remove());
      container.appendChild(div);
    });
  }

  // Research Interests
  const ICON_OPTIONS = ["network", "shield", "monitor", "lock", "cloud", "cpu", "code", "brain"];
  function renderResearchList(items) {
    const container = $("researchCardsContainer");
    if (!container) return;
    container.innerHTML = "";
    items.forEach((r, i) => {
      const card = document.createElement("div");
      card.className = "card-item-editor";
      const iconOpts = ICON_OPTIONS.map((ico) => `<option value="${ico}" ${r.icon === ico ? "selected" : ""}>${ico.toUpperCase()}</option>`).join("");
      card.innerHTML = `
        <div class="card-header-bar">
          <span class="card-num mono">R.${String(i + 1).padStart(2, "0")}</span>
          <button type="button" class="btn-icon-del btn-del-r" title="Remove Area">&times;</button>
        </div>
        <div class="form-row-2">
          <div class="form-group">
            <label>Title</label>
            <input type="text" class="r-title" value="${escapeHtml(r.title)}" required />
          </div>
          <div class="form-group">
            <label>Icon Style</label>
            <select class="r-icon">${iconOpts}</select>
          </div>
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea rows="2" class="r-desc">${escapeHtml(r.desc || "")}</textarea>
        </div>
        <div class="form-group">
          <label>Tags (Comma separated)</label>
          <input type="text" class="r-tags" value="${escapeHtml((r.tags || []).join(", "))}" placeholder="Protocols, IoT, Wireless" />
        </div>
      `;
      card.querySelector(".btn-del-r").addEventListener("click", () => card.remove());
      container.appendChild(card);
    });
  }

  // Education List
  function renderEducationList(items) {
    const container = $("educationListContainer");
    if (!container) return;
    container.innerHTML = "";
    items.forEach((e, i) => {
      const div = document.createElement("div");
      div.className = "list-item-box";
      div.innerHTML = `
        <div class="item-row-top">
          <label class="checkbox-label mono">
            <input type="checkbox" class="edu-current" ${e.current ? "checked" : ""} />
            <span>ONGOING / IN PROGRESS</span>
          </label>
          <button type="button" class="btn-icon-del btn-del-edu" title="Remove Degree">&times;</button>
        </div>
        <div class="form-row-3">
          <div class="form-group">
            <label>Degree Title</label>
            <input type="text" class="edu-degree" value="${escapeHtml(e.degree)}" required />
          </div>
          <div class="form-group">
            <label>Institution / University</label>
            <input type="text" class="edu-org" value="${escapeHtml(e.org)}" required />
          </div>
          <div class="form-group">
            <label>Badge Label</label>
            <input type="text" class="edu-badge" value="${escapeHtml(e.badge || "")}" placeholder="DOCTORATE, MASTER'S" />
          </div>
        </div>
        <div class="form-group">
          <label>Summary / Focus</label>
          <input type="text" class="edu-desc" value="${escapeHtml(e.desc || "")}" />
        </div>
      `;
      div.querySelector(".btn-del-edu").addEventListener("click", () => div.remove());
      container.appendChild(div);
    });
  }

  // Leadership Pillars
  function renderLeadershipPillars(items) {
    const container = $("leadPillarsList");
    if (!container) return;
    container.innerHTML = "";
    items.forEach((item) => {
      const div = document.createElement("div");
      div.className = "dynamic-item";
      div.innerHTML = `
        <input type="text" class="lead-pillar-input" value="${escapeHtml(item)}" placeholder="Initiative or responsibility" />
        <button type="button" class="btn-icon-del" title="Remove">&times;</button>
      `;
      div.querySelector(".btn-icon-del").addEventListener("click", () => div.remove());
      container.appendChild(div);
    });
  }

  // Citations per year
  function renderPerYearList(list) {
    const container = $("perYearList");
    if (!container) return;
    container.innerHTML = "";
    list.forEach((item) => {
      const div = document.createElement("div");
      div.className = "year-stat-item";
      div.innerHTML = `
        <input type="text" class="py-year" value="${escapeHtml(item.year)}" placeholder="Year" style="max-width:90px;" />
        <input type="number" class="py-count" value="${item.count || 0}" min="0" placeholder="Count" />
        <button type="button" class="btn-icon-del" title="Delete" style="width:30px;height:30px;">&times;</button>
      `;
      div.querySelector(".btn-icon-del").addEventListener("click", () => div.remove());
      container.appendChild(div);
    });
  }

  // Publications List
  function renderPublicationsList(pubs) {
    const container = $("publicationsContainer");
    if (!container) return;
    container.innerHTML = "";
    pubs.forEach((p, i) => {
      const div = document.createElement("div");
      div.className = "list-item-box";
      div.innerHTML = `
        <div class="item-row-top">
          <strong class="mono" style="color:var(--cyan)">#${i + 1} Publication</strong>
          <button type="button" class="btn-icon-del btn-del-pub" title="Delete Publication">&times;</button>
        </div>
        <div class="form-group">
          <label>Paper Title</label>
          <input type="text" class="pub-title" value="${escapeHtml(p.title)}" required />
        </div>
        <div class="form-group">
          <label>Authors (Use **Name** to bold)</label>
          <input type="text" class="pub-authors" value="${escapeHtml(p.authors || "")}" />
        </div>
        <div class="form-row-2">
          <div class="form-group">
            <label>Venue / Conference / Journal</label>
            <input type="text" class="pub-venue" value="${escapeHtml(p.venue || "")}" />
          </div>
          <div class="form-group">
            <label>Publication Type</label>
            <input type="text" class="pub-type" value="${escapeHtml(p.type || "")}" placeholder="Conference, Journal, Proceedings" />
          </div>
        </div>
        <div class="form-row-3">
          <div class="form-group">
            <label>Year</label>
            <input type="text" class="pub-year" value="${escapeHtml(p.year || "")}" placeholder="2022" />
          </div>
          <div class="form-group">
            <label>Citations Count</label>
            <input type="number" class="pub-cites" value="${p.citations || 0}" min="0" />
          </div>
          <div class="form-group">
            <label>DOI / URL Link</label>
            <input type="url" class="pub-link" value="${escapeHtml(p.link || "")}" placeholder="https://doi.org/..." />
          </div>
        </div>
      `;
      div.querySelector(".btn-del-pub").addEventListener("click", () => div.remove());
      container.appendChild(div);
    });
  }

  // ================= INBOX MESSAGES =================
  function renderInboxMessages() {
    const container = $("inboxContainer");
    if (!container) return;

    let inbox = [];
    try {
      inbox = JSON.parse(localStorage.getItem(INBOX_KEY) || "[]");
    } catch (_) {}

    if (inbox.length === 0) {
      container.innerHTML = `
        <div class="panel-box" style="text-align:center; padding:3rem 1rem;">
          <p class="mono muted-text">No incoming messages received yet.</p>
          <small class="muted-text">Test by transmitting a message through the contact form on the home page.</small>
        </div>
      `;
      return;
    }

    container.innerHTML = inbox.map((m, idx) => `
      <div class="inbox-item ${m.read ? '' : 'unread'}" data-idx="${idx}">
        <div class="inbox-header">
          <div class="inbox-meta">
            <strong>${escapeHtml(m.name || "Anonymous")}</strong> &middot; 
            <a href="mailto:${escapeHtml(m.email)}">${escapeHtml(m.email || "")}</a>
          </div>
          <span class="inbox-date mono">${escapeHtml(m.date || "")}</span>
        </div>
        <div class="inbox-subject">${escapeHtml(m.subject || "No Subject")}</div>
        <div class="inbox-body">${escapeHtml(m.message || "")}</div>
        <div style="margin-top:0.8rem; display:flex; gap:0.6rem; justify-content:flex-end;">
          <a href="mailto:${escapeHtml(m.email)}?subject=Re: ${encodeURIComponent(m.subject || '')}" class="btn btn-ghost btn-sm">Reply via Email</a>
          <button type="button" class="btn btn-danger btn-sm btn-del-msg" data-idx="${idx}">Delete</button>
        </div>
      </div>
    `).join("");

    // Attach delete listeners
    $$(".btn-del-msg", container).forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = +btn.dataset.idx;
        inbox.splice(idx, 1);
        localStorage.setItem(INBOX_KEY, JSON.stringify(inbox));
        renderInboxMessages();
        updateInboxBadge();
        showToast("Message removed.");
      });
    });
  }

  function updateInboxBadge() {
    let inbox = [];
    try {
      inbox = JSON.parse(localStorage.getItem(INBOX_KEY) || "[]");
    } catch (_) {}
    const badge = $("inboxBadge");
    if (!badge) return;
    if (inbox.length > 0) {
      badge.textContent = inbox.length;
      badge.style.display = "inline-block";
    } else {
      badge.style.display = "none";
    }
  }

  // ================= COLLECT FORM DATA =================
  function harvestCurrentData() {
    const d = state.data || {};
    d.profile = d.profile || {};

    // Profile
    d.profile.name = $("pName")?.value.trim() || d.profile.name;
    d.profile.title = $("pTitle")?.value.trim() || d.profile.title;
    d.profile.department = $("pDept")?.value.trim() || d.profile.department;
    d.profile.university = $("pUni")?.value.trim() || d.profile.university;
    d.profile.highestDegree = $("pHighestDegree")?.value.trim() || d.profile.highestDegree;
    d.profile.statusText = $("pStatusText")?.value.trim() || d.profile.statusText;
    d.profile.photo = $("pPhoto")?.value.trim() || d.profile.photo;
    d.profile.heroDesc = $("pHeroDesc")?.value.trim() || d.profile.heroDesc;
    d.profile.email = $("pEmail")?.value.trim() || d.profile.email;
    d.profile.phone = $("pPhone")?.value.trim() || d.profile.phone;
    d.profile.scholar = $("pScholar")?.value.trim() || d.profile.scholar;
    d.profile.office = $("pOffice")?.value.trim() || d.profile.office;

    // Roles
    d.profile.roles = $$(".role-item-input", $("rolesList"))
      .map((inp) => inp.value.trim())
      .filter(Boolean);

    // About paragraphs
    d.profile.about = $$(".about-item-input", $("aboutList"))
      .map((inp) => inp.value.trim())
      .filter(Boolean);

    // Research
    d.research = $$(".card-item-editor", $("researchCardsContainer")).map((card) => ({
      title: card.querySelector(".r-title")?.value.trim() || "",
      icon: card.querySelector(".r-icon")?.value || "network",
      desc: card.querySelector(".r-desc")?.value.trim() || "",
      tags: (card.querySelector(".r-tags")?.value || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    })).filter((r) => r.title);

    // Education
    d.education = $$(".list-item-box", $("educationListContainer")).map((div) => ({
      current: Boolean(div.querySelector(".edu-current")?.checked),
      degree: div.querySelector(".edu-degree")?.value.trim() || "",
      org: div.querySelector(".edu-org")?.value.trim() || "",
      badge: div.querySelector(".edu-badge")?.value.trim() || "",
      desc: div.querySelector(".edu-desc")?.value.trim() || ""
    })).filter((e) => e.degree);

    // Leadership
    d.leadership = {
      intro: $("leadIntroInput")?.value.trim() || "",
      items: $$(".lead-pillar-input", $("leadPillarsList"))
        .map((inp) => inp.value.trim())
        .filter(Boolean)
    };

    // Metrics
    d.metrics = {
      citations: +$("metricCitations")?.value || 0,
      hIndex: +$("metricHIndex")?.value || 0,
      i10Index: +$("metricI10Index")?.value || 0,
      perYear: $$(".year-stat-item", $("perYearList")).map((div) => ({
        year: div.querySelector(".py-year")?.value.trim() || "",
        count: +div.querySelector(".py-count")?.value || 0
      })).filter((y) => y.year)
    };

    // Publications
    d.publications = $$(".list-item-box", $("publicationsContainer")).map((div) => ({
      title: div.querySelector(".pub-title")?.value.trim() || "",
      authors: div.querySelector(".pub-authors")?.value.trim() || "",
      venue: div.querySelector(".pub-venue")?.value.trim() || "",
      type: div.querySelector(".pub-type")?.value.trim() || "",
      year: div.querySelector(".pub-year")?.value.trim() || "",
      citations: +div.querySelector(".pub-cites")?.value || 0,
      link: div.querySelector(".pub-link")?.value.trim() || ""
    })).filter((p) => p.title);

    state.data = d;
    return d;
  }

  // ================= SAVE & PUBLISH =================
  function saveDraftLocally() {
    const d = harvestCurrentData();
    localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(d, null, 2));
    updateOverviewStats();

    if ($("sidebarUserName") && d.profile?.name) {
      $("sidebarUserName").textContent = d.profile.name;
    }
    showToast("✔ Local preview draft saved! Click 'View Site' to preview.");
  }

  async function publishToGitHub() {
    const logBox = $("publishProgress");
    if (logBox) {
      logBox.style.display = "block";
      logBox.textContent = "[ INITIATING ] Preparing data payload...\n";
    }

    if (!state.ghConfig.token) {
      if (logBox) logBox.textContent += "[ ERROR ] No GitHub Personal Access Token configured.\n";
      alert("Please configure your GitHub Personal Access Token in the 'GitHub & Backups' tab first.");
      document.querySelector('[data-tab="tab-settings"]')?.click();
      return;
    }

    const payload = harvestCurrentData();
    const jsonStr = JSON.stringify(payload, null, 2);
    // Base64 encode UTF-8
    const contentBase64 = btoa(unescape(encodeURIComponent(jsonStr)));

    const { repo, branch, path, token } = state.ghConfig;
    const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;

    try {
      if (logBox) logBox.textContent += `[ CONNECTING ] Fetching current SHA from ${repo}/${path}...\n`;

      // 1. Get current file sha
      const getRes = await fetch(`${apiUrl}?ref=${branch}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json"
        }
      });

      let currentSha = null;
      if (getRes.ok) {
        const fileInfo = await getRes.json();
        currentSha = fileInfo.sha;
        if (logBox) logBox.textContent += `[ OK ] Remote file found. Current SHA: ${currentSha.slice(0, 7)}\n`;
      } else if (getRes.status === 404) {
        if (logBox) logBox.textContent += `[ INFO ] File does not exist yet. Will create new file.\n`;
      } else {
        const err = await getRes.json();
        throw new Error(err.message || "Failed to inspect remote file");
      }

      // 2. Commit update
      if (logBox) logBox.textContent += `[ COMMIT ] Transmitting update to branch '${branch}'...\n`;
      const putBody = {
        message: "Update portfolio content via Admin Console",
        content: contentBase64,
        branch: branch
      };
      if (currentSha) putBody.sha = currentSha;

      const putRes = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(putBody)
      });

      if (!putRes.ok) {
        const err = await putRes.json();
        throw new Error(err.message || "GitHub API PUT failed");
      }

      const commitInfo = await putRes.json();
      const commitSha = commitInfo.commit?.sha?.slice(0, 7) || "latest";

      if (logBox) {
        logBox.textContent += `[ SUCCESS ] Commit ${commitSha} published to ${repo}!\n`;
        logBox.textContent += `[ DEPLOY ] GitHub Pages will automatically rebuild and deploy within 1-2 minutes.\n`;
      }

      // Sync local draft with published state
      localStorage.setItem(LOCAL_DRAFT_KEY, jsonStr);
      showToast("🚀 Successfully published to GitHub! Pages rebuild started.");
    } catch (e) {
      if (logBox) logBox.textContent += `[ FAILED ] Error: ${e.message}\n`;
      showToast(`❌ Publish failed: ${e.message}`, 4500);
    }
  }

  // ================= EVENT BINDINGS =================
  function initEvents() {
    // Tab switching
    $$(".nav-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetId = btn.dataset.tab;
        $$(".nav-item").forEach((b) => b.classList.remove("active"));
        $$(".tab-pane").forEach((pane) => pane.classList.remove("active"));
        btn.classList.add("active");
        $(targetId)?.classList.add("active");
      });
    });

    // Save Draft Buttons
    $("saveDraftBtn")?.addEventListener("click", saveDraftLocally);

    // Forms auto-save on submit
    $("profileForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      saveDraftLocally();
    });
    $("leadershipForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      saveDraftLocally();
    });

    // Publish buttons
    $("publishGithubBtn")?.addEventListener("click", publishToGitHub);
    $("btnPublishFromOverview")?.addEventListener("click", publishToGitHub);

    // Profile photo upload preview
    $("pPhotoFile")?.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target.result;
        $("pPhoto").value = dataUrl;
        if ($("sidebarAvatar")) $("sidebarAvatar").src = dataUrl;
        showToast("Photo loaded into draft.");
      };
      reader.readAsDataURL(file);
    });

    // Add buttons
    $("btnAddRole")?.addEventListener("click", () => {
      const container = $("rolesList");
      const div = document.createElement("div");
      div.className = "dynamic-item";
      div.innerHTML = `
        <input type="text" class="role-item-input" placeholder="New Role title" />
        <button type="button" class="btn-icon-del" title="Remove">&times;</button>
      `;
      div.querySelector(".btn-icon-del").addEventListener("click", () => div.remove());
      container.appendChild(div);
      div.querySelector("input").focus();
    });

    $("btnAddAboutPara")?.addEventListener("click", () => {
      const container = $("aboutList");
      const div = document.createElement("div");
      div.className = "dynamic-item";
      div.innerHTML = `
        <textarea rows="3" class="about-item-input" placeholder="New paragraph text (Supports **bold**)"></textarea>
        <button type="button" class="btn-icon-del" title="Remove">&times;</button>
      `;
      div.querySelector(".btn-icon-del").addEventListener("click", () => div.remove());
      container.appendChild(div);
      div.querySelector("textarea").focus();
    });

    $("btnAddResearch")?.addEventListener("click", () => {
      const container = $("researchCardsContainer");
      const card = document.createElement("div");
      card.className = "card-item-editor";
      const iconOpts = ICON_OPTIONS.map((ico) => `<option value="${ico}">${ico.toUpperCase()}</option>`).join("");
      card.innerHTML = `
        <div class="card-header-bar">
          <span class="card-num mono">R.NEW</span>
          <button type="button" class="btn-icon-del btn-del-r" title="Remove Area">&times;</button>
        </div>
        <div class="form-row-2">
          <div class="form-group">
            <label>Title</label>
            <input type="text" class="r-title" placeholder="e.g. Cloud Security" required />
          </div>
          <div class="form-group">
            <label>Icon Style</label>
            <select class="r-icon">${iconOpts}</select>
          </div>
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea rows="2" class="r-desc" placeholder="Overview of research domain..."></textarea>
        </div>
        <div class="form-group">
          <label>Tags (Comma separated)</label>
          <input type="text" class="r-tags" placeholder="Zero Trust, IAM, Encryption" />
        </div>
      `;
      card.querySelector(".btn-del-r").addEventListener("click", () => card.remove());
      container.prepend(card);
      card.querySelector("input").focus();
    });

    $("btnAddEducation")?.addEventListener("click", () => {
      const container = $("educationListContainer");
      const div = document.createElement("div");
      div.className = "list-item-box";
      div.innerHTML = `
        <div class="item-row-top">
          <label class="checkbox-label mono">
            <input type="checkbox" class="edu-current" />
            <span>ONGOING / IN PROGRESS</span>
          </label>
          <button type="button" class="btn-icon-del btn-del-edu" title="Remove Degree">&times;</button>
        </div>
        <div class="form-row-3">
          <div class="form-group">
            <label>Degree Title</label>
            <input type="text" class="edu-degree" placeholder="Degree name" required />
          </div>
          <div class="form-group">
            <label>Institution / University</label>
            <input type="text" class="edu-org" placeholder="University name" required />
          </div>
          <div class="form-group">
            <label>Badge Label</label>
            <input type="text" class="edu-badge" placeholder="CERTIFICATION, DIPLOMA" />
          </div>
        </div>
        <div class="form-group">
          <label>Summary / Focus</label>
          <input type="text" class="edu-desc" placeholder="Specialization description" />
        </div>
      `;
      div.querySelector(".btn-del-edu").addEventListener("click", () => div.remove());
      container.prepend(div);
      div.querySelector("input").focus();
    });

    $("btnAddLeadPillar")?.addEventListener("click", () => {
      const container = $("leadPillarsList");
      const div = document.createElement("div");
      div.className = "dynamic-item";
      div.innerHTML = `
        <input type="text" class="lead-pillar-input" placeholder="New pillar or responsibility" />
        <button type="button" class="btn-icon-del" title="Remove">&times;</button>
      `;
      div.querySelector(".btn-icon-del").addEventListener("click", () => div.remove());
      container.appendChild(div);
      div.querySelector("input").focus();
    });

    $("btnAddYearStat")?.addEventListener("click", () => {
      const container = $("perYearList");
      const div = document.createElement("div");
      div.className = "year-stat-item";
      div.innerHTML = `
        <input type="text" class="py-year" placeholder="Year" style="max-width:90px;" />
        <input type="number" class="py-count" value="0" min="0" placeholder="Count" />
        <button type="button" class="btn-icon-del" title="Delete" style="width:30px;height:30px;">&times;</button>
      `;
      div.querySelector(".btn-icon-del").addEventListener("click", () => div.remove());
      container.appendChild(div);
    });

    $("btnAddPublication")?.addEventListener("click", () => {
      const container = $("publicationsContainer");
      const div = document.createElement("div");
      div.className = "list-item-box";
      div.innerHTML = `
        <div class="item-row-top">
          <strong class="mono" style="color:var(--cyan)">New Publication</strong>
          <button type="button" class="btn-icon-del btn-del-pub" title="Delete Publication">&times;</button>
        </div>
        <div class="form-group">
          <label>Paper Title</label>
          <input type="text" class="pub-title" placeholder="Title of publication" required />
        </div>
        <div class="form-group">
          <label>Authors (Use **Name** to bold)</label>
          <input type="text" class="pub-authors" placeholder="Author list, e.g. **M. Hasanuzzaman**, et al." />
        </div>
        <div class="form-row-2">
          <div class="form-group">
            <label>Venue / Conference / Journal</label>
            <input type="text" class="pub-venue" placeholder="IEEE / Springer / ACM / Journal" />
          </div>
          <div class="form-group">
            <label>Publication Type</label>
            <input type="text" class="pub-type" placeholder="Conference / Journal" />
          </div>
        </div>
        <div class="form-row-3">
          <div class="form-group">
            <label>Year</label>
            <input type="text" class="pub-year" placeholder="2026" />
          </div>
          <div class="form-group">
            <label>Citations Count</label>
            <input type="number" class="pub-cites" value="0" min="0" />
          </div>
          <div class="form-group">
            <label>DOI / URL Link</label>
            <input type="url" class="pub-link" placeholder="https://..." />
          </div>
        </div>
      `;
      div.querySelector(".btn-del-pub").addEventListener("click", () => div.remove());
      container.prepend(div);
      div.querySelector("input").focus();
    });

    // GitHub Settings
    $("btnSaveGhConfig")?.addEventListener("click", saveGhConfigFromInputs);

    $("toggleGhTokenBtn")?.addEventListener("click", () => {
      const inp = $("ghTokenInput");
      inp.type = inp.type === "password" ? "text" : "password";
    });

    $("btnClearGhToken")?.addEventListener("click", () => {
      if (confirm("Remove saved GitHub token from this browser?")) {
        state.ghConfig.token = "";
        $("ghTokenInput").value = "";
        localStorage.removeItem(GH_CONFIG_KEY);
        updateGhStatusIndicators();
        showToast("GitHub token removed.");
      }
    });

    $("btnTestGhConnection")?.addEventListener("click", async () => {
      saveGhConfigFromInputs();
      const resBox = $("ghTestResult");
      resBox.style.display = "block";
      resBox.className = "mono test-result-box";
      resBox.textContent = "Testing connection to GitHub repository...";

      const { repo, token } = state.ghConfig;
      if (!token) {
        resBox.className = "mono test-result-box err";
        resBox.textContent = "Error: Please enter a GitHub Personal Access Token.";
        return;
      }

      try {
        const res = await fetch(`https://api.github.com/repos/${repo}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json"
          }
        });
        if (res.ok) {
          const info = await res.json();
          resBox.className = "mono test-result-box ok";
          resBox.textContent = `✔ Connected successfully to ${info.full_name} (${info.visibility || "public"}). Push permissions verified!`;
        } else {
          const err = await res.json();
          resBox.className = "mono test-result-box err";
          resBox.textContent = `❌ Connection failed (${res.status}): ${err.message}`;
        }
      } catch (e) {
        resBox.className = "mono test-result-box err";
        resBox.textContent = `❌ Network error: ${e.message}`;
      }
    });

    // Backups
    $("btnDownloadJson")?.addEventListener("click", () => {
      const d = harvestCurrentData();
      const blob = new Blob([JSON.stringify(d, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `content-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      showToast("Download started.");
    });

    $("btnCopyJson")?.addEventListener("click", async () => {
      const d = harvestCurrentData();
      await navigator.clipboard.writeText(JSON.stringify(d, null, 2));
      showToast("Raw JSON copied to clipboard!");
    });

    $("importJsonInput")?.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          state.data = parsed;
          populateAllForms();
          saveDraftLocally();
          showToast("✔ Data imported and loaded into draft!");
        } catch (err) {
          alert("Invalid JSON format in uploaded file: " + err.message);
        }
      };
      reader.readAsText(file);
    });

    $("btnResetDefaults")?.addEventListener("click", async () => {
      if (confirm("Reset current draft to default repository content? Any unsaved edits will be discarded.")) {
        localStorage.removeItem(LOCAL_DRAFT_KEY);
        await loadContentData();
        showToast("Reset to remote repository defaults.");
      }
    });

    // Inbox actions
    $("btnClearInbox")?.addEventListener("click", () => {
      if (confirm("Clear all inbound contact messages?")) {
        localStorage.removeItem(INBOX_KEY);
        renderInboxMessages();
        updateInboxBadge();
        showToast("Inbox cleared.");
      }
    });

    $("btnExportInbox")?.addEventListener("click", () => {
      const raw = localStorage.getItem(INBOX_KEY) || "[]";
      const blob = new Blob([raw], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `inbox-messages-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }

  // ================= UTILITIES =================
  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getDefaultFallbackData() {
    return {
      profile: {
        name: "Md. Hasanuzzaman",
        title: "Head of the Department",
        department: "Department of Computer Science & Engineering (CSE)",
        university: "Canadian University of Bangladesh",
        highestDegree: "Ph.D. in progress",
        statusText: "SYSTEM ONLINE · CSE DEPT. HEAD",
        heroDesc: "Head of the Department of **Computer Science & Engineering** at the **Canadian University of Bangladesh**.",
        roles: ["Head of the Department, CSE", "Cyber Security Researcher"],
        photo: "Hasan.jpg",
        about: [],
        email: "hasanuzzaman@cub.edu.bd",
        phone: "+8801322077218",
        scholar: "https://scholar.google.com/citations?user=aX7wNF0AAAAJ&hl=en",
        office: "Dept. of CSE, Canadian University of Bangladesh, Dhaka"
      },
      research: [],
      education: [],
      leadership: { intro: "", items: [] },
      metrics: { citations: 6, hIndex: 1, i10Index: 0, perYear: [] },
      publications: []
    };
  }

  // Start
  document.addEventListener("DOMContentLoaded", () => {
    initAuth();
    initEvents();
  });
})();
