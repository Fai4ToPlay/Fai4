const STORAGE_KEY = "fz214_cases_v1";

const problemInput = document.getElementById("problemInput");
const searchInput = document.getElementById("searchInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const clearBtn = document.getElementById("clearBtn");
const casesContainer = document.getElementById("cases");
const dialog = document.getElementById("resultDialog");
const resultBody = document.getElementById("resultBody");
const saveCaseBtn = document.getElementById("saveCaseBtn");
const closeDialogBtn = document.getElementById("closeDialogBtn");
const downloadJsonBtn = document.getElementById("downloadJsonBtn");
const downloadTxtBtn = document.getElementById("downloadTxtBtn");

let cases = loadCases();
let pendingCase = null;

function now() {
  return new Date().toLocaleString("ru-RU");
}

function loadCases() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistCases() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
}

function classify(problemText) {
  const text = problemText.toLowerCase();

  const map = [
    {
      re: /(плесень|сырость|влажн|мокрое пятно)/,
      type: "Окна/влажность",
      classification: "Предварительно гарантийный",
      recommendation:
        "Проверить узел примыкания окна, герметизацию, тепловизор и вентиляцию. Зафиксировать актом осмотра.",
    },
    {
      re: /(трещин|шов|фасад)/,
      type: "Трещины/фасад",
      classification: "Требует обследования",
      recommendation:
        "Уточнить динамику трещины, выполнить маячки/замеры, проверить конструктив и акт скрытых работ.",
    },
    {
      re: /(теч|протеч|стояк|кровл)/,
      type: "Протечки",
      classification: "Предварительно гарантийный",
      recommendation:
        "Локализовать источник протечки, составить акт, проверить инженерные сети и смежные помещения.",
    },
    {
      re: /(вентиляц|тяга)/,
      type: "Вентиляция",
      classification: "Недостаточно данных",
      recommendation:
        "Сделать замер тяги и притока воздуха, проверить вмешательства после ремонта, оформить акт.",
    },
  ];

  const found = map.find((item) => item.re.test(text));
  const base = found || {
    type: "Общий дефект",
    classification: "Недостаточно данных",
    recommendation:
      "Нужен акт осмотра, фотофиксация, сведения о вмешательствах собственника и сроках передачи/обращения.",
  };

  const ownerRisk = /(ремонт|перенос|сверлен|замен|переплан)/.test(text) ? 45 : 20;
  const warrantyProbability = base.classification.includes("гарантийный") ? 75 : 45;

  return {
    ...base,
    warrantyProbability,
    ownerRisk,
  };
}

function renderCases() {
  const q = searchInput.value.trim().toLowerCase();
  const filtered = cases.filter(
    (c) =>
      !q ||
      c.problem.toLowerCase().includes(q) ||
      c.solution.type.toLowerCase().includes(q) ||
      c.solution.classification.toLowerCase().includes(q),
  );

  if (!filtered.length) {
    casesContainer.innerHTML = "<p>Кейсов пока нет.</p>";
    return;
  }

  casesContainer.innerHTML = filtered
    .map(
      (c) => `
      <div class="case">
        <div class="meta">${c.createdAt}</div>
        <strong>Проблема:</strong> ${c.problem}<br/>
        <strong>Категория:</strong> ${c.solution.type}<br/>
        <strong>Статус:</strong> ${c.solution.classification}<br/>
        <strong>Вероятность гарантии:</strong> ${c.solution.warrantyProbability}%<br/>
        <strong>Риск ошибки/вмешательства собственника:</strong> ${c.solution.ownerRisk}%<br/>
        <strong>Решение:</strong> ${c.solution.recommendation}
      </div>
    `,
    )
    .join("");
}

function openResultWindow(problemText, solution) {
  const output = [
    `Проблема: ${problemText}`,
    `Категория: ${solution.type}`,
    `Классификация: ${solution.classification}`,
    `Вероятность гарантии: ${solution.warrantyProbability}%`,
    `Риск ошибки/вмешательства собственника: ${solution.ownerRisk}%`,
    `Рекомендация: ${solution.recommendation}`,
  ].join("\n");

  resultBody.innerHTML = `<pre>${output}</pre>`;
  dialog.showModal();
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

analyzeBtn.addEventListener("click", () => {
  const text = problemInput.value.trim();
  if (!text) return;

  const solution = classify(text);
  pendingCase = {
    id: crypto.randomUUID(),
    problem: text,
    solution,
    createdAt: now(),
  };

  openResultWindow(text, solution);
});

saveCaseBtn.addEventListener("click", () => {
  if (!pendingCase) return;
  cases.unshift(pendingCase);
  persistCases();
  renderCases();
  pendingCase = null;
  dialog.close();
  problemInput.value = "";
});

closeDialogBtn.addEventListener("click", () => {
  dialog.close();
});

searchInput.addEventListener("input", renderCases);

clearBtn.addEventListener("click", () => {
  cases = [];
  persistCases();
  renderCases();
});

downloadJsonBtn.addEventListener("click", () => {
  downloadFile("fz214-cases.json", JSON.stringify(cases, null, 2), "application/json");
});

downloadTxtBtn.addEventListener("click", () => {
  const text = cases
    .map(
      (c, i) =>
        `#${i + 1}\nДата: ${c.createdAt}\nПроблема: ${c.problem}\nКатегория: ${c.solution.type}\nСтатус: ${c.solution.classification}\nВероятность гарантии: ${c.solution.warrantyProbability}%\nРиск собственника: ${c.solution.ownerRisk}%\nРешение: ${c.solution.recommendation}\n`,
    )
    .join("\n");
  downloadFile("fz214-cases.txt", text, "text/plain");
});

renderCases();
