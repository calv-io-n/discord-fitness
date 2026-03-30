const app = document.getElementById("app");
const navBtns = document.querySelectorAll(".nav-btn");

let currentView = "overview";
let chartInstances = [];

navBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    navBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentView = btn.dataset.view;
    render();
  });
});

async function api(path) {
  const res = await fetch(`/api${path}`);
  return res.json();
}

function destroyCharts() {
  chartInstances.forEach((c) => c.destroy());
  chartInstances = [];
}

function createChart(canvas, config) {
  const chart = new Chart(canvas, config);
  chartInstances.push(chart);
  return chart;
}

// --- Overview ---
async function renderOverview() {
  const [today, targets] = await Promise.all([api("/today"), api("/targets")]);

  const totalCalories = (today.nutrition || []).reduce((sum, e) => sum + e.calories, 0);
  const totalProtein = (today.nutrition || []).reduce((sum, e) => sum + e.protein_g, 0);
  const totalCarbs = (today.nutrition || []).reduce((sum, e) => sum + e.carbs_g, 0);
  const totalFat = (today.nutrition || []).reduce((sum, e) => sum + e.fat_g, 0);
  const totalSteps = (today.steps || []).reduce((sum, e) => sum + e.steps, 0);
  const latestWeight = (today.weight || []).slice(-1)[0];
  const latestSleep = (today.sleep || []).slice(-1)[0];

  const cards = [
    { label: "Calories", value: totalCalories, target: targets.nutrition?.calories, unit: "kcal" },
    { label: "Protein", value: totalProtein, target: targets.nutrition?.protein_g, unit: "g" },
    { label: "Carbs", value: totalCarbs, target: targets.nutrition?.carbs_g, unit: "g" },
    { label: "Fat", value: totalFat, target: targets.nutrition?.fat_g, unit: "g" },
    { label: "Steps", value: totalSteps, target: targets.steps?.daily, unit: "" },
    { label: "Weight", value: latestWeight?.weight || "—", target: targets.weight?.target, unit: targets.weight?.unit || "lb" },
    { label: "Sleep", value: latestSleep?.duration_hr || "—", target: targets.sleep?.hours, unit: "hrs" },
  ];

  app.innerHTML = `
    <h2>Today</h2>
    <div class="cards">
      ${cards.map((c) => {
        const pct = c.target && typeof c.value === "number" ? Math.min((c.value / c.target) * 100, 150) : 0;
        const over = pct > 105 && (c.label === "Calories" || c.label === "Fat");
        return `
          <div class="card">
            <h3>${c.label}</h3>
            <div class="value">${c.value} <small>${c.unit}</small></div>
            ${c.target ? `<div class="target">Target: ${c.target} ${c.unit}</div>
            <div class="progress-bar"><div class="fill ${over ? "over" : ""}" style="width:${Math.min(pct, 100)}%"></div></div>` : ""}
          </div>`;
      }).join("")}
    </div>
  `;
}

