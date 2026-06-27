// ========== USER REGISTRATION & LOGIN (API) ==========
// Call this to register a user
// Usage: registerUser(name, location, email, password)
async function registerUser(name, location, email, password) {
  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, location, email, password })
    });
    const data = await response.json();
    if (response.ok) {
      alert(`Registratie geslaagd! Welkom, ${name} uit ${location}. Je kunt nu inloggen met ${email}.`);
      // Save user info to localStorage and update header
      setAuth({ loggedIn: true, name, location, email });
      renderAuthUI();
    } else {
      alert('Registratie mislukt: ' + (data.error || 'Onbekende fout'));
    }
  } catch (err) {
    alert('Registration error: ' + err.message);
  }
}

// Call this to log in a user
async function loginUser(email, password) {
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (response.ok) {
      alert(`Ingelogd! Welkom, ${data.name} uit ${data.location}.`);
      // Save user info to localStorage and update header
      setAuth({ loggedIn: true, name: data.name, location: data.location, email });
      renderAuthUI();
    } else {
      alert('Login mislukt: ' + (data.error || 'Onbekende fout'));
    }
  } catch (err) {
    alert('Login error: ' + err.message);
  }
}
// Add a class to body when the page is fully loaded (for fade-in effect)
document.body.classList.add("page-loaded");

// Example: Fetch jobs from backend API (MySQL)
async function fetchJobsFromServer() {
  try {
    const response = await fetch('/api/jobs');
    if (!response.ok) throw new Error('Failed to fetch jobs');
    const jobs = await response.json();
    console.log('Jobs from server:', jobs);
    // TODO: Render jobs in the UI
  } catch (err) {
    console.error('Error fetching jobs:', err);
  }
}

// Call this function on page load or when needed
// fetchJobsFromServer();

// =======================
// AUTH STATE AND LOCAL JOB STORAGE
// Handles authentication state and job storage using localStorage.
// Used by both worker and employer pages for login/logout and job posting.
// =======================
const LS_AUTH = "microjobs_auth_clean"; // Key for storing auth info
const LS_JOBS = "microjobs_jobs_clean"; // Key for storing jobs array

// Retrieve authentication info from localStorage
const getAuth = () => {
  try { return JSON.parse(localStorage.getItem(LS_AUTH)) || { loggedIn: false }; }
  catch { return { loggedIn: false }; }
};
// Save authentication info to localStorage
const setAuth = (data) => localStorage.setItem(LS_AUTH, JSON.stringify(data));
// Log out user and update UI
const logout = () => { localStorage.removeItem(LS_AUTH); renderAuthUI(); };

// Determine current page role (worker, employer, or guest)
// Used to show/hide UI elements and for role-based logic
const currentRoleFromPage = () => {
  if (document.querySelector(".worker-page")) return "worker";
  if (document.querySelector(".employer-page")) return "employer";
  return "guest";
};

// =======================
// HEADER UI (login/logout)
// Handles showing/hiding login/register and logout buttons in the header.
// Also disables/enables buttons that require authentication.
// Linked with: getAuth, setAuth, logout, and modal logic below.
// =======================
const headerAuthBtn = document.querySelector(".header-auth-btn");
let headerLogoutBtn = document.getElementById("header-logout-btn");

// Create logout button if it doesn't exist, and add click handler
if (!headerLogoutBtn && headerAuthBtn) {
  headerLogoutBtn = document.createElement("button");
  headerLogoutBtn.id = "header-logout-btn";
  headerLogoutBtn.className = "header-auth-btn";
  headerLogoutBtn.style.display = "none";
  headerLogoutBtn.textContent = "Uitloggen";
  headerAuthBtn.insertAdjacentElement("afterend", headerLogoutBtn);
  headerLogoutBtn.addEventListener("click", (e) => { e.preventDefault(); logout(); });
}

// Update header UI and auth-required buttons based on login state
function renderAuthUI() {
  const auth = getAuth();
  const role = currentRoleFromPage();

  if (headerAuthBtn) {
    if (auth.loggedIn) {
      const first = auth.name ? auth.name.split(" ")[0] : "Account";
      headerAuthBtn.textContent = role === "employer" ? `${first} · Dashboard` : `${first} · Profiel`;
    } else {
      headerAuthBtn.textContent = "Inloggen / Registreren";
    }

    headerAuthBtn.onclick = (e) => {
      e.preventDefault();
      if (!getAuth().loggedIn) openAuthModal();
      else window.scrollTo({ top: 0, behavior: "smooth" });
    };
  }

  if (headerLogoutBtn) headerLogoutBtn.style.display = auth.loggedIn ? "inline-flex" : "none";

  // Disable/enable all buttons that require authentication
  document.querySelectorAll("[data-requires-auth]").forEach((btn) => {
    btn.onclick = (e) => {
      e.preventDefault();
      if (!getAuth().loggedIn) return openAuthModal();
      // default behavior per page handled elsewhere
    };
  });
}

