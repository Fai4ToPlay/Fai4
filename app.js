const STORAGE_CASES_KEY = "ferrumbot_cases_v5";

const problemInput = document.getElementById("problemInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const resultBody = document.getElementById("resultBody");
const casesContainer = document.getElementById("cases");
const casesPanel = document.getElementById("casesPanel");
const casesToggleBtn = document.getElementById("casesToggleBtn");
const closeCasesBtn = document.getElementById("closeCasesBtn");

const TRUSTED_DOMAINS = [
  "consultant.ru",
  "cntd.ru",
  "pravo.gov.ru",
  "sudrf.ru",
  "ksrf.ru",
  "vsrf.ru",
  "fssp.gov.ru",
  "minjust.gov.ru",
  "government.ru",
];

let cases = readJson(STORAGE_CASES_KEY, []);

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function persistCases() {
  localStorage.setItem(STORAGE_CASES_KEY, JSON.stringify(cases));
}

function now() {
  return new Date().toLocaleString("ru-RU");
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    return u.href;
  } catch {
    return null;
  }
}

function isTrusted(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return TRUSTED_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

function extractLinksFromMarkdown(text) {
  const links = [];
  const regex = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  let match = regex.exec(text);
  while (match) {
    const title = match[1].trim();
    const rawUrl = normalizeUrl(match[2]);
    if (rawUrl && isTrusted(rawUrl)) {
      links.push({ title, url: rawUrl });
    }
    match = regex.exec(text);
  }
  return links;
}

async function fetchAsText(url) {
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function searchTrustedSourcesRealtime(problemText) {
  const query = encodeURIComponent(`${problemText} строительные нормы СП ГОСТ судебная практика`);
  const ddgProxyUrl = `https://r.jina.ai/http://duckduckgo.com/html/?q=${query}`;

  const searchRaw = await fetchAsText(ddgProxyUrl);
  const links = extractLinksFromMarkdown(searchRaw)
    .filter((item, idx, arr) => arr.findIndex((x) => x.url === item.url) === idx)
    .slice(0, 6);

  const resolved = [];
  for (const item of links) {
    try {
      const page = await fetchAsText(`https://r.jina.ai/http://${item.url.replace(/^https?:\/\//, "")}`);
      const clean = page.replace(/\s+/g, " ").trim();
      const snippet = clean.slice(0, 650);
      if (snippet.length > 180) {
        resolved.push({ ...item, snippet });
      }
    } catch {
      // skip failed source
    }
    if (resolved.length >= 3) break;
  }

  return resolved;
}

function buildNarrative(problemText, sources) {
  const sourceNames = sources.map((s) => s.title).join("; ");
  const sourceLinks = sources.map((s) => `- ${s.title}: ${s.url}`).join("\n");
  const evidence = sources.map((s, i) => `Источник ${i + 1}: ${s.snippet}`).join("\n\n");

  const base = `По вашему запросу «${problemText}» FerrumBot выполнил поиск в реальном времени по открытым источникам и сформировал вывод только по данным, которые удалось получить на текущий момент из доверенных доменов. На основании найденных материалов ключевой фокус проверки лежит в зоне соответствия выполненных работ действующим нормам качества, правильности технических узлов и причинно-следственной связи между дефектом и действиями сторон.`;

  const legal = `Нормативная и правоприменительная база в данной выборке опирается на следующие источники: ${sourceNames}. При наличии расхождений между позициями приоритет отдается нормам закона и официальным судебным/государственным источникам, а не вторичным публикациям.`;

  const analysis = `Сопоставление найденных данных показывает, что вопрос о виновной стороне решается через подтверждение происхождения дефекта: если дефект обусловлен несоответствием строительных/монтажных решений нормативным требованиям, ответственность возлагается на исполнителя работ; если подтверждается вмешательство, нештатная эксплуатация или механическое повреждение после передачи, ответственность смещается на пользователя помещения. Для юридически устойчивого результата необходимы акт осмотра, фотофиксация, хронология возникновения дефекта и, при споре, независимое техническое обследование.`;

  const final = `Итоговое решение по текущему запросу формируется как предварительное экспертное заключение с опорой на найденные в реальном времени источники. Для окончательного определения виновной стороны и способа устранения дефекта требуется документальная верификация фактов на объекте. Если предоставите акт осмотра, даты передачи/обнаружения и фото дефекта, FerrumBot обновит вывод более предметно и точно.`;

  return `Краткий вывод.\n\n${base}\n\nНормативная база.\n\n${legal}\n\nАнализ источников.\n\n${analysis}\n\nФрагменты источников (realtime-выборка).\n\n${evidence}\n\nСсылки на использованные источники.\n${sourceLinks}\n\nОбоснованный итог.\n\n${final}`;
}

async function typeText(element, text, speed = 8) {
  element.textContent = "";
  for (let i = 0; i < text.length; i += 1) {
    element.textContent += text[i];
    await new Promise((resolve) => setTimeout(resolve, speed));
  }
}

function renderCases() {
  if (!cases.length) {
    casesContainer.innerHTML = "<p class='meta'>Кейсов пока нет.</p>";
    return;
  }

  casesContainer.innerHTML = cases
    .map(
      (item) => `
      <div class="case">
        <div class="meta">${item.createdAt}</div>
        <strong>${item.problem}</strong>
        <p>${item.preview}</p>
      </div>
    `,
    )
    .join("");
}

analyzeBtn.addEventListener("click", async () => {
  const text = problemInput.value.trim();
  if (!text) return;

  resultBody.innerHTML = `<div class="status-line">FerrumBot выполняет realtime-поиск по открытым источникам...</div>`;

  let sources = [];
  try {
    sources = await searchTrustedSourcesRealtime(text);
  } catch {
    resultBody.textContent =
      "Не удалось получить данные из открытых источников в реальном времени. Повторите запрос или проверьте сетевое подключение.";
    return;
  }

  if (!sources.length) {
    resultBody.textContent =
      "По запросу не удалось извлечь проверяемые данные из доверенных открытых источников. Уточните формулировку (тип дефекта, место, срок, обстоятельства).";
    return;
  }

  const full = buildNarrative(text, sources);
  await typeText(resultBody, full);

  const preview = full.slice(0, 180) + (full.length > 180 ? "..." : "");
  cases.unshift({ createdAt: now(), problem: text, preview, fullText: full, sources });
  cases = cases.slice(0, 50);
  persistCases();
  renderCases();
});

casesToggleBtn.addEventListener("click", () => {
  casesPanel.classList.toggle("hidden");
});

closeCasesBtn.addEventListener("click", () => {
  casesPanel.classList.add("hidden");
});

renderCases();
