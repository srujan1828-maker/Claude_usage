(() => {
  const DEFAULTS = { limit: 50, used: 0, windowHours: 5, resetAt: Date.now() + 5 * 3600000 };
  const WIDGET_ID = 'claude-usage-widget';
  let state = { ...DEFAULTS };
  let minimized = false;

  const remaining = () => Math.max(0, state.limit - state.used);
  const percentage = () => Math.round((remaining() / state.limit) * 100);
  const resetIn = () => {
    const minutes = Math.max(0, Math.ceil((state.resetAt - Date.now()) / 60000));
    return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m` : `${minutes}m`;
  };
  async function persist() { await chrome.storage.local.set({ trackerState: state }); }
  async function resetIfNeeded() {
    if (Date.now() >= state.resetAt) {
      state = { ...state, used: 0, resetAt: Date.now() + state.windowHours * 3600000 };
      await persist();
    }
  }
  function render() {
    const widget = document.getElementById(WIDGET_ID);
    if (!widget) return;
    const left = remaining();
    widget.classList.toggle('cut-minimized', minimized);
    widget.querySelector('.cut-ring').style.setProperty('--value', `${percentage()}%`);
    widget.querySelector('[data-percentage]').textContent = `${percentage()}%`;
    widget.querySelector('[data-remaining]').textContent = left;
    widget.querySelector('[data-limit]').textContent = state.limit;
    widget.querySelector('[data-reset]').textContent = `Resets in ${resetIn()}`;
    widget.querySelector('.cut-progress > div').style.width = `${Math.min(100, (state.used / state.limit) * 100)}%`;
    widget.querySelector('[data-log]').disabled = left === 0;
    widget.querySelector('[data-undo]').disabled = state.used === 0;
  }
  async function changeUsage(change) {
    await resetIfNeeded();
    state.used = Math.max(0, Math.min(state.limit, state.used + change));
    await persist();
    render();
  }
  function mount() {
    if (document.getElementById(WIDGET_ID)) return;
    const widget = document.createElement('aside');
    widget.id = WIDGET_ID;
    widget.setAttribute('aria-label', 'Claude usage tracker');
    widget.innerHTML = `
      <div class="cut-head"><i class="cut-dot"></i><span>Usage tracker</span><button class="cut-close" aria-label="Minimize tracker">−</button></div>
      <div class="cut-row"><div class="cut-ring"><span data-percentage></span></div><div class="cut-details"><div class="cut-remaining"><strong data-remaining></strong> <small>of <span data-limit></span> messages left</small></div><div class="cut-reset" data-reset></div></div></div>
      <div class="cut-progress"><div></div></div>
      <div class="cut-actions"><button data-undo title="Undo message">Undo</button><button data-log>+ Log message</button></div>`;
    widget.querySelector('.cut-close').addEventListener('click', (event) => { event.stopPropagation(); minimized = true; render(); });
    widget.querySelector('[data-log]').addEventListener('click', () => changeUsage(1));
    widget.querySelector('[data-undo]').addEventListener('click', () => changeUsage(-1));
    widget.addEventListener('click', () => { if (minimized) { minimized = false; render(); } });
    document.body.append(widget);
    render();
  }
  async function load() {
    const { trackerState } = await chrome.storage.local.get('trackerState');
    state = { ...DEFAULTS, ...trackerState };
    await resetIfNeeded();
    await persist();
    mount();
    render();
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.trackerState?.newValue) {
      state = { ...DEFAULTS, ...changes.trackerState.newValue };
      render();
    }
  });
  load();
  setInterval(async () => { await resetIfNeeded(); render(); }, 30000);
})();
