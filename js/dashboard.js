/* ============================================================
   dashboard.js — Golden Pride Hub

   Handles:
   - Current user information
   - Dashboard statistics
   - Latest announcement
   - Members
   - Events
   - RSVP
   - Gallery
   - Achievements
   - Profile
   ============================================================ */

let currentUserData = null;

/* ============================================================
   CURRENT USER
   ============================================================ */

function initCurrentUser() {
  if (typeof auth === "undefined") {
    console.error("Firebase Auth is not available.");
    return;
  }

  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      currentUserData = null;
      return;
    }

    try {
      const snapshot = await db
        .collection(COLLECTIONS.USERS)
        .doc(user.uid)
        .get();

      if (snapshot.exists) {
        currentUserData = snapshot.data() || {};
      } else {
        currentUserData = {
          fullname:
            user.displayName ||
            "Member",

          email:
            user.email ||
            "",

          role:
            ROLES.MEMBER
        };
      }

      currentUserData.fullname =
        currentUserData.fullname ||
        user.displayName ||
        "Member";

      currentUserData.email =
        currentUserData.email ||
        user.email ||
        "";

      currentUserData.role =
        currentUserData.role ||
        ROLES.MEMBER;

      updateUserInterface();

      await loadDashboardStats();
    } catch (error) {
      console.error(
        "Unable to load current user:",
        error
      );

      currentUserData = {
        fullname:
          user.displayName ||
          "Member",

        email:
          user.email ||
          "",

        role:
          ROLES.MEMBER
      };

      updateUserInterface();
    }
  });
}

/* ---------- Update Header / Sidebar ---------- */

function updateUserInterface() {
  if (!currentUserData) return;

  document
    .querySelectorAll(".user-fullname")
    .forEach((element) => {
      element.textContent =
        currentUserData.fullname;
    });

  document
    .querySelectorAll(".user-role-badge")
    .forEach((element) => {
      element.textContent =
        currentUserData.role;

      element.classList.remove(
        "badge-admin",
        "badge-member"
      );

      element.classList.add(
        currentUserData.role === ROLES.ADMIN
          ? "badge-admin"
          : "badge-member"
      );
    });

  document
    .querySelectorAll(".user-avatar-initials")
    .forEach((element) => {
      element.textContent =
        getInitials(
          currentUserData.fullname
        );
    });

  document
    .querySelectorAll(".user-email")
    .forEach((element) => {
      element.textContent =
        currentUserData.email;
    });

  if (
    currentUserData.role === ROLES.ADMIN
  ) {
    document
      .querySelectorAll(".admin-only")
      .forEach((element) => {
        element.style.display = "";
      });
  }
}

/* ============================================================
   DASHBOARD STATISTICS
   ============================================================ */

async function safeCollectionCount(
  collectionName
) {
  try {
    const snapshot = await db
      .collection(collectionName)
      .get();

    return snapshot.size;
  } catch (error) {
    console.error(
      `Unable to count ${collectionName}:`,
      error
    );

    return 0;
  }
}

async function loadDashboardStats() {
  const stats = {
    announcements:
      document.getElementById(
        "stat-announcements"
      ),

    members:
      document.getElementById(
        "stat-members"
      ),

    events:
      document.getElementById(
        "stat-events"
      ),

    gallery:
      document.getElementById(
        "stat-gallery"
      ),

    achievements:
      document.getElementById(
        "stat-achievements"
      )
  };

  const requests = [];

  if (stats.announcements) {
    requests.push(
      safeCollectionCount(
        COLLECTIONS.ANNOUNCEMENTS
      ).then((count) => {
        stats.announcements.textContent =
          count;
      })
    );
  }

  if (stats.members) {
    requests.push(
      safeCollectionCount(
        COLLECTIONS.USERS
      ).then((count) => {
        stats.members.textContent =
          count;
      })
    );
  }

  if (stats.events) {
    requests.push(
      safeCollectionCount(
        COLLECTIONS.EVENTS
      ).then((count) => {
        stats.events.textContent =
          count;
      })
    );
  }

  if (stats.gallery) {
    requests.push(
      safeCollectionCount(
        COLLECTIONS.GALLERY
      ).then((count) => {
        stats.gallery.textContent =
          count;
      })
    );
  }

  if (stats.achievements) {
    requests.push(
      safeCollectionCount(
        COLLECTIONS.ACHIEVEMENTS
      ).then((count) => {
        stats.achievements.textContent =
          count;
      })
    );
  }

  await Promise.all(requests);

  await loadRecentAnnouncementPreview();
}

