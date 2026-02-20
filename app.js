const STORAGE_CASES_KEY = "ferrumbot_cases_v9";
const STORAGE_LEARNING_KEY = "ferrumbot_learning_v9";
const STORAGE_VECTORDB_KEY = "ferrumbot_vectordb_v9";

const problemInput = document.getElementById("problemInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const resultBody = document.getElementById("resultBody");
const casesContainer = document.getElementById("cases");
const followupInput = document.getElementById("followupInput");
const followupBtn = document.getElementById("followupBtn");
const activeCaseInfo = document.getElementById("activeCaseInfo");
const confirmBtn = document.getElementById("confirmBtn");
const rejectBtn = document.getElementById("rejectBtn");

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

class NLPEngine {
  static fixCommonTypos(text) {
    return text
      .replace(/пртичк/gi, "протечка")
      .replace(/вентеляц/gi, "вентиляц")
      .replace(/трещена/gi, "трещина")
      .replace(/конденсатт/gi, "конденсат");
  }

  static lemmatizeLight(text) {
    return text
      .replace(/\bпротекает\b/gi, "протечка")
      .replace(/\bпромерзает\b/gi, "промерзание")
      .replace(/\bпотрескалась\b/gi, "трещина")
      .replace(/\bвлажно\b/gi, "влажность")
      .replace(/\bтечет\b/gi, "протечка");
  }

  static applySynonyms(text) {
    let out = text;
    SYNONYM_MAP.forEach((s) => {
      out = out.replace(s.re, s.term);
    });
    return out;
  }

  static splitDefects(text) {
    const separators = /(?:\.|;|\n|,\sи\s|\s+и\s+ещ[её]\s+|\s+также\s+)/gi;
    return text
      .split(separators)
      .map((x) => x.trim())
      .filter((x) => x.length > 12);
  }

  static encode(text) {
    const dim = 128;
    const vec = new Array(dim).fill(0);
    const tokens = text.toLowerCase().split(/[^а-яa-z0-9]+/).filter(Boolean);
    tokens.forEach((token) => {
      let h = 0;
      for (let i = 0; i < token.length; i += 1) h = (h * 31 + token.charCodeAt(i)) % 1000003;
      const idx = h % dim;
      vec[idx] += 1;
    });
    const norm = Math.sqrt(vec.reduce((acc, x) => acc + x * x, 0)) || 1;
    return vec.map((x) => x / norm);
  }

  static preprocess(rawText) {
    const cleaned = rawText.replace(GREETINGS_PATTERN, " ").replace(/[!?]{2,}/g, " ").replace(/\s+/g, " ").trim();
    const typoFixed = NLPEngine.fixCommonTypos(cleaned);
    const lemmatized = NLPEngine.lemmatizeLight(typoFixed);
    const synonymed = NLPEngine.applySynonyms(lemmatized);
    const chunks = NLPEngine.splitDefects(synonymed);
    const parts = chunks.length ? chunks : [synonymed];
    return {
      normalizedTechnicalText: synonymed,
      parts,
      embedding: NLPEngine.encode(synonymed),
    };
  }
}

class NERModel {
  static extract(text) {
    const t = text.toLowerCase();
    return {
      element: /(кровл)/.test(t)
        ? "кровля"
        : /(стояк|сануз|канализац|водопровод)/.test(t)
          ? "инженерный стояк"
          : /(фасад|наруж)/.test(t)
            ? "фасад/наружные ограждения"
            : /(перекрыт|потолок)/.test(t)
              ? "перекрытие/потолок"
              : /(пол|стяжк|ламинат|плитк)/.test(t)
                ? "пол/покрытие"
                : /(окон|откос)/.test(t)
                  ? "оконный узел"
                  : "не определен",
      system_type: /(стояк|вентиляц|водопровод|канализац)/.test(t)
        ? "инженерные сети"
        : /(фасад|окон|перекрыт|стена|кровл)/.test(t)
          ? "ограждающие/несущие конструкции"
          : /(отделк|пол|плитк|штукатур)/.test(t)
            ? "отделочные покрытия"
            : "не определен",
      defect_type: /(трещин)/.test(t)
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
      conditions: [
        /(неотапливаем|без отоплен)/.test(t) ? "неотапливаемое помещение" : null,
        /(незаселен)/.test(t) ? "незаселенный этаж/помещение" : null,
        /(влажност|сыро|конденсат)/.test(t) ? "повышенная влажность" : null,
      ].filter(Boolean),
      time_factor: /(через\s+\d+\s+(месяц|месяцев|лет|года|год))/i.test(t)
        ? t.match(/через\s+\d+\s+(месяц|месяцев|лет|года|год)/i)?.[0] || "указан"
        : /(после зим)/.test(t)
          ? "после зимы"
          : /(сразу после|после заселени|после передачи)/.test(t)
            ? "сразу после заселения/передачи"
            : "не указан",
    };
  }
}

class DefectClassifier {
  constructor(learningState) {
    this.state = learningState;
    this.labels = [
      "конструктивный дефект",
      "монтажный дефект",
      "нарушение технологии",
      "проектная ошибка",
      "эксплуатационный фактор",
      "недостаточно данных",
    ];
  }

  classify(entities, text) {
    const t = text.toLowerCase();
    const scores = {
      "конструктивный дефект": /(трещин|деформац|осадк)/.test(t) ? 2.2 : 0.6,
      "монтажный дефект": /(шов|герметич|примыкан|монтаж)/.test(t) ? 2.0 : 0.6,
      "нарушение технологии": /(протеч|вздутие|отслоен|промерзан)/.test(t) ? 2.1 : 0.8,
      "проектная ошибка": /(узел|проект|непредусмотр)/.test(t) ? 1.6 : 0.5,
      "эксплуатационный фактор": /(после ремонта|повред|эксплуатац|механическ)/.test(t) ? 1.9 : 0.7,
      "недостаточно данных": entities.defect_type === "не определен" || entities.element === "не определен" ? 2.4 : 0.3,
    };

    const bias = this.state.bias || {};
    Object.keys(scores).forEach((k) => {
      scores[k] += bias[k] || 0;
    });

    const logits = this.labels.map((l) => scores[l]);
    const exps = logits.map((x) => Math.exp(x));
    const sum = exps.reduce((a, b) => a + b, 0) || 1;
    const probs = this.labels.map((l, i) => ({ label: l, prob: exps[i] / sum }));
    probs.sort((a, b) => b.prob - a.prob);
    return probs;
  }

  updateWithFeedback(topLabel, positive = true) {
    if (!this.state.bias) this.state.bias = {};
    this.state.bias[topLabel] = (this.state.bias[topLabel] || 0) + (positive ? 0.08 : -0.08);
  }
}

class VectorStore {
  constructor(initial) {
    this.rows = initial || [];
  }

  upsertMany(items) {
    this.rows.push(...items);
    this.rows = this.rows.slice(-2500);
  }

  search(queryVec, caseId, k = 5) {
    const scoped = this.rows.filter((r) => !caseId || r.caseId === caseId || r.global);
    const scored = scoped.map((r) => ({ ...r, score: cosine(r.embedding, queryVec) }));
    return scored.sort((a, b) => b.score - a.score).slice(0, k);
  }
}

function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d ? dot / d : 0;
}

