const STORAGE_CASES_KEY = "ferrumbot_cases_v8";
const STORAGE_LEARNING_KEY = "ferrumbot_learning_v8";

const problemInput = document.getElementById("problemInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const resultBody = document.getElementById("resultBody");
const casesContainer = document.getElementById("cases");
const followupInput = document.getElementById("followupInput");
const followupBtn = document.getElementById("followupBtn");
const activeCaseInfo = document.getElementById("activeCaseInfo");

const TRUSTED_DOMAINS = [
  "gost.ru",
  "docs.cntd.ru",
  "cntd.ru",
  "minstroyrf.gov.ru",
  "faufcc.ru",
  "rst.gov.ru",
  "publication.pravo.gov.ru",
  "pravo.gov.ru",
  "standartgost.ru",
];

const NORMATIVE_TITLE_PATTERN = /(ГОСТ|СНиП|СП\s|Свод правил|Техническ(ий|ого) регламент|ТР\s|Методическ|Рекомендац|Р\s\d+\.?\d*)/i;
const GREETINGS_PATTERN = /(добрый день|здравствуйте|привет|прошу решить|помогите|нет слов|пожалуйста|подскажите)/gi;

const SYNONYM_MAP = [
  { re: /(разбух|вспучил|поднял[ао]?сь|волн[аы])/gi, term: "вздутие покрытия" },
  { re: /(теч[её]т|подтек|капает)/gi, term: "протечка" },
  { re: /(плеснев|грибок)/gi, term: "плесень" },
  { re: /(сквозит|дует)/gi, term: "инфильтрация воздуха" },
  { re: /(лопнул|растрескал)/gi, term: "трещина" },
  { re: /(мокрое пятно|сырое пятно)/gi, term: "увлажнение" },
];

let cases = readJson(STORAGE_CASES_KEY, []);
let learningMap = readJson(STORAGE_LEARNING_KEY, {});
let selectedCaseId = null;

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function persistAll() {
  localStorage.setItem(STORAGE_CASES_KEY, JSON.stringify(cases));
  localStorage.setItem(STORAGE_LEARNING_KEY, JSON.stringify(learningMap));
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

function fixCommonTypos(text) {
  return text
    .replace(/пртичк/gi, "протечка")
    .replace(/вентеляц/gi, "вентиляц")
    .replace(/трещена/gi, "трещина")
    .replace(/конденсатт/gi, "конденсат");
}

function simpleLemmatize(text) {
  return text
    .replace(/\bпротекает\b/gi, "протечка")
    .replace(/\bпромерзает\b/gi, "промерзание")
    .replace(/\bпотрескалась\b/gi, "трещина")
    .replace(/\bвлажно\b/gi, "влажность")
    .replace(/\bтечет\b/gi, "протечка");
}

function applySynonyms(text) {
  let out = text;
  SYNONYM_MAP.forEach((s) => {
    out = out.replace(s.re, s.term);
  });
  return out;
}

function splitPotentialDefects(text) {
  const separators = /(?:\.|;|\n|,\sи\s|\s+и\s+ещ[её]\s+|\s+также\s+)/gi;
  return text
    .split(separators)
    .map((x) => x.trim())
    .filter((x) => x.length > 12);
}

function extractEntities(text) {
  const t = text.toLowerCase();
  return {
    objectType: /(квартир|помещен|дом|этаж)/.test(t)
      ? "квартира/помещение"
      : /(кровл)/.test(t)
        ? "кровля"
        : /(фасад)/.test(t)
          ? "фасад"
          : /(стояк)/.test(t)
            ? "стояк"
            : /(перекрыт|потолок)/.test(t)
              ? "перекрытие/потолок"
              : /(пол|стяжк)/.test(t)
                ? "пол/стяжка"
                : "не определен",
    elementType: /(отделк|плитк|ламинат|штукатур)/.test(t)
      ? "отделка"
      : /(стояк|вентиляц|водопровод|канализац)/.test(t)
        ? "инженерная система"
        : /(стена|фасад|перекрыт|колон|плита)/.test(t)
          ? "несущая/ограждающая конструкция"
          : /(утепл)/.test(t)
            ? "утепление"
            : "не определен",
    defectNature: /(трещин)/.test(t)
      ? "трещина"
      : /(промерзан)/.test(t)
        ? "промерзание"
        : /(протечк|увлажнен)/.test(t)
          ? "протечка/увлажнение"
          : /(вздутие покрытия)/.test(t)
            ? "вздутие покрытия"
            : /(конденсат)/.test(t)
              ? "конденсат"
              : /(деформац)/.test(t)
                ? "деформация"
                : /(корроз)/.test(t)
                  ? "коррозия"
                  : "не определен",
    timeFactor: /(через\s+\d+\s+(месяц|месяцев|лет|года|год))/i.test(t)
      ? t.match(/через\s+\d+\s+(месяц|месяцев|лет|года|год)/i)?.[0] || "указан"
      : /(после зим)/.test(t)
        ? "после зимы"
        : /(сразу после|после заселени|после передачи)/.test(t)
          ? "сразу после заселения/передачи"
          : "не указан",
    operationConditions: [
      /(неотапливаем|без отоплен)/.test(t) ? "неотапливаемое помещение" : null,
      /(незаселен)/.test(t) ? "незаселенный этаж/помещение" : null,
      /(влажност|сыро|конденсат)/.test(t) ? "повышенная влажность" : null,
    ].filter(Boolean),
  };
}

function classifyDefectFromEntities(entities, text) {
  const t = text.toLowerCase();
  const category = /(монтаж|шов|герметич|протечк)/.test(t)
    ? "монтажный/технологический"
    : /(трещин|деформац|осадк)/.test(t)
      ? "конструктивный/проектный"
      : /(после ремонта|вмешател|повред|эксплуатац)/.test(t)
        ? "эксплуатационный"
        : "требует уточнения";

  const normativeSection = /(промерзан|конденсат|плесень|окон|откос)/.test(t)
    ? "ГОСТ/СП по тепловой защите и узлам примыкания"
    : /(протеч|стояк|кровл|гидроизоляц)/.test(t)
      ? "СП/СНиП по инженерным системам и гидроизоляции"
      : /(трещин|деформац)/.test(t)
        ? "СП/СНиП/ГОСТ по конструкциям и дефектам"
        : "общие требования к качеству строительных работ";

  const technicalCore = `${entities.defectNature} в зоне «${entities.objectType}/${entities.elementType}» при условиях «${entities.operationConditions.join(", ") || "не уточнены"}», срок: ${entities.timeFactor}`;

  return { category, normativeSection, technicalCore };
}

function nlpPreprocessUserText(rawText) {
  const cleaned = rawText
    .replace(GREETINGS_PATTERN, " ")
    .replace(/[!?]{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const typoFixed = fixCommonTypos(cleaned);
  const lemmatized = simpleLemmatize(typoFixed);
  const synonymed = applySynonyms(lemmatized);
  const chunks = splitPotentialDefects(synonymed);

  const parts = chunks.length ? chunks : [synonymed];
  const items = parts.map((part) => {
    const entities = extractEntities(part);
    const cls = classifyDefectFromEntities(entities, part);
    return {
      raw: part,
      entities,
      defectClass: cls.category,
      normativeSectionHint: cls.normativeSection,
      technicalCore: cls.technicalCore,
      isClear: entities.defectNature !== "не определен" && entities.objectType !== "не определен",
    };
  });

  return {
    normalizedTechnicalText: synonymed,
    defectItems: items,
  };
}

function buildClarifyingQuestion(item) {
  const missing = [];
  if (item.entities.objectType === "не определен") missing.push("где возник дефект (кровля, стояк, фасад, перекрытие и т.д.)");
  if (item.entities.defectNature === "не определен") missing.push("какое физическое проявление (трещина, протечка, промерзание, вздутие и т.д.)");
  if (item.entities.timeFactor === "не указан") missing.push("когда проявился дефект (сразу, после зимы, через N месяцев)");

  if (!missing.length) return null;
  return `Уточните, пожалуйста: ${missing.join("; ")}.`;
}

async function fetchAsText(url) {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function searchTrustedSourcesRealtime(searchText, sectionHint) {
  const query = encodeURIComponent(`${searchText} ${sectionHint} ГОСТ СНиП СП технический регламент методические рекомендации`);
  const searchRaw = await fetchAsText(`https://r.jina.ai/http://duckduckgo.com/html/?q=${query}`);

  const links = extractLinksFromMarkdown(searchRaw)
    .filter((item) => NORMATIVE_TITLE_PATTERN.test(item.title))
    .filter((item, idx, arr) => arr.findIndex((x) => x.url === item.url) === idx)
    .slice(0, 10);

  const resolved = [];
  for (const item of links) {
    try {
      const text = await fetchAsText(`https://r.jina.ai/http://${item.url.replace(/^https?:\/\//, "")}`);
      const clean = text.replace(/\s+/g, " ").trim();
      const snippet = clean.slice(0, 900);
      if (snippet.length < 180) continue;
      if (/(форум|реклама|реклам|купить|продажа|маркетплейс|блог личный)/i.test(clean.slice(0, 2500))) continue;
      resolved.push({ ...item, snippet });
    } catch {
      // skip
    }
    if (resolved.length >= 5) break;
  }

  return resolved;
}

function extractNormativeRefs(sources) {
  const refs = [];
  const refRegex = /(ГОСТ\s*\d+[\d.-]*|СНиП\s*\d+[\d.-]*|СП\s*\d+[\d.-]*|Техническ(?:ий|ого) регламент[^.,;\n]*|ТР\s*ЕАЭС[^.,;\n]*)/gi;
  const pointRegex = /(п\.?\s*\d+(?:\.\d+)?(?:[-–]\d+(?:\.\d+)?)?|раздел\s*\d+(?:\.\d+)?|таблиц[аы]\s*\d+)/gi;

  sources.forEach((s) => {
    const norms = [...new Set([...(s.title.match(refRegex) || []), ...(s.snippet.match(refRegex) || [])].map((x) => x.trim()))];
    const points = [...new Set((s.snippet.match(pointRegex) || []).slice(0, 4).map((x) => x.trim()))];

    norms.forEach((norm) => {
      refs.push({
        norm,
        points: points.length ? points.join(", ") : "пункты требуют уточнения по первоисточнику",
        url: s.url,
      });
    });
  });

  return refs.slice(0, 10);
}

function updateLearningMap(defectItem, refs) {
  const key = `${defectItem.defectClass} | ${defectItem.normativeSectionHint}`;
  if (!learningMap[key]) {
    learningMap[key] = { count: 0, norms: {}, lastCore: defectItem.technicalCore };
  }
  learningMap[key].count += 1;
  refs.forEach((r) => {
    learningMap[key].norms[r.norm] = (learningMap[key].norms[r.norm] || 0) + 1;
  });
}

function buildTechnicalAnswer(originalText, normalizedText, defectItem, sources, refs) {
  const normsText = refs.length
    ? refs.map((r) => `- ${r.norm}; ориентировочно: ${r.points}; источник: ${r.url}`).join("\n")
    : "- Точные нормативные реквизиты по найденным материалам требуют дополнительной верификации.";

  const sourceAnalysis = sources
    .slice(0, 3)
    .map((s, i) => `Источник ${i + 1}: ${s.title}\n${s.snippet.slice(0, 390)}...`)
    .join("\n\n");

  const qualification = /(монтажный|технологический)/.test(defectItem.defectClass)
    ? "нарушение технологии"
    : /(конструктивный|проектный)/.test(defectItem.defectClass)
      ? "несоответствие нормативам"
      : /(эксплуатационный)/.test(defectItem.defectClass)
        ? "эксплуатационный фактор"
        : "требуется инструментальное обследование";

  return `Краткое техническое заключение.\n\nПо обращению «${originalText}» после первичной NLP-нормализации сформировано техническое ядро запроса: «${normalizedText}». Анализируемый дефект: ${defectItem.technicalCore}. Предварительная квалификация: ${qualification}.\n\nПеречень применимых нормативных документов.\n\n${normsText}\n\nАнализ соответствия описанной ситуации требованиям нормативов.\n\nСитуация сопоставлена с требованиями к технологии выполнения работ, условиям монтажа и эксплуатационному режиму. Если подтверждаются признаки нарушения технологии (герметичность, узлы примыкания, температурно-влажностный режим, допустимые отклонения), дефект относится к несоответствию нормативам. Если выявляется влияние условий эксплуатации, требуется разграничение причин по инструментальным данным.\n\nИтоговая техническая квалификация.\n\n${qualification}. Для окончательного вывода необходимы: акт осмотра, фотофиксация, измерения (температура/влажность/деформации), а при споре — инструментальное обследование профильным специалистом.\n\nФрагменты источников.\n\n${sourceAnalysis}`;
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

function renderCases() {
  if (!cases.length) {
    casesContainer.innerHTML = "<p class='meta'>Кейсов пока нет.</p>";
    return;
  }

  casesContainer.innerHTML = cases
    .map((item) => {
      const activeClass = item.id === selectedCaseId ? "active" : "";
      return `
        <div class="case ${activeClass}" data-id="${item.id}">
          <div class="meta">${item.createdAt}</div>
          <strong>${getCasePreview(item.problem)}</strong>
          <p>${item.preview || "Ожидание анализа..."}</p>
        </div>
      `;
    })
    .join("");

  casesContainer.querySelectorAll(".case").forEach((node) => {
    node.addEventListener("click", () => selectCase(node.dataset.id));
  });
}

async function processOneDefectItem(originalText, normalizedText, defectItem, caseRef) {
  const clarifyingQuestion = buildClarifyingQuestion(defectItem);
  if (clarifyingQuestion) {
    await typeText(resultBody, `Ищу информацию.\n\nПока не перехожу к поиску нормативов: ${clarifyingQuestion}`);
    caseRef.partialEntities = defectItem.entities;
    const historyRow = {
      question: originalText,
      answer: clarifyingQuestion,
      refs: [],
      sources: [],
      internal: defectItem,
      at: now(),
      status: "need_clarification",
    };
    caseRef.history.push(historyRow);
    caseRef.preview = clarifyingQuestion;
    persistAll();
    renderCases();
    return;
  }

  let sources = [];
  try {
    sources = await searchTrustedSourcesRealtime(defectItem.technicalCore, defectItem.normativeSectionHint);
  } catch {
    await typeText(resultBody, "Ищу информацию.\n\nНе удалось выполнить realtime-поиск по нормативным источникам. Повторите запрос позже.");
    return;
  }

  if (!sources.length) {
    await typeText(resultBody, "Ищу информацию.\n\nПроверяемые нормативные источники не найдены. Уточните описание дефекта и место возникновения.");
    return;
  }

  const refs = extractNormativeRefs(sources);
  updateLearningMap(defectItem, refs);
  const answer = buildTechnicalAnswer(originalText, normalizedText, defectItem, sources, refs);
  await typeText(resultBody, answer);

  const historyRow = {
    question: originalText,
    answer,
    refs,
    sources,
    internal: defectItem,
    at: now(),
    status: "analyzed",
  };

  caseRef.history.push(historyRow);
  caseRef.preview = answer.slice(0, 130) + (answer.length > 130 ? "..." : "");
  persistAll();
  renderCases();
}

async function processQuestion(text, caseRef) {
  resultBody.innerHTML = `<div class="status-line">Ищу информацию.</div>`;

  const nlp = nlpPreprocessUserText(text);

  // if multiple defects in one text, split to child defect items and process first one now
  caseRef.detectedItems = nlp.defectItems.map((d) => ({
    core: d.technicalCore,
    class: d.defectClass,
    object: d.entities.objectType,
    nature: d.entities.defectNature,
  }));

  if (nlp.defectItems.length > 1) {
    caseRef.preview = `Выделено ${nlp.defectItems.length} дефектов, начат анализ первого.`;
    persistAll();
    renderCases();
  }

  // analyze first defect item; follow-ups can continue same case context
  await processOneDefectItem(text, nlp.normalizedTechnicalText, nlp.defectItems[0], caseRef);
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
    detectedItems: [],
    partialEntities: null,
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