/* ============================================================
   LATEST ANNOUNCEMENT
   ============================================================ */

async function loadRecentAnnouncementPreview() {
  const container =
    document.getElementById(
      "latest-announcement"
    );

  if (!container) return;

  try {
    const snapshot = await db
      .collection(
        COLLECTIONS.ANNOUNCEMENTS
      )
      .orderBy(
        "createdAt",
        "desc"
      )
      .limit(1)
      .get();

    if (snapshot.empty) {
      container.innerHTML = `
        <p class="empty-state">
          No announcements yet.
        </p>
      `;

      return;
    }

    const data =
      snapshot.docs[0].data() || {};

    const title =
      sanitize(data.title || "");

    const content =
      sanitize(data.content || "");

    const author =
      sanitize(data.author || "Admin");

    const image =
      data.image
        ? `
          <img
            src="${sanitize(data.image)}"
            alt="Announcement image"
            loading="lazy"
          >
        `
        : "";

    const shortenedContent =
      content.length > 140
        ? `${content.substring(0, 140)}…`
        : content;

    container.innerHTML = `
      <div class="announcement-card glass fade-in">
        ${image}

        <div class="announcement-card-body">
          <h3>${title}</h3>

          <p>
            ${shortenedContent}
          </p>

          <span class="announcement-meta">
            ${author}
            •
            ${formatDate(data.createdAt)}
          </span>
        </div>
      </div>
    `;
  } catch (error) {
    console.error(
      "Announcement preview error:",
      error
    );

    container.innerHTML = `
      <p class="empty-state">
        Unable to load announcements.
      </p>
    `;
  }
}

/* ============================================================
   MEMBERS
   ============================================================ */

async function loadMembers(
  searchTerm = ""
) {
  const grid =
    document.getElementById(
      "members-grid"
    );

  if (!grid) return;

  grid.innerHTML = `
    <p class="empty-state">
      Loading members…
    </p>
  `;

  try {
    const snapshot = await db
      .collection(COLLECTIONS.USERS)
      .orderBy("fullname")
      .get();

    const query =
      String(searchTerm || "")
        .trim()
        .toLowerCase();

    const members =
      snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter((member) => {
          const fullname =
            String(
              member.fullname || ""
            );

          return fullname
            .toLowerCase()
            .includes(query);
        });

    if (!members.length) {
      grid.innerHTML = `
        <p class="empty-state">
          No members found.
        </p>
      `;

      return;
    }

    grid.innerHTML = members
      .map((member) => {
        const fullname =
          member.fullname ||
          "Member";

        const role =
          member.role ||
          ROLES.MEMBER;

        const email =
          member.email ||
          "";

        let online = false;

        try {
          online =
            typeof isUserOnline === "function"
              ? !!isUserOnline(member)
              : false;
        } catch (error) {
          online = false;
        }

        return `
          <div
            class="member-card glass fade-in"
          >
            <div class="avatar-circle">
              ${getInitials(fullname)}

              <span
                class="status-dot ${
                  online
                    ? "status-online"
                    : "status-offline"
                }"
                title="${
                  online
                    ? "Online"
                    : "Offline"
                }"
              ></span>
            </div>

            <h4>
              ${sanitize(fullname)}
            </h4>

            <span
              class="role-badge ${
                role === ROLES.ADMIN
                  ? "badge-admin"
                  : "badge-member"
              }"
            >
              ${sanitize(role)}
            </span>

            <p class="member-email">
              ${sanitize(email)}
            </p>

            <p
              class="member-status ${
                online
                  ? "text-online"
                  : "text-offline"
              }"
            >
              ${
                online
                  ? "🟢 Online now"
                  : "⚪ Offline"
              }
            </p>
          </div>
        `;
      })
      .join("");
  } catch (error) {
    console.error(
      "Members loading error:",
      error
    );

    grid.innerHTML = `
      <p class="empty-state">
        Unable to load members.
      </p>
    `;
  }
}