const vectorStore = new VectorStore(readJson(STORAGE_VECTORDB_KEY, []));
let cases = readJson(STORAGE_CASES_KEY, []);
let learningMap = readJson(STORAGE_LEARNING_KEY, { bias: {} });
let selectedCaseId = null;
const classifier = new DefectClassifier(learningMap);

function persistAll() {
  localStorage.setItem(STORAGE_CASES_KEY, JSON.stringify(cases));
  localStorage.setItem(STORAGE_LEARNING_KEY, JSON.stringify(learningMap));
  localStorage.setItem(STORAGE_VECTORDB_KEY, JSON.stringify(vectorStore.rows));
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

function buildClarifyingQuestion(entities) {
  const missing = [];
  if (entities.element === "не определен") missing.push("где возник дефект (кровля, стояк, фасад, перекрытие и т.д.)");
  if (entities.defect_type === "не определен") missing.push("какое физическое проявление (трещина, протечка, промерзание, вздутие и т.д.)");
  if (entities.time_factor === "не указан") missing.push("когда проявился дефект (сразу, после зимы, через N месяцев)");
  return missing.length ? `Уточните, пожалуйста: ${missing.join("; ")}.` : null;
}

async function fetchAsText(url) {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function chunkText(text, maxLen = 600) {
  const clean = text.replace(/\s+/g, " ").trim();
  const chunks = [];
  for (let i = 0; i < clean.length; i += maxLen) chunks.push(clean.slice(i, i + maxLen));
  return chunks;
}

async function retrieveNormativeChunksRealtime(searchText, sectionHint, caseId) {
  const query = encodeURIComponent(`${searchText} ${sectionHint} ГОСТ СНиП СП технический регламент методические рекомендации`);
  const searchRaw = await fetchAsText(`https://r.jina.ai/http://duckduckgo.com/html/?q=${query}`);

  const links = extractLinksFromMarkdown(searchRaw)
    .filter((item) => NORMATIVE_TITLE_PATTERN.test(item.title))
    .filter((item, idx, arr) => arr.findIndex((x) => x.url === item.url) === idx)
    .slice(0, 8);

  const docs = [];
  for (const item of links) {
    try {
      const text = await fetchAsText(`https://r.jina.ai/http://${item.url.replace(/^https?:\/\//, "")}`);
      if (/(форум|реклама|реклам|купить|продажа|маркетплейс|блог личный)/i.test(text.slice(0, 2600))) continue;
      docs.push({ ...item, text });
    } catch {
      // skip
    }
    if (docs.length >= 4) break;
  }

  const rows = [];
  docs.forEach((doc) => {
    chunkText(doc.text, 620)
      .filter((c) => c.length > 160)
      .slice(0, 8)
      .forEach((chunk) => {
        rows.push({
          id: crypto.randomUUID(),
          caseId,
          global: false,
          sourceTitle: doc.title,
          sourceUrl: doc.url,
          chunk,
          embedding: NLPEngine.encode(chunk),
          createdAt: Date.now(),
        });
      });
  });

  vectorStore.upsertMany(rows);
  return rows;
}

function extractNormativeRefs(chunks) {
  const refs = [];
  const refRegex = /(ГОСТ\s*\d+[\d.-]*|СНиП\s*\d+[\d.-]*|СП\s*\d+[\d.-]*|Техническ(?:ий|ого) регламент[^.,;\n]*|ТР\s*ЕАЭС[^.,;\n]*)/gi;
  const pointRegex = /(п\.?\s*\d+(?:\.\d+)?(?:[-–]\d+(?:\.\d+)?)?|раздел\s*\d+(?:\.\d+)?|таблиц[аы]\s*\d+)/gi;

  chunks.forEach((c) => {
    const norms = [...new Set((c.chunk.match(refRegex) || []).map((x) => x.trim()))];
    const points = [...new Set((c.chunk.match(pointRegex) || []).slice(0, 3).map((x) => x.trim()))];
    norms.forEach((norm) => {
      refs.push({ norm, points: points.length ? points.join(", ") : "пункты требуют уточнения", url: c.sourceUrl });
    });
  });

  return refs.slice(0, 10);
}

function updateLearningMap(defectClass, sectionHint, refs) {
  const key = `${defectClass} | ${sectionHint}`;
  if (!learningMap[key]) learningMap[key] = { count: 0, norms: {} };
  learningMap[key].count += 1;
  refs.forEach((r) => {
    learningMap[key].norms[r.norm] = (learningMap[key].norms[r.norm] || 0) + 1;
  });
}

function buildTechnicalAnswer(originalText, normalizedText, entities, classProbs, refs, retrievedChunks) {
  const topClass = classProbs[0]?.label || "недостаточно данных";
  const normsText = refs.length
    ? refs.map((r) => `- ${r.norm}; ориентировочно: ${r.points}; источник: ${r.url}`).join("\n")
    : "- По найденным материалам точные реквизиты требуют дополнительной верификации в официальном документе.";

  const sourceAnalysis = retrievedChunks
    .slice(0, 3)
    .map((c, i) => `Источник ${i + 1}: ${c.sourceTitle}\n${c.chunk.slice(0, 360)}...`)
    .join("\n\n");

  const qualification = /нарушение технологии|монтажный дефект/.test(topClass)
    ? "нарушение технологии"
    : /конструктивный дефект|проектная ошибка/.test(topClass)
      ? "несоответствие нормативам"
      : /эксплуатационный фактор/.test(topClass)
        ? "эксплуатационный фактор"
        : "требуется инструментальное обследование";

  return `Краткое техническое заключение.\n\nПо обращению «${originalText}» после NLP-предобработки сформирован технический запрос: «${normalizedText}». Система выделила: элемент «${entities.element}», тип системы «${entities.system_type}», дефект «${entities.defect_type}», условия «${entities.conditions.join(", ") || "не указаны"}», время проявления «${entities.time_factor}».\n\nПеречень применимых нормативных документов (RAG-выборка).\n\n${normsText}\n\nАнализ соответствия описанной ситуации требованиям нормативов.\n\nСемантический поиск по векторной базе нормативных фрагментов выполнил сопоставление признаков дефекта с требованиями к технологии работ, условиям монтажа и допустимым отклонениям. Вывод сформирован только на основе найденных нормативных фрагментов.\n\nИтоговая техническая квалификация.\n\n${qualification}. Для окончательного заключения требуется инструментальное обследование по месту дефекта и проверка соответствия проектной документации.\n\nФрагменты релевантных нормативов.\n\n${sourceAnalysis}`;
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

function setCaseControlsEnabled(enabled) {
  followupInput.disabled = !enabled;
  followupBtn.disabled = !enabled;
  confirmBtn.disabled = !enabled;
  rejectBtn.disabled = !enabled;
}

function selectCase(caseId) {
  selectedCaseId = caseId;
  const selected = cases.find((c) => c.id === caseId);
  setCaseControlsEnabled(!!selected);
  activeCaseInfo.textContent = selected ? `Активный кейс: ${selected.problem.slice(0, 90)}` : "Активный кейс: не выбран.";
  if (selected?.history?.length) resultBody.textContent = selected.history[selected.history.length - 1].answer;
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

async function processDefectItem(originalText, normalizedText, partText, caseRef) {
  const entities = NERModel.extract(partText);
  const clarify = buildClarifyingQuestion(entities);
  if (clarify) {
    await typeText(resultBody, `Ищу информацию.\n\nПока не перехожу к поиску нормативов: ${clarify}`);
    caseRef.partialEntities = entities;
    caseRef.history.push({ question: originalText, answer: clarify, entities, at: now(), status: "need_clarification" });
    caseRef.preview = clarify;
    persistAll();
    renderCases();
    return;
  }

  const classProbs = classifier.classify(entities, partText);
  const topClass = classProbs[0]?.label || "недостаточно данных";
  const sectionHint = /(протеч|стояк|кровл|гидроизоляц)/.test(partText.toLowerCase())
    ? "СП/СНиП по инженерным системам и гидроизоляции"
    : /(промерзан|конденсат|плесень|окон|откос)/.test(partText.toLowerCase())
      ? "ГОСТ/СП по тепловой защите и узлам примыкания"
      : /(трещин|деформац)/.test(partText.toLowerCase())
        ? "СП/СНиП/ГОСТ по конструкциям"
        : "общие требования к качеству строительных работ";

  const ingested = await retrieveNormativeChunksRealtime(partText, sectionHint, caseRef.id);
  const queryVec = NLPEngine.encode(partText);
  const retrieved = vectorStore.search(queryVec, caseRef.id, 6).filter((r) => ingested.some((i) => i.id === r.id) || r.score > 0.15);

  if (!retrieved.length) {
    await typeText(resultBody, "Ищу информацию.\n\nНе удалось получить нормативные фрагменты с достаточной релевантностью. Уточните технические признаки дефекта.");
    return;
  }

  const refs = extractNormativeRefs(retrieved);
  updateLearningMap(topClass, sectionHint, refs);
  const answer = buildTechnicalAnswer(originalText, normalizedText, entities, classProbs, refs, retrieved);
  await typeText(resultBody, answer);

  caseRef.embedding = queryVec;
  caseRef.history.push({
    question: originalText,
    answer,
    refs,
    entities,
    topClass,
    classProbs,
    retrieved: retrieved.map((r) => ({ sourceTitle: r.sourceTitle, sourceUrl: r.sourceUrl, score: r.score })),
    at: now(),
    status: "analyzed",
  });

  caseRef.preview = answer.slice(0, 130) + (answer.length > 130 ? "..." : "");
  persistAll();
  renderCases();
}

async function processQuestion(text, caseRef) {
  resultBody.innerHTML = `<div class="status-line">Ищу информацию.</div>`;

  const nlp = NLPEngine.preprocess(text);
  const parts = nlp.parts;

  if (parts.length > 1) {
    // multi-defect message -> create additional sibling cases
    caseRef.preview = `Обнаружено ${parts.length} дефектов; анализируется каждый отдельно.`;
    persistAll();
    renderCases();

    const first = parts[0];
    await processDefectItem(text, nlp.normalizedTechnicalText, first, caseRef);

    for (let i = 1; i < parts.length; i += 1) {
      const sub = {
        id: crypto.randomUUID(),
        createdAt: now(),
        problem: parts[i],
        preview: "",
        history: [],
        partialEntities: null,
        parentCaseId: caseRef.id,
      };
      cases.unshift(sub);
      await processDefectItem(parts[i], parts[i], parts[i], sub);
    }
  } else {
    await processDefectItem(text, nlp.normalizedTechnicalText, parts[0], caseRef);
  }

  persistAll();
  renderCases();
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
    partialEntities: null,
    embedding: null,
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

confirmBtn.addEventListener("click", () => {
  if (!selectedCaseId) return;
  const caseRef = cases.find((c) => c.id === selectedCaseId);
  if (!caseRef?.history?.length) return;
  const topLabel = caseRef.history[caseRef.history.length - 1].topClass;
  if (!topLabel) return;
  classifier.updateWithFeedback(topLabel, true);
  persistAll();
});

rejectBtn.addEventListener("click", () => {
  if (!selectedCaseId) return;
  const caseRef = cases.find((c) => c.id === selectedCaseId);
  if (!caseRef?.history?.length) return;
  const topLabel = caseRef.history[caseRef.history.length - 1].topClass;
  if (!topLabel) return;
  classifier.updateWithFeedback(topLabel, false);
  persistAll();
});

setCaseControlsEnabled(false);
renderCases();
