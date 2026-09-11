/* ============================================================
   app.js — Golden Pride Hub
   Shared utilities used across every page:
   - Loading screen
   - Toast notifications
   - Mobile navigation toggle
   - Scroll-to-top button
   - Confirmation dialogs
   - Simple helper functions
   ============================================================ */

/* ---------- PWA Setup (manifest + service worker) ----------
   Injected here so every page gets PWA support without editing
   all 12 HTML files individually. */
(function setupPWA() {
  // Inject manifest link if not already present
  if (!document.querySelector('link[rel="manifest"]')) {
    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = "manifest.json";
    document.head.appendChild(link);
  }

  // Inject theme-color meta tag
  if (!document.querySelector('meta[name="theme-color"]')) {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = "#0d0d0d";
    document.head.appendChild(meta);
  }

  // Register service worker
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch((err) => {
        console.warn("Service worker registration failed:", err);
      });
    });
  }
})();

/* ---------- Loading Screen ---------- */
window.addEventListener("load", () => {
  const loader = document.getElementById("loading-screen");
  if (loader) {
    setTimeout(() => {
      loader.classList.add("hide");
      setTimeout(() => (loader.style.display = "none"), 400);
    }, 400);
  }
});

/* ---------- Toast Notifications ---------- */
/**
 * Shows a toast notification.
 * @param {string} message - text to display
 * @param {"success"|"error"|"info"|"warning"} type
 */
function showToast(message, type = "info") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const icons = {
    success: "fa-circle-check",
    error: "fa-circle-xmark",
    info: "fa-circle-info",
    warning: "fa-triangle-exclamation"
  };

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${icons[type] || icons.info}"></i>
    <span>${sanitize(message)}</span>
  `;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/* ---------- Confirmation Dialog ---------- */
/**
 * Returns a Promise<boolean> resolved true/false based on user choice.
 * @param {string} message
 */
function confirmDialog(message = "Are you sure?") {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.innerHTML = `
      <div class="confirm-box glass">
        <p>${message}</p>
        <div class="confirm-actions">
          <button class="btn btn-outline" id="confirm-cancel">Cancel</button>
          <button class="btn btn-primary" id="confirm-ok">Confirm</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("show"));

    const close = (result) => {
      overlay.classList.remove("show");
      setTimeout(() => overlay.remove(), 250);
      resolve(result);
    };

    overlay.querySelector("#confirm-ok").addEventListener("click", () => close(true));
    overlay.querySelector("#confirm-cancel").addEventListener("click", () => close(false));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close(false);
    });
  });
}

/* ---------- Mobile Navigation Toggle ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const navToggle = document.querySelector(".nav-toggle");
  const navMenu = document.querySelector(".nav-menu");
  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      navMenu.classList.toggle("open");
      navToggle.classList.toggle("active");
    });
  }

  const sidebarToggle = document.querySelector(".sidebar-toggle");
  const sidebar = document.querySelector(".sidebar");
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }
});

/* ---------- Scroll To Top ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("scroll-top");
  if (!btn) return;

  window.addEventListener("scroll", () => {
    btn.classList.toggle("visible", window.scrollY > 400);
  });

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

/* ---------- v4.2 UX upgrades ---------- */
(function initV42UX(){
  const start = () => {
    if (!document.getElementById("connection-status")) {
      const status = document.createElement("div");
      status.id = "connection-status";
      document.body.appendChild(status);
      updateConnectionStatus();
    }
    injectCommandPalette();
    checkScheduledUpdate();
  };
  document.addEventListener("DOMContentLoaded", start);

  function updateConnectionStatus(){
    const el=document.getElementById("connection-status"); if(!el)return;
    const online=navigator.onLine;
    el.className=online?"online":"offline";
    el.innerHTML=`<i class="fa-solid fa-circle"></i><span>${online?"Online":"Offline"}</span>`;
  }
  window.addEventListener("online",updateConnectionStatus);
  window.addEventListener("offline",updateConnectionStatus);

  function injectCommandPalette(){
    if(document.getElementById("command-palette") || !document.querySelector(".sidebar"))return;
    const overlay=document.createElement("div"); overlay.id="command-palette"; overlay.className="command-overlay";
    overlay.innerHTML=`<div class="command-box glass" role="dialog" aria-modal="true" aria-label="Quick navigation">
      <div class="command-head"><i class="fa-solid fa-magnifying-glass"></i><input id="global-command-input" autocomplete="off" placeholder="Search pages…"><kbd>ESC</kbd></div>
      <div id="command-results" class="command-results"></div><p class="command-hint">Press <kbd>Ctrl</kbd> + <kbd>K</kbd> to open quick search.</p></div>`;
    document.body.appendChild(overlay);
    const routes=[
      ["Dashboard","dashboard.html","fa-gauge"],["Announcements","announcements.html","fa-bullhorn"],["Members","members.html","fa-users"],
      ["Events","events.html","fa-calendar-days"],["Gallery","gallery.html","fa-images"],["Achievements","achievements.html","fa-trophy"],["Profile","profile.html","fa-user"]
    ];
    if(document.querySelector('a[href="admin.html"]'))routes.push(["Admin Panel","admin.html","fa-user-shield"]);
    const input=overlay.querySelector("#global-command-input"), results=overlay.querySelector("#command-results");
    const render=()=>{const q=input.value.trim().toLowerCase(); const items=routes.filter(r=>r[0].toLowerCase().includes(q));
      results.innerHTML=items.map(r=>`<a class="command-item" href="${r[1]}"><i class="fa-solid ${r[2]}"></i><span>${sanitize(r[0])}</span><small>Open</small></a>`).join("")||`<div class="command-empty">No matching page.</div>`;};
    input.addEventListener("input",render);
    overlay.addEventListener("click",e=>{if(e.target===overlay)overlay.classList.remove("show")});
    document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();overlay.classList.add("show");input.focus();render()} if(e.key==="Escape")overlay.classList.remove("show")});
  }

  function checkScheduledUpdate(){
    fetch(`update.json?ts=${Date.now()}`,{cache:"no-store"}).then(r=>r.ok?r.json():null).then(d=>{
      if(!d || d.status!=="scheduled" || !d.version)return;
      const releaseAt=d.releaseDate&&d.releaseTime?new Date(`${d.releaseDate}T${d.releaseTime}:00`):null;
      if(releaseAt && releaseAt.getTime()<=Date.now())return;
      const banner=document.createElement("div"); banner.className="release-banner";
      banner.innerHTML=`<div><i class="fa-solid fa-bolt"></i><span><strong>Version ${sanitize(d.version)}</strong> — ${sanitize(d.updateName||"Scheduled update")}</span></div><button aria-label="Dismiss">×</button>`;
      banner.querySelector("button").onclick=()=>banner.remove(); document.body.prepend(banner);
    }).catch(()=>{});
  }
})();

/* ---------- Helpers ---------- */

// Escape user-generated text before inserting into innerHTML (basic XSS guard)
function sanitize(str = "") {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Format a Firestore Timestamp or JS Date into a readable string
function formatDate(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

// Debounce helper for search inputs
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Get initials from a full name, used for avatar placeholders
function getInitials(name = "") {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}
