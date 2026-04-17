// Injected floating panel — runs in page context
// CSS injected via chrome.scripting.insertCSS (matches .tn- prefixed classes)

(function () {
  'use strict';

  if (document.getElementById('teaching-note-panel')) {
    return;
  }

  const html = `
    <div id="teaching-note-panel" class="tn-panel">
      <div class="tn-drag-handle" id="tn-drag">
        <span>Note Builder</span>
        <button class="tn-close-btn" id="tn-close" title="Close">&times;</button>
      </div>
      <div class="tn-content">
        <div class="tn-field">
          <p class="tn-label">Input</p>
          <div class="tn-input-wrap">
            <textarea class="tn-textarea" id="tn-source" placeholder="Type Chinese, press Enter"></textarea>
            <button class="tn-gen-icon" id="tn-gen" title="Generate">&#9889;</button>
          </div>
        </div>
        <div class="tn-field">
          <p class="tn-label">Level</p>
          <select class="tn-select" id="tn-level">
            <option value="A">A &middot; Pinyin only</option>
            <option value="B">B &middot; Chinese + Pinyin</option>
            <option value="C">C &middot; Chinese only</option>
          </select>
        </div>
        <div class="tn-result">
          <div class="tn-result-head">
            <span class="tn-result-title">Note</span>
            <button class="tn-copy-btn" id="tn-copy-l2" title="Copy">&#9168;</button>
          </div>
          <textarea class="tn-result-box" id="tn-line2" readonly></textarea>
        </div>
        <div class="tn-result">
          <div class="tn-result-head">
            <span class="tn-result-title">Explanation</span>
            <button class="tn-copy-btn" id="tn-copy-l3" title="Copy">&#9168;</button>
          </div>
          <textarea class="tn-result-box" id="tn-line3" readonly></textarea>
        </div>
        <div class="tn-actions">
          <button class="tn-btn" id="tn-copy-all">Copy All</button>
          <button class="tn-btn" id="tn-export">Export MD</button>
        </div>
        <p class="tn-status" id="tn-status"></p>
      </div>
      <div class="tn-footer">
        <button class="tn-icon-btn" id="tn-reset" title="Reset">&#8634;</button>
        <button class="tn-icon-btn" id="tn-settings" title="Settings">&#9881;</button>
      </div>
      <div class="tn-resize-handle tn-resize-r" id="tn-resize-r"></div>
      <div class="tn-resize-handle tn-resize-b" id="tn-resize-b"></div>
      <div class="tn-resize-handle tn-resize-br" id="tn-resize-br"></div>
    </div>
  `;

  // Insert CSS as a <style> tag directly (no Shadow DOM needed)
  const styleEl = document.createElement('style');
  styleEl.id = 'tn-style';
  styleEl.textContent = `
:root {
  --tn-bg: #f2f8fd;
  --tn-surface: rgba(255,255,255,0.97);
  --tn-border: #cfe8fb;
  --tn-border-input: #8fcbef;
  --tn-primary: #0c8ddd;
  --tn-primary-hover: #0a7cc5;
  --tn-primary-light: #e8f6ff;
  --tn-text: #16384d;
  --tn-text-heading: #0e3d56;
  --tn-text-muted: #5a8a9e;
  --tn-text-link: #0d6ea8;
  --tn-text-title: #1a5276;
  --tn-text-label: #4a7488;
  --tn-error: #c13a3a;
  --tn-success: #1a8a5c;
  --tn-shadow: rgba(77,134,166,0.18);
  --tn-radius: 10px;
  --tn-font: "Avenir Next","Segoe UI",system-ui,sans-serif;
}
@media(prefers-color-scheme:dark){:root{
  --tn-bg:#0d1b26;--tn-surface:rgba(22,40,56,0.97);--tn-border:#1e3a54;
  --tn-border-input:#2a5070;--tn-primary:#3aa6ef;--tn-primary-hover:#52b4f5;
  --tn-primary-light:#1a3a58;--tn-text:#d8ecf8;--tn-text-heading:#c0ddf0;
  --tn-text-muted:#6a9ab8;--tn-text-link:#5db8f0;--tn-text-title:#b0dcf0;
  --tn-text-label:#7aaad0;--tn-error:#ef6b6b;--tn-success:#4ec47d;
  --tn-shadow:rgba(0,0,0,0.4);
}}
.tn-panel{position:fixed;z-index:2147483647;width:280px;height:420px;
  min-width:200px;min-height:200px;max-width:600px;max-height:90vh;
  background:var(--tn-surface);border:1px solid var(--tn-border);
  border-radius:var(--tn-radius);box-shadow:0 8px 32px var(--tn-shadow);
  display:none;flex-direction:column;font-family:var(--tn-font);
  font-size:12px;color:var(--tn-text);overflow:hidden;
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);top:12px;right:12px;}
.tn-panel.visible{display:flex;}
.tn-drag-handle{display:flex;align-items:center;justify-content:space-between;
  padding:6px 8px;background:var(--tn-bg);border-bottom:1px solid var(--tn-border);
  cursor:move;user-select:none;flex-shrink:0;}
.tn-drag-handle span{font-weight:800;font-size:11px;text-transform:uppercase;
  letter-spacing:.05em;color:var(--tn-text-heading);}
.tn-close-btn{border:none;background:transparent;color:var(--tn-text-muted);
  cursor:pointer;padding:2px;font-size:16px;line-height:1;border-radius:4px;}
.tn-close-btn:hover{color:var(--tn-error);background:rgba(193,58,58,.1);}
.tn-content{flex:1;overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:8px;}
.tn-field{margin:0;}
.tn-label{margin:0 0 3px;text-transform:uppercase;letter-spacing:.06em;
  font-size:10px;font-weight:800;color:var(--tn-text-label);}
.tn-input-wrap{position:relative;}
.tn-textarea{width:100%;min-height:44px;max-height:120px;border:2px solid var(--tn-border-input);
  border-radius:8px;padding:4px 30px 4px 6px;font:inherit;font-size:12px;
  background:var(--tn-bg);color:var(--tn-text);resize:vertical;box-sizing:border-box;}
.tn-textarea:focus{border-color:var(--tn-primary);outline:none;box-shadow:0 0 0 2px var(--tn-primary-light);}
.tn-gen-icon{position:absolute;right:4px;bottom:4px;border:none;background:transparent;
  color:var(--tn-text-muted);cursor:pointer;padding:2px;font-size:16px;line-height:1;border-radius:4px;}
.tn-gen-icon:hover{color:var(--tn-primary);background:var(--tn-primary-light);}
.tn-gen-icon:disabled{opacity:.4;cursor:not-allowed;}
.tn-select{width:100%;border:2px solid var(--tn-border-input);border-radius:8px;
  padding:3px 6px;font:inherit;font-size:11px;font-weight:700;background:var(--tn-surface);
  color:var(--tn-text-heading);cursor:pointer;}
.tn-select:focus{border-color:var(--tn-primary);outline:none;}
.tn-result{border:1px solid var(--tn-border);border-radius:8px;padding:4px 6px;background:var(--tn-surface);}
.tn-result-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;}
.tn-result-title{text-transform:uppercase;letter-spacing:.04em;font-size:10px;
  font-weight:800;color:var(--tn-text-title);}
.tn-copy-btn{border:none;background:transparent;color:var(--tn-text-muted);
  cursor:pointer;padding:2px;font-size:14px;line-height:1;border-radius:4px;}
.tn-copy-btn:hover{color:var(--tn-primary);background:var(--tn-primary-light);}
.tn-result-box{width:100%;min-height:32px;max-height:100px;border:1px solid var(--tn-border);
  border-radius:6px;padding:3px 6px;font:inherit;font-size:11px;background:transparent;
  color:var(--tn-text);resize:vertical;box-sizing:border-box;}
.tn-result-box:focus{border-color:var(--tn-primary);outline:none;}
.tn-actions{display:flex;gap:4px;flex-wrap:wrap;}
.tn-btn{border:none;border-radius:6px;padding:4px 8px;min-height:26px;font:inherit;
  font-size:11px;font-weight:700;cursor:pointer;background:var(--tn-surface);
  color:var(--tn-text-link);border:1px solid var(--tn-border-input);}
.tn-btn:hover{background:var(--tn-primary-light);border-color:var(--tn-primary);}
.tn-status{min-height:14px;margin:0;font-weight:700;font-size:10px;color:var(--tn-success);}
.tn-status.error{color:var(--tn-error);}
.tn-footer{display:flex;justify-content:flex-end;gap:4px;padding:4px 8px;
  border-top:1px solid var(--tn-border);flex-shrink:0;}
.tn-icon-btn{border:none;background:transparent;color:var(--tn-text-muted);
  cursor:pointer;padding:3px;font-size:14px;border-radius:4px;}
.tn-icon-btn:hover{color:var(--tn-text-link);background:var(--tn-primary-light);}
.tn-resize-handle{position:absolute;z-index:1;}
.tn-resize-r{top:0;right:-3px;width:6px;height:100%;cursor:ew-resize;}
.tn-resize-b{bottom:-3px;left:0;width:100%;height:6px;cursor:ns-resize;}
.tn-resize-br{bottom:-4px;right:-4px;width:10px;height:10px;cursor:nwse-resize;}
  `;
  document.head.appendChild(styleEl);

  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  const panel = wrapper.firstElementChild;
  document.body.appendChild(panel);

  // --- State ---
  let selectedLevel = 'A';
  let isGenerating = false;
  let isComposing = false;

  const el = (id) => document.getElementById(id);
  const sourceText = el('tn-source');
  const line2 = el('tn-line2');
  const line3 = el('tn-line3');
  const statusEl = el('tn-status');
  const levelSelect = el('tn-level');
  const genBtn = el('tn-gen');

  function setStatus(msg, isError) {
    statusEl.textContent = msg || '';
    statusEl.classList.toggle('error', !!isError);
  }

  function loadSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'get-settings' }, (r) => resolve(r || { provider: 'deepseek', apiKey: '', model: '', endpoint: '' }));
    });
  }
  function loadNotes() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'get-notes' }, (r) => resolve(Array.isArray(r) ? r : []));
    });
  }
  function saveNote(n) { chrome.runtime.sendMessage({ action: 'save-note', note: n }); }
  function saveUiState(s) { chrome.runtime.sendMessage({ action: 'save-ui-state', state: s }); }
  function loadUiState() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'get-ui-state' }, (r) => resolve(r || { sourceText: '', selectedLevel: 'A' }));
    });
  }

  function validateChinese(t) { return /[\u4e00-\u9fff]/.test(t); }

  function buildPrompt(src, level) {
    const rules = {
      A: 'Line 2 must contain only tone-marked pinyin.',
      B: 'Line 2 must group by meaning: Chinese+tone-marked pinyin together. Example: 经济jīngjì 发展fāzhǎn.',
      C: 'Line 2 must contain only Chinese.'
    };
    return `Chinese note → JSON {"line2":"","line3":""}. Level: ${level}. ${rules[level]} Line3: natural English translation. Short phrases (1-4 chars): translation only. Longer: add structure/usage note, max 50 words. Write for students, no "teaching note" phrasing. Only JSON, no extra text. Source: ${src}`;
  }

  async function onGenerate() {
    if (isGenerating) return;
    const text = sourceText.value.trim();
    if (!validateChinese(text)) { setStatus('Please enter Chinese text first.', true); return; }
    const settings = await loadSettings();
    if (!settings.apiKey || !settings.model) { setStatus('Please configure AI settings first.', true); return; }

    isGenerating = true; genBtn.disabled = true; setStatus('Generating...');
    try {
      const result = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'generate', provider: settings.provider || 'deepseek',
          apiKey: settings.apiKey, model: settings.model,
          prompt: buildPrompt(text, selectedLevel), endpoint: settings.endpoint
        }, (resp) => { resp?.error ? reject(new Error(resp.error)) : resolve(resp); });
      });
      line2.value = result.line2; line3.value = result.line3;
      saveNote({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), sourceText: text, level: selectedLevel, line2: result.line2, line3: result.line3 });
      setStatus('Done.');
    } catch (err) { setStatus(err.message || 'Failed.', true); }
    finally { isGenerating = false; genBtn.disabled = false; }
  }

  levelSelect.addEventListener('change', () => { selectedLevel = levelSelect.value; });
  sourceText.addEventListener('input', () => {
    clearTimeout(sourceText._timer);
    sourceText._timer = setTimeout(() => saveUiState({ sourceText: sourceText.value, selectedLevel }), 300);
  });
  sourceText.addEventListener('compositionstart', () => { isComposing = true; });
  sourceText.addEventListener('compositionend', () => { isComposing = false; });
  sourceText.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) { e.preventDefault(); onGenerate(); }
  });
  genBtn.addEventListener('click', onGenerate);
  el('tn-copy-l2').addEventListener('click', () => { const t = line2.value.trim(); if (!t) { setStatus('Nothing to copy.', true); return; } navigator.clipboard.writeText(t).then(() => setStatus('Copied.')); });
  el('tn-copy-l3').addEventListener('click', () => { const t = line3.value.trim(); if (!t) { setStatus('Nothing to copy.', true); return; } navigator.clipboard.writeText(t).then(() => setStatus('Copied.')); });
  el('tn-copy-all').addEventListener('click', () => {
    const parts = [];
    if (sourceText.value.trim()) parts.push('Input: ' + sourceText.value.trim());
    if (line2.value.trim()) parts.push('Note: ' + line2.value.trim());
    if (line3.value.trim()) parts.push('Explanation: ' + line3.value.trim());
    if (!parts.length) { setStatus('Nothing to copy yet.', true); return; }
    navigator.clipboard.writeText(parts.join('\n')).then(() => setStatus('Copied all.'));
  });
  el('tn-export').addEventListener('click', async () => {
    const notes = await loadNotes();
    if (!notes.length) { setStatus('No notes to export.', true); return; }
    const now = new Date(); const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const lc = { A: 0, B: 0, C: 0 };
    for (const n of notes) if (lc[n.level] !== undefined) lc[n.level]++;
    const unique = new Set(notes.map(n => n.sourceText)).size;
    const lines = ['# Teaching Notes', '', '**Total:** ' + notes.length + ' notes | **Unique:** ' + unique,
      '**Levels:** A=' + lc.A + ' B=' + lc.B + ' C=' + lc.C, '**Exported:** ' + now.toLocaleString(), '', '---', ''];
    for (const n of notes) lines.push('## ' + n.sourceText, '', '**Level:** ' + n.level, '', '**Note:** ' + n.line2, '', '**Explanation:** ' + n.line3, '', '*' + new Date(n.createdAt).toLocaleString() + ' | ID: ' + n.id + '*', '', '---', '');
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'teaching-notes-' + ts + '.md';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    setStatus('Exported ' + notes.length + ' notes.');
  });
  el('tn-reset').addEventListener('click', () => {
    selectedLevel = 'A'; levelSelect.value = 'A';
    sourceText.value = ''; line2.value = ''; line3.value = '';
    setStatus('Reset.'); saveUiState({ sourceText: '', selectedLevel: 'A' });
  });
  el('tn-settings').addEventListener('click', () => { chrome.runtime.openOptionsPage(); });
  el('tn-close').addEventListener('click', () => { panel.classList.remove('visible'); chrome.runtime.sendMessage({ action: 'panel-hidden' }); });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'show-panel') {
      panel.classList.add('visible');
      loadUiState().then((s) => { sourceText.value = s.sourceText || ''; selectedLevel = s.selectedLevel || 'A'; levelSelect.value = selectedLevel; });
    }
    if (msg.action === 'hide-panel') panel.classList.remove('visible');
  });

  // --- Drag ---
  let dragOffX = 0, dragOffY = 0, isDragging = false;
  el('tn-drag').addEventListener('mousedown', (e) => {
    if (e.target === el('tn-close')) return;
    isDragging = true; dragOffX = e.clientX - panel.offsetLeft; dragOffY = e.clientY - panel.offsetTop;
    document.addEventListener('mousemove', onDrag); document.addEventListener('mouseup', endDrag); e.preventDefault();
  });
  function onDrag(e) {
    if (!isDragging) return;
    let x = e.clientX - dragOffX, y = e.clientY - dragOffY;
    x = Math.max(0, Math.min(x, window.innerWidth - 100));
    y = Math.max(0, Math.min(y, window.innerHeight - 50));
    panel.style.left = x + 'px'; panel.style.top = y + 'px'; panel.style.right = 'auto'; panel.style.bottom = 'auto';
  }
  function endDrag() { isDragging = false; document.removeEventListener('mousemove', onDrag); document.removeEventListener('mouseup', endDrag); }

  // --- Resize ---
  let rDir = null, rSX, rSY, rSW, rSH;
  function startResize(dir, e) {
    rDir = dir; rSX = e.clientX; rSY = e.clientY; rSW = panel.offsetWidth; rSH = panel.offsetHeight;
    document.addEventListener('mousemove', onResize); document.addEventListener('mouseup', endResize);
    e.preventDefault(); e.stopPropagation();
  }
  el('tn-resize-r').addEventListener('mousedown', (e) => startResize('r', e));
  el('tn-resize-b').addEventListener('mousedown', (e) => startResize('b', e));
  el('tn-resize-br').addEventListener('mousedown', (e) => startResize('br', e));
  function onResize(e) {
    if (!rDir) return;
    const dx = e.clientX - rSX, dy = e.clientY - rSY;
    let nw = rSW, nh = rSH;
    if (rDir === 'r' || rDir === 'br') nw = Math.max(200, Math.min(600, rSW + dx));
    if (rDir === 'b' || rDir === 'br') nh = Math.max(200, Math.min(window.innerHeight, rSH + dy));
    panel.style.width = nw + 'px'; panel.style.height = nh + 'px';
  }
  function endResize() { rDir = null; document.removeEventListener('mousemove', onResize); document.removeEventListener('mouseup', endResize); }

})();
