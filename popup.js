const DEFAULTS = { limit: 50, used: 0, windowHours: 5, resetAt: Date.now() + 5 * 60 * 60 * 1000 };
const $ = (id) => document.getElementById(id);
let state;

function formatCountdown(ms) {
  if (ms <= 0) return 'Resetting…';
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours}h ${String(minutes).padStart(2, '0')}m` : `${minutes}m`;
}
function resetLabel(date) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(date);
}
function localDateTimeValue(ms) {
  const date = new Date(ms - new Date().getTimezoneOffset() * 60000);
  return date.toISOString().slice(0, 16);
}
async function save() { await chrome.storage.local.set({ trackerState: state }); }
async function load() {
  const stored = await chrome.storage.local.get('trackerState');
  state = { ...DEFAULTS, ...stored.trackerState };
  checkReset(); render();
}
function checkReset() {
  if (Date.now() >= state.resetAt) {
    state.used = 0;
    state.resetAt = Date.now() + state.windowHours * 3600000;
    save();
  }
}
function render() {
  checkReset();
  const left = Math.max(0, state.limit - state.used);
  const leftPercent = Math.round((left / state.limit) * 100);
  $('remainingPercent').textContent = `${leftPercent}%`;
  $('usedCount').textContent = state.used;
  $('limitCount').textContent = state.limit;
  $('remainingCount').textContent = left;
  $('progressBar').style.width = `${Math.min(100, (state.used / state.limit) * 100)}%`;
  document.querySelector('.meter').style.setProperty('--percent', `${leftPercent}%`);
  $('countdown').textContent = formatCountdown(state.resetAt - Date.now());
  $('resetAt').textContent = `Resets ${resetLabel(new Date(state.resetAt))}`;
  $('undoMessage').disabled = state.used === 0;
}
function notice(message) { $('notice').textContent = message; }
$('addMessage').addEventListener('click', async () => {
  checkReset(); state.used = Math.min(state.limit, state.used + 1); await save(); render();
  notice(state.used === state.limit ? 'Usage window is fully logged.' : 'Message logged.');
});
$('undoMessage').addEventListener('click', async () => {
  state.used = Math.max(0, state.used - 1); await save(); render(); notice('Last message removed.');
});
$('settingsButton').addEventListener('click', () => {
  $('limitInput').value = state.limit;
  $('hoursInput').value = state.windowHours;
  $('resetInput').value = localDateTimeValue(state.resetAt);
  $('settingsDialog').showModal();
});
$('settingsForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const limit = Number($('limitInput').value), windowHours = Number($('hoursInput').value), resetAt = new Date($('resetInput').value).getTime();
  if (!Number.isFinite(limit) || !Number.isFinite(windowHours) || !Number.isFinite(resetAt)) return;
  state = { ...state, limit, windowHours, resetAt, used: Math.min(state.used, limit) };
  await save(); $('settingsDialog').close(); render(); notice('Usage window updated.');
});
$('startFresh').addEventListener('click', async () => {
  state.used = 0; state.resetAt = Date.now() + state.windowHours * 3600000;
  await save(); $('resetInput').value = localDateTimeValue(state.resetAt); render(); notice('Started a fresh usage window.');
});
load(); setInterval(render, 30000);
