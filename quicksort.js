/**
 * quicksort.js
 * Core algorithm engine — generates a flat list of animation steps
 * from the QuickSort algorithm. No DOM manipulation here.
 */

const QS = (() => {

  /* ─── Colour state identifiers ─── */
  const C = {
    UNSORTED:  'unsorted',
    PIVOT:     'pivot',
    COMPARING: 'comparing',
    SWAPPING:  'swapping',
    SORTED:    'sorted',
    BOUNDARY:  'boundary',
  };

  /* ─── Code line identifiers (maps to displayed code) ─── */
  const LINE = {
    FN_CALL:     0,
    CHOOSE_PIVOT:1,
    INIT_I:      2,
    LOOP:        3,
    COMPARE:     4,
    SWAP_ELEM:   5,
    PLACE_PIVOT: 6,
    RECURSE_L:   7,
    RECURSE_R:   8,
    BASE_CASE:   9,
  };

  /* ─── Pivot strategy implementations ─── */
  const pivotStrategies = {
    last:    (arr, lo, hi)       => hi,
    first:   (arr, lo, hi)       => lo,
    mid:     (arr, lo, hi)       => Math.floor((lo + hi) / 2),
    random:  (arr, lo, hi)       => lo + Math.floor(Math.random() * (hi - lo + 1)),
    median3: (arr, lo, hi) => {
      const mid = Math.floor((lo + hi) / 2);
      const candidates = [[arr[lo], lo], [arr[mid], mid], [arr[hi], hi]];
      candidates.sort((a, b) => a[0] - b[0]);
      return candidates[1][1]; // median index
    },
  };

  /* ─── Pivot strategy descriptions for the explain panel ─── */
  const strategyInfo = {
    last:    { label: 'Last element', desc: 'Always pick arr[hi] as pivot. Simple but O(n²) on sorted arrays.' },
    first:   { label: 'First element', desc: 'Always pick arr[lo] as pivot. Worst on sorted / reverse-sorted.' },
    mid:     { label: 'Middle element', desc: 'Pick arr[⌊(lo+hi)/2⌋]. Much better on nearly-sorted data.' },
    random:  { label: 'Random element', desc: 'Pick a random index in [lo…hi]. Expected O(n log n) — immune to adversarial patterns.' },
    median3: { label: 'Median of three', desc: 'Sample lo, mid, hi — pick the median value. Best general-purpose pivot choice.' },
  };

  /**
   * buildSteps — runs QuickSort on a copy of `arr` and records every
   * interesting moment as a step object, returning them all.
   *
   * @param {number[]} arr       — input array
   * @param {string}   strategy  — pivot strategy key
   * @returns {{ steps, comparisons, swaps, recCalls }}
   */
  function buildSteps(arr, strategy) {
    const steps      = [];
    const sortedSet  = new Set();
    const callStack  = [];
    let comparisons  = 0;
    let swaps        = 0;
    let recCalls     = 0;

    const choosePivot = pivotStrategies[strategy] || pivotStrategies.last;

    /* ── helpers ── */
    function colors(overrides = {}) {
      const c = {};
      for (let k = 0; k < arr.length; k++) {
        c[k] = sortedSet.has(k) ? C.SORTED : C.UNSORTED;
      }
      return Object.assign(c, overrides);
    }

    function snap(info, line, vars = {}) {
      steps.push({
        arr:       [...arr],
        colors:    colors(),
        info,
        line,
        vars,
        stack:     callStack.map(f => ({ ...f })),
      });
    }

    function partition(lo, hi) {
      const pivotIdx = choosePivot(arr, lo, hi);
      const pivotOriginalIdx = pivotIdx;

      /* move pivot to end if not already */
      if (pivotIdx !== hi) {
        [arr[pivotIdx], arr[hi]] = [arr[hi], arr[pivotIdx]];
        swaps++;
      }
      const pivotVal = arr[hi];

      /* snapshot: pivot chosen */
      const c0 = colors({ [hi]: C.PIVOT });
      for (let k = lo; k < hi; k++) if (!sortedSet.has(k)) c0[k] = C.UNSORTED;
      steps.push({
        arr: [...arr], colors: c0, line: LINE.CHOOSE_PIVOT,
        info: `<strong>Pivot = ${pivotVal}</strong> chosen using <em>${strategyInfo[strategy].label}</em> from range [${lo}…${hi}]. Moved to position ${hi}.`,
        vars: { pivot: pivotVal, lo, hi, i: lo - 1 },
        stack: callStack.map(f => ({ ...f })),
      });

      let i = lo - 1;

      for (let j = lo; j < hi; j++) {
        comparisons++;

        /* snapshot: comparing */
        const cCmp = colors({ [hi]: C.PIVOT, [j]: C.COMPARING });
        if (i >= lo) cCmp[i] = C.BOUNDARY;
        steps.push({
          arr: [...arr], colors: cCmp, line: LINE.COMPARE,
          info: `Comparing arr[<strong>${j}</strong>] = <strong>${arr[j]}</strong> with pivot <strong>${pivotVal}</strong>.`,
          vars: { pivot: pivotVal, i, j, 'arr[j]': arr[j] },
          stack: callStack.map(f => ({ ...f })),
        });

        if (arr[j] <= pivotVal) {
          i++;
          if (i !== j) {
            [arr[i], arr[j]] = [arr[j], arr[i]];
            swaps++;
            const cSwp = colors({ [hi]: C.PIVOT, [i]: C.SWAPPING, [j]: C.SWAPPING });
            steps.push({
              arr: [...arr], colors: cSwp, line: LINE.SWAP_ELEM,
              info: `arr[${j}] = ${arr[i]} ≤ pivot → <strong>swap</strong> arr[${i}] and arr[${j}].`,
              vars: { pivot: pivotVal, i, j, 'arr[i]': arr[i], 'arr[j]': arr[j] },
              stack: callStack.map(f => ({ ...f })),
            });
          } else {
            const cNoSwp = colors({ [hi]: C.PIVOT, [i]: C.BOUNDARY });
            steps.push({
              arr: [...arr], colors: cNoSwp, line: LINE.SWAP_ELEM,
              info: `arr[${j}] = ${arr[j]} ≤ pivot — already in position (i = j = ${i}), no swap needed.`,
              vars: { pivot: pivotVal, i, j },
              stack: callStack.map(f => ({ ...f })),
            });
          }
        }
      }

      /* place pivot in final position */
      const finalPos = i + 1;
      [arr[finalPos], arr[hi]] = [arr[hi], arr[finalPos]];
      swaps++;
      sortedSet.add(finalPos);

      const cPlace = colors({ [finalPos]: C.SORTED });
      steps.push({
        arr: [...arr], colors: cPlace, line: LINE.PLACE_PIVOT,
        info: `Pivot <strong>${pivotVal}</strong> placed at its final position <strong>${finalPos}</strong>. It will never move again.`,
        vars: { pivot: pivotVal, 'final index': finalPos },
        stack: callStack.map(f => ({ ...f })),
      });

      return finalPos;
    }

    function quicksort(lo, hi, depth) {
      if (lo > hi) return;

      if (lo === hi) {
        sortedSet.add(lo);
        const c = colors();
        steps.push({
          arr: [...arr], colors: c, line: LINE.BASE_CASE,
          info: `Base case: single element arr[${lo}] = <strong>${arr[lo]}</strong> is trivially sorted.`,
          vars: { lo, hi },
          stack: callStack.map(f => ({ ...f })),
        });
        return;
      }

      recCalls++;
      callStack.push({ lo, hi, depth, id: recCalls });

      const c0 = colors();
      steps.push({
        arr: [...arr], colors: c0, line: LINE.FN_CALL,
        info: `<strong>quicksort(arr, ${lo}, ${hi})</strong> called — sorting ${hi - lo + 1} elements at depth ${depth}.`,
        vars: { lo, hi, depth, size: hi - lo + 1 },
        stack: callStack.map(f => ({ ...f })),
      });

      const p = partition(lo, hi);

      /* recurse left */
      if (lo < p - 1) {
        snap(`Recursing left: quicksort(arr, ${lo}, ${p - 1})`, LINE.RECURSE_L,
             { lo, hi: p - 1 });
      }
      quicksort(lo, p - 1, depth + 1);

      /* recurse right */
      if (p + 1 < hi) {
        snap(`Recursing right: quicksort(arr, ${p + 1}, ${hi})`, LINE.RECURSE_R,
             { lo: p + 1, hi });
      }
      quicksort(p + 1, hi, depth + 1);

      callStack.pop();
    }

    quicksort(0, arr.length - 1, 0);

    /* final fully-sorted snapshot */
    const cFinal = {};
    for (let k = 0; k < arr.length; k++) cFinal[k] = C.SORTED;
    steps.push({
      arr: [...arr], colors: cFinal, line: -1,
      info: `✓ Array fully sorted in <strong>${comparisons}</strong> comparisons and <strong>${swaps}</strong> swaps.`,
      vars: { comparisons, swaps, 'recursive calls': recCalls },
      stack: [],
    });

    return { steps, comparisons, swaps, recCalls };
  }

  /**
   * runSilent — runs QuickSort without recording steps.
   * Used for the strategy comparison table.
   */
  function runSilent(inputArr, strategy) {
    const arr = [...inputArr];
    const choose = pivotStrategies[strategy] || pivotStrategies.last;
    let cmp = 0, swp = 0, rec = 0;

    function partition(lo, hi) {
      let pi = choose(arr, lo, hi);
      if (pi !== hi) { [arr[pi], arr[hi]] = [arr[hi], arr[pi]]; swp++; }
      const pv = arr[hi];
      let i = lo - 1;
      for (let j = lo; j < hi; j++) {
        cmp++;
        if (arr[j] <= pv) {
          i++;
          if (i !== j) { [arr[i], arr[j]] = [arr[j], arr[i]]; swp++; }
        }
      }
      [arr[i + 1], arr[hi]] = [arr[hi], arr[i + 1]]; swp++;
      return i + 1;
    }

    function qs(lo, hi) {
      if (lo >= hi) return;
      rec++;
      const p = partition(lo, hi);
      qs(lo, p - 1);
      qs(p + 1, hi);
    }

    qs(0, arr.length - 1);
    return { cmp, swp, rec };
  }

  /* ─── Array generators ─── */
  function generateArray(size, mode) {
    switch (mode) {
      case 'sorted':  return Array.from({ length: size }, (_, i) => Math.round((i + 1) * (95 / size)));
      case 'reverse': return Array.from({ length: size }, (_, i) => Math.round((size - i) * (95 / size)));
      case 'nearly': {
        const a = Array.from({ length: size }, (_, i) => Math.round((i + 1) * (95 / size)));
        const swaps = Math.max(1, Math.floor(size / 5));
        for (let k = 0; k < swaps; k++) {
          const x = Math.floor(Math.random() * size);
          const y = Math.floor(Math.random() * size);
          [a[x], a[y]] = [a[y], a[x]];
        }
        return a;
      }
      default: {
        const used = new Set();
        const a = [];
        while (a.length < size) {
          const v = Math.floor(Math.random() * 95) + 5;
          if (!used.has(v)) { used.add(v); a.push(v); }
        }
        return a;
      }
    }
  }

  /* ─── Worst-case complexity detector ─── */
  function isWorstCase(arr, strategy) {
    if ((strategy === 'last' || strategy === 'first') &&
        (isSorted(arr) || isReverseSorted(arr))) return true;
    return false;
  }
  function isSorted(a)        { return a.every((v, i) => i === 0 || a[i - 1] <= v); }
  function isReverseSorted(a) { return a.every((v, i) => i === 0 || a[i - 1] >= v); }

  /* ─── Public API ─── */
  return { buildSteps, runSilent, generateArray, strategyInfo, isWorstCase, C, LINE };
})();