// =======================
// AUTH MODAL
// Handles opening/closing the login/register modal and switching tabs.
// Also processes login/register form submissions.
// Linked with: renderAuthUI, setAuth, getAuth, and header buttons.
// =======================
const authOverlay = document.getElementById("auth-modal");
const authTabs = authOverlay?.querySelectorAll(".modal-tab") || [];
const authPanels = authOverlay?.querySelectorAll("[data-auth-panel]") || [];
const authCloseBtns = authOverlay?.querySelectorAll("[data-close-modal]") || [];

// Show/hide modal overlay
const openAuthModal = () => authOverlay?.classList.add("open");
const closeAuthModal = () => authOverlay?.classList.remove("open");

// Close modal on close button or overlay click
authCloseBtns.forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); closeAuthModal(); }));
authOverlay?.addEventListener("click", (e) => { if (e.target === authOverlay) closeAuthModal(); });

// Switch between login/register tabs
authTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.getAttribute("data-auth-tab");
    authTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    authPanels.forEach((p) => p.classList.toggle("hidden", p.getAttribute("data-auth-panel") !== target));
  });
});

// Helper to get input value by label text
function getInputValue(form, labelContains) {
  const label = Array.from(form.querySelectorAll("label")).find((l) =>
    l.textContent.toLowerCase().includes(labelContains.toLowerCase())
  );
  const input = label ? label.querySelector("input") : null;
  return input ? input.value.trim() : "";
}

// Handle login/register form submissions
authPanels.forEach((form) => {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const panel = form.getAttribute("data-auth-panel");
    if (panel === "login") {
      const email = getInputValue(form, "e-mail");
      const password = getInputValue(form, "wachtwoord");
      loginUser(email, password);
      closeAuthModal();
    } else if (panel === "register") {
      const name = getInputValue(form, "naam");
      const location = getInputValue(form, "buurt") || getInputValue(form, "locatie");
      const email = getInputValue(form, "e-mail");
      const password = getInputValue(form, "wachtwoord");
      registerUser(name, location, email, password);
      closeAuthModal();
    }
  });
});

// =======================
// FILTER CHIPS UI
// Handles toggling the active state of filter chips (for both worker and employer pages).
// Linked with: filter logic below (applyWorkerFilters, applyEmployerFilters)
// =======================
document.querySelectorAll("[data-chip]").forEach((chip) => {
  chip.addEventListener("click", () => chip.classList.toggle("active"));
});

// =======================
// WORKER FILTERS
// Handles filtering the job feed for workers based on search, location, skills, and quick filters.
// Linked with: job feed rendering, filter chips, and reset button.
// =======================
let applyWorkerFilters = null;

// Normalize 'wanneer' (when) text to a filter key
function normalizeWhenToKey(whenText) {
  const t = (whenText || "").toLowerCase();
  if (t.includes("vandaag") || t.includes("morgen")) return "today";
  if (t.includes("school")) return "after-school";
  if (t.includes("weekend")) return "weekend";
  return "any";
}