// --- Trends ---
async function renderTrends() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const [weight, nutrition, steps, sleep] = await Promise.all([
    api(`/weight/${year}/${month}`),
    api(`/nutrition/${year}/${month}`),
    api(`/steps/${year}/${month}`),
    api(`/sleep/${year}/${month}`),
  ]);

  app.innerHTML = `
    <h2>Trends</h2>
    <div class="chart-container"><h3>Weight</h3><canvas id="weightChart"></canvas></div>
    <div class="chart-container"><h3>Daily Calories</h3><canvas id="calorieChart"></canvas></div>
    <div class="chart-container"><h3>Daily Steps</h3><canvas id="stepsChart"></canvas></div>
    <div class="chart-container"><h3>Sleep Duration</h3><canvas id="sleepChart"></canvas></div>
  `;

  const chartDefaults = { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: "#888" } }, y: { ticks: { color: "#888" } } } };

  if (weight.entries.length) {
    createChart(document.getElementById("weightChart"), {
      type: "line",
      data: { labels: weight.entries.map((e) => e.date), datasets: [{ data: weight.entries.map((e) => e.weight), borderColor: "#4aba70", tension: 0.3 }] },
      options: chartDefaults,
    });
  }

  // Aggregate nutrition per day
  const calByDay = {};
  (nutrition.entries || []).forEach((e) => { calByDay[e.date] = (calByDay[e.date] || 0) + e.calories; });
  const calDays = Object.keys(calByDay).sort();
  if (calDays.length) {
    createChart(document.getElementById("calorieChart"), {
      type: "bar",
      data: { labels: calDays, datasets: [{ data: calDays.map((d) => calByDay[d]), backgroundColor: "#3498db" }] },
      options: chartDefaults,
    });
  }

  if (steps.entries.length) {
    createChart(document.getElementById("stepsChart"), {
      type: "bar",
      data: { labels: steps.entries.map((e) => e.date), datasets: [{ data: steps.entries.map((e) => e.steps), backgroundColor: "#e67e22" }] },
      options: chartDefaults,
    });
  }

  if (sleep.entries.length) {
    createChart(document.getElementById("sleepChart"), {
      type: "line",
      data: { labels: sleep.entries.map((e) => e.date), datasets: [{ data: sleep.entries.map((e) => e.duration_hr), borderColor: "#9b59b6", tension: 0.3 }] },
      options: chartDefaults,
    });
  }
}

