// ===== DOM refs =====
const form       = document.getElementById("form");
const text       = document.getElementById("text");
const amount     = document.getElementById("amount");
const category   = document.getElementById("category");
const dateEl     = document.getElementById("date");

const list       = document.getElementById("list");
const balanceEl  = document.getElementById("balance");
const incomeEl   = document.getElementById("income");
const expenseEl  = document.getElementById("expense");

// ===== State =====
let transactions = JSON.parse(localStorage.getItem("transactions") || "[]");
let editingId = null;

// ===== Utils =====
const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const todayISO = () => new Date().toISOString().split("T")[0];

function save() {
  localStorage.setItem("transactions", JSON.stringify(transactions));
}

function formatDate(d) {
  try { return new Date(d).toLocaleDateString(); } catch { return d; }
}

// ===== Summary (totals) =====
function updateSummary(source = transactions) {
  const nums = source.map(t => t.amount);
  const total = nums.reduce((a, v) => a + v, 0);
  const inc   = nums.filter(v => v > 0).reduce((a, v) => a + v, 0);
  const exp   = -nums.filter(v => v < 0).reduce((a, v) => a + v, 0);

  balanceEl.textContent = INR.format(total);
  incomeEl.textContent  = INR.format(inc);
  expenseEl.textContent = INR.format(exp);
}

// ===== Render one item safely =====
function renderTransaction(tx) {
  const li = document.createElement("li");
  li.className = tx.amount < 0 ? "minus" : "plus";
  li.dataset.id = String(tx.id);

  const left = document.createElement("div");
  left.innerHTML = `<strong>${tx.text}</strong><br><small>${tx.category} | ${formatDate(tx.date)}</small>`;

  const right = document.createElement("div");
  const sign = tx.amount < 0 ? "-" : "+";
  const val = document.createElement("span");
  val.textContent = `${sign}${INR.format(Math.abs(tx.amount))}`;

  const editBtn = document.createElement("button");
  editBtn.className = "edit";
  editBtn.dataset.id = String(tx.id);
  editBtn.textContent = "✎";
  editBtn.setAttribute("aria-label", "Edit transaction");

  const delBtn = document.createElement("button");
  delBtn.className = "delete";
  delBtn.dataset.id = String(tx.id);
  delBtn.textContent = "×";
  delBtn.setAttribute("aria-label", "Delete transaction");

  right.append(val, editBtn, delBtn);
  li.append(left, right);
  list.appendChild(li);
}

// ===== Render all (newest first) =====
function renderAll() {
  list.innerHTML = "";
  [...transactions]
    .sort((a,b) => new Date(b.date) - new Date(a.date))
    .forEach(renderTransaction);

  updateSummary();
  updateChart();
}

// ===== CRUD via form =====
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const desc = text.value.trim();
  const amt  = Number(amount.value);
  const cat  = category.value;
  const dt   = dateEl.value;

  // basic validation (believable UX)
  if (!desc || !cat || !dt || !amt || isNaN(amt)) return;
  if (dt > todayISO()) return;  // no future date

  const payload = { id: editingId ?? Date.now(), text: desc, amount: amt, category: cat, date: dt };

  if (editingId) {
    transactions = transactions.map(t => t.id === editingId ? payload : t);
    editingId = null;
  } else {
    transactions.push(payload);
  }

  save();
  renderAll();
  form.reset();
  dateEl.value = todayISO();
});

// ===== List actions (event delegation) =====
list.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const id = Number(btn.dataset.id);
  if (btn.classList.contains("delete")) {
    transactions = transactions.filter(t => t.id !== id);
    save(); renderAll();
  }
  if (btn.classList.contains("edit")) {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    text.value = tx.text;
    amount.value = tx.amount;
    category.value = tx.category;
    dateEl.value = tx.date;
    editingId = id;
  }
});

// ===== Chart.js (expenses by category) =====
let chart;
function updateChart() {
  const byCat = transactions
    .filter(t => t.amount < 0)
    .reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount); return acc; }, {});

  const labels = Object.keys(byCat);
  const data = Object.values(byCat);

  const ctx = document.getElementById("chart");
  if (!ctx) return;
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "pie",
    data: { labels, datasets: [{ data }] },
    options: { plugins: { legend: { position: "bottom" } } }
  });
}

// ===== Init =====
(function init(){
  dateEl.max = todayISO();
  if (!dateEl.value) dateEl.value = todayISO();
  renderAll();
})();