// Initialize worker filters only on worker page
(function initWorkerFilters() {
  const page = document.querySelector(".worker-page");
  if (!page) return;

  // Get filter input/select elements
  const searchInput = document.getElementById("job-search");
  const locationSelect = document.getElementById("job-location");
  const skillSelect = document.getElementById("job-skill");
  const quickChips = page.querySelectorAll("[data-quick]");

  // Main filter function for jobs (called on input/change)
  applyWorkerFilters = () => {
    const cards = page.querySelectorAll(".feed-card");
    const searchTerm = (searchInput?.value || "").toLowerCase().trim();
    const selectedLocation = (locationSelect?.value || "Alle buurten").toLowerCase();
    const selectedSkill = (skillSelect?.value || "Alles").toLowerCase();

    const activeQuick = Array.from(quickChips)
      .filter((c) => c.classList.contains("active"))
      .map((c) => c.getAttribute("data-quick"));

    cards.forEach((card) => {
      let visible = true;

      const loc = (card.dataset.location || "").toLowerCase();
      const skills = (card.dataset.skills || "").toLowerCase();
      const when = card.dataset.when || "any";
      const pay = parseFloat(card.dataset.pay || "0");
      const allText = card.innerText.toLowerCase();

      if (selectedLocation !== "alle buurten" && loc !== selectedLocation) visible = false;
      if (visible && selectedSkill !== "alles" && !skills.includes(selectedSkill)) visible = false;
      if (visible && searchTerm && !allText.includes(searchTerm)) visible = false;

      if (visible && activeQuick.length > 0) {
        if (activeQuick.includes("today") && when !== "today") visible = false;
        if (visible && activeQuick.includes("after-school") && when !== "after-school") visible = false;
        if (visible && activeQuick.includes("pay-50") && !(pay >= 50)) visible = false;
      }

      card.style.display = visible ? "" : "none";
    });
  };

  // Attach filter events
  searchInput?.addEventListener("input", applyWorkerFilters);
  locationSelect?.addEventListener("change", applyWorkerFilters);
  skillSelect?.addEventListener("change", applyWorkerFilters);
  quickChips.forEach((chip) => chip.addEventListener("click", applyWorkerFilters));

  // Initial filter on page load
  applyWorkerFilters();
})();

// =======================
// EMPLOYER FILTERS
// Handles filtering the worker profiles for employers based on search, location, and rating.
// Linked with: employer profile grid, filter chips, and reset button.
// =======================
let applyEmployerFilters = null;

// Initialize employer filters only on employer page
(function initEmployerFilters() {
  const page = document.querySelector(".employer-page");
  if (!page) return;

  // Get filter input/select elements
  const searchInput = document.getElementById("worker-search");
  const locationSelect = document.getElementById("worker-location");
  const ratingSelect = document.getElementById("worker-rating");
  const profileCards = page.querySelectorAll(".profile-card");

  // Helper to get minimum rating value
  function ratingThreshold(value) {
    switch (value) {
      case "4★ en hoger": return 4;
      case "4.5★ en hoger": return 4.5;
      case "5★": return 4.95;
      default: return 0;
    }
  }

  // Main filter function for profiles (called on input/change)
  applyEmployerFilters = () => {
    const searchTerm = (searchInput?.value || "").toLowerCase().trim();
    const selectedLocation = (locationSelect?.value || "Alle buurten").toLowerCase();
    const minRating = ratingThreshold(ratingSelect?.value || "Alle ratings");

    profileCards.forEach((card) => {
      let visible = true;
      const location = (card.dataset.location || "").toLowerCase();
      const rating = parseFloat(card.dataset.rating || "0");
      const name = (card.dataset.name || "").toLowerCase();
      const skills = (card.dataset.skills || "").toLowerCase();
      const allText = card.innerText.toLowerCase();

      if (selectedLocation !== "alle buurten" && !location.includes(selectedLocation)) visible = false;
      if (visible && minRating > 0 && rating < minRating) visible = false;
      if (visible && searchTerm && !name.includes(searchTerm) && !skills.includes(searchTerm) && !allText.includes(searchTerm)) {
        visible = false;
      }

      card.style.display = visible ? "" : "none";
    });
  };

  // Attach filter events
  searchInput?.addEventListener("input", applyEmployerFilters);
  locationSelect?.addEventListener("change", applyEmployerFilters);
  ratingSelect?.addEventListener("change", applyEmployerFilters);

  // Initial filter on page load
  applyEmployerFilters();
})();

// =======================
// RESET BUTTONS
// Handles clearing all filters for both worker and employer pages.
// Linked with: filter logic and UI inputs.
// =======================
document.getElementById("clear-filters")?.addEventListener("click", () => {
  // Reset worker filters
  const s = document.getElementById("job-search");
  const l = document.getElementById("job-location");
  const k = document.getElementById("job-skill");
  const quick = document.querySelectorAll(".worker-page [data-quick]");
  if (s) s.value = "";
  if (l) l.value = "Alle buurten";
  if (k) k.value = "Alles";
  quick.forEach((c) => c.classList.remove("active"));
  applyWorkerFilters?.();
});

document.getElementById("clear-filters-employer")?.addEventListener("click", () => {
  // Reset employer filters
  const s = document.getElementById("worker-search");
  const l = document.getElementById("worker-location");
  const r = document.getElementById("worker-rating");
  if (s) s.value = "";
  if (l) l.value = "Alle buurten";
  if (r) r.value = "Alle ratings";
  applyEmployerFilters?.();
});

