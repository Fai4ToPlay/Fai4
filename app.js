const STORAGE_KEY = 'tfg-state-v1';
const defaults = {
  map: 'Таможня', goals: [], checks: {}, notes: '',
};
const gear = ['Аптечка и обезболивающее', 'Боеприпасы и запасной магазин', 'Еда и вода', 'Ключи в защищённом контейнере', 'Деньги на экстракт', 'Проверить броню и шлем', 'Выбрать запасной маршрут'];
let state = loadState();

const $ = (selector) => document.querySelector(selector);
const mapSelect = $('#map-select');
const goalInput = $('#goal-input');

function loadState() {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; }
  catch { return { ...defaults }; }
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); updateStats(); }

function renderGoals() {
  const list = $('#goals');
  list.replaceChildren();
  if (!state.goals.length) {
    const item = document.createElement('li'); item.className = 'empty'; item.textContent = 'Добавьте задачи — они останутся на этом устройстве.'; list.append(item); return;
  }
  state.goals.forEach((goal, index) => {
    const item = document.createElement('li'); item.className = 'goal';
    const text = document.createElement('span'); text.textContent = goal;
    const remove = document.createElement('button'); remove.type = 'button'; remove.setAttribute('aria-label', `Удалить задачу «${goal}»`); remove.textContent = '×';
    remove.addEventListener('click', () => { state.goals.splice(index, 1); save(); renderGoals(); });
    item.append(text, remove); list.append(item);
  });
}

function renderGear() {
  const list = $('#gear-list'); list.replaceChildren();
  gear.forEach((name, index) => {
    const label = document.createElement('label'); label.className = 'check-item';
    const input = document.createElement('input'); input.type = 'checkbox'; input.checked = Boolean(state.checks[index]);
    input.addEventListener('change', () => { state.checks[index] = input.checked; save(); });
    const box = document.createElement('span'); box.className = 'fake-check'; box.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span'); text.textContent = name;
    label.append(input, box, text); list.append(label);
  });
}

function updateStats() {
  const done = gear.filter((_, index) => state.checks[index]).length;
  const readiness = Math.round((done / gear.length) * 100);
  $('#readiness').textContent = `${readiness}%`;
  $('#readiness-bar').style.width = `${readiness}%`;
  $('#check-progress').textContent = `${done} / ${gear.length}`;
  $('#task-count').textContent = state.goals.length;
  $('#selected-map-label').textContent = state.map;
}

function addGoal() {
  const value = goalInput.value.trim(); if (!value) return;
  state.goals.push(value); goalInput.value = ''; save(); renderGoals(); goalInput.focus();
}

mapSelect.value = state.map;
mapSelect.addEventListener('change', () => { state.map = mapSelect.value; save(); });
$('#add-goal').addEventListener('click', addGoal);
goalInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') addGoal(); });
$('#clear-all').addEventListener('click', () => { state = { ...defaults, checks: {}, goals: [] }; mapSelect.value = state.map; $('#notes-area').value = ''; save(); renderGoals(); renderGear(); updateNotesCount(); });

const notes = $('#notes-area'); notes.value = state.notes;
function updateNotesCount() { $('#char-count').textContent = `${notes.value.length} / 1500`; }
notes.addEventListener('input', () => { state.notes = notes.value; save(); updateNotesCount(); });

let seconds = 25 * 60; let timerId = null;
function drawTimer() { $('#timer').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
$('#timer-toggle').addEventListener('click', () => {
  if (timerId) { clearInterval(timerId); timerId = null; $('#timer-toggle').textContent = 'Продолжить'; return; }
  $('#timer-toggle').textContent = 'Пауза'; timerId = setInterval(() => { if (seconds > 0) { seconds -= 1; drawTimer(); } else { clearInterval(timerId); timerId = null; $('#timer-toggle').textContent = 'Снова'; } }, 1000);
});
$('#timer-reset').addEventListener('click', () => { clearInterval(timerId); timerId = null; seconds = 25 * 60; drawTimer(); $('#timer-toggle').textContent = 'Запустить'; });

renderGoals(); renderGear(); updateStats(); updateNotesCount(); drawTimer();
