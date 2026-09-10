(() => {
  const DEFAULTS = { limit: 50, used: 0, windowHours: 5, resetAt: Date.now() + 5 * 3600000 };
  let state = DEFAULTS;
  let minimized = false;
  const remaining = () => Math.max(0, state.limit - state.used);
  const remainingPercent = () => Math.round((remaining() / state.limit) * 100);
  function timeLeft() {
    const minutes = Math.max(0, Math.ceil((state.resetAt - Date.now()) / 60000));
    return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m` : `${minutes}m`;
  }
  async function normalize() {
    if (Date.now() >= state.resetAt) {
      state = { ...state, used: 0, resetAt: Date.now() + state.windowHours * 3600000 };
      await chrome.storage.local.set({ trackerState: state });
    }
  }
  function render() {
    const root = document.getElementById('claude-usage-widget');
    if (!root) return;
    const percent = remainingPercent();
    root.classList.toggle('cut-minimized', minimized);
    root.querySelector('.cut-ring').style.setProperty('--value', `${percent}%`);
    root.querySelector('.cut-ring span').textContent = `${percent}%`;
    root.querySelector('.cut-remaining').innerHTML = `${remaining()} <small>of ${state.limit} messages left</small>`;
    root.querySelector('.cut-reset').textContent = `Resets in ${timeLeft()}`;
    root.querySelector('.cut-progress div').style.width = `${Math.min(100, (state.used / state.limit) * 100)}%`;
  }
  function mount() {
    if (document.getElementById('claude-usage-widget')) return;
    const root = document.createElement('aside');
    root.id = 'claude-usage-widget';
    root.setAttribute('aria-label', 'Claude usage tracker');
    root.innerHTML = `<div class="cut-head"><i class="cut-dot"></i><span>Usage tracker</span><button class="cut-close" aria-label="Minimize tracker">−</button></div><div class="cut-row"><div class="cut-ring"><span></span></div><div class="cut-details"><div class="cut-remaining"></div><div class="cut-reset"></div></div></div><div class="cut-progress"><div></div></div>`;
    root.querySelector('.cut-close').addEventListener('click', (event) => { event.stopPropagation(); minimized = true; render(); });
    root.addEventListener('click', () => { if (minimized) { minimized = false; render(); } });
    document.body.append(root); render();
  }
  async function load() {
    const stored = await chrome.storage.local.get('trackerState');
    state = { ...DEFAULTS, ...stored.trackerState };
    await normalize(); mount(); render();
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.trackerState) { state = { ...DEFAULTS, ...changes.trackerState.newValue }; render(); }
  });
  load(); setInterval(async () => { await normalize(); render(); }, 30000);
})();
