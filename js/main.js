/* =========================================================
   Md. Hasanuzzaman — Portfolio Interactions
   ========================================================= */
(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Boot loader ---------- */
  document.body.classList.add("loading");
  const bootLines = [
    "[ OK ] Initializing secure kernel...",
    "[ OK ] Loading network modules...",
    "[ OK ] Establishing TLS handshake...",
    "[ OK ] Verifying identity: Md. Hasanuzzaman",
    "[ OK ] Access granted. Welcome.",
  ];
  const bootEl = $("#bootText");
  let li = 0;
  const bootTimer = setInterval(() => {
    if (li < bootLines.length) bootEl.textContent += bootLines[li++] + "\n";
  }, 300);

  let loaded = false;
  const finishLoading = () => {
    if (loaded) return;
    loaded = true;
    clearInterval(bootTimer);
    $("#loader").classList.add("hide");
    document.body.classList.remove("loading");
    startTyping();
    contentReady.then(() => countUp($$(".hero-stats .stat-num")));
  };
  window.addEventListener("load", () => setTimeout(finishLoading, reduceMotion ? 0 : 1900));
  setTimeout(finishLoading, 4500); // safety net if external assets are slow

  /* ---------- Typing effect ---------- */
  const roles = [
    "Head of the Department, CSE",
    "Cyber Security Researcher",
    "Network Security Specialist",
    "Computer Networking Educator",
    "Data Security Enthusiast",
  ];
  let typingStarted = false;
  function startTyping() {
    if (typingStarted) return;
    typingStarted = true;
    const el = $("#typed");
    let r = 0, c = 0, deleting = false;
    const tick = () => {
      const list = window.SITE?.profile?.roles?.length ? window.SITE.profile.roles : roles;
      if (r >= list.length) r = 0;
      const word = list[r];
      el.textContent = word.slice(0, c);
      let delay = deleting ? 35 : 75;
      if (!deleting && c === word.length) { delay = 1800; deleting = true; }
      else if (deleting && c === 0) { deleting = false; r = (r + 1) % list.length; delay = 350; }
      c += deleting ? -1 : 1;
      setTimeout(tick, delay);
    };
    tick();
  }

  /* ---------- Count up ---------- */
  function countUp(els) {
    els.forEach((el) => {
      if (el.dataset.done) return;
      el.dataset.done = "1";
      const target = +el.dataset.count;
      if (target === 0) { el.textContent = "0"; return; }
      const dur = 1400;
      let start = null;
      const step = (t) => {
        if (start === null) start = t;
        const p = Math.min(Math.max((t - start) / dur, 0), 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  /* ---------- Network canvas background ---------- */
  const canvas = $("#network");
  const ctx = canvas.getContext("2d");
  let W, H, nodes = [], packets = [];
  const mouse = { x: -9999, y: -9999 };
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const count = Math.min(Math.floor((W * H) / 16000), 110);
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.6 + 0.6,
    }));
    packets = [];
  }

  const LINK = 140;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const n of nodes) {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
      const dx = n.x - mouse.x, dy = n.y - mouse.y, d = Math.hypot(dx, dy);
      if (d < 120) { n.x += dx / d * 0.8; n.y += dy / d * 0.8; }
    }
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < LINK) {
          ctx.strokeStyle = `rgba(0,240,255,${(1 - d / LINK) * 0.18})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          if (packets.length < 18 && Math.random() < 0.0006) packets.push({ a, b, t: 0 });
        }
      }
      ctx.fillStyle = "rgba(160,220,255,0.8)";
      ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
    }
    // data packets travelling along links
    packets = packets.filter((p) => (p.t += 0.015) < 1 && Math.hypot(p.a.x - p.b.x, p.a.y - p.b.y) < LINK);
    for (const p of packets) {
      const x = p.a.x + (p.b.x - p.a.x) * p.t, y = p.a.y + (p.b.y - p.a.y) * p.t;
      ctx.fillStyle = "#ff2e97"; ctx.shadowColor = "#ff2e97"; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    requestAnimationFrame(draw);
  }
  resize();
  if (!reduceMotion) draw();
  let rT; window.addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(resize, 200); });

  /* ---------- Cursor glow ---------- */
  const glow = $(".cursor-glow");
  window.addEventListener("pointermove", (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    glow.style.transform = `translate(${e.clientX - 210}px, ${e.clientY - 210}px)`;
  });
  glow.style.transform = "translate(-9999px,-9999px)";

  /* ---------- Nav: scroll state, spy, mobile ---------- */
  const nav = $("#nav"), toTop = $("#toTop");
  const links = $$(".nav-links a");
  const sections = links.map((a) => $(a.getAttribute("href")));
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle("scrolled", y > 30);
    toTop.classList.toggle("show", y > 600);
    let current = sections[0];
    for (const s of sections) if (s && s.offsetTop - 140 <= y) current = s;
    links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + current.id));
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  const menuBtn = $("#menuToggle"), navLinks = $("#navLinks");
  menuBtn.addEventListener("click", () => {
    menuBtn.classList.toggle("open");
    navLinks.classList.toggle("open");
  });
  links.forEach((a) => a.addEventListener("click", () => {
    menuBtn.classList.remove("open"); navLinks.classList.remove("open");
  }));

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("visible");
      countUp($$("[data-count]", e.target));
      io.unobserve(e.target);
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
  $$(".reveal").forEach((el, i) => {
    el.style.transitionDelay = `${(i % 4) * 80}ms`;
    io.observe(el);
  });

  /* ---------- 3D tilt + spotlight on research cards ---------- */
  if (!reduceMotion && window.matchMedia("(hover: hover)").matches) {
    $$(".tilt").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 10}deg) rotateY(${(px - 0.5) * 12}deg) translateY(-6px)`;
        card.style.setProperty("--mx", `${px * 100}%`);
        card.style.setProperty("--my", `${py * 100}%`);
      });
      card.addEventListener("pointerleave", () => { card.style.transform = ""; });
    });
  }

  /* ---------- Contact form → mailto & local inbox ---------- */
  $("#contactForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#fname").value.trim();
    const email = $("#femail").value.trim();
    const subject = $("#fsubject").value.trim();
    const msg = $("#fmsg").value.trim();
    const targetEmail = window.SITE_EMAIL || "hasanuzzaman@cub.edu.bd";
    const body = `${msg}\n\n— ${name}\n${email}`;

    // Store locally for the Admin Inbox viewer
    try {
      const inbox = JSON.parse(localStorage.getItem("cub_inbox_messages") || "[]");
      inbox.unshift({
        id: "msg_" + Date.now(),
        name,
        email,
        subject,
        message: msg,
        date: new Date().toLocaleString(),
        read: false
      });
      localStorage.setItem("cub_inbox_messages", JSON.stringify(inbox.slice(0, 100)));
    } catch (_) {}

    window.location.href = `mailto:${encodeURIComponent(targetEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast("✔ Message stored & opening email client...");
    e.target.reset();
  });

  function toast(text) {
    const t = document.createElement("div");
    t.className = "toast"; t.textContent = text;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 400); }, 2600);
  }

  $("#year").textContent = new Date().getFullYear();
})();