/* ============================================================
   EVENTS
   ============================================================ */

async function loadEvents() {
  const upcomingEl =
    document.getElementById(
      "upcoming-events"
    );

  const pastEl =
    document.getElementById(
      "past-events"
    );

  if (!upcomingEl && !pastEl) {
    return;
  }

  try {
    const snapshot = await db
      .collection(COLLECTIONS.EVENTS)
      .orderBy("date", "asc")
      .get();

    const now = new Date();

    const upcoming = [];
    const past = [];

    snapshot.forEach((doc) => {
      const data = {
        id: doc.id,
        ...doc.data()
      };

      const eventDate =
        convertToDate(data.date);

      if (!eventDate) return;

      if (eventDate >= now) {
        upcoming.push(data);
      } else {
        past.push(data);
      }
    });

    const cardHtml = (
      event,
      isPast
    ) => {
      const eventDate =
        convertToDate(event.date);

      if (!eventDate) return "";

      const day =
        eventDate.getDate();

      const month =
        eventDate.toLocaleString(
          "en-PH",
          {
            month: "short"
          }
        );

      return `
        <div
          class="event-card glass fade-in"
          data-event-id="${event.id}"
        >
          <div class="event-date-badge">
            <span class="day">
              ${day}
            </span>

            <span class="month">
              ${month}
            </span>
          </div>

          <div class="event-info">
            <h4>
              ${sanitize(
                event.title || ""
              )}
            </h4>

            <p>
              ${sanitize(
                event.description || ""
              )}
            </p>

            <span class="event-location">
              <i class="fa-solid fa-location-dot"></i>
              ${sanitize(
                event.location || ""
              )}
            </span>

            <div class="event-rsvp-row">
              <span
                class="rsvp-count"
                id="rsvp-count-${event.id}"
              >
                <i class="fa-solid fa-user-group"></i>
                Loading…
              </span>

              ${
                !isPast
                  ? `
                    <button
                      type="button"
                      class="btn-icon rsvp-btn"
                      data-event-id="${event.id}"
                    >
                      <i class="fa-solid fa-check"></i>
                      RSVP
                    </button>
                  `
                  : ""
              }
            </div>
          </div>
        </div>
      `;
    };

    if (upcomingEl) {
      upcomingEl.innerHTML =
        upcoming.length
          ? upcoming
              .map((event) =>
                cardHtml(
                  event,
                  false
                )
              )
              .join("")
          : `
            <p class="empty-state">
              No upcoming events.
            </p>
          `;
    }

    if (pastEl) {
      pastEl.innerHTML =
        past.length
          ? past
              .map((event) =>
                cardHtml(
                  event,
                  true
                )
              )
              .join("")
          : `
            <p class="empty-state">
              No past events yet.
            </p>
          `;
    }

    const allEvents = [
      ...upcoming,
      ...past
    ];

    await Promise.all(
      allEvents.map((event) =>
        refreshRsvpUI(event.id)
      )
    );
  } catch (error) {
    console.error(
      "Events loading error:",
      error
    );

    if (upcomingEl) {
      upcomingEl.innerHTML = `
        <p class="empty-state">
          Unable to load events.
        </p>
      `;
    }

    if (pastEl) {
      pastEl.innerHTML = "";
    }
  }
}

/* ---------- Convert Firestore Date ---------- */

function convertToDate(value) {
  if (!value) return null;

  try {
    if (
      typeof value.toDate === "function"
    ) {
      return value.toDate();
    }

    if (
      value instanceof Date
    ) {
      return Number.isNaN(
        value.getTime()
      )
        ? null
        : value;
    }

    const date =
      new Date(value);

    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date;
  } catch (error) {
    return null;
  }
}

/* ============================================================
   RSVP
   ============================================================ */