// --- Adherence ---
async function renderAdherence() {
  const targets = await api("/targets");
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const [nutrition, steps, sleep] = await Promise.all([
    api(`/nutrition/${year}/${month}`),
    api(`/steps/${year}/${month}`),
    api(`/sleep/${year}/${month}`),
  ]);

  // Protein adherence per day
  const proteinByDay = {};
  (nutrition.entries || []).forEach((e) => { proteinByDay[e.date] = (proteinByDay[e.date] || 0) + e.protein_g; });

  const stepsByDay = {};
  (steps.entries || []).forEach((e) => { stepsByDay[e.date] = (stepsByDay[e.date] || 0) + e.steps; });

  const sleepByDay = {};
  (sleep.entries || []).forEach((e) => { sleepByDay[e.date] = e.duration_hr; });

  const daysInMonth = new Date(year, now.getMonth() + 1, 0).getDate();

  function heatmapHTML(data, target, label) {
    let cells = "";
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${month}-${String(d).padStart(2, "0")}`;
      const val = data[dateStr];
      const cls = val === undefined ? "empty" : val >= target ? "hit" : "miss";
      cells += `<div class="heatmap-cell ${cls}" title="${dateStr}: ${val ?? '—'}">${d}</div>`;
    }
    return `<div class="chart-container"><h3>${label} (target: ${target})</h3><div class="heatmap">${cells}</div></div>`;
  }

  app.innerHTML = `
    <h2>Adherence — ${year}-${month}</h2>
    ${heatmapHTML(proteinByDay, targets.nutrition?.protein_g || 180, "Protein (g)")}
    ${heatmapHTML(stepsByDay, targets.steps?.daily || 10000, "Steps")}
    ${heatmapHTML(sleepByDay, targets.sleep?.hours || 7.5, "Sleep (hrs)")}
  `;
}

// --- Nutrition (macro breakdown + calorie tracking) ---
async function renderNutrition() {
  const targets = await api("/targets");
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const today = now.toISOString().slice(0, 10);

  const nutrition = await api(`/nutrition/${year}/${month}`);
  const entries = nutrition.entries || [];

  // Today's macros
  const todayEntries = entries.filter((e) => e.date === today);
  const todayProtein = todayEntries.reduce((s, e) => s + e.protein_g, 0);
  const todayCarbs = todayEntries.reduce((s, e) => s + e.carbs_g, 0);
  const todayFat = todayEntries.reduce((s, e) => s + e.fat_g, 0);
  const todayCalories = todayEntries.reduce((s, e) => s + e.calories, 0);

  // Weekly calories
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEntries = entries.filter((e) => e.date >= weekStartStr && e.date <= today);
  const weekCalories = weekEntries.reduce((s, e) => s + e.calories, 0);
  const weeklyTarget = (targets.nutrition?.calories || 2500) * 7;

  // Daily calories over the month
  const calByDay = {};
  entries.forEach((e) => { calByDay[e.date] = (calByDay[e.date] || 0) + e.calories; });
  const calDays = Object.keys(calByDay).sort();

  app.innerHTML = `
    <h2>Nutrition</h2>
    <div class="cards">
      <div class="card"><h3>Today's Calories</h3><div class="value">${todayCalories} <small>/ ${targets.nutrition?.calories || "—"}</small></div></div>
      <div class="card"><h3>Week Calories</h3><div class="value">${weekCalories} <small>/ ${weeklyTarget}</small></div></div>
    </div>
    <div class="chart-container"><h3>Macro Breakdown (Today)</h3><canvas id="macroChart"></canvas></div>
    <div class="chart-container"><h3>Daily Calories vs Target</h3><canvas id="dailyCalChart"></canvas></div>
  `;

  if (todayProtein || todayCarbs || todayFat) {
    createChart(document.getElementById("macroChart"), {
      type: "doughnut",
      data: {
        labels: ["Protein", "Carbs", "Fat"],
        datasets: [{ data: [todayProtein, todayCarbs, todayFat], backgroundColor: ["#e74c3c", "#3498db", "#f1c40f"] }],
      },
      options: { responsive: true, plugins: { legend: { labels: { color: "#ccc" } } } },
    });
  }

  if (calDays.length) {
    const dailyTarget = targets.nutrition?.calories || 2500;
    createChart(document.getElementById("dailyCalChart"), {
      type: "bar",
      data: {
        labels: calDays,
        datasets: [
          { label: "Calories", data: calDays.map((d) => calByDay[d]), backgroundColor: "#3498db" },
          { label: "Target", data: calDays.map(() => dailyTarget), type: "line", borderColor: "#e74c3c", borderDash: [5, 5], pointRadius: 0, fill: false },
        ],
      },
      options: { responsive: true, plugins: { legend: { labels: { color: "#ccc" } } }, scales: { x: { ticks: { color: "#888" } }, y: { ticks: { color: "#888" } } } },
    });
  }
}

// --- Domain Detail ---
async function renderDomain() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  app.innerHTML = `
    <h2>Domain Detail</h2>
    <select class="domain-select" id="domainPicker">
      <option value="strength">Strength</option>
      <option value="cardio">Cardio</option>
      <option value="steps">Steps</option>
      <option value="nutrition">Nutrition</option>
      <option value="sleep">Sleep</option>
      <option value="weight">Weight</option>
    </select>
    <div id="domainContent"></div>
  `;

  const picker = document.getElementById("domainPicker");
  picker.addEventListener("change", () => loadDomain(picker.value, year, month));
  loadDomain("strength", year, month);
}

async function loadDomain(domain, year, month) {
  const data = await api(`/${domain}/${year}/${String(month).padStart(2, "0")}`);
  const container = document.getElementById("domainContent");
  const entries = data.entries || [];

  if (!entries.length) {
    container.innerHTML = `<div class="card">No data for this month.</div>`;
    return;
  }

  const keys = Object.keys(entries[0]).filter((k) => k !== "date" && k !== "notes");
  const tableRows = entries.map((e) => `<tr>${["date", ...keys, "notes"].map((k) => `<td>${e[k] ?? ""}</td>`).join("")}</tr>`).join("");

  container.innerHTML = `
    <div class="chart-container">
      <table style="width:100%;border-collapse:collapse;font-size:0.875rem;">
        <thead><tr>${["date", ...keys, "notes"].map((k) => `<th style="text-align:left;padding:0.5rem;border-bottom:1px solid #333;color:#888;">${k}</th>`).join("")}</tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
  `;
}

// --- Router ---
async function render() {
  destroyCharts();
  switch (currentView) {
    case "overview": return renderOverview();
    case "trends": return renderTrends();
    case "adherence": return renderAdherence();
    case "nutrition": return renderNutrition();
    case "domain": return renderDomain();
  }
}

render();
