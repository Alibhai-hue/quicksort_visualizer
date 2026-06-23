/**
 * renderer.js
 * All DOM rendering. Receives a step object and updates the UI.
 * No algorithm logic here — pure view layer.
 */

const Renderer = (() => {

  /* ── Color map: state → gradient ── */
  const COLOR_MAP = {
    unsorted:  'linear-gradient(to top, #1e3a6e, #4f8ef7)',
    pivot:     'linear-gradient(to top, #92400e, #f59e0b)',
    comparing: 'linear-gradient(to top, #7f1d1d, #f87171)',
    swapping:  'linear-gradient(to top, #4c1d95, #a78bfa)',
    sorted:    'linear-gradient(to top, #065f46, #34d399)',
    boundary:  'linear-gradient(to top, #1e293b, #64748b)',
  };

  /* ── Code lines with HTML syntax highlighting ── */
  const CODE_LINES = [
    /* 0  */ `<span class="kw">function</span> <span class="fn">quicksort</span>(arr, lo, hi) {`,
    /* 1  */ `  <span class="kw">const</span> pivotIdx <span class="op">=</span> <span class="fn">choosePivot</span>(arr, lo, hi)  <span class="cm">// select pivot</span>`,
    /* 2  */ `  <span class="kw">let</span> i <span class="op">=</span> lo <span class="op">-</span> <span class="num">1</span>                              <span class="cm">// boundary pointer</span>`,
    /* 3  */ `  <span class="kw">for</span> (<span class="kw">let</span> j <span class="op">=</span> lo; j <span class="op">&lt;</span> hi; j<span class="op">++</span>) {`,
    /* 4  */ `    <span class="kw">if</span> (arr[j] <span class="op">&lt;=</span> pivot) {                 <span class="cm">// compare with pivot</span>`,
    /* 5  */ `      i<span class="op">++</span>; <span class="fn">swap</span>(arr, i, j)               <span class="cm">// swap into left partition</span>`,
    /* 6  */ `  } }  <span class="fn">swap</span>(arr, i<span class="op">+</span><span class="num">1</span>, hi)               <span class="cm">// place pivot at final position</span>`,
    /* 7  */ `  <span class="fn">quicksort</span>(arr, lo, i)                   <span class="cm">// recurse left</span>`,
    /* 8  */ `  <span class="fn">quicksort</span>(arr, i<span class="op">+</span><span class="num">2</span>, hi)                 <span class="cm">// recurse right</span>`,
    /* 9  */ `  <span class="kw">return</span>                                  <span class="cm">// base case: single element</span>`,
    /* 10 */ `}`,
  ];

  /* line index → highlight class */
  const LINE_CLASSES = {
    0: 'hl',
    1: 'hl-pivot',
    2: 'hl',
    3: 'hl',
    4: 'hl',
    5: 'hl-swap',
    6: 'hl-swap',
    7: 'hl',
    8: 'hl',
    9: 'hl',
  };

  /* step.line value → code line index */
  const LINE_MAP = { 0:0, 1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:7, 8:8, 9:9 };

  /* ── Explain text for each line ── */
  const LINE_EXPLAIN = {
    0: 'Calling quicksort with the current sub-array range [lo…hi]. If lo ≥ hi, the sub-array has 0 or 1 elements and is already sorted.',
    1: 'Selecting the pivot using the chosen strategy. The pivot will define the partition boundary.',
    2: 'Initialising i to lo−1. i tracks the right edge of the "smaller than pivot" partition as it grows.',
    3: 'Scanning every element j from lo to hi−1, comparing each to the pivot.',
    4: 'If arr[j] ≤ pivot, it belongs in the left partition. We increment i and swap arr[i] with arr[j].',
    5: 'Swapping the element into place. After the loop, all elements left of i+1 are ≤ pivot.',
    6: 'Placing the pivot at position i+1 — its correct final position. Everything left is smaller, everything right is larger.',
    7: 'Recursing on the left sub-array [lo … pivot−1]. Sorts all elements smaller than the pivot.',
    8: 'Recursing on the right sub-array [pivot+1 … hi]. Sorts all elements larger than the pivot.',
    9: 'Base case reached: sub-array has one element. It is trivially sorted — return immediately.',
  };

  /* ── Render bars ── */
  function renderBars(stage, step) {
    const n = step.arr.length;
    const max = Math.max(...step.arr, 1);
    stage.innerHTML = '';

    step.arr.forEach((val, i) => {
      const state  = step.colors[i] || 'unsorted';
      const color  = COLOR_MAP[state] || COLOR_MAP.unsorted;
      const pct    = val / max;
      const height = Math.max(4, Math.round(pct * 180));

      const wrap = document.createElement('div');
      wrap.className = `bar-wrap${state === 'pivot' ? ' pivot' : ''}${state === 'sorted' ? ' sorted' : ''}`;

      const bar = document.createElement('div');
      bar.className = `bar${state === 'pivot' ? ' pivot-anim' : ''}`;
      bar.style.height  = height + 'px';
      bar.style.background = color;
      bar.style.width = '100%';
      bar.title = `Index ${i} = ${val}`;

      const lbl = document.createElement('div');
      lbl.className = 'bar-val';
      lbl.textContent = n <= 16 ? val : '';

      wrap.appendChild(bar);
      wrap.appendChild(lbl);
      stage.appendChild(wrap);
    });
  }

  /* ── Render info bar ── */
  function renderInfo(el, step) {
    el.innerHTML = step.info || '';
  }

  /* ── Render code panel ── */
  function renderCode(preEl, step) {
    const activeLine = step && step.line !== undefined ? LINE_MAP[step.line] : -1;
    preEl.innerHTML = CODE_LINES.map((src, idx) => {
      const cls = idx === activeLine ? (LINE_CLASSES[idx] || 'hl') : '';
      return `<span class="code-line${cls ? ' ' + cls : ''}">${src}</span>`;
    }).join('\n');
  }

  /* ── Render explain panel ── */
  function renderExplain(textEl, varsEl, step) {
    if (!step) {
      textEl.textContent = 'Step through the algorithm to see explanations.';
      varsEl.innerHTML   = '';
      return;
    }
    textEl.innerHTML = LINE_EXPLAIN[step.line] || step.info || '';
    const vars = step.vars || {};
    const keys = Object.keys(vars);
    if (!keys.length) { varsEl.innerHTML = ''; return; }

    varsEl.innerHTML = keys.map(k => `
      <div class="var-row">
        <span class="var-name">${k}</span>
        <span class="var-val">${vars[k]}</span>
      </div>`).join('');
  }

  /* ── Render call stack ── */
  function renderCallStack(el, step) {
    const stack = step && step.stack ? step.stack : [];
    if (!stack.length) {
      el.innerHTML = '<div class="stack-empty">Call stack is empty.</div>';
      return;
    }
    // newest frame at top
    el.innerHTML = [...stack].reverse().map((f, i) => {
      const isActive = i === 0;
      return `
        <div class="stack-frame${isActive ? ' active' : ''}">
          <span class="frame-depth">d${f.depth}</span>
          <span class="frame-sig">quicksort(arr, ${f.lo}, ${f.hi})</span>
          <span class="frame-range">[${f.hi - f.lo + 1} elem]</span>
        </div>`;
    }).join('');
  }

  /* ── Render step log entry ── */
  function appendLog(logEl, idx, step) {
    // Remove empty placeholder
    const empty = logEl.querySelector('.log-empty');
    if (empty) empty.remove();

    const item = document.createElement('div');
    item.className = 'log-item';
    item.innerHTML = `<span class="log-idx">#${idx}</span><span class="log-msg">${step.info}</span>`;
    logEl.prepend(item);
  }

  /* ── Render strategy comparison table ── */
  function renderCompare(el, results, inputArr) {
    if (!results.length) { el.innerHTML = ''; return; }

    const sorted = [...results].sort((a, b) => a.cmp - b.cmp);
    const maxCmp = Math.max(...results.map(r => r.cmp));

    const rows = sorted.map((r, i) => {
      const isBest = i === 0;
      const barPct = maxCmp ? Math.round((r.cmp / maxCmp) * 100) : 0;
      const barColor = isBest ? '#22c55e' : '#4f8ef7';
      return `
        <tr class="${isBest ? 'best-row' : ''}">
          <td>${r.label}${isBest ? '<span class="winner-badge">best</span>' : ''}</td>
          <td>${r.cmp}</td>
          <td>${r.swp}</td>
          <td>${r.rec}</td>
          <td class="bar-cell">
            <div class="bar-track">
              <div class="bar-fill" style="width:${barPct}%;background:${barColor}"></div>
            </div>
          </td>
        </tr>`;
    }).join('');

    el.innerHTML = `
      <p style="font-size:12px;color:var(--text-muted);margin-bottom:0.75rem">
        Input: [${inputArr.join(', ')}] · Sorted by fewest comparisons
      </p>
      <table class="compare-table">
        <thead>
          <tr>
            <th>Strategy</th>
            <th>Comparisons</th>
            <th>Swaps</th>
            <th>Recursive calls</th>
            <th>Relative cost</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  /* ── Update stats counters ── */
  function updateStats(cmp, swp, rec, stp) {
    document.getElementById('s-cmp').textContent = cmp;
    document.getElementById('s-swp').textContent = swp;
    document.getElementById('s-rec').textContent = rec;
    document.getElementById('s-stp').textContent = stp;
  }

  /* ── Update complexity badge ── */
  function updateComplexityBadge(arr, strategy) {
    const el = document.getElementById('complexity-tag');
    if (QS.isWorstCase(arr, strategy)) {
      el.textContent = 'O(n²) worst case — try a different pivot!';
      el.classList.add('worst');
    } else {
      el.textContent = 'O(n log n) average';
      el.classList.remove('worst');
    }
  }

  return {
    renderBars,
    renderInfo,
    renderCode,
    renderExplain,
    renderCallStack,
    appendLog,
    renderCompare,
    updateStats,
    updateComplexityBadge,
  };
})();
