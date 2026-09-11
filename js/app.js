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
    <span>${message}</span>
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

/* ---------- Helpers ---------- */

// Escape user-generated text before inserting into innerHTML (basic XSS guard)
function sanitize(str = "") {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Convert Firestore Timestamp, JS Date, or date-like value to a Date.
// Used by the live broadcast system so expiry checks never throw.
function getDateValue(value) {
  if (!value) return null;
  try {
    if (value.toDate && typeof value.toDate === "function") return value.toDate();
    if (value instanceof Date) return value;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

// Format a Firestore Timestamp or JS Date into a readable string
function formatDate(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
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

/* ---------- Live Admin Broadcasts ----------
   Admin messages are stored in Firestore `broadcasts`. Every page
   loads this listener, so an active message can appear immediately
   in the upper-center even when the user is on another Hub page. */
(function initLiveBroadcasts(){
  const MAX_FEED = 12;
  const seen = new Set();
  let activeDocs = [];
  let initialized = false;

  function ensureFeed(){
    return document.getElementById("live-broadcast-feed");
  }

  function sortNewestFirst(docs){
    return docs.slice().sort((a,b) => {
      const at = getDateValue(a.createdAt)?.getTime() || 0;
      const bt = getDateValue(b.createdAt)?.getTime() || 0;
      return bt - at;
    });
  }

  function renderFeed(){
    const feed = ensureFeed();
    if (!feed) return;
    const now = Date.now();
    activeDocs = sortNewestFirst(activeDocs).filter(x => {
      if (x.active === false) return false;
      const expires = getDateValue(x.expiresAt);
      return !expires || expires.getTime() > now;
    }).slice(0, MAX_FEED);

    feed.innerHTML = activeDocs.length
      ? activeDocs.map(x => `
        <article class="live-feed-card glass">
          <div class="live-feed-icon"><i class="fa-solid fa-bolt"></i></div>
          <div class="live-feed-body">
            <div class="live-feed-meta">
              <strong>${sanitize(x.sender || "Admin")} <span aria-label="verified">✅</span></strong>
              <time>${formatDate(x.createdAt) || "Just now"}</time>
            </div>
            <p>${sanitize(x.message || "")}</p>
          </div>
        </article>`).join("")
      : `<div class="live-feed-empty"><i class="fa-regular fa-bell-slash"></i><span>No live admin messages right now.</span></div>`;
  }

  function renderBroadcast(data){
    if (!data || data.active === false) return;
    const expires = getDateValue(data.expiresAt);
    if (expires && expires.getTime() <= Date.now()) return;

    const duration = Math.max(3000, Number(data.duration) || 8000);
    let wrap = document.getElementById("top-broadcast");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "top-broadcast";
      wrap.className = "top-broadcast";
      document.body.appendChild(wrap);
    }

    wrap.innerHTML = `
      <div class="broadcast-card" role="status" aria-live="polite">
        <div class="broadcast-check"><i class="fa-solid fa-check"></i></div>
        <div class="broadcast-body">
          <strong>${sanitize(data.sender || "Admin")} <span aria-label="verified">✅</span></strong>
          <p>${sanitize(data.message || "")}</p>
          <div class="broadcast-progress"><span></span></div>
        </div>
        <button class="broadcast-close" aria-label="Close message">×</button>
      </div>`;

    const bar = wrap.querySelector(".broadcast-progress span");
    if (bar) bar.style.animationDuration = `${duration}ms`;
    wrap.classList.add("show");

    const close = () => {
      wrap.classList.remove("show");
      clearTimeout(wrap.__timer);
    };
    wrap.querySelector(".broadcast-close")?.addEventListener("click", close);
    clearTimeout(wrap.__timer);
    wrap.__timer = setTimeout(close, duration);
  }

  function subscribe(){
    if (typeof firebase === "undefined" || typeof db === "undefined") return;

    try {
      db.collection("broadcasts").limit(25).onSnapshot(
        snap => {
          const docs = snap.docs.map(d => ({id:d.id, ...d.data()}));
          activeDocs = docs;
          renderFeed();

          if (!initialized) {
            // On first load, show the newest currently-active broadcast so
            // opening any Hub page/tab still gives the user the message.
            const newest = sortNewestFirst(docs).find(d => {
              if (d.active === false) return false;
              const expires = getDateValue(d.expiresAt);
              return !expires || expires.getTime() > Date.now();
            });
            if (newest) {
              seen.add(newest.id);
              renderBroadcast(newest);
            }
            docs.forEach(d => seen.add(d.id));
            initialized = true;
            return;
          }

          snap.docChanges().forEach(change => {
            if (change.type === "added" && !seen.has(change.doc.id)) {
              const data = change.doc.data();
              seen.add(change.doc.id);
              renderBroadcast(data);
            }
          });

          if (seen.size > 100) {
            const keep = new Set(docs.map(d => d.id));
            seen.forEach(id => { if (!keep.has(id)) seen.delete(id); });
          }
        },
        err => {
          console.warn("Broadcast listener unavailable:", err);
        }
      );
    } catch (e) {
      console.warn("Broadcast listener unavailable:", e);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderFeed();
    subscribe();
    setInterval(renderFeed, 30000);
  });
})();
