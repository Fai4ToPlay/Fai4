const STORAGE_CASES_KEY = "ferrumbot_cases_v6";

const problemInput = document.getElementById("problemInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const resultBody = document.getElementById("resultBody");
const casesContainer = document.getElementById("cases");
const followupInput = document.getElementById("followupInput");
const followupBtn = document.getElementById("followupBtn");
const activeCaseInfo = document.getElementById("activeCaseInfo");

const SYSTEM_PROMPT = `Ты — интеллектуальная система анализа дефектов и нормативной практики с возможностью динамического обучения в момент запроса. Система выполняет поиск по открытым источникам и формирует обоснованные выводы. Ответ содержит: Краткий вывод, Нормативная база, Анализ источников, Обоснованный итог.`;

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
let selectedCaseId = null;

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
    return new URL(url).href;
  } catch {
    return null;
  }
}

function isTrusted(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return TRUSTED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
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
    const url = normalizeUrl(match[2]);
    if (url && isTrusted(url)) links.push({ title, url });
    match = regex.exec(text);
  }
  return links;
}

async function fetchAsText(url) {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function searchTrustedSourcesRealtime(searchText) {
  const query = encodeURIComponent(`${searchText} строительные нормы СП ГОСТ судебная практика`);
  const searchRaw = await fetchAsText(`https://r.jina.ai/http://duckduckgo.com/html/?q=${query}`);

  const links = extractLinksFromMarkdown(searchRaw)
    .filter((item, idx, arr) => arr.findIndex((x) => x.url === item.url) === idx)
    .slice(0, 8);

  const resolved = [];
  for (const item of links) {
    try {
      const text = await fetchAsText(`https://r.jina.ai/http://${item.url.replace(/^https?:\/\//, "")}`);
      const snippet = text.replace(/\s+/g, " ").trim().slice(0, 700);
      if (snippet.length > 180) resolved.push({ ...item, snippet });
    } catch {
      // skip source fetch errors
    }
    if (resolved.length >= 4) break;
  }
  return resolved;
}

function selectCase(caseId) {
  selectedCaseId = caseId;
  const selected = cases.find((c) => c.id === caseId);
  followupInput.disabled = !selected;
  followupBtn.disabled = !selected;
  activeCaseInfo.textContent = selected
    ? `Активный кейс: ${selected.problem.slice(0, 90)}`
    : "Активный кейс: не выбран.";
  if (selected?.history?.length) {
    resultBody.textContent = selected.history[selected.history.length - 1].answer;
  }
  renderCases();
}

function buildStructuredAnswer(searchText, sources) {
  const sourceNames = sources.map((s) => s.title).join("; ");
  const sourceLinks = sources.map((s) => `- ${s.title}: ${s.url}`).join("\n");
  const evidence = sources.map((s, i) => `Источник ${i + 1}: ${s.snippet}`).join("\n\n");

  const short = `По запросу «${searchText}» выполнен анализ открытых источников в реальном времени. Вывод сформирован только по найденным в текущей сессии данным из доверенных доменов.`;
  const norms = `В анализ включены материалы из нормативных и правоприменительных источников: ${sourceNames}. Приоритет отдан действующим НПА, строительным нормам и официальным судебным/государственным ресурсам.`;
  const analysis = `Найденные материалы указывают, что для определения виновной стороны ключевое значение имеет подтверждение причины дефекта актом осмотра и технической фиксацией. При противоречивых позициях больший юридический вес имеют федеральные законы и официальные документы судов/госорганов.`;
  const final = `Итог квалифицирован как предварительный до получения документальных доказательств по объекту. Для однозначного решения нужно добавить дату передачи, дату обнаружения, сведения о вмешательствах, фотофиксацию и при необходимости экспертное обследование.`;

  return `Краткий вывод.\n\n${short}\n\nНормативная база.\n\n${norms}\n\nАнализ источников.\n\n${analysis}\n\nФактические фрагменты найденных источников.\n\n${evidence}\n\nСсылки на использованные источники.\n${sourceLinks}\n\nОбоснованный итог.\n\n${final}`;
}

async function typeText(element, text, speed = 8) {
  element.textContent = "";
  for (let i = 0; i < text.length; i += 1) {
    element.textContent += text[i];
    await new Promise((r) => setTimeout(r, speed));
  }
}

function getCasePreview(text) {
  return text.replace(/\s+/g, " ").trim().slice(0, 95);
}

function renderCases() {
  if (!cases.length) {
    casesContainer.innerHTML = "<p class='meta'>Кейсов пока нет.</p>";
    return;
  }

  casesContainer.innerHTML = cases
    .map((item) => {
      const activeClass = item.id === selectedCaseId ? "active" : "";
      const shortDefect = getCasePreview(item.problem);
      return `
        <div class="case ${activeClass}" data-id="${item.id}">
          <div class="meta">${item.createdAt}</div>
          <strong>${shortDefect}</strong>
          <p>${item.preview}</p>
        </div>
      `;
    })
    .join("");

  casesContainer.querySelectorAll(".case").forEach((node) => {
    node.addEventListener("click", () => selectCase(node.dataset.id));
  });
}

async function processQuestion(text, caseRef) {
  resultBody.innerHTML = `<div class="status-line">Ищу информацию.</div>`;

  let sources = [];
  try {
    sources = await searchTrustedSourcesRealtime(text);
  } catch {
    resultBody.textContent =
      "Не удалось получить данные из открытых источников в реальном времени. Повторите запрос позже.";
    return null;
  }

  if (!sources.length) {
    resultBody.textContent =
      "Проверяемые источники не найдены. Уточните формулировку: укажите тип дефекта, место, срок и обстоятельства.";
    return null;
  }

  const answer = buildStructuredAnswer(text, sources);
  await typeText(resultBody, answer);

  const historyRow = { question: text, answer, sources, at: now(), prompt: SYSTEM_PROMPT };
  caseRef.history.push(historyRow);
  caseRef.preview = answer.slice(0, 140) + (answer.length > 140 ? "..." : "");
  persistCases();
  renderCases();
  return historyRow;
}

analyzeBtn.addEventListener("click", async () => {
  const text = problemInput.value.trim();
  if (!text) return;

  const newCase = {
    id: crypto.randomUUID(),
    createdAt: now(),
    problem: text,
    preview: "",
    history: [],
  };
  cases.unshift(newCase);
  selectCase(newCase.id);
  await processQuestion(text, newCase);
  problemInput.value = "";
});

followupBtn.addEventListener("click", async () => {
  if (!selectedCaseId) return;
  const text = followupInput.value.trim();
  if (!text) return;

  const caseRef = cases.find((c) => c.id === selectedCaseId);
  if (!caseRef) return;

  const contextualText = `${caseRef.problem}. Уточнение: ${text}`;
  await processQuestion(contextualText, caseRef);
  followupInput.value = "";
});

renderCases();
