const STORAGE_CASES_KEY = "ferrumbot_cases_v3";

const problemInput = document.getElementById("problemInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const resultBody = document.getElementById("resultBody");
const casesContainer = document.getElementById("cases");
const casesPanel = document.getElementById("casesPanel");
const casesToggleBtn = document.getElementById("casesToggleBtn");
const closeCasesBtn = document.getElementById("closeCasesBtn");

const SOURCE_INDEX = {
  windows: {
    patterns: /(плесень|окон|откос|промерзан|конденсат)/i,
    docs: [
      {
        doc: "СП 50.13330.2012",
        point: "раздел 5",
        text: "Внутренние поверхности ограждений должны обеспечивать условия без образования конденсата при нормируемом режиме эксплуатации.",
      },
      {
        doc: "ГОСТ 30971-2012",
        point: "п. 5.1-5.3",
        text: "Монтажный шов оконного примыкания выполняется как многослойный узел с наружной, средней и внутренней защитой.",
      },
    ],
  },
  leaks: {
    patterns: /(протеч|теч|стояк|затоп|кровл)/i,
    docs: [
      {
        doc: "СП 30.13330.2020",
        point: "раздел 7",
        text: "Инженерные системы водоснабжения и канализации должны проходить проверку герметичности и соответствовать проектным параметрам.",
      },
      {
        doc: "СП 17.13330.2017",
        point: "раздел 5",
        text: "Кровельные и примыкающие узлы выполняются с обеспечением водонепроницаемости на расчетный срок службы.",
      },
    ],
  },
  cracks: {
    patterns: /(трещин|шов|фасад|раскрыт)/i,
    docs: [
      {
        doc: "СП 70.13330.2012",
        point: "раздел 8",
        text: "Требования к качеству несущих и ограждающих конструкций включают контроль дефектов и отклонений.",
      },
      {
        doc: "ГОСТ 31937-2011",
        point: "раздел 6",
        text: "Обследование дефектов конструкций выполняется с фиксацией признаков развития и влияния на эксплуатационную пригодность.",
      },
    ],
  },
  ventilation: {
    patterns: /(вентиляц|тяга|влажн|духота)/i,
    docs: [
      {
        doc: "СП 60.13330.2020",
        point: "раздел 7",
        text: "Системы вентиляции должны обеспечивать нормативный воздухообмен в жилых помещениях.",
      },
      {
        doc: "СанПиН 1.2.3685-21",
        point: "таблицы микроклимата",
        text: "Параметры температуры и влажности должны находиться в допустимых диапазонах для жилых зон.",
      },
    ],
  },
  general: {
    patterns: /.*/,
    docs: [
      {
        doc: "214-ФЗ",
        point: "ст. 7",
        text: "Застройщик несет ответственность за недостатки, если не докажет, что они возникли вследствие нормального износа или ненадлежащей эксплуатации.",
      },
    ],
  },
};

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

function detectBucket(problemText) {
  const value = Object.entries(SOURCE_INDEX).find(([k, v]) => k !== "general" && v.patterns.test(problemText));
  return value ? value[0] : "general";
}

async function querySource(problemText) {
  const bucket = detectBucket(problemText);
  const selected = [...SOURCE_INDEX[bucket].docs, ...SOURCE_INDEX.general.docs];

  await new Promise((resolve) => setTimeout(resolve, 1100));

  const confidence = bucket === "general" ? 0.85 : 0.9;
  const body = [
    `По вашему запросу «${problemText}» FerrumBot сопоставил описание с релевантными нормами и сформировал итоговое заключение на основе связки строительной логики и правовой оценки. По содержанию обращения ключевая причина относится к категории «${bucket}», поэтому для квалификации применены профильные документы и общий правовой критерий ответственности застройщика по 214-ФЗ.`,
    `Анализ показывает, что окончательное решение должно опираться на акт осмотра, фотофиксацию и при необходимости инструментальные замеры, но уже на текущем наборе данных видно, какие технические признаки необходимо подтвердить в первую очередь и какие обстоятельства могут исключать гарантийную ответственность при доказанном вмешательстве или нарушении правил эксплуатации.`,
    `В качестве нормативной опоры использованы ${selected
      .map((d) => `${d.doc} (${d.point})`)
      .join(", ")}. По сути этих норм проверяется состояние узлов, герметичность, соответствие условиям эксплуатации и причинная связь между дефектом и качеством выполненных строительных работ. Если подтверждается строительная причина, дефект подлежит устранению в гарантийном порядке; если подтверждается эксплуатационная причина, решение переносится в плоскость ответственности пользователя помещения.`,
    `Для повышения точности до целевого уровня рекомендуется приложить к следующему обращению дату передачи, дату обнаружения дефекта, сведения о любых изменениях после приемки и не менее двух фото с привязкой к месту дефекта. При таком наборе данных система выдает более точное заключение и снижает риск ошибочной квалификации.`
  ].join("\n\n");

  return { text: body, confidence, sources: selected, bucket };
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

  resultBody.innerHTML = `<div class="status-line">FerrumBot обращается к общему источнику и подбирает точные нормы...</div>`;

  const result = await querySource(text);

  if (result.confidence < 0.85) {
    resultBody.textContent =
      "Для точного ответа не хватает данных. Укажите дату передачи, дату обращения, место дефекта и были ли изменения после приемки.";
    return;
  }

  await typeText(resultBody, result.text);

  const preview = result.text.slice(0, 180) + (result.text.length > 180 ? "..." : "");
  cases.unshift({ createdAt: now(), problem: text, preview, fullText: result.text, sources: result.sources });
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