async function toggleRsvp(eventId) {
  const user =
    auth.currentUser;

  if (!user) {
    showToast(
      "Please sign in first.",
      "warning"
    );
    return;
  }

  if (!eventId) return;

  const button =
    document.querySelector(
      `.rsvp-btn[data-event-id="${CSS.escape(
        eventId
      )}"]`
    );

  if (button) {
    button.disabled = true;
  }

  const rsvpRef =
    db
      .collection(
        COLLECTIONS.EVENTS
      )
      .doc(eventId)
      .collection("rsvps")
      .doc(user.uid);

  try {
    const existing =
      await rsvpRef.get();

    if (existing.exists) {
      await rsvpRef.delete();

      showToast(
        "RSVP cancelled.",
        "info"
      );
    } else {
      await rsvpRef.set({
        uid: user.uid,

        fullname:
          currentUserData?.fullname ||
          user.displayName ||
          "Member",

        timestamp:
          firebase.firestore.FieldValue.serverTimestamp()
      });

      showToast(
        "You're going! See you there 🎉",
        "success"
      );
    }

    await refreshRsvpUI(
      eventId
    );
  } catch (error) {
    console.error(
      "RSVP error:",
      error
    );

    showToast(
      "Failed to update RSVP.",
      "error"
    );
  } finally {
    if (button) {
      button.disabled = false;
    }
  }
}

/* ---------- RSVP UI ---------- */

async function refreshRsvpUI(
  eventId
) {
  if (!eventId) return;

  const countEl =
    document.getElementById(
      `rsvp-count-${eventId}`
    );

  const button =
    document.querySelector(
      `.rsvp-btn[data-event-id="${CSS.escape(
        eventId
      )}"]`
    );

  try {
    const snapshot =
      await db
        .collection(
          COLLECTIONS.EVENTS
        )
        .doc(eventId)
        .collection("rsvps")
        .get();

    if (countEl) {
      countEl.innerHTML = `
        <i class="fa-solid fa-user-group"></i>
        ${snapshot.size} going
      `;
    }

    const user =
      auth.currentUser;

    if (!button || !user) {
      return;
    }

    const hasRsvp =
      snapshot.docs.some(
        (doc) =>
          doc.id === user.uid
      );

    if (hasRsvp) {
      button.classList.add(
        "rsvp-active"
      );

      button.innerHTML = `
        <i class="fa-solid fa-check"></i>
        Going
      `;
    } else {
      button.classList.remove(
        "rsvp-active"
      );

      button.innerHTML = `
        <i class="fa-solid fa-check"></i>
        RSVP
      `;
    }
  } catch (error) {
    console.error(
      `Unable to load RSVP for ${eventId}:`,
      error
    );

    if (countEl) {
      countEl.innerHTML = `
        <i class="fa-solid fa-user-group"></i>
        0 going
      `;
    }
  }
}

/* ============================================================
   GALLERY
   ============================================================ */

async function loadGallery() {
  const grid =
    document.getElementById(
      "gallery-grid"
    );

  if (!grid) return;

  try {
    const snapshot =
      await db
        .collection(
          COLLECTIONS.GALLERY
        )
        .orderBy(
          "createdAt",
          "desc"
        )
        .get();

    if (snapshot.empty) {
      grid.innerHTML = `
        <p class="empty-state">
          No photos uploaded yet.
        </p>
      `;

      return;
    }

    grid.innerHTML =
      snapshot.docs
        .map((doc) => {
          const data =
            doc.data() || {};

          return `
            <figure
              class="gallery-item fade-in"
              data-img="${sanitize(
                data.image || ""
              )}"
              data-caption="${sanitize(
                data.caption || ""
              )}"
            >
              <img
                src="${sanitize(
                  data.image || ""
                )}"
                alt="${sanitize(
                  data.caption || ""
                )}"
                loading="lazy"
              >

              <figcaption>
                ${sanitize(
                  data.caption || ""
                )}
              </figcaption>
            </figure>
          `;
        })
        .join("");

    grid
      .querySelectorAll(
        ".gallery-item"
      )
      .forEach((item) => {
        item.addEventListener(
          "click",
          () => {
            openLightbox(
              item.dataset.img || "",
              item.dataset.caption || ""
            );
          }
        );
      });
  } catch (error) {
    console.error(
      "Gallery loading error:",
      error
    );

    grid.innerHTML = `
      <p class="empty-state">
        Unable to load gallery.
      </p>
    `;
  }
}

/* ---------- Lightbox ---------- */