// =======================
// JOBS (Employer -> Worker feed)
// Handles storing, retrieving, and rendering jobs posted by employers to the worker feed.
// Linked with: job modal (posting), worker feed, and filters.
// =======================
// Retrieve jobs array from localStorage
const getJobs = () => {
  try { return JSON.parse(localStorage.getItem(LS_JOBS)) || []; }
  catch { return []; }
};
// Save jobs array to localStorage
const saveJobs = (jobs) => localStorage.setItem(LS_JOBS, JSON.stringify(jobs));

// Render jobs to the worker feed (dynamic jobs section)
function renderJobsToWorkerFeed() {
  const container = document.getElementById("dynamic-jobs");
  if (!container) return;

  // Sort jobs by creation date (newest first)
  const jobs = getJobs().slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  container.innerHTML = "";

  const emptyState = document.getElementById("worker-empty-state");
  if (emptyState) emptyState.style.display = jobs.length ? "none" : "";

  // Render each job as a card in the feed
  jobs.forEach((job) => {
    const skillsCsv = job.skills.join(",");
    const whenKey = normalizeWhenToKey(job.when);

    const el = document.createElement("article");
    el.className = "feed-card";
    el.dataset.location = job.location;
    el.dataset.skills = skillsCsv;
    el.dataset.when = whenKey;
    el.dataset.pay = String(job.pay);

    el.innerHTML = `
      <div class="feed-image"></div>
      <div class="feed-content">
        <div class="feed-title">${job.title}</div>
        <div class="feed-meta">${job.location} · ${job.when} · Geplaatst door: ${job.postedBy}</div>
        <div class="feed-tags">
          ${job.skills.slice(0, 4).map(s => `<span class="tag-pill green">${s}</span>`).join("")}
        </div>
        <div class="feed-pay">Vergoeding: SRD ${job.pay}</div>
        <p class="job-desc">${job.desc}</p>
        <div class="feed-actions">
          <button class="btn-outline" data-requires-auth>Reageer</button>
          <button class="btn-ghost">Opslaan</button>
        </div>
      </div>
    `;

    container.appendChild(el);
  });

  // Re-bind auth protection and re-apply filters after rendering
  renderAuthUI();
  applyWorkerFilters?.();
}

// =======================
// JOB MODAL (Employer)
// Handles opening/closing the job posting modal and submitting new jobs.
// Linked with: getAuth, saveJobs, renderJobsToWorkerFeed, and UI elements in employer.html.
// =======================
const jobModal = document.getElementById("job-modal");
const openJobBtn = document.getElementById("open-job-modal");
const closeJobBtn = jobModal?.querySelector("[data-close-job-modal]");
const jobForm = document.getElementById("job-form");

// Show/hide job modal
const openJobModal = () => jobModal?.classList.add("open");
const closeJobModal = () => jobModal?.classList.remove("open");

// Open job modal on button click (if present)
if (openJobBtn) {
  openJobBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (!getAuth().loggedIn) return openAuthModal();
    openJobModal();
  });
}

// Close job modal on close button or overlay click
closeJobBtn?.addEventListener("click", (e) => { e.preventDefault(); closeJobModal(); });
jobModal?.addEventListener("click", (e) => { if (e.target === jobModal) closeJobModal(); });

// Handle job form submission (save job to localStorage and update feed)
jobForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const auth = getAuth();
  if (!auth.loggedIn) return openAuthModal();

  // Get job details from form inputs
  const title = document.getElementById("job-title")?.value.trim();
  const location = document.getElementById("job-location")?.value.trim();
  const skillsRaw = document.getElementById("job-skills")?.value.trim();
  const when = document.getElementById("job-when")?.value.trim();
  const pay = parseFloat(document.getElementById("job-pay")?.value || "0");
  const desc = document.getElementById("job-desc")?.value.trim();

  if (!title || !location || !skillsRaw || !when || !desc) {
    alert("Vul alles in a.u.b.");
    return;
  }

  const skills = skillsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const jobs = getJobs();
  jobs.unshift({
    id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
    title,
    location,
    skills,
    when,
    pay: isNaN(pay) ? 0 : pay,
    desc,
    createdAt: new Date().toISOString(),
    postedBy: auth.name || "Werkgever",
  });

  saveJobs(jobs);

  jobForm.reset();
  closeJobModal();

  alert("✅ Job geplaatst! Werknemers zien ’m meteen in hun feed.");
});

// Render jobs in worker feed on page load
renderJobsToWorkerFeed();

// Render auth UI on page load
renderAuthUI();
