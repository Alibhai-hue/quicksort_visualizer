/**
 * app.js
 * Application controller — wires controls, manages state,
 * calls QS (algorithm) and Renderer (view).
 */

(() => {

  /* ─── State ─────────────────────────────────────────── */
  let arr         = [];
  let steps       = [];
  let stepIdx     = 0;
  let playing     = false;
  let playTimer   = null;
  let comparisons = 0;
  let swaps       = 0;
  let recCalls    = 0;
  let logCount    = 0;

  /* ─── DOM refs ──────────────────────────────────────── */
  const $ = id => document.getElementById(id);

  const barStage    = $('bar-stage');
  const infoBar     = $('info-bar');
  const codeBlock   = $('code-block');
  const explainText = $('explain-text');
  const explainVars = $('explain-vars');
  const callStackEl = $('call-stack');
  const stepLogEl   = $('step-log');
  const compareRes  = $('compare-result');
  const playBtn     = $('play-btn');
  const sizeSlider  = $('size-slider');
  const sizeDisplay = $('size-display');
  const speedSlider = $('speed-slider');
  const speedDisplay= $('speed-display');
  const inputType   = $('input-type');
  const customGroup = $('custom-group');
  const customInput = $('custom-input');
  const pivotPivotInfo = $('code-pivot-info');

  /* ─── Helpers ───────────────────────────────────────── */
  function getSpeed()    { return Math.round(1100 - parseInt(speedSlider.value) * 100); }
  function getSize()     { return parseInt(sizeSlider.value); }
  function getStrategy() { return document.querySelector('input[name="pivot"]:checked')?.value || 'last'; }

  /* ─── Array generation ──────────────────────────────── */
  function generateAndReset() {
    const mode = inputType.value;
    if (mode === 'custom') return; // custom handled separately
    arr = QS.generateArray(getSize(), mode);
    initViz();
  }

  function applyCustomArray() {
    const raw  = customInput.value.trim();
    const vals = raw.split(',')
                    .map(x => parseInt(x.trim()))
                    .filter(x => !isNaN(x) && x >= 1 && x <= 100);
    if (vals.length < 2) {
      customInput.style.borderColor = 'var(--red)';
      setTimeout(() => (customInput.style.borderColor = ''), 1200);
      return;
    }
    arr = vals;
    sizeSlider.value   = Math.min(24, arr.length);
    sizeDisplay.textContent = arr.length;
    initViz();
  }

  /* ─── Visualization init ────────────────────────────── */
  function initViz() {
    stopPlay();
    stepIdx     = 0;
    logCount    = 0;
    comparisons = 0;
    swaps       = 0;
    recCalls    = 0;

    const strategy = getStrategy();
    const result   = QS.buildSteps([...arr], strategy);
    steps          = result.steps;

    /* reset log */
    stepLogEl.innerHTML = '<div class="log-empty">Steps will appear here as you advance.</div>';

    /* update pivot info label */
    pivotPivotInfo.textContent = `Strategy: ${QS.strategyInfo[strategy].label}`;

    /* render initial state */
    const initial = {
      arr:    [...arr],
      colors: Object.fromEntries(arr.map((_, i) => [i, 'unsorted'])),
      info:   'Press <kbd>Play</kbd> or <kbd>Step →</kbd> to begin sorting.',
      line:   -1,
      vars:   {},
      stack:  [],
    };

    Renderer.renderBars(barStage, initial);
    Renderer.renderInfo(infoBar, initial);
    Renderer.renderCode(codeBlock, initial);
    Renderer.renderExplain(explainText, explainVars, null);
    Renderer.renderCallStack(callStackEl, null);
    Renderer.updateStats(0, 0, 0, 0);
    Renderer.updateComplexityBadge(arr, strategy);

    playBtn.textContent = '▶ Play';
    playBtn.disabled    = false;
    compareRes.innerHTML = '';
  }

  /* ─── Step execution ────────────────────────────────── */
  function applyStep() {
    if (stepIdx >= steps.length) return false;
    const step = steps[stepIdx];
    stepIdx++;

    /* accumulate stats from first step data */
    if (step.vars) {
      if (step.vars.comparisons !== undefined) comparisons = step.vars.comparisons;
      if (step.vars.swaps       !== undefined) swaps       = step.vars.swaps;
    }
    /* count events from line type */
    const l = step.line;
    if (l === 4) comparisons++;    // compare line
    if (l === 5 || l === 6) swaps++; // swap lines
    if (l === 0) recCalls++;       // fn call line

    logCount++;
    Renderer.renderBars(barStage, step);
    Renderer.renderInfo(infoBar, step);
    Renderer.renderCode(codeBlock, step);
    Renderer.renderExplain(explainText, explainVars, step);
    Renderer.renderCallStack(callStackEl, step);
    Renderer.appendLog(stepLogEl, logCount, step);
    Renderer.updateStats(comparisons, swaps, recCalls, stepIdx);

    if (stepIdx >= steps.length) {
      stopPlay();
      playBtn.textContent = '↺ Done';
    }
    return true;
  }

  /* ─── Playback ──────────────────────────────────────── */
  function startPlay() {
    if (stepIdx >= steps.length) { initViz(); return; }
    playing = true;
    playBtn.textContent = '⏸ Pause';
    playTimer = setInterval(() => {
      if (!applyStep()) stopPlay();
    }, getSpeed());
  }

  function stopPlay() {
    playing = false;
    clearInterval(playTimer);
    playTimer = null;
    if (stepIdx < steps.length) playBtn.textContent = '▶ Play';
  }

  function togglePlay() {
    if (playing) { stopPlay(); return; }
    // if finished, reset first
    if (stepIdx >= steps.length) { initViz(); setTimeout(startPlay, 50); return; }
    startPlay();
  }

  /* ─── Tab switching ─────────────────────────────────── */
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
      btn.classList.add('active');
      $('tab-' + target).classList.remove('hidden');
    });
  });

  /* ─── Strategy comparison ───────────────────────────── */
  function runComparison() {
    const strategies = ['last', 'first', 'mid', 'random', 'median3'];
    const results = strategies.map(s => {
      const r = QS.runSilent([...arr], s);
      return {
        label: QS.strategyInfo[s].label,
        cmp: r.cmp,
        swp: r.swp,
        rec: r.rec,
      };
    });
    Renderer.renderCompare(compareRes, results, arr);
  }

  /* ─── Event wiring ──────────────────────────────────── */
  playBtn.addEventListener('click', togglePlay);

  $('step-btn').addEventListener('click', () => {
    stopPlay();
    applyStep();
  });

  $('reset-btn').addEventListener('click', () => {
    stopPlay();
    initViz();
  });

  $('gen-btn').addEventListener('click', generateAndReset);

  $('apply-custom').addEventListener('click', applyCustomArray);

  customInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') applyCustomArray();
  });

  sizeSlider.addEventListener('input', function () {
    sizeDisplay.textContent = this.value;
    if (inputType.value !== 'custom') generateAndReset();
  });

  speedSlider.addEventListener('input', function () {
    speedDisplay.textContent = this.value;
    if (playing) { stopPlay(); startPlay(); } // restart with new speed
  });

  inputType.addEventListener('change', function () {
    customGroup.classList.toggle('hidden', this.value !== 'custom');
    if (this.value !== 'custom') generateAndReset();
  });

  document.querySelectorAll('input[name="pivot"]').forEach(radio => {
    radio.addEventListener('change', () => {
      stopPlay();
      initViz();
    });
  });

  $('compare-btn').addEventListener('click', runComparison);

  $('clear-log').addEventListener('click', () => {
    stepLogEl.innerHTML = '<div class="log-empty">Log cleared.</div>';
    logCount = 0;
  });

  /* ─── Keyboard shortcuts ────────────────────────────── */
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'Space')      { e.preventDefault(); togglePlay(); }
    if (e.code === 'ArrowRight') { stopPlay(); applyStep(); }
    if (e.code === 'KeyR')       { stopPlay(); initViz(); }
  });

  /* ─── Bootstrap ─────────────────────────────────────── */
  generateAndReset();

})();
