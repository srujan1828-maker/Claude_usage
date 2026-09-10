(() => {
  const DEFAULTS = { limit: 50, used: 0, inputTokens: 0, windowHours: 5, resetAt: Date.now() + 5 * 3600000, sessionStartedAt: Date.now() };
  const WIDGET_ID = 'claude-usage-widget';
  let state = { ...DEFAULTS };
  let minimized = false;
  let draftTokens = 0;
  let lastTrackedDraft = '';
  let lastTrackedAt = 0;

  const remaining = () => Math.max(0, state.limit - state.used);
  const percentage = () => Math.round((remaining() / state.limit) * 100);
  const resetIn = () => {
    const minutes = Math.max(0, Math.ceil((state.resetAt - Date.now()) / 60000));
    return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m` : `${minutes}m`;
  };
  const sessionDuration = () => {
    const seconds = Math.max(0, Math.floor((Date.now() - state.sessionStartedAt) / 1000));
    return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  };
  // A local estimate avoids reading Claude responses or transmitting conversation content.
  const estimateTokens = (text) => Math.max(0, Math.ceil(text.trim().length / 4));
  const composer = () => document.querySelector('textarea, [contenteditable="true"][role="textbox"], [contenteditable="true"]');
  const composerText = () => composer()?.value ?? composer()?.innerText ?? '';
  async function persist() { await chrome.storage.local.set({ trackerState: state }); }
  async function resetIfNeeded() {
    if (Date.now() >= state.resetAt) {
      state = { ...state, used: 0, inputTokens: 0, resetAt: Date.now() + state.windowHours * 3600000, sessionStartedAt: Date.now() };
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
    widget.querySelector('[data-tokens]').textContent = `${state.inputTokens.toLocaleString()} input tokens`;
    widget.querySelector('[data-draft]').textContent = `Draft: ~${draftTokens.toLocaleString()} tokens`;
    widget.querySelector('[data-session]').textContent = `Live: ${sessionDuration()}`;
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
  function updateDraft() { draftTokens = estimateTokens(composerText()); render(); }
  async function trackSentDraft() {
    const text = composerText().trim();
    if (!text || (text === lastTrackedDraft && Date.now() - lastTrackedAt < 1200)) return;
    lastTrackedDraft = text; lastTrackedAt = Date.now();
    await resetIfNeeded();
    state.inputTokens += estimateTokens(text);
    state.used = Math.min(state.limit, state.used + 1);
    await persist();
    draftTokens = 0;
    render();
  }
  function observeComposer() {
    document.addEventListener('input', (event) => { if (event.target === composer() || event.target.isContentEditable) updateDraft(); }, true);
    document.addEventListener('submit', () => trackSentDraft(), true);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && (event.target === composer() || event.target.isContentEditable)) trackSentDraft();
    }, true);
    document.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (button && /send|submit/i.test(`${button.getAttribute('aria-label') || ''} ${button.textContent || ''}`)) trackSentDraft();
    }, true);
  }
  function mount() {
    if (document.getElementById(WIDGET_ID)) return;
    const widget = document.createElement('aside');
    widget.id = WIDGET_ID;
    widget.setAttribute('aria-label', 'Claude usage tracker');
    widget.innerHTML = `
      <div class="cut-head"><i class="cut-dot"></i><span>Live usage tracker</span><button class="cut-close" aria-label="Minimize tracker">−</button></div>
      <div class="cut-row"><div class="cut-ring"><span data-percentage></span></div><div class="cut-details"><div class="cut-remaining"><strong data-remaining></strong> <small>of <span data-limit></span> messages left</small></div><div class="cut-reset" data-reset></div></div></div>
      <div class="cut-progress"><div></div></div><div class="cut-live"><span data-tokens></span><span data-draft></span><span data-session></span></div>
      <div class="cut-actions"><button data-undo title="Undo message">Undo</button><button data-log>+ Log message</button></div>`;
    widget.querySelector('.cut-close').addEventListener('click', (event) => { event.stopPropagation(); minimized = true; render(); });
    widget.querySelector('[data-log]').addEventListener('click', () => changeUsage(1));
    widget.querySelector('[data-undo]').addEventListener('click', () => changeUsage(-1));
    widget.addEventListener('click', () => { if (minimized) { minimized = false; render(); } });
    document.body.append(widget); render();
  }
  async function load() {
    const { trackerState } = await chrome.storage.local.get('trackerState');
    state = { ...DEFAULTS, ...trackerState, sessionStartedAt: trackerState?.sessionStartedAt || Date.now() };
    await resetIfNeeded(); await persist(); mount(); observeComposer(); updateDraft(); render();
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.trackerState?.newValue) { state = { ...DEFAULTS, ...changes.trackerState.newValue }; render(); }
  });
  load();
  setInterval(async () => { await resetIfNeeded(); updateDraft(); render(); }, 1000);
})();