function openLightbox(
  imgSrc,
  caption
) {
  if (!imgSrc) return;

  const lightbox =
    document.createElement("div");

  lightbox.className =
    "lightbox show";

  lightbox.innerHTML = `
    <span
      class="lightbox-close"
      role="button"
      tabindex="0"
      aria-label="Close"
    >
      <i class="fa-solid fa-xmark"></i>
    </span>

    <img
      src="${sanitize(imgSrc)}"
      alt="${sanitize(caption)}"
    >

    <p class="lightbox-caption">
      ${sanitize(caption)}
    </p>
  `;

  document.body.appendChild(
    lightbox
  );

  const close = () => {
    lightbox.remove();
  };

  lightbox.addEventListener(
    "click",
    (event) => {
      if (
        event.target === lightbox ||
        event.target.closest(
          ".lightbox-close"
        )
      ) {
        close();
      }
    }
  );

  lightbox
    .querySelector(
      ".lightbox-close"
    )
    ?.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          close();
        }
      }
    );
}

/* ============================================================
   ACHIEVEMENTS
   ============================================================ */

async function loadAchievements() {
  const grid =
    document.getElementById(
      "achievements-grid"
    );

  if (!grid) return;

  try {
    const snapshot =
      await db
        .collection(
          COLLECTIONS.ACHIEVEMENTS
        )
        .orderBy(
          "createdAt",
          "desc"
        )
        .get();

    if (snapshot.empty) {
      grid.innerHTML = `
        <p class="empty-state">
          No achievements posted yet.
        </p>
      `;

      return;
    }

    grid.innerHTML =
      snapshot.docs
        .map((doc) => {
          const data =
            doc.data() || {};

          const image =
            data.image
              ? `
                <img
                  src="${sanitize(
                    data.image
                  )}"
                  alt="${sanitize(
                    data.title || ""
                  )}"
                  loading="lazy"
                >
              `
              : `
                <i
                  class="fa-solid fa-trophy achievement-icon"
                ></i>
              `;

          return `
            <div
              class="achievement-card glass fade-in"
            >
              ${image}

              <h4>
                ${sanitize(
                  data.title || ""
                )}
              </h4>

              <p>
                ${sanitize(
                  data.description || ""
                )}
              </p>
            </div>
          `;
        })
        .join("");
  } catch (error) {
    console.error(
      "Achievements loading error:",
      error
    );

    grid.innerHTML = `
      <p class="empty-state">
        Unable to load achievements.
      </p>
    `;
  }
}

/* ============================================================
   PROFILE
   ============================================================ */

function initProfile() {
  const form =
    document.getElementById(
      "profile-form"
    );

  if (!form) return;

  auth.onAuthStateChanged(
    async (user) => {
      if (!user) return;

      try {
        const snapshot =
          await db
            .collection(
              COLLECTIONS.USERS
            )
            .doc(user.uid)
            .get();

        const data =
          snapshot.exists
            ? snapshot.data() || {}
            : {};

        const fullname =
          document.getElementById(
            "profile-fullname"
          );

        const email =
          document.getElementById(
            "profile-email"
          );

        const photo =
          document.getElementById(
            "profile-photo"
          );

        if (fullname) {
          fullname.value =
            data.fullname ||
            user.displayName ||
            "";
        }

        if (email) {
          email.value =
            data.email ||
            user.email ||
            "";
        }

        if (photo) {
          if (data.photoURL) {
            photo.src =
              data.photoURL;
          } else {
            photo.removeAttribute(
              "src"
            );
          }
        }
      } catch (error) {
        console.error(
          "Profile loading error:",
          error
        );

        showToast(
          "Unable to load profile.",
          "error"
        );
      }
    }
  );

  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const user =
        auth.currentUser;

      if (!user) {
        showToast(
          "Please sign in first.",
          "warning"
        );
        return;
      }

      const fullnameInput =
        document.getElementById(
          "profile-fullname"
        );

      const fullname =
        fullnameInput?.value
          ?.trim() || "";

      if (!fullname) {
        showToast(
          "Full name is required.",
          "warning"
        );
        return;
      }

      const button =
        form.querySelector(
          'button[type="submit"]'
        );

      if (button) {
        button.disabled = true;
        button.classList.add(
          "btn-loading"
        );
      }

      try {
        await db
          .collection(
            COLLECTIONS.USERS
          )
          .doc(user.uid)
          .set(
            {
              fullname
            },
            {
              merge: true
            }
          );

        await user.updateProfile({
          displayName: fullname
        });

        currentUserData = {
          ...(currentUserData || {}),
          fullname
        };

        updateUserInterface();

        showToast(
          "Profile updated successfully!",
          "success"
        );
      } catch (error) {
        console.error(
          "Profile update error:",
          error
        );

        showToast(
          error?.message ||
            "Failed to update profile.",
          "error"
        );
      } finally {
        if (button) {
          button.disabled = false;
          button.classList.remove(
            "btn-loading"
          );
        }
      }
    }
  );

  initProfilePhotoUpload();
}

/* ---------- Profile Photo ---------- */

function initProfilePhotoUpload() {
  const input =
    document.getElementById(
      "profile-photo-input"
    );

  if (!input) return;

  input.addEventListener(
    "change",
    async (event) => {
      const file =
        event.target.files?.[0];

      if (!file) return;

      if (
        !file.type.startsWith(
          "image/"
        )
      ) {
        showToast(
          "Please choose a valid image.",
          "warning"
        );

        input.value = "";
        return;
      }

      if (
        file.size >
        500 * 1024
      ) {
        showToast(
          "Image too large. Max size is 500KB.",
          "warning"
        );

        input.value = "";
        return;
      }

      const user =
        auth.currentUser;

      if (!user) {
        showToast(
          "Please sign in first.",
          "warning"
        );

        return;
      }

      try {
        const reader =
          new FileReader();

        reader.onload = async () => {
          try {
            await db
              .collection(
                COLLECTIONS.USERS
              )
              .doc(user.uid)
              .set(
                {
                  photoURL:
                    reader.result
                },
                {
                  merge: true
                }
              );

            const photo =
              document.getElementById(
                "profile-photo"
              );

            if (photo) {
              photo.src =
                reader.result;
            }

            currentUserData = {
              ...(currentUserData || {}),
              photoURL:
                reader.result
            };

            showToast(
              "Profile picture updated!",
              "success"
            );
          } catch (error) {
            console.error(
              "Photo save error:",
              error
            );

            showToast(
              "Failed to save profile picture.",
              "error"
            );
          }
        };

        reader.onerror = () => {
          showToast(
            "Failed to read image.",
            "error"
          );
        };

        reader.readAsDataURL(
          file
        );
      } catch (error) {
        console.error(
          "Profile photo error:",
          error
        );

        showToast(
          "Unable to update profile picture.",
          "error"
        );
      }
    }
  );
}

/* ============================================================
   EVENT DELEGATION FOR RSVP
   ============================================================ */

document.addEventListener(
  "click",
  (event) => {
    const button =
      event.target.closest(
        ".rsvp-btn"
      );

    if (!button) return;

    const eventId =
      button.dataset.eventId;

    if (!eventId) return;

    toggleRsvp(eventId);
  }
);

/* ============================================================
   DOM READY
   ============================================================ */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    initCurrentUser();

    const memberSearch =
      document.getElementById(
        "member-search"
      );

    if (memberSearch) {
      memberSearch.addEventListener(
        "input",
        debounce(
          (event) => {
            loadMembers(
              event.target.value
            );
          },
          300
        )
      );
    }

    if (
      document.getElementById(
        "members-grid"
      )
    ) {
      loadMembers();
    }

    if (
      document.getElementById(
        "upcoming-events"
      ) ||
      document.getElementById(
        "past-events"
      )
    ) {
      loadEvents();
    }

    if (
      document.getElementById(
        "gallery-grid"
      )
    ) {
      loadGallery();
    }

    if (
      document.getElementById(
        "achievements-grid"
      )
    ) {
      loadAchievements();
    }

    initProfile();
  }
);

/* ============================================================
   GLOBAL FUNCTIONS
   ============================================================ */

window.loadMembers =
  loadMembers;

window.loadEvents =
  loadEvents;

window.toggleRsvp =
  toggleRsvp;

window.refreshRsvpUI =
  refreshRsvpUI;

window.loadGallery =
  loadGallery;

window.openLightbox =
  openLightbox;

window.loadAchievements =
  loadAchievements;

window.loadDashboardStats =
  loadDashboardStats;
