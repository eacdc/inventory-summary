(function () {
  'use strict';

  const isLocalHost = typeof window !== 'undefined' && /localhost|127\.0\.0\.1/i.test(window.location.hostname);
  const API_BASE = isLocalHost ? 'http://localhost:3001/api' : 'https://cdcapi.onrender.com/api';

  const els = {
    tabItemwise: document.getElementById('tab-itemwise'),
    tabClientwise: document.getElementById('tab-clientwise'),
    tabPonoNoClient: document.getElementById('tab-pono-noclient'),
    tabAllSummary: document.getElementById('tab-all-summary'),
    tabStockBuffer: document.getElementById('tab-stock-buffer'),
    tabCategorywise: document.getElementById('tab-categorywise'),
    tabJobwise: document.getElementById('tab-jobwise'),
    itemwisePanel: document.getElementById('itemwise-panel'),
    clientwisePanel: document.getElementById('clientwise-panel'),
    poPanel: document.getElementById('po-noclient-panel'),
    allSummaryPanel: document.getElementById('all-summary-panel'),
    stockBufferPanel: document.getElementById('stock-buffer-panel'),
    categorywisePanel: document.getElementById('categorywise-panel'),
    categorywiseCards: document.getElementById('categorywise-cards'),
    categorywiseHead: document.getElementById('categorywise-head'),
    categorywiseBody: document.getElementById('categorywise-body'),
    jobwisePanel: document.getElementById('jobwise-panel'),
    jobwiseBody: document.getElementById('jobwise-body'),
    jobwiseGroupBar: document.querySelector('.jobwise-group-bar'),
    stockBufferDeckle: document.getElementById('stock-buffer-deckle'),
    stockBufferGsm: document.getElementById('stock-buffer-gsm'),
    stockBufferQuality: document.getElementById('stock-buffer-quality'),
    stockBufferSizeL: document.getElementById('stock-buffer-sizel'),
    stockBufferBody: document.getElementById('stock-buffer-body'),
    stockBufferSearchForm: document.getElementById('stock-buffer-search-form'),
    btnStockBufferSearch: document.getElementById('btn-stock-buffer-search'),
    database: document.getElementById('database'),
    fromDate: document.getElementById('from-date'),
    toDate: document.getElementById('to-date'),
    btnLoad: document.getElementById('btn-load'),
    btnExportCurrent: document.getElementById('btn-export-current'),
    btnAllSummaryPreset: document.getElementById('btn-all-summary-preset'),
    btnExportAllSummary: document.getElementById('btn-export-all-summary'),
    status: document.getElementById('status'),
    tableBody: document.getElementById('table-body'),
    clientTableBody: document.getElementById('client-table-body'),
    poTableBody: document.getElementById('po-table-body'),
    allSummaryHead: document.getElementById('all-summary-head'),
    allSummaryBody: document.getElementById('all-summary-body'),
    filterItemwise: {
      label: document.getElementById('filter-itemwise-label'),
      opening: document.getElementById('filter-itemwise-opening'),
      in: document.getElementById('filter-itemwise-in'),
      out: document.getElementById('filter-itemwise-out'),
      closing: document.getElementById('filter-itemwise-closing')
    },
    filterClient: {
      label: document.getElementById('filter-client-label'),
      opening: document.getElementById('filter-client-opening'),
      receipt: document.getElementById('filter-client-receipt'),
      issue: document.getElementById('filter-client-issue'),
      closing: document.getElementById('filter-client-closing')
    },
    filterPo: {
      pono: document.getElementById('filter-po-pono'),
      poDate: document.getElementById('filter-po-date'),
      client: document.getElementById('filter-po-client'),
      itemId: document.getElementById('filter-po-itemid'),
      itemName: document.getElementById('filter-po-itemname'),
      itemCode: document.getElementById('filter-po-itemcode'),
      stockKg: document.getElementById('filter-po-stockkg')
    },
    filterJobwise: {
      date: document.getElementById('filter-jw-date'),
      item: document.getElementById('filter-jw-item'),
      itemGroup: document.getElementById('filter-jw-itemgroup'),
      jobNum: document.getElementById('filter-jw-jobnum'),
      jobName: document.getElementById('filter-jw-jobname'),
      client: document.getElementById('filter-jw-client'),
      required: document.getElementById('filter-jw-required'),
      issued: document.getElementById('filter-jw-issued'),
      unit: document.getElementById('filter-jw-unit'),
      excess: document.getElementById('filter-jw-excess'),
      varPct: document.getElementById('filter-jw-varpct'),
      reqGsm: document.getElementById('filter-jw-reqgsm'),
      issuedGsm: document.getElementById('filter-jw-issuedgsm'),
      reqJobTotal: document.getElementById('filter-jw-reqjobtotal'),
      specMatch: document.getElementById('filter-jw-specmatch'),
      issuedStock: document.getElementById('filter-jw-issuedstock'),
      stockUnit: document.getElementById('filter-jw-stockunit'),
      issuedCost: document.getElementById('filter-jw-issuedcost'),
      reqSource: document.getElementById('filter-jw-reqsource'),
      unplanned: document.getElementById('filter-jw-unplanned')
    }
  };

  let activeTab = 'itemwise';
  let currentRows = [];
  let currentClientRows = [];
  let currentPoRows = [];
  let currentAllSummaryRows = [];
  let currentStockBufferRows = [];
  let currentCategorywiseDetail = [];
  let currentCategorywiseSummary = [];
  let categorywiseMonths = [];
  let categorywiseTree = [];
  let categorywiseHeadMonthsKey = '';
  let categorywiseFilterState = { label: '', months: {}, totalKg: '' };
  let currentJobwiseRows = [];
  let jobwiseGroupMode = 'all';
  const expandedJobwiseGroups = new Set();
  let stockBufferSearchInFlight = false;
  let allSummaryColumns = [];
  let allSummaryColumnWidths = {};
  const expandedGroups = new Set();
  const expandedClientGroups = new Set();
  const expandedCategoryNodes = new Set();
  /** All Tab Summary: numeric filter for the Aging column (days). */
  let allSummaryAgingFilter = { op: '', value: '' };
  let agingFilterPopoverEl = null;
  let agingFilterPopoverAnchor = null;
  let agingFilterDocMousedown = null;

  /** All Tab Summary: preset filter Aging ≥ 30 days and PhysicalStockInPU ≥ 1000 (frontend only). */
  let allSummaryPresetAge30Pu1000 = false;

  function setDefaultDates() {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 30);
    els.fromDate.value = toDateInput(from);
    els.toDate.value = toDateInput(to);
  }

  function toDateInput(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function setStatus(text, isError) {
    els.status.textContent = text || '';
    els.status.classList.toggle('error', Boolean(isError));
  }

  const STOCK_BUFFER_ROW_KEYS = [
    'itemCode',
    'itemName',
    'sizeW',
    'sizeL',
    'quality',
    'gsm',
    'manufacturer',
    'certification',
    'stockUnit',
    'stock',
    'freeStock',
    'clientName',
    'stockType'
  ];

  function setTab(which) {
    const isItemwise = which === 'itemwise';
    const isClientwise = which === 'clientwise';
    const isPo = which === 'po-noclient';
    const isAllSummary = which === 'all-summary';
    const isStockBuffer = which === 'stock-buffer';
    const isCategorywise = which === 'categorywise';
    const isJobwise = which === 'jobwise';

    if (isItemwise) activeTab = 'itemwise';
    else if (isClientwise) activeTab = 'clientwise';
    else if (isPo) activeTab = 'po-noclient';
    else if (isAllSummary) activeTab = 'all-summary';
    else if (isStockBuffer) activeTab = 'stock-buffer';
    else if (isCategorywise) activeTab = 'categorywise';
    else if (isJobwise) activeTab = 'jobwise';
    else activeTab = 'itemwise';

    if (els.tabItemwise) els.tabItemwise.classList.toggle('active', isItemwise);
    if (els.tabClientwise) els.tabClientwise.classList.toggle('active', isClientwise);
    if (els.tabPonoNoClient) els.tabPonoNoClient.classList.toggle('active', isPo);
    if (els.tabAllSummary) els.tabAllSummary.classList.toggle('active', isAllSummary);
    if (els.tabStockBuffer) els.tabStockBuffer.classList.toggle('active', isStockBuffer);
    if (els.tabCategorywise) els.tabCategorywise.classList.toggle('active', isCategorywise);
    if (els.tabJobwise) els.tabJobwise.classList.toggle('active', isJobwise);

    if (els.itemwisePanel) els.itemwisePanel.classList.toggle('hidden', !isItemwise);
    if (els.clientwisePanel) els.clientwisePanel.classList.toggle('hidden', !isClientwise);
    if (els.poPanel) els.poPanel.classList.toggle('hidden', !isPo);
    if (els.allSummaryPanel) els.allSummaryPanel.classList.toggle('hidden', !isAllSummary);
    if (els.stockBufferPanel) els.stockBufferPanel.classList.toggle('hidden', !isStockBuffer);
    if (els.categorywisePanel) els.categorywisePanel.classList.toggle('hidden', !isCategorywise);
    if (els.jobwisePanel) els.jobwisePanel.classList.toggle('hidden', !isJobwise);

    if (els.btnLoad) els.btnLoad.classList.toggle('hidden', isStockBuffer);

    toggleDateFilters(isItemwise || isClientwise || isPo || isCategorywise || isJobwise);
    updateAllSummaryPresetToolbar();
  }

  function updateAllSummaryPresetToolbar() {
    const btn = els.btnAllSummaryPreset;
    if (!btn) return;
    const hasRows = Array.isArray(currentAllSummaryRows) && currentAllSummaryRows.length > 0;
    btn.disabled = !hasRows;
    btn.classList.toggle('is-active', Boolean(allSummaryPresetAge30Pu1000 && hasRows));
    btn.setAttribute('aria-pressed', allSummaryPresetAge30Pu1000 && hasRows ? 'true' : 'false');
  }

  function getAllSummaryRowFieldCI(row, canonicalName) {
    if (!row || typeof row !== 'object') return undefined;
    const want = String(canonicalName || '').toLowerCase();
    const keys = Object.keys(row);
    const k = keys.find((x) => String(x).toLowerCase() === want);
    return k !== undefined ? row[k] : undefined;
  }

  function allSummaryPresetAge30Pu1000Pass(row) {
    const agingRaw = getAllSummaryRowFieldCI(row, 'Aging');
    const ageDays = parseAgingCellNumeric(agingRaw);
    if (!Number.isFinite(ageDays) || ageDays < 30) return false;
    const puRaw = getAllSummaryRowFieldCI(row, 'PhysicalStockInPU');
    const pu = Number(puRaw);
    if (!Number.isFinite(pu) || pu < 1000) return false;
    return true;
  }

  function getAllSummaryRowsAfterPreset(rows) {
    if (!allSummaryPresetAge30Pu1000) return rows;
    return rows.filter((r) => allSummaryPresetAge30Pu1000Pass(r));
  }

  function toggleDateFilters(showDateFilters) {
    const fromLabel = els.fromDate?.closest('label');
    const toLabel = els.toDate?.closest('label');
    if (fromLabel) fromLabel.style.display = showDateFilters ? '' : 'none';
    if (toLabel) toLabel.style.display = showDateFilters ? '' : 'none';
  }

  function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function fmt(v) {
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(Math.round(num(v)));
  }

  /** Number column filter: empty = no filter; otherwise value must be >= entered minimum (integers). */
  function numMinPass(value, filterRaw) {
    const t = String(filterRaw ?? '').trim();
    if (t === '') return true;
    return Math.round(num(value)) >= Math.round(num(t));
  }

  function isAgingColumnName(col) {
    return String(col || '').trim().toLowerCase() === 'aging';
  }

  function parseAgingCellNumeric(raw) {
    if (raw == null || raw === '') return NaN;
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
    const m = String(raw).match(/-?\d+/);
    return m ? Number(m[0]) : NaN;
  }

  function agingFilterIsActive() {
    const op = String(allSummaryAgingFilter.op || '').trim();
    const valStr = String(allSummaryAgingFilter.value ?? '').trim();
    if (!op || !valStr) return false;
    return Number.isFinite(Number(valStr));
  }

  function agingNumericPass(rawCell) {
    const op = String(allSummaryAgingFilter.op || '').trim();
    const valStr = String(allSummaryAgingFilter.value ?? '').trim();
    if (!op || valStr === '') return true;
    const threshold = Number(valStr);
    if (!Number.isFinite(threshold)) return true;
    const actual = parseAgingCellNumeric(rawCell);
    if (!Number.isFinite(actual)) return false;
    const a = Math.round(actual);
    const t = Math.round(threshold);
    switch (op) {
      case 'lt': return a < t;
      case 'lte': return a <= t;
      case 'gt': return a > t;
      case 'gte': return a >= t;
      case 'eq': return a === t;
      case 'neq': return a !== t;
      default: return true;
    }
  }

  function getAgingFilterSummaryLabel() {
    if (!agingFilterIsActive()) return '—';
    const op = String(allSummaryAgingFilter.op || '').trim();
    const v = String(allSummaryAgingFilter.value ?? '').trim();
    const sym = { lt: '<', lte: '≤', gt: '>', gte: '≥', eq: '=', neq: '≠' }[op] || op;
    return `${sym} ${v} days`;
  }

  function closeAgingFilterPopover() {
    if (agingFilterPopoverEl) {
      agingFilterPopoverEl.classList.add('hidden');
    }
    if (agingFilterPopoverAnchor) {
      agingFilterPopoverAnchor.setAttribute('aria-expanded', 'false');
      agingFilterPopoverAnchor = null;
    }
    if (agingFilterDocMousedown) {
      document.removeEventListener('mousedown', agingFilterDocMousedown, true);
      agingFilterDocMousedown = null;
    }
  }

  function positionAgingFilterPopover(anchor) {
    if (!agingFilterPopoverEl || !anchor) return;
    const rect = anchor.getBoundingClientRect();
    const pad = 6;
    const pop = agingFilterPopoverEl;
    pop.style.position = 'fixed';
    let left = rect.left;
    let top = rect.bottom + pad;
    const w = pop.offsetWidth || 240;
    const h = pop.offsetHeight || 180;
    if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
    if (left < 8) left = 8;
    if (top + h > window.innerHeight - 8) top = Math.max(8, rect.top - h - pad);
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
  }

  function syncAgingFilterPopoverFields() {
    if (!agingFilterPopoverEl) return;
    const opSel = agingFilterPopoverEl.querySelector('.aging-filter-op');
    const valInp = agingFilterPopoverEl.querySelector('.aging-filter-value');
    if (opSel) opSel.value = String(allSummaryAgingFilter.op || '');
    if (valInp) valInp.value = String(allSummaryAgingFilter.value ?? '');
  }

  function ensureAgingFilterPopover() {
    if (agingFilterPopoverEl) return agingFilterPopoverEl;
    const wrap = document.createElement('div');
    wrap.id = 'all-summary-aging-filter-popover';
    wrap.className = 'aging-filter-popover hidden';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-label', 'Aging filter');
    wrap.innerHTML = `
      <div class="aging-filter-popover-title">Aging (days)</div>
      <label class="aging-filter-field">
        <span>Condition</span>
        <select class="aging-filter-op filter-input">
          <option value="">Any</option>
          <option value="lt">Less than</option>
          <option value="lte">Less than or equal to</option>
          <option value="gt">Greater than</option>
          <option value="gte">Greater than or equal to</option>
          <option value="eq">Equal to</option>
          <option value="neq">Not equal to</option>
        </select>
      </label>
      <label class="aging-filter-field">
        <span>Value (days)</span>
        <input type="number" class="aging-filter-value filter-input filter-num" step="1" placeholder="e.g. 30" inputmode="numeric">
      </label>
      <div class="aging-filter-popover-actions">
        <button type="button" class="aging-filter-apply">Apply</button>
        <button type="button" class="aging-filter-clear secondary">Clear</button>
      </div>
    `;
    document.body.appendChild(wrap);
    agingFilterPopoverEl = wrap;

    wrap.querySelector('.aging-filter-apply')?.addEventListener('click', () => {
      const opSel = wrap.querySelector('.aging-filter-op');
      const valInp = wrap.querySelector('.aging-filter-value');
      allSummaryAgingFilter = {
        op: String(opSel?.value || '').trim(),
        value: String(valInp?.value || '').trim()
      };
      closeAgingFilterPopover();
      updateAgingFilterHeaderUi();
      applyAllSummaryFilters();
    });
    wrap.querySelector('.aging-filter-clear')?.addEventListener('click', () => {
      allSummaryAgingFilter = { op: '', value: '' };
      syncAgingFilterPopoverFields();
      closeAgingFilterPopover();
      updateAgingFilterHeaderUi();
      applyAllSummaryFilters();
    });
    return wrap;
  }

  function openAgingFilterPopover(anchorBtn) {
    const pop = ensureAgingFilterPopover();
    syncAgingFilterPopoverFields();
    closeAgingFilterPopover();
    agingFilterPopoverAnchor = anchorBtn;
    anchorBtn.setAttribute('aria-expanded', 'true');
    pop.classList.remove('hidden');
    positionAgingFilterPopover(anchorBtn);
    requestAnimationFrame(() => positionAgingFilterPopover(anchorBtn));

    agingFilterDocMousedown = (ev) => {
      const t = ev.target;
      if (pop.contains(t)) return;
      if (anchorBtn.contains(t)) return;
      closeAgingFilterPopover();
    };
    document.addEventListener('mousedown', agingFilterDocMousedown, true);
  }

  function toggleAgingFilterPopover(anchorBtn) {
    const pop = ensureAgingFilterPopover();
    const wasOpen = pop && !pop.classList.contains('hidden') && agingFilterPopoverAnchor === anchorBtn;
    if (wasOpen) {
      closeAgingFilterPopover();
      return;
    }
    openAgingFilterPopover(anchorBtn);
  }

  function updateAgingFilterHeaderUi() {
    const active = agingFilterIsActive();
    document.querySelectorAll('.aging-filter-trigger').forEach((btn) => {
      btn.classList.toggle('is-active', active);
    });
    document.querySelectorAll('.aging-filter-summary-text').forEach((el) => {
      el.textContent = getAgingFilterSummaryLabel();
      el.classList.toggle('has-filter', agingFilterIsActive());
    });
  }

  function allSummaryRowMatchesFilters(row, filters) {
    return allSummaryColumns.every((col) => {
      if (isAgingColumnName(col)) {
        return agingNumericPass(row[col]);
      }
      const needle = filters[col];
      if (!needle) return true;
      return String(row[col] == null ? '' : row[col]).toLowerCase().includes(needle);
    });
  }

  function sumItemwiseItems(items) {
    return items.reduce(
      (acc, r) => ({
        opening: acc.opening + num(r.openingKg),
        inn: acc.inn + num(r.stockInKg),
        out: acc.out + num(r.stockOutKg),
        closing: acc.closing + num(r.closingKg)
      }),
      { opening: 0, inn: 0, out: 0, closing: 0 }
    );
  }

  function sumClientItems(items) {
    return items.reduce(
      (acc, r) => ({
        opening: acc.opening + num(r.openingStockKg),
        receipt: acc.receipt + num(r.receiptKg),
        issue: acc.issue + num(r.issueKg),
        closing: acc.closing + num(r.closingStockKg)
      }),
      { opening: 0, receipt: 0, issue: 0, closing: 0 }
    );
  }

  function getItemwiseFilterState() {
    const fi = els.filterItemwise;
    return {
      label: String(fi.label?.value || '').trim().toLowerCase(),
      opening: fi.opening?.value ?? '',
      in: fi.in?.value ?? '',
      out: fi.out?.value ?? '',
      closing: fi.closing?.value ?? ''
    };
  }

  function getClientFilterState() {
    const fi = els.filterClient;
    return {
      label: String(fi.label?.value || '').trim().toLowerCase(),
      opening: fi.opening?.value ?? '',
      receipt: fi.receipt?.value ?? '',
      issue: fi.issue?.value ?? '',
      closing: fi.closing?.value ?? ''
    };
  }

  function itemwiseItemMatches(r, g, f) {
    const q = f.label;
    if (q && !g.key.toLowerCase().includes(q) && !String(r.itemName || '').toLowerCase().includes(q)) {
      return false;
    }
    return (
      numMinPass(r.openingKg, f.opening) &&
      numMinPass(r.stockInKg, f.in) &&
      numMinPass(r.stockOutKg, f.out) &&
      numMinPass(r.closingKg, f.closing)
    );
  }

  function itemwiseTotalsPass(totals, f) {
    return (
      numMinPass(totals.opening, f.opening) &&
      numMinPass(totals.inn, f.in) &&
      numMinPass(totals.out, f.out) &&
      numMinPass(totals.closing, f.closing)
    );
  }

  function clientItemMatches(r, g, f) {
    const q = f.label;
    if (q && !g.key.toLowerCase().includes(q) && !String(r.itemName || '').toLowerCase().includes(q)) {
      return false;
    }
    return (
      numMinPass(r.openingStockKg, f.opening) &&
      numMinPass(r.receiptKg, f.receipt) &&
      numMinPass(r.issueKg, f.issue) &&
      numMinPass(r.closingStockKg, f.closing)
    );
  }

  function clientTotalsPass(totals, f) {
    return (
      numMinPass(totals.opening, f.opening) &&
      numMinPass(totals.receipt, f.receipt) &&
      numMinPass(totals.issue, f.issue) &&
      numMinPass(totals.closing, f.closing)
    );
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function groupRows(rows) {
    const map = new Map();
    rows.forEach((r) => {
      const key = String(r.itemGroup || 'Unknown');
      if (!map.has(key)) {
        map.set(key, { key, items: [], opening: 0, in: 0, out: 0, closing: 0 });
      }
      const g = map.get(key);
      g.items.push(r);
      g.opening += num(r.openingKg);
      g.in += num(r.stockInKg);
      g.out += num(r.stockOutKg);
      g.closing += num(r.closingKg);
    });
    const grouped = Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
    grouped.forEach((g) => {
      g.items.sort((a, b) => num(b.closingKg) - num(a.closingKg));
    });
    return grouped;
  }

  function renderTable(rows) {
    if (!rows.length) {
      els.tableBody.innerHTML = '<tr><td colspan="6" class="empty">No records found.</td></tr>';
      return;
    }

    const f = getItemwiseFilterState();
    const grouped = groupRows(rows);
    let html = '';
    let anyRow = false;
    grouped.forEach((g) => {
      const visibleItems = g.items.filter((r) => itemwiseItemMatches(r, g, f));
      if (visibleItems.length === 0) return;
      const totals = sumItemwiseItems(visibleItems);
      if (!itemwiseTotalsPass(totals, f)) return;
      anyRow = true;
      const expanded = expandedGroups.has(g.key);
      html += `
        <tr class="group-row">
          <td><button type="button" class="toggle-btn" data-group="${escapeHtml(g.key)}">${expanded ? '−' : '+'}</button></td>
          <td>${escapeHtml(g.key)}</td>
          <td class="numeric">${fmt(totals.opening)}</td>
          <td class="numeric">${fmt(totals.inn)}</td>
          <td class="numeric">${fmt(totals.out)}</td>
          <td class="numeric">${fmt(totals.closing)}</td>
        </tr>
      `;
      if (expanded) {
        visibleItems.forEach((r) => {
          html += `
            <tr>
              <td></td>
              <td>${escapeHtml(r.itemName || '')}</td>
              <td class="numeric">${fmt(r.openingKg)}</td>
              <td class="numeric">${fmt(r.stockInKg)}</td>
              <td class="numeric">${fmt(r.stockOutKg)}</td>
              <td class="numeric">${fmt(r.closingKg)}</td>
            </tr>
          `;
        });
      }
    });
    if (!anyRow) {
      els.tableBody.innerHTML = '<tr><td colspan="6" class="empty">No rows match filters.</td></tr>';
      return;
    }
    els.tableBody.innerHTML = html;

    els.tableBody.querySelectorAll('.toggle-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = String(btn.dataset.group || '');
        if (!key) return;
        if (expandedGroups.has(key)) expandedGroups.delete(key);
        else expandedGroups.add(key);
        renderTable(currentRows);
      });
    });
  }

  function renderClientTable(rows) {
    if (!rows.length) {
      els.clientTableBody.innerHTML = '<tr><td colspan="6" class="empty">No records found.</td></tr>';
      return;
    }
    const f = getClientFilterState();
    const grouped = groupClientRows(rows);
    let html = '';
    let anyRow = false;
    grouped.forEach((g) => {
      const visibleItems = g.items.filter((r) => clientItemMatches(r, g, f));
      if (visibleItems.length === 0) return;
      const totals = sumClientItems(visibleItems);
      if (!clientTotalsPass(totals, f)) return;
      anyRow = true;
      const expanded = expandedClientGroups.has(g.key);
      html += `
        <tr class="group-row">
          <td><button type="button" class="toggle-btn-client" data-client="${escapeHtml(g.key)}">${expanded ? '−' : '+'}</button></td>
          <td>${escapeHtml(g.key)}</td>
          <td class="numeric">${fmt(totals.opening)}</td>
          <td class="numeric">${fmt(totals.receipt)}</td>
          <td class="numeric">${fmt(totals.issue)}</td>
          <td class="numeric">${fmt(totals.closing)}</td>
        </tr>
      `;
      if (expanded) {
        visibleItems.forEach((r) => {
          html += `
            <tr>
              <td></td>
              <td>${escapeHtml(r.itemName || '')}</td>
              <td class="numeric">${fmt(r.openingStockKg)}</td>
              <td class="numeric">${fmt(r.receiptKg)}</td>
              <td class="numeric">${fmt(r.issueKg)}</td>
              <td class="numeric">${fmt(r.closingStockKg)}</td>
            </tr>
          `;
        });
      }
    });
    if (!anyRow) {
      els.clientTableBody.innerHTML = '<tr><td colspan="6" class="empty">No rows match filters.</td></tr>';
      return;
    }
    els.clientTableBody.innerHTML = html;

    els.clientTableBody.querySelectorAll('.toggle-btn-client').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = String(btn.dataset.client || '');
        if (!key) return;
        if (expandedClientGroups.has(key)) expandedClientGroups.delete(key);
        else expandedClientGroups.add(key);
        renderClientTable(currentClientRows);
      });
    });
  }

  function getPoFilterState() {
    const f = els.filterPo;
    return {
      pono: String(f.pono?.value || '').trim().toLowerCase(),
      poDate: String(f.poDate?.value || '').trim().toLowerCase(),
      client: String(f.client?.value || '').trim().toLowerCase(),
      itemId: String(f.itemId?.value || '').trim().toLowerCase(),
      itemName: String(f.itemName?.value || '').trim().toLowerCase(),
      itemCode: String(f.itemCode?.value || '').trim().toLowerCase(),
      stockKg: f.stockKg?.value ?? ''
    };
  }

  function poRowMatches(r, f) {
    const ponoOk = !f.pono || String(r.pono || '').toLowerCase().includes(f.pono);
    const dateOk = !f.poDate || String(normalizeDateString(r.poDate || '')).toLowerCase().includes(f.poDate);
    const clientOk = !f.client || String(r.clientName || '').toLowerCase().includes(f.client);
    const itemIdOk = !f.itemId || String(r.itemId ?? '').toLowerCase().includes(f.itemId);
    const itemNameOk = !f.itemName || String(r.itemName || '').toLowerCase().includes(f.itemName);
    const itemCodeOk = !f.itemCode || String(r.itemCode || '').toLowerCase().includes(f.itemCode);
    const stockOk = numMinPass(r.stockKg, f.stockKg);
    return ponoOk && dateOk && clientOk && itemIdOk && itemNameOk && itemCodeOk && stockOk;
  }

  function normalizeDateString(value) {
    const s = String(value == null ? '' : value).trim();
    if (!s) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // If SQL returns datetime-like string, strip to date portion
    if (s.includes('T')) return s.split('T')[0];
    if (s.includes(' ')) return s.split(' ')[0];
    const dt = new Date(s);
    if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
    return s;
  }

  function renderPoTable(rows) {
    if (!rows.length) {
      els.poTableBody.innerHTML = '<tr><td colspan="7" class="empty">No records found.</td></tr>';
      return;
    }

    const f = getPoFilterState();
    const visible = rows.filter((r) => poRowMatches(r, f));

    if (!visible.length) {
      els.poTableBody.innerHTML = '<tr><td colspan="7" class="empty">No rows match filters.</td></tr>';
      return;
    }

    els.poTableBody.innerHTML = visible.map((r) => {
      const displayClientRaw = r.currentClientName ?? r.CurrentClientName ?? r.clientName;
      const displayClient = (displayClientRaw && String(displayClientRaw).trim()) ? displayClientRaw : 'No Client';
      const sourceTypeVal = String(r.sourceType ?? r.SourceType ?? '').trim();
      const sourceTxnIdVal = String(r.sourceTransactionId ?? r.SourceTransactionID ?? '').trim();
      const poTxnIdVal = String(r.poTransactionId ?? r.POTransactionID ?? '').trim();
      const itemIdVal = String(r.itemId ?? r.ItemID ?? '').trim();
      return `
      <tr>
        <td>${escapeHtml(r.pono ?? r.PONumber ?? '')}</td>
        <td>${escapeHtml(normalizeDateString(r.poDate ?? r.PODate ?? ''))}</td>
        <td
          class="po-client-cell"
          data-po-transaction-id="${escapeHtml(poTxnIdVal)}"
          data-source-type="${escapeHtml(sourceTypeVal)}"
          data-source-transaction-id="${escapeHtml(sourceTxnIdVal)}"
          data-item-id="${escapeHtml(itemIdVal)}"
        >${escapeHtml(displayClient)}</td>
        <td>${escapeHtml(r.itemId ?? r.ItemID ?? '')}</td>
        <td>${escapeHtml(r.itemName ?? r.ItemName ?? '')}</td>
        <td>${escapeHtml(r.itemCode ?? r.ItemCode ?? '')}</td>
        <td class="numeric">${fmt(r.stockKg ?? r.StockKG)}</td>
      </tr>
      `;
    }).join('');
  }

  /**
   * Column order aligned with `GET /inventory-summary/all-tab-summary` SELECT in backend.
   * Ensures new fields (e.g. TopSalesExecutive) appear in a predictable place even if
   * the driver returns object keys in a different order.
   */
  const ALL_TAB_SUMMARY_COLUMN_ORDER = [
    'ItemID',
    'ItemCode',
    'ItemGroup',
    'SubGroup',
    'ItemName',
    'PhysicalStockInPU',
    'PurchaseUnit',
    'PhysicalStockSU',
    'StockUnit',
    'GSM',
    'ClientRef',
    'TopSalesExecutive',
    'IncomingStock',
    'allocatedstock',
    'FreeStock',
    'Manufecturer',
    'SizeL',
    'SizeW',
    'Quality',
    'CertificationType',
    'LastPONO',
    'LastPODate',
    'StockStatus',
    'LastGRNNO',
    'LastGRNDate',
    'Aging'
  ];

  function resolveAllSummaryColumnKey(rows, preferredName) {
    const want = String(preferredName || '').toLowerCase();
    if (!want) return null;
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      if (!row || typeof row !== 'object') continue;
      const found = Object.keys(row).find((k) => String(k).toLowerCase() === want);
      if (found) return found;
    }
    return null;
  }

  function getAllSummaryColumns(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return [];
    const cols = [];
    const seen = new Set();
    ALL_TAB_SUMMARY_COLUMN_ORDER.forEach((pref) => {
      const key = resolveAllSummaryColumnKey(rows, pref);
      if (key && !seen.has(key)) {
        seen.add(key);
        cols.push(key);
      }
    });
    rows.forEach((row) => {
      if (!row || typeof row !== 'object') return;
      Object.keys(row).forEach((key) => {
        if (!seen.has(key)) {
          seen.add(key);
          cols.push(key);
        }
      });
    });
    return cols;
  }

  function renderAllSummaryTable(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      allSummaryPresetAge30Pu1000 = false;
      allSummaryAgingFilter = { op: '', value: '' };
      closeAgingFilterPopover();
      if (els.allSummaryHead) {
        els.allSummaryHead.innerHTML = '<tr><th class="sticky-header">No data</th></tr>';
      }
      if (els.allSummaryBody) {
        els.allSummaryBody.innerHTML = '<tr><td class="empty">No records found.</td></tr>';
      }
      updateAllSummaryPresetToolbar();
      return;
    }

    const columns = getAllSummaryColumns(rows);
    allSummaryColumns = columns;
    allSummaryPresetAge30Pu1000 = false;
    allSummaryAgingFilter = { op: '', value: '' };
    closeAgingFilterPopover();
    allSummaryColumnWidths = calculateAllSummaryColumnWidths(rows, columns);
    if (!columns.length) {
      allSummaryAgingFilter = { op: '', value: '' };
      closeAgingFilterPopover();
      if (els.allSummaryHead) {
        els.allSummaryHead.innerHTML = '<tr><th class="sticky-header">No columns</th></tr>';
      }
      if (els.allSummaryBody) {
        els.allSummaryBody.innerHTML = '<tr><td class="empty">No records found.</td></tr>';
      }
      updateAllSummaryPresetToolbar();
      return;
    }

    if (els.allSummaryHead) {
      const filterIconSvg = `
        <svg class="aging-filter-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
        </svg>`;
      els.allSummaryHead.innerHTML = `
        <tr>${columns.map((col) => {
          if (isAgingColumnName(col)) {
            return `
            <th class="sticky-header th-aging-header">
              <div class="aging-header-inner">
                <span class="aging-header-label">${escapeHtml(col)}</span>
                <button type="button" class="aging-filter-trigger" title="Number filter for Aging" aria-label="Filter Aging column" aria-expanded="false">
                  ${filterIconSvg}
                </button>
              </div>
            </th>`;
          }
          return `<th class="sticky-header">${escapeHtml(col)}</th>`;
        }).join('')}</tr>
        <tr class="filter-row">
          ${columns.map((col) => {
          if (isAgingColumnName(col)) {
            return `<th class="sticky-filter aging-filter-summary-cell"><span class="aging-filter-summary-text">—</span></th>`;
          }
          return `
            <th class="sticky-filter">
              <input
                type="search"
                class="filter-input filter-text all-summary-filter-input"
                data-col="${escapeHtml(col)}"
                placeholder="Filter..."
                autocomplete="off"
              >
            </th>`;
        }).join('')}
        </tr>
      `;
    }

    renderAllSummaryBody(rows, columns);
    applyAllSummaryColumnWidths(columns);
    bindAllSummaryFilterInputs();
    updateAgingFilterHeaderUi();
    updateAllSummaryPresetToolbar();
  }

  function renderAllSummaryBody(rows, columns) {
    if (!els.allSummaryBody) return;
    if (!Array.isArray(rows) || rows.length === 0) {
      els.allSummaryBody.innerHTML = `<tr><td colspan="${Math.max(columns.length, 1)}" class="empty">No rows match filters.</td></tr>`;
      return;
    }
    els.allSummaryBody.innerHTML = rows.map((row) => {
      return `<tr>${columns.map((col) => {
        const cell = escapeHtml(row[col] == null ? '' : String(row[col]));
        const tdClass = isAgingColumnName(col) ? ' class="col-aging"' : '';
        return `<td${tdClass}>${cell}</td>`;
      }).join('')}</tr>`;
    }).join('');
    applyAllSummaryColumnWidths(columns);
  }

  const ALL_SUMMARY_CELL_FONT = '11px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const ALL_SUMMARY_HEADER_FONT = 'bold 11px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const ALL_SUMMARY_CELL_PADDING_X = 12;
  const ALL_SUMMARY_FILTER_MIN_WIDTH = 80;
  const ALL_SUMMARY_WIDTH_BUFFER = 6;

  let allSummaryMeasureCtx = null;
  function getMeasureCtx() {
    if (allSummaryMeasureCtx) return allSummaryMeasureCtx;
    try {
      const canvas = document.createElement('canvas');
      allSummaryMeasureCtx = canvas.getContext('2d');
    } catch (e) {
      allSummaryMeasureCtx = null;
    }
    return allSummaryMeasureCtx;
  }

  function measureTextPx(text, font) {
    const ctx = getMeasureCtx();
    if (!ctx) {
      return String(text || '').length * 7;
    }
    ctx.font = font;
    return ctx.measureText(String(text == null ? '' : text)).width;
  }

  function calculateAllSummaryColumnWidths(rows, columns) {
    const widths = {};
    columns.forEach((col) => {
      const headerPx = measureTextPx(col, ALL_SUMMARY_HEADER_FONT);
      let maxBodyPx = 0;
      rows.forEach((row) => {
        const cell = row?.[col];
        const px = measureTextPx(cell, ALL_SUMMARY_CELL_FONT);
        if (px > maxBodyPx) maxBodyPx = px;
      });
      const contentPx = Math.max(headerPx, maxBodyPx);
      const totalPx = Math.ceil(contentPx) + ALL_SUMMARY_CELL_PADDING_X + ALL_SUMMARY_WIDTH_BUFFER;
      widths[col] = Math.max(totalPx, ALL_SUMMARY_FILTER_MIN_WIDTH);
    });
    return widths;
  }

  function applyAllSummaryColumnWidths(columns) {
    if (!Array.isArray(columns) || !columns.length) return;
    if (!els.allSummaryHead || !els.allSummaryBody) return;
    const setCellWidth = (cell, width) => {
      const w = `${width}px`;
      cell.style.width = w;
      cell.style.minWidth = w;
      cell.style.maxWidth = w;
    };
    const headerRows = els.allSummaryHead.querySelectorAll('tr');
    headerRows.forEach((row) => {
      const cells = row.children;
      for (let i = 0; i < cells.length; i += 1) {
        const col = columns[i];
        const width = allSummaryColumnWidths[col];
        if (width) setCellWidth(cells[i], width);
      }
    });
    const bodyRows = els.allSummaryBody.querySelectorAll('tr');
    bodyRows.forEach((row) => {
      const cells = row.children;
      for (let i = 0; i < cells.length; i += 1) {
        const col = columns[i];
        const width = allSummaryColumnWidths[col];
        if (width) setCellWidth(cells[i], width);
      }
    });
  }

  function getAllSummaryFilterState() {
    const state = {};
    const inputs = document.querySelectorAll('.all-summary-filter-input');
    inputs.forEach((input) => {
      const col = String(input.getAttribute('data-col') || '').trim();
      if (!col) return;
      state[col] = String(input.value || '').trim().toLowerCase();
    });
    return state;
  }

  function applyAllSummaryFilters() {
    const filters = getAllSummaryFilterState();
    const base = getAllSummaryRowsAfterPreset(currentAllSummaryRows);
    const visible = base.filter((row) => allSummaryRowMatchesFilters(row, filters));
    updateAgingFilterHeaderUi();
    renderAllSummaryBody(visible, allSummaryColumns);
  }

  function bindAllSummaryFilterInputs() {
    const inputs = document.querySelectorAll('.all-summary-filter-input');
    inputs.forEach((input) => {
      input.addEventListener('input', applyAllSummaryFilters);
    });
  }

  function toCsvCell(value) {
    const text = String(value == null ? '' : value);
    const escaped = text.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  function downloadCsvFile(filename, csvBody) {
    const blob = new Blob(['\ufeff' + csvBody], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function getFilteredItemwiseExportRows(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return [];
    const f = getItemwiseFilterState();
    const grouped = groupRows(rows);
    const out = [];
    grouped.forEach((g) => {
      const visibleItems = g.items.filter((r) => itemwiseItemMatches(r, g, f));
      if (visibleItems.length === 0) return;
      const totals = sumItemwiseItems(visibleItems);
      if (!itemwiseTotalsPass(totals, f)) return;
      visibleItems.forEach((r) => {
        out.push({
          itemGroup: g.key,
          itemName: r.itemName || '',
          openingKg: r.openingKg,
          stockInKg: r.stockInKg,
          stockOutKg: r.stockOutKg,
          closingKg: r.closingKg
        });
      });
    });
    return out;
  }

  function getFilteredClientExportRows(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return [];
    const f = getClientFilterState();
    const grouped = groupClientRows(rows);
    const out = [];
    grouped.forEach((g) => {
      const visibleItems = g.items.filter((r) => clientItemMatches(r, g, f));
      if (visibleItems.length === 0) return;
      const totals = sumClientItems(visibleItems);
      if (!clientTotalsPass(totals, f)) return;
      visibleItems.forEach((r) => {
        out.push({
          clientName: g.key,
          itemName: r.itemName || '',
          openingStockKg: r.openingStockKg,
          receiptKg: r.receiptKg,
          issueKg: r.issueKg,
          closingStockKg: r.closingStockKg
        });
      });
    });
    return out;
  }

  function exportCurrentTabToExcel() {
    const db = String(els.database?.value || 'KOL').trim().toUpperCase();
    const dateStr = new Date().toISOString().slice(0, 10);

    if (activeTab === 'itemwise') {
      const rows = getFilteredItemwiseExportRows(currentRows);
      if (!rows.length) {
        setStatus('No rows to export.', true);
        return;
      }
      const header = ['Item Group', 'Item Name', 'Opening (KG)', 'Stock In (KG)', 'Stock Out (KG)', 'Closing (KG)'];
      const lines = [header.map(toCsvCell).join(',')];
      rows.forEach((r) => {
        lines.push(
          [r.itemGroup, r.itemName, r.openingKg, r.stockInKg, r.stockOutKg, r.closingKg].map(toCsvCell).join(',')
        );
      });
      downloadCsvFile(`inventory-itemwise-${db}-${dateStr}.csv`, lines.join('\r\n'));
      setStatus(`Exported ${rows.length} row(s) (itemwise).`);
      return;
    }

    if (activeTab === 'clientwise') {
      const rows = getFilteredClientExportRows(currentClientRows);
      if (!rows.length) {
        setStatus('No rows to export.', true);
        return;
      }
      const header = ['Client', 'Item Name', 'Opening (KG)', 'Receipt (KG)', 'Issue (KG)', 'Closing (KG)'];
      const lines = [header.map(toCsvCell).join(',')];
      rows.forEach((r) => {
        lines.push(
          [r.clientName, r.itemName, r.openingStockKg, r.receiptKg, r.issueKg, r.closingStockKg].map(toCsvCell).join(',')
        );
      });
      downloadCsvFile(`inventory-clientwise-${db}-${dateStr}.csv`, lines.join('\r\n'));
      setStatus(`Exported ${rows.length} row(s) (clientwise).`);
      return;
    }

    if (activeTab === 'po-noclient') {
      const f = getPoFilterState();
      const visible = (currentPoRows || []).filter((r) => poRowMatches(r, f));
      if (!visible.length) {
        setStatus('No rows to export.', true);
        return;
      }
      const header = ['PONO', 'PO Date', 'Client Name', 'ItemID', 'ItemName', 'ItemCode', 'StockKG'];
      const lines = [header.map(toCsvCell).join(',')];
      visible.forEach((r) => {
        const displayClientRaw = r.currentClientName ?? r.CurrentClientName ?? r.clientName;
        const displayClient =
          displayClientRaw && String(displayClientRaw).trim() ? displayClientRaw : 'No Client';
        lines.push(
          [
            r.pono ?? r.PONumber ?? '',
            normalizeDateString(r.poDate ?? r.PODate ?? ''),
            displayClient,
            r.itemId ?? r.ItemID ?? '',
            r.itemName ?? r.ItemName ?? '',
            r.itemCode ?? r.ItemCode ?? '',
            r.stockKg ?? r.StockKG ?? ''
          ]
            .map(toCsvCell)
            .join(',')
        );
      });
      downloadCsvFile(`inventory-po-no-client-${db}-${dateStr}.csv`, lines.join('\r\n'));
      setStatus(`Exported ${visible.length} row(s) (PO no client).`);
      return;
    }

    if (activeTab === 'all-summary') {
      exportAllSummaryToExcel();
      return;
    }

    if (activeTab === 'stock-buffer') {
      const rows = currentStockBufferRows || [];
      if (!rows.length) {
        setStatus('No rows to export.', true);
        return;
      }
      const header = [
        'Item Code',
        'Item Name',
        'Size W',
        'Size L',
        'Quality',
        'GSM',
        'Manufacturer',
        'Certification',
        'Stock unit',
        'Stock',
        'Free stock',
        'Client name',
        'Stock type'
      ];
      const lines = [header.map(toCsvCell).join(',')];
      rows.forEach((r) => {
        lines.push(STOCK_BUFFER_ROW_KEYS.map((k) => toCsvCell(r[k] == null ? '' : String(r[k]))).join(','));
      });
      downloadCsvFile(`inventory-stock-buffer-${db}-${dateStr}.csv`, lines.join('\r\n'));
      setStatus(`Exported ${rows.length} row(s) (stock search).`);
      return;
    }

    if (activeTab === 'categorywise') {
      const { months, rows } = getCategorywiseExportLeafRows();
      if (!rows.length) {
        setStatus('No rows to export.', true);
        return;
      }
      const header = [
        'Business Category',
        'Sales Person',
        'Client',
        'Job',
        'Item Name',
        ...months.flatMap((m) => {
          const label = formatMonthKeyLabel(m);
          return [`${label} KG`, `${label} Value`];
        }),
        'Total (KG)',
        'Total Value'
      ];
      const lines = [header.map(toCsvCell).join(',')];
      rows.forEach((r) => {
        lines.push(
          [
            r.category,
            r.salesPerson,
            r.client,
            r.job,
            r.item,
            ...months.flatMap((m) => {
              const cell = r.months[m] || { kg: 0, value: 0 };
              return [cell.kg ?? 0, cell.value ?? 0];
            }),
            r.totalKg,
            r.totalValue
          ]
            .map(toCsvCell)
            .join(',')
        );
      });
      downloadCsvFile(`inventory-categorywise-issued-${db}-${dateStr}.csv`, lines.join('\r\n'));
      setStatus(`Exported ${rows.length} leaf row(s) (categorywise issued).`);
      return;
    }

    if (activeTab === 'jobwise') {
      const rows = getFilteredJobwiseRows();
      if (!rows.length) {
        setStatus('No rows to export.', true);
        return;
      }
      const header = [
        'Date',
        'Item',
        'Item Group',
        'JobNum',
        'Job Name',
        'Client',
        'Required as per Job',
        'Issued Qty (same unit)',
        'Unit',
        'Excess/(Short)',
        'Var %',
        'Req GSM',
        'Issued GSM',
        'Req Job Total',
        'Spec Match',
        'Issued Qty (Stock Unit)',
        'Stock Unit',
        'Issued Cost',
        'Req Source',
        'Unplanned Issue'
      ];
      const lines = [header.map(toCsvCell).join(',')];
      rows.forEach((r) => {
        lines.push(
          [
            normalizeDateString(r.issueDate),
            r.itemName,
            r.itemGroup,
            r.jobNum,
            r.jobName,
            r.clientName,
            r.requiredQty,
            r.issuedQty,
            r.unit,
            r.excessShort,
            r.varPct,
            r.reqGsm,
            r.issuedGsm,
            r.reqJobTotal,
            r.specMatch,
            r.issuedQtyStock,
            r.stockUnit,
            r.issuedCost,
            r.reqSource,
            r.unplannedIssue
          ]
            .map(toCsvCell)
            .join(',')
        );
      });
      downloadCsvFile(`inventory-jobwise-issued-${db}-${dateStr}.csv`, lines.join('\r\n'));
      setStatus(`Exported ${rows.length} row(s) (jobwise issued).`);
    }
  }

  function exportAllSummaryToExcel() {
    if (!Array.isArray(currentAllSummaryRows) || currentAllSummaryRows.length === 0 || !allSummaryColumns.length) {
      setStatus('No rows to export.', true);
      return;
    }

    const filters = getAllSummaryFilterState();
    const base = getAllSummaryRowsAfterPreset(currentAllSummaryRows);
    const rowsToExport = base.filter((row) => allSummaryRowMatchesFilters(row, filters));

    const headerLine = allSummaryColumns.map((col) => toCsvCell(col)).join(',');
    const bodyLines = rowsToExport.map((row) => allSummaryColumns.map((col) => toCsvCell(row[col])).join(','));
    const csv = [headerLine, ...bodyLines].join('\r\n');
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadCsvFile(`all-tab-summary-${dateStr}.csv`, csv);
    setStatus(`Exported ${rowsToExport.length} row(s).`);
  }

  let clientOptionsCache = null;
  let clientOptionsCacheDb = null;

  async function loadClientOptionsForDatabase(databaseValue) {
    const db = String(databaseValue || '').trim().toUpperCase();
    if (!db) return [];
    if (clientOptionsCache && clientOptionsCacheDb === db) return clientOptionsCache;

    const url = new URL(`${API_BASE}/inventory-summary/client-names`);
    url.searchParams.set('database', db);
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.status !== true) {
      throw new Error(data.error || `Failed to fetch client names (${res.status})`);
    }
    clientOptionsCache = Array.isArray(data.clients) ? data.clients : [];
    clientOptionsCacheDb = db;
    return clientOptionsCache;
  }

  async function updatePoClientId(payload) {
    const url = new URL(`${API_BASE}/inventory-summary/po-noclient-update-client`);
    console.log('payload', payload);
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.status !== true) {
      throw new Error(data.error || `Update failed (${res.status})`);
    }
    return data;
  }

  async function startPoClientEdit(td) {
    if (!td || !td.dataset) return;
    if (td.querySelector('select.po-client-edit-select')) return;

    const oldText = td.textContent;
    const db = els.database.value || 'KOL';

    const clientOptions = await loadClientOptionsForDatabase(db);
    if (!clientOptions.length) throw new Error('No clients found for dropdown.');

    console.log('clientOptions', JSON.stringify(td.dataset, null, 2));

    const poTransactionId = td.dataset.poTransactionId || '';
    console.log('td.dataset', JSON.stringify(td.dataset, null, 2));
    const sourceTransactionId = td.dataset.sourceTransactionId || '';
    const sourceType = String(td.dataset.sourceType || '').trim();
    const itemId = td.dataset.itemId || '';

    const select = document.createElement('select');
    select.className = 'po-client-edit-select';
    select.innerHTML = `<option value="">Select Client…</option>`;
    clientOptions.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = String(c.ledgerId ?? '');
      opt.textContent = String(c.ledgerName ?? '');
      select.appendChild(opt);
    });

    td.textContent = '';
    td.appendChild(select);
    select.focus();

    const revertToOldText = () => {
      td.textContent = oldText;
    };

    select.addEventListener('change', async () => {
      const newClientId = select.value;
      if (!newClientId) {
        revertToOldText();
        return;
      }

      select.disabled = true;
      setStatus('Updating PO client…');
      try {
        await updatePoClientId({
          database: db,
          poTransactionId: poTransactionId,
          itemId: itemId,
          newClientId,
          sourceType: sourceType,
          sourceTransactionId: sourceTransactionId
        });
        await loadPoNoClientTop200();
      } catch (e) {
        setStatus(String(e.message || e), true);
        revertToOldText();
      } finally {
        select.disabled = false;
      }
    });

    select.addEventListener('blur', () => {
      if (!select.value) revertToOldText();
    });
  }

  if (els.poTableBody) {
    els.poTableBody.addEventListener('click', (e) => {
      const td = e.target && e.target.closest ? e.target.closest('td.po-client-cell') : null;
      if (!td) return;
      startPoClientEdit(td).catch((err) => {
        setStatus(String(err.message || err), true);
      });
    });
  }

  /** Exclude rows where Receipt, Issue, and Closing are all zero. */
  function filterClientRowsWithMovement(rows) {
    return rows.filter((r) => {
      const receipt = num(r.receiptKg);
      const issue = num(r.issueKg);
      const closing = num(r.closingStockKg);
      return !(receipt === 0 && issue === 0 && closing === 0);
    });
  }

  function groupClientRows(rows) {
    const map = new Map();
    rows.forEach((r) => {
      const key = String(r.clientName || 'Unknown Client');
      if (!map.has(key)) {
        map.set(key, { key, items: [], opening: 0, receipt: 0, issue: 0, closing: 0 });
      }
      const g = map.get(key);
      g.items.push(r);
      g.opening += num(r.openingStockKg);
      g.receipt += num(r.receiptKg);
      g.issue += num(r.issueKg);
      g.closing += num(r.closingStockKg);
    });
    const grouped = Array.from(map.values()).sort((a, b) => {
      const byClosing = num(b.closing) - num(a.closing);
      if (byClosing !== 0) return byClosing;
      return a.key.localeCompare(b.key);
    });
    grouped.forEach((g) => {
      g.items.sort((a, b) => num(b.closingStockKg) - num(a.closingStockKg));
    });
    return grouped;
  }

  const CATEGORYWISE_UNTAGGED = 'Untagged';
  const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function categorywiseLabelOrUntagged(value) {
    const s = String(value == null ? '' : value).trim();
    return s || CATEGORYWISE_UNTAGGED;
  }

  function issueDateToMonthKey(issueDate) {
    const s = normalizeDateString(issueDate);
    if (!s || s.length < 7) return null;
    return s.slice(0, 7);
  }

  function formatMonthKeyLabel(ym) {
    const parts = String(ym || '').split('-');
    if (parts.length < 2) return String(ym || '');
    const y = parts[0];
    const m = Number(parts[1]);
    if (!Number.isFinite(m) || m < 1 || m > 12) return String(ym || '');
    return `${MONTH_SHORT[m - 1]} ${y}`;
  }

  function emptyMonthMap(months) {
    const map = {};
    months.forEach((m) => {
      map[m] = { kg: 0, value: 0 };
    });
    return map;
  }

  function ensureCategorywiseChild(parentMap, key) {
    if (!parentMap.has(key)) {
      parentMap.set(key, {
        key,
        months: {},
        totalKg: 0,
        totalValue: 0,
        children: new Map()
      });
    }
    return parentMap.get(key);
  }

  function addMetricsToNode(node, monthKey, kg, value) {
    if (!monthKey) return;
    const cur = node.months[monthKey] || { kg: 0, value: 0 };
    node.months[monthKey] = {
      kg: num(cur.kg) + kg,
      value: num(cur.value) + value
    };
    node.totalKg += kg;
    node.totalValue += value;
  }

  function finalizeCategorywiseNode(node, months) {
    const monthMap = emptyMonthMap(months);
    Object.keys(node.months || {}).forEach((k) => {
      const cell = node.months[k] || {};
      monthMap[k] = { kg: num(cell.kg), value: num(cell.value) };
    });
    node.months = monthMap;
    const children = Array.from(node.children.values())
      .map((c) => finalizeCategorywiseNode(c, months))
      .sort((a, b) => b.totalValue - a.totalValue || b.totalKg - a.totalKg || a.key.localeCompare(b.key));
    node.children = children;
    return node;
  }

  function buildCategorywisePivot(detailRows) {
    const rows = Array.isArray(detailRows) ? detailRows : [];
    const monthSet = new Set();
    rows.forEach((r) => {
      const mk = issueDateToMonthKey(r.issueDate);
      if (mk) monthSet.add(mk);
    });
    const months = Array.from(monthSet).sort();

    const root = new Map();
    rows.forEach((r) => {
      const monthKey = issueDateToMonthKey(r.issueDate);
      if (!monthKey) return;
      const kg = num(r.stockOutKg);
      const value = num(r.stockOutValue);
      if (!kg && !value) return;

      const category = categorywiseLabelOrUntagged(r.businessCategory);
      const salesPerson = categorywiseLabelOrUntagged(r.salesPerson);
      const client = categorywiseLabelOrUntagged(r.clientName);
      const jobNo = String(r.jobBookingNo == null ? '' : r.jobBookingNo).trim();
      const jobName = String(r.jobName == null ? '' : r.jobName).trim();
      let jobLabel = CATEGORYWISE_UNTAGGED;
      if (jobNo && jobName) jobLabel = `${jobNo} — ${jobName}`;
      else if (jobNo) jobLabel = jobNo;
      else if (jobName) jobLabel = jobName;
      const item = categorywiseLabelOrUntagged(r.itemName);

      const catNode = ensureCategorywiseChild(root, category);
      addMetricsToNode(catNode, monthKey, kg, value);

      const spNode = ensureCategorywiseChild(catNode.children, salesPerson);
      addMetricsToNode(spNode, monthKey, kg, value);

      const clientNode = ensureCategorywiseChild(spNode.children, client);
      addMetricsToNode(clientNode, monthKey, kg, value);

      const jobNode = ensureCategorywiseChild(clientNode.children, jobLabel);
      addMetricsToNode(jobNode, monthKey, kg, value);

      const itemNode = ensureCategorywiseChild(jobNode.children, item);
      addMetricsToNode(itemNode, monthKey, kg, value);
    });

    const tree = Array.from(root.values())
      .map((n) => finalizeCategorywiseNode(n, months))
      .sort((a, b) => b.totalValue - a.totalValue || b.totalKg - a.totalKg || a.key.localeCompare(b.key));

    return { months, tree };
  }

  function sumCategorywiseTreeMonths(tree, months) {
    const totals = emptyMonthMap(months);
    let grandKg = 0;
    let grandValue = 0;
    (tree || []).forEach((node) => {
      months.forEach((m) => {
        const cell = node.months[m] || {};
        totals[m].kg += num(cell.kg);
        totals[m].value += num(cell.value);
      });
      grandKg += num(node.totalKg);
      grandValue += num(node.totalValue);
    });
    return { months: totals, totalKg: grandKg, totalValue: grandValue };
  }

  function formatIndicativeValue(v) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    }).format(Math.round(num(v)));
  }

  function renderCategorywiseMetricPair(kg, value) {
    return `<span class="categorywise-cell-pair" title="KG and indicative value">
      <span class="categorywise-cell-kg">${fmt(kg)} kg</span>
      <span class="categorywise-cell-val">${escapeHtml(formatIndicativeValue(value))}</span>
    </span>`;
  }

  function renderCategorywiseCards(summary) {
    if (!els.categorywiseCards) return;
    const list = Array.isArray(summary) ? summary : [];
    if (!list.length) {
      els.categorywiseCards.innerHTML = '';
      return;
    }

    els.categorywiseCards.innerHTML = list
      .map((s) => {
        const cat = String(s.businessCategory || '').trim() || CATEGORYWISE_UNTAGGED;
        const isUncat = cat.toLowerCase() === 'uncategorized';
        const tip = isUncat
          ? ' title="Issues not tagged to a job — data-quality signal, not a business segment."'
          : '';
        return `
          <div class="categorywise-card${isUncat ? ' is-uncategorized' : ''}"${tip}>
            <div class="categorywise-card-title">${escapeHtml(cat)}</div>
            <div class="categorywise-card-kg">${fmt(s.stockOutKg)} kg</div>
            <div class="categorywise-card-meta">
              <span>${fmt(s.issueLines)} lines</span>
              <span>${fmt(s.jobs)} jobs</span>
            </div>
            <div class="categorywise-card-value" title="Indicative value (latest purchase rate; ₹70/kg fallback)">
              Indicative: ${escapeHtml(formatIndicativeValue(s.stockOutValue))}
            </div>
          </div>
        `;
      })
      .join('');
  }

  function renderCategorywiseMonthCells(monthMap, months) {
    return months
      .map((m) => {
        const cell = monthMap[m] || { kg: 0, value: 0 };
        return `<td class="numeric">${renderCategorywiseMetricPair(cell.kg, cell.value)}</td>`;
      })
      .join('');
  }

  function resetCategorywiseFilters(months) {
    const monthFilters = {};
    (months || []).forEach((m) => {
      monthFilters[m] = '';
    });
    categorywiseFilterState = { label: '', months: monthFilters, totalKg: '' };
    categorywiseHeadMonthsKey = '';
  }

  function syncCategorywiseMonthFilterKeys(months) {
    const next = {};
    (months || []).forEach((m) => {
      next[m] = categorywiseFilterState.months[m] || '';
    });
    categorywiseFilterState.months = next;
  }

  function readCategorywiseFiltersFromDom() {
    if (!els.categorywiseHead) return;
    const labelInp = els.categorywiseHead.querySelector('[data-cw-filter="label"]');
    if (labelInp) {
      categorywiseFilterState.label = String(labelInp.value || '').trim();
    }
    const totalInp = els.categorywiseHead.querySelector('[data-cw-filter="total"]');
    if (totalInp) {
      categorywiseFilterState.totalKg = totalInp.value ?? '';
    }
    els.categorywiseHead.querySelectorAll('[data-cw-filter-month]').forEach((inp) => {
      const m = String(inp.getAttribute('data-cw-filter-month') || '');
      if (!m) return;
      categorywiseFilterState.months[m] = inp.value ?? '';
    });
  }

  function categorywiseFiltersActive(f) {
    if (String(f.label || '').trim()) return true;
    if (String(f.totalKg ?? '').trim() !== '') return true;
    return Object.values(f.months || {}).some((v) => String(v ?? '').trim() !== '');
  }

  function categorywiseNodePassesNumeric(node, months, f) {
    if (!numMinPass(node.totalKg, f.totalKg)) return false;
    for (let i = 0; i < months.length; i += 1) {
      const m = months[i];
      const minRaw = f.months[m];
      if (String(minRaw ?? '').trim() === '') continue;
      const cell = node.months[m] || { kg: 0 };
      if (!numMinPass(cell.kg, minRaw)) return false;
    }
    return true;
  }

  function rebuildCategorywiseNodeFromChildren(key, children, months) {
    const rebuilt = {
      key,
      children,
      months: emptyMonthMap(months),
      totalKg: 0,
      totalValue: 0
    };
    children.forEach((c) => {
      months.forEach((m) => {
        const cell = c.months[m] || { kg: 0, value: 0 };
        rebuilt.months[m].kg += num(cell.kg);
        rebuilt.months[m].value += num(cell.value);
      });
      rebuilt.totalKg += num(c.totalKg);
      rebuilt.totalValue += num(c.totalValue);
    });
    return rebuilt;
  }

  function filterCategorywiseTree(nodes, months, f, pathLabels) {
    const out = [];
    (nodes || []).forEach((node) => {
      const labels = pathLabels.concat([node.key]);
      const kids = Array.isArray(node.children) ? node.children : [];
      if (kids.length) {
        const filteredKids = filterCategorywiseTree(kids, months, f, labels);
        if (!filteredKids.length) return;
        out.push(rebuildCategorywiseNodeFromChildren(node.key, filteredKids, months));
        return;
      }
      const labelNeedle = String(f.label || '').trim().toLowerCase();
      const labelOk =
        !labelNeedle || labels.some((l) => String(l).toLowerCase().includes(labelNeedle));
      if (labelOk && categorywiseNodePassesNumeric(node, months, f)) {
        out.push(node);
      }
    });
    return out;
  }

  function getFilteredCategorywiseTree() {
    const months = categorywiseMonths;
    const f = categorywiseFilterState;
    if (!categorywiseFiltersActive(f)) return categorywiseTree;
    return filterCategorywiseTree(categorywiseTree, months, f, []);
  }

  function renderCategorywiseTreeRows(nodes, months, depth, parentPath) {
    let html = '';
    (nodes || []).forEach((node) => {
      const path = parentPath ? `${parentPath}||${node.key}` : node.key;
      const hasChildren = Array.isArray(node.children) && node.children.length > 0;
      const expanded = expandedCategoryNodes.has(path);
      const toggle = hasChildren
        ? `<button type="button" class="toggle-btn toggle-btn-category" data-path="${escapeHtml(path)}">${expanded ? '−' : '+'}</button>`
        : '';
      const rowClass = depth === 0 ? 'group-row categorywise-row' : 'categorywise-row';
      html += `
        <tr class="${rowClass}" data-depth="${depth}">
          <td class="categorywise-label-cell">
            <span class="categorywise-indent depth-${depth}">${toggle}<span class="categorywise-label">${escapeHtml(node.key)}</span></span>
          </td>
          ${renderCategorywiseMonthCells(node.months, months)}
          <td class="numeric categorywise-total">${renderCategorywiseMetricPair(node.totalKg, node.totalValue)}</td>
        </tr>
      `;
      if (hasChildren && expanded) {
        html += renderCategorywiseTreeRows(node.children, months, depth + 1, path);
      }
    });
    return html;
  }

  function renderCategorywiseHead(months) {
    if (!els.categorywiseHead) return;
    const key = months.join(',');
    syncCategorywiseMonthFilterKeys(months);

    if (key === categorywiseHeadMonthsKey && els.categorywiseHead.querySelector('.filter-row')) {
      return;
    }
    categorywiseHeadMonthsKey = key;

    if (!months.length) {
      els.categorywiseHead.innerHTML =
        '<tr><th class="sticky-header">Category / Sales / Client / Job / Item</th><th class="sticky-header">Total</th></tr>';
      return;
    }

    const monthHeaders = months
      .map(
        (m) =>
          `<th class="sticky-header">${escapeHtml(formatMonthKeyLabel(m))}<div class="categorywise-subhead">KG · Value</div></th>`
      )
      .join('');
    const monthFilters = months
      .map((m) => {
        const val = escapeHtml(categorywiseFilterState.months[m] || '');
        return `<th class="sticky-filter"><input type="number" step="1" class="filter-input filter-num" data-cw-filter-month="${escapeHtml(m)}" placeholder="Min kg" inputmode="numeric" value="${val}"></th>`;
      })
      .join('');
    const labelVal = escapeHtml(categorywiseFilterState.label || '');
    const totalVal = escapeHtml(categorywiseFilterState.totalKg || '');

    els.categorywiseHead.innerHTML = `
      <tr>
        <th class="sticky-header categorywise-label-col">Category / Sales / Client / Job / Item</th>
        ${monthHeaders}
        <th class="sticky-header">Total<div class="categorywise-subhead">KG · Value</div></th>
      </tr>
      <tr class="filter-row">
        <th class="sticky-filter"><input type="search" class="filter-input filter-text" data-cw-filter="label" placeholder="Filter…" autocomplete="off" value="${labelVal}"></th>
        ${monthFilters}
        <th class="sticky-filter"><input type="number" step="1" class="filter-input filter-num" data-cw-filter="total" placeholder="Min kg" inputmode="numeric" value="${totalVal}"></th>
      </tr>
    `;
  }

  function renderCategorywiseBody(months, tree) {
    if (!els.categorywiseBody) return;
    const colCount = Math.max(2, months.length + 2);

    if (!months.length && !tree.length) {
      els.categorywiseBody.innerHTML =
        '<tr><td colspan="2" class="empty">No categorywise issued rows for this date range.</td></tr>';
      return;
    }

    if (!tree.length) {
      els.categorywiseBody.innerHTML = `<tr><td colspan="${colCount}" class="empty">No rows match filters.</td></tr>`;
      return;
    }

    const grand = sumCategorywiseTreeMonths(tree, months);
    let html = `
      <tr class="categorywise-grand-total">
        <td class="categorywise-label-cell"><strong>Grand Total</strong></td>
        ${renderCategorywiseMonthCells(grand.months, months)}
        <td class="numeric categorywise-total"><strong>${renderCategorywiseMetricPair(grand.totalKg, grand.totalValue)}</strong></td>
      </tr>
    `;
    html += renderCategorywiseTreeRows(tree, months, 0, '');
    els.categorywiseBody.innerHTML = html;

    els.categorywiseBody.querySelectorAll('.toggle-btn-category').forEach((btn) => {
      btn.addEventListener('click', () => {
        const path = String(btn.dataset.path || '');
        if (!path) return;
        if (expandedCategoryNodes.has(path)) expandedCategoryNodes.delete(path);
        else expandedCategoryNodes.add(path);
        renderCategorywiseBody(categorywiseMonths, getFilteredCategorywiseTree());
      });
    });
  }

  function renderCategorywise() {
    const months = categorywiseMonths;
    renderCategorywiseCards(currentCategorywiseSummary);

    if (!els.categorywiseHead || !els.categorywiseBody) return;

    if (!months.length && !categorywiseTree.length) {
      categorywiseHeadMonthsKey = '';
      els.categorywiseHead.innerHTML =
        '<tr><th class="sticky-header">Category / Sales / Client / Job / Item</th><th class="sticky-header">Total</th></tr>';
      els.categorywiseBody.innerHTML =
        '<tr><td colspan="2" class="empty">No categorywise issued rows for this date range.</td></tr>';
      return;
    }

    renderCategorywiseHead(months);
    renderCategorywiseBody(months, getFilteredCategorywiseTree());
  }

  function getCategorywiseExportLeafRows() {
    const months = categorywiseMonths;
    const out = [];
    const tree = getFilteredCategorywiseTree();

    function walk(nodes, ancestry) {
      (nodes || []).forEach((node) => {
        const next = ancestry.concat([node.key]);
        const hasChildren = Array.isArray(node.children) && node.children.length > 0;
        if (!hasChildren) {
          const row = {
            category: next[0] || '',
            salesPerson: next[1] || '',
            client: next[2] || '',
            job: next[3] || '',
            item: next[4] || node.key,
            months: node.months,
            totalKg: node.totalKg,
            totalValue: node.totalValue
          };
          out.push(row);
          return;
        }
        walk(node.children, next);
      });
    }

    walk(tree, []);
    return { months, rows: out };
  }

  async function loadCategorywiseIssued() {
    const fromDate = String(els.fromDate.value || '').trim();
    const toDate = String(els.toDate.value || '').trim();
    if (!fromDate || !toDate) {
      setStatus('Please select both from and to date.', true);
      return;
    }
    if (fromDate > toDate) {
      setStatus('From date cannot be after to date.', true);
      return;
    }

    setStatus('Loading...');
    els.btnLoad.disabled = true;
    try {
      const url = new URL(`${API_BASE}/inventory-summary/categorywise-issued`);
      url.searchParams.set('database', els.database.value || 'KOL');
      url.searchParams.set('fromDate', fromDate);
      url.searchParams.set('toDate', toDate);

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.status !== true) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      currentCategorywiseDetail = Array.isArray(data.detail) ? data.detail : [];
      currentCategorywiseSummary = Array.isArray(data.summary) ? data.summary : [];
      expandedCategoryNodes.clear();

      const pivot = buildCategorywisePivot(currentCategorywiseDetail);
      categorywiseMonths = pivot.months;
      categorywiseTree = pivot.tree;
      resetCategorywiseFilters(categorywiseMonths);
      renderCategorywise();
      setStatus(
        `Loaded ${currentCategorywiseDetail.length} issue line(s) across ${categorywiseTree.length} categor${
          categorywiseTree.length === 1 ? 'y' : 'ies'
        }.`
      );
    } catch (e) {
      currentCategorywiseDetail = [];
      currentCategorywiseSummary = [];
      categorywiseMonths = [];
      categorywiseTree = [];
      expandedCategoryNodes.clear();
      resetCategorywiseFilters([]);
      renderCategorywise();
      setStatus(e.message || 'Failed to load categorywise issued.', true);
    } finally {
      els.btnLoad.disabled = false;
    }
  }

  const JOBWISE_COLSPAN = 21;

  function fmtDec(v, digits) {
    const d = digits == null ? 3 : digits;
    const n = num(v);
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: d,
      minimumFractionDigits: 0
    }).format(n);
  }

  function textIncludes(hay, needle) {
    if (!needle) return true;
    return String(hay == null ? '' : hay).toLowerCase().includes(needle);
  }

  function getJobwiseFilterState() {
    const f = els.filterJobwise || {};
    return {
      date: String(f.date?.value || '').trim().toLowerCase(),
      item: String(f.item?.value || '').trim().toLowerCase(),
      itemGroup: String(f.itemGroup?.value || '').trim().toLowerCase(),
      jobNum: String(f.jobNum?.value || '').trim().toLowerCase(),
      jobName: String(f.jobName?.value || '').trim().toLowerCase(),
      client: String(f.client?.value || '').trim().toLowerCase(),
      required: f.required?.value ?? '',
      issued: f.issued?.value ?? '',
      unit: String(f.unit?.value || '').trim().toLowerCase(),
      excess: f.excess?.value ?? '',
      varPct: f.varPct?.value ?? '',
      reqGsm: f.reqGsm?.value ?? '',
      issuedGsm: f.issuedGsm?.value ?? '',
      reqJobTotal: f.reqJobTotal?.value ?? '',
      specMatch: String(f.specMatch?.value || '').trim().toLowerCase(),
      issuedStock: f.issuedStock?.value ?? '',
      stockUnit: String(f.stockUnit?.value || '').trim().toLowerCase(),
      issuedCost: f.issuedCost?.value ?? '',
      reqSource: String(f.reqSource?.value || '').trim().toLowerCase(),
      unplanned: f.unplanned?.value ?? ''
    };
  }

  function jobwiseRowMatches(r, f) {
    const dateStr = normalizeDateString(r.issueDate);
    return (
      textIncludes(dateStr, f.date) &&
      textIncludes(r.itemName, f.item) &&
      textIncludes(r.itemGroup, f.itemGroup) &&
      textIncludes(r.jobNum, f.jobNum) &&
      textIncludes(r.jobName, f.jobName) &&
      textIncludes(r.clientName, f.client) &&
      numMinPass(r.requiredQty, f.required) &&
      numMinPass(r.issuedQty, f.issued) &&
      textIncludes(r.unit, f.unit) &&
      numMinPass(r.excessShort, f.excess) &&
      numMinPass(r.varPct, f.varPct) &&
      numMinPass(r.reqGsm, f.reqGsm) &&
      numMinPass(r.issuedGsm, f.issuedGsm) &&
      numMinPass(r.reqJobTotal, f.reqJobTotal) &&
      textIncludes(r.specMatch, f.specMatch) &&
      numMinPass(r.issuedQtyStock, f.issuedStock) &&
      textIncludes(r.stockUnit, f.stockUnit) &&
      numMinPass(r.issuedCost, f.issuedCost) &&
      textIncludes(r.reqSource, f.reqSource) &&
      numMinPass(r.unplannedIssue, f.unplanned)
    );
  }

  function getFilteredJobwiseRows() {
    const f = getJobwiseFilterState();
    return (currentJobwiseRows || []).filter((r) => jobwiseRowMatches(r, f));
  }

  function sumJobwiseRows(rows) {
    return (rows || []).reduce(
      (acc, r) => ({
        requiredQty: acc.requiredQty + num(r.requiredQty),
        issuedQty: acc.issuedQty + num(r.issuedQty),
        issuedQtyStock: acc.issuedQtyStock + num(r.issuedQtyStock),
        issuedCost: acc.issuedCost + num(r.issuedCost),
        excessShort: acc.excessShort + num(r.excessShort),
        reqJobTotal: acc.reqJobTotal + num(r.reqJobTotal)
      }),
      { requiredQty: 0, issuedQty: 0, issuedQtyStock: 0, issuedCost: 0, excessShort: 0, reqJobTotal: 0 }
    );
  }

  function renderJobwiseDetailRow(r) {
    return `
      <tr>
        <td></td>
        <td>${escapeHtml(normalizeDateString(r.issueDate))}</td>
        <td>${escapeHtml(r.itemName)}</td>
        <td>${escapeHtml(r.itemGroup)}</td>
        <td>${escapeHtml(r.jobNum)}</td>
        <td>${escapeHtml(r.jobName)}</td>
        <td>${escapeHtml(r.clientName)}</td>
        <td class="numeric">${fmtDec(r.requiredQty)}</td>
        <td class="numeric">${fmtDec(r.issuedQty)}</td>
        <td>${escapeHtml(r.unit)}</td>
        <td class="numeric">${fmtDec(r.excessShort)}</td>
        <td class="numeric">${fmtDec(r.varPct, 1)}</td>
        <td class="numeric">${r.reqGsm == null || r.reqGsm === '' ? '' : fmtDec(r.reqGsm, 0)}</td>
        <td class="numeric">${r.issuedGsm == null || r.issuedGsm === '' ? '' : fmtDec(r.issuedGsm, 0)}</td>
        <td class="numeric">${fmtDec(r.reqJobTotal)}</td>
        <td>${escapeHtml(r.specMatch)}</td>
        <td class="numeric">${fmtDec(r.issuedQtyStock)}</td>
        <td>${escapeHtml(r.stockUnit)}</td>
        <td class="numeric">${fmtDec(r.issuedCost, 2)}</td>
        <td>${escapeHtml(r.reqSource)}</td>
        <td class="numeric">${fmtDec(r.unplannedIssue, 0)}</td>
      </tr>
    `;
  }

  function renderJobwiseGroupHeader(path, label, rows, depth) {
    const expanded = expandedJobwiseGroups.has(path);
    const totals = sumJobwiseRows(rows);
    return `
      <tr class="group-row jobwise-group-row" data-depth="${depth}">
        <td><button type="button" class="toggle-btn toggle-btn-jobwise" data-path="${escapeHtml(path)}">${expanded ? '−' : '+'}</button></td>
        <td colspan="6" class="jobwise-group-label">${escapeHtml(label)} <span class="jobwise-group-count">(${rows.length})</span></td>
        <td class="numeric">${fmtDec(totals.requiredQty)}</td>
        <td class="numeric">${fmtDec(totals.issuedQty)}</td>
        <td></td>
        <td class="numeric">${fmtDec(totals.excessShort)}</td>
        <td></td>
        <td></td>
        <td></td>
        <td class="numeric">${fmtDec(totals.reqJobTotal)}</td>
        <td></td>
        <td class="numeric">${fmtDec(totals.issuedQtyStock)}</td>
        <td></td>
        <td class="numeric">${fmtDec(totals.issuedCost, 2)}</td>
        <td></td>
        <td></td>
      </tr>
    `;
  }

  function groupJobwiseByDate(rows) {
    const map = new Map();
    rows.forEach((r) => {
      const key = normalizeDateString(r.issueDate) || 'Unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, items]) => ({ key, label: key, items }));
  }

  function groupJobwiseByJob(rows) {
    const map = new Map();
    rows.forEach((r) => {
      const jobNum = String(r.jobNum || '').trim() || 'Untagged';
      if (!map.has(jobNum)) map.set(jobNum, { jobNum, jobName: r.jobName || '', items: [] });
      const g = map.get(jobNum);
      if (!g.jobName && r.jobName) g.jobName = r.jobName;
      g.items.push(r);
    });
    return Array.from(map.values())
      .sort((a, b) => a.jobNum.localeCompare(b.jobNum))
      .map((g) => ({
        key: g.jobNum,
        label: g.jobName ? `${g.jobNum} — ${g.jobName}` : g.jobNum,
        items: g.items
      }));
  }

  function setJobwiseGroupMode(mode) {
    const allowed = { all: 1, date: 1, job: 1, 'date-job': 1 };
    jobwiseGroupMode = allowed[mode] ? mode : 'all';
    if (els.jobwiseGroupBar) {
      els.jobwiseGroupBar.querySelectorAll('.jobwise-group-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.getAttribute('data-jobwise-group') === jobwiseGroupMode);
      });
    }
    expandedJobwiseGroups.clear();
    renderJobwiseTable();
  }

  function renderJobwiseTable() {
    if (!els.jobwiseBody) return;
    const rows = getFilteredJobwiseRows();
    if (!currentJobwiseRows.length) {
      els.jobwiseBody.innerHTML = `<tr><td colspan="${JOBWISE_COLSPAN}" class="empty">Load to view jobwise issued (job issue register).</td></tr>`;
      return;
    }
    if (!rows.length) {
      els.jobwiseBody.innerHTML = `<tr><td colspan="${JOBWISE_COLSPAN}" class="empty">No rows match filters.</td></tr>`;
      return;
    }

    let html = '';
    const mode = jobwiseGroupMode;

    if (mode === 'all') {
      html = rows.map((r) => renderJobwiseDetailRow(r)).join('');
    } else if (mode === 'date') {
      groupJobwiseByDate(rows).forEach((g) => {
        const path = `date||${g.key}`;
        html += renderJobwiseGroupHeader(path, g.label, g.items, 0);
        if (expandedJobwiseGroups.has(path)) {
          html += g.items.map((r) => renderJobwiseDetailRow(r)).join('');
        }
      });
    } else if (mode === 'job') {
      groupJobwiseByJob(rows).forEach((g) => {
        const path = `job||${g.key}`;
        html += renderJobwiseGroupHeader(path, g.label, g.items, 0);
        if (expandedJobwiseGroups.has(path)) {
          html += g.items.map((r) => renderJobwiseDetailRow(r)).join('');
        }
      });
    } else if (mode === 'date-job') {
      groupJobwiseByDate(rows).forEach((dateGroup) => {
        const datePath = `date||${dateGroup.key}`;
        html += renderJobwiseGroupHeader(datePath, dateGroup.label, dateGroup.items, 0);
        if (expandedJobwiseGroups.has(datePath)) {
          groupJobwiseByJob(dateGroup.items).forEach((jobGroup) => {
            const jobPath = `${datePath}||job||${jobGroup.key}`;
            html += renderJobwiseGroupHeader(jobPath, jobGroup.label, jobGroup.items, 1);
            if (expandedJobwiseGroups.has(jobPath)) {
              html += jobGroup.items.map((r) => renderJobwiseDetailRow(r)).join('');
            }
          });
        }
      });
    }

    els.jobwiseBody.innerHTML = html;
    els.jobwiseBody.querySelectorAll('.toggle-btn-jobwise').forEach((btn) => {
      btn.addEventListener('click', () => {
        const path = String(btn.dataset.path || '');
        if (!path) return;
        if (expandedJobwiseGroups.has(path)) expandedJobwiseGroups.delete(path);
        else expandedJobwiseGroups.add(path);
        renderJobwiseTable();
      });
    });
  }

  async function loadJobwiseIssued() {
    const fromDate = String(els.fromDate.value || '').trim();
    const toDate = String(els.toDate.value || '').trim();
    if (!fromDate || !toDate) {
      setStatus('Please select both from and to date.', true);
      return;
    }
    if (fromDate > toDate) {
      setStatus('From date cannot be after to date.', true);
      return;
    }

    setStatus('Loading...');
    els.btnLoad.disabled = true;
    try {
      const url = new URL(`${API_BASE}/inventory-summary/jobwise-issued`);
      url.searchParams.set('database', els.database.value || 'KOL');
      url.searchParams.set('fromDate', fromDate);
      url.searchParams.set('toDate', toDate);

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.status !== true) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      currentJobwiseRows = Array.isArray(data.records) ? data.records : [];
      expandedJobwiseGroups.clear();
      renderJobwiseTable();
      setStatus(`Loaded ${currentJobwiseRows.length} job issue row(s).`);
    } catch (e) {
      currentJobwiseRows = [];
      expandedJobwiseGroups.clear();
      renderJobwiseTable();
      setStatus(e.message || 'Failed to load jobwise issued.', true);
    } finally {
      els.btnLoad.disabled = false;
    }
  }

  async function loadItemwise() {
    const fromDate = String(els.fromDate.value || '').trim();
    const toDate = String(els.toDate.value || '').trim();
    if (!fromDate || !toDate) {
      setStatus('Please select both from and to date.', true);
      return;
    }
    if (fromDate > toDate) {
      setStatus('From date cannot be after to date.', true);
      return;
    }

    setStatus('Loading...');
    els.btnLoad.disabled = true;
    try {
      const url = new URL(`${API_BASE}/inventory-summary/group`);
      url.searchParams.set('database', els.database.value || 'KOL');
      url.searchParams.set('fromDate', fromDate);
      url.searchParams.set('toDate', toDate);

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.status !== true) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      currentRows = Array.isArray(data.records) ? data.records : [];
      renderTable(currentRows);
      setStatus(`Loaded ${currentRows.length} rows.`);
    } catch (e) {
      currentRows = [];
      renderTable(currentRows);
      setStatus(e.message || 'Failed to load inventory summary.', true);
    } finally {
      els.btnLoad.disabled = false;
    }
  }

  async function loadClientwise() {
    const fromDate = String(els.fromDate.value || '').trim();
    const toDate = String(els.toDate.value || '').trim();
    if (!fromDate || !toDate) {
      setStatus('Please select both from and to date.', true);
      return;
    }
    if (fromDate > toDate) {
      setStatus('From date cannot be after to date.', true);
      return;
    }

    setStatus('Loading...');
    els.btnLoad.disabled = true;
    try {
      const url = new URL(`${API_BASE}/inventory-summary/clientwise`);
      url.searchParams.set('database', els.database.value || 'KOL');
      url.searchParams.set('fromDate', fromDate);
      url.searchParams.set('toDate', toDate);
      url.searchParams.set('companyId', '2');

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.status !== true) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      const raw = Array.isArray(data.records) ? data.records : [];
      currentClientRows = filterClientRowsWithMovement(raw);
      renderClientTable(currentClientRows);
      setStatus(`Loaded ${currentClientRows.length} row(s) after excluding zero movement.`);
    } catch (e) {
      currentClientRows = [];
      renderClientTable(currentClientRows);
      setStatus(e.message || 'Failed to load clientwise stock movement.', true);
    } finally {
      els.btnLoad.disabled = false;
    }
  }

  async function loadPoNoClientTop200() {
    setStatus('Loading...');
    els.btnLoad.disabled = true;
    try {
      const url = new URL(`${API_BASE}/inventory-summary/po-no-client-top200`);
      url.searchParams.set('database', els.database.value || 'KOL');

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.status !== true) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      currentPoRows = Array.isArray(data.records) ? data.records : [];
      renderPoTable(currentPoRows);
      setStatus(`Loaded ${currentPoRows.length} PO row(s).`);
    } catch (e) {
      currentPoRows = [];
      renderPoTable(currentPoRows);
      setStatus(e.message || 'Failed to load top 200 PO (no client).', true);
    } finally {
      els.btnLoad.disabled = false;
    }
  }

  function renderStockBufferTable(rows) {
    if (!els.stockBufferBody) return;
    const list = Array.isArray(rows) ? rows : [];
    if (!list.length) {
      els.stockBufferBody.innerHTML =
        '<tr><td colspan="13" class="empty">No rows to show. Run a search from the fields above.</td></tr>';
      return;
    }
    els.stockBufferBody.innerHTML = list
      .map((row) => {
        return `<tr>${STOCK_BUFFER_ROW_KEYS.map((key) => {
          const raw = row[key];
          const text = raw == null ? '' : String(raw);
          return `<td>${escapeHtml(text)}</td>`;
        }).join('')}</tr>`;
      })
      .join('');
  }

  const STOCK_BUFFER_SEARCH_BTN_IDLE = 'Search';

  function setStockBufferSearchLoading(isLoading) {
    const btn = els.btnStockBufferSearch;
    if (!btn) return;
    if (isLoading) {
      btn.disabled = true;
      btn.classList.add('is-loading');
      btn.textContent = 'Searching…';
      btn.setAttribute('aria-busy', 'true');
    } else {
      btn.disabled = false;
      btn.classList.remove('is-loading');
      btn.textContent = STOCK_BUFFER_SEARCH_BTN_IDLE;
      btn.setAttribute('aria-busy', 'false');
    }
  }

  async function runStockBufferSearch() {
    const deckleVal = String(els.stockBufferDeckle?.value || '').trim();
    const gsmVal = String(els.stockBufferGsm?.value || '').trim();
    const qualityVal = String(els.stockBufferQuality?.value || '').trim();
    const sizeLVal = String(els.stockBufferSizeL?.value || '').trim();

    if (!deckleVal || !gsmVal || !qualityVal) {
      setStatus('Deckle, GSM, and Quality are required.', true);
      return;
    }

    if (stockBufferSearchInFlight) return;
    stockBufferSearchInFlight = true;

    setStatus('Searching...');
    setStockBufferSearchLoading(true);
    try {
      const res = await fetch(`${API_BASE}/inventory-summary/stock-search-buffer`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          database: els.database.value || 'KOL',
          deckle: parseFloat(deckleVal),
          gsm: parseInt(gsmVal, 10),
          quality: qualityVal,
          sizeL: sizeLVal === '' ? undefined : parseFloat(sizeLVal)
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.status !== true) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      currentStockBufferRows = Array.isArray(data.records) ? data.records : [];
      renderStockBufferTable(currentStockBufferRows);
      setStatus(`Found ${currentStockBufferRows.length} row(s).`);
    } catch (e) {
      currentStockBufferRows = [];
      renderStockBufferTable(currentStockBufferRows);
      setStatus(e.message || 'Stock search failed.', true);
    } finally {
      stockBufferSearchInFlight = false;
      setStockBufferSearchLoading(false);
    }
  }

  async function loadAllTabSummary() {
    setStatus('Loading...');
    els.btnLoad.disabled = true;
    try {
      const url = new URL(`${API_BASE}/inventory-summary/all-tab-summary`);
      url.searchParams.set('database', els.database.value || 'KOL');

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.status !== true) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      currentAllSummaryRows = Array.isArray(data.records) ? data.records : [];
      renderAllSummaryTable(currentAllSummaryRows);
      setStatus(`Loaded ${currentAllSummaryRows.length} row(s).`);
    } catch (e) {
      currentAllSummaryRows = [];
      renderAllSummaryTable(currentAllSummaryRows);
      setStatus(e.message || 'Failed to load all tab summary.', true);
    } finally {
      els.btnLoad.disabled = false;
    }
  }

  els.tabItemwise.addEventListener('click', () => {
    setTab('itemwise');
    loadItemwise();
  });
  els.tabClientwise.addEventListener('click', () => {
    setTab('clientwise');
    loadClientwise();
  });
  if (els.tabPonoNoClient) {
    els.tabPonoNoClient.addEventListener('click', () => {
      setTab('po-noclient');
      loadPoNoClientTop200();
    });
  }
  if (els.tabAllSummary) {
    els.tabAllSummary.addEventListener('click', () => {
      setTab('all-summary');
      loadAllTabSummary();
    });
  }
  if (els.tabStockBuffer) {
    els.tabStockBuffer.addEventListener('click', () => {
      setTab('stock-buffer');
    });
  }
  if (els.tabCategorywise) {
    els.tabCategorywise.addEventListener('click', () => {
      setTab('categorywise');
      loadCategorywiseIssued();
    });
  }
  if (els.tabJobwise) {
    els.tabJobwise.addEventListener('click', () => {
      setTab('jobwise');
      loadJobwiseIssued();
    });
  }
  if (els.jobwiseGroupBar) {
    els.jobwiseGroupBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.jobwise-group-btn');
      if (!btn) return;
      const mode = btn.getAttribute('data-jobwise-group');
      if (!mode) return;
      setJobwiseGroupMode(mode);
    });
  }
  if (els.stockBufferSearchForm) {
    els.stockBufferSearchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      runStockBufferSearch();
    });
  }
  if (els.btnExportAllSummary) {
    els.btnExportAllSummary.addEventListener('click', exportAllSummaryToExcel);
  }
  if (els.btnExportCurrent) {
    els.btnExportCurrent.addEventListener('click', exportCurrentTabToExcel);
  }
  els.btnLoad.addEventListener('click', () => {
    if (activeTab === 'clientwise') return loadClientwise();
    if (activeTab === 'po-noclient') return loadPoNoClientTop200();
    if (activeTab === 'all-summary') return loadAllTabSummary();
    if (activeTab === 'categorywise') return loadCategorywiseIssued();
    if (activeTab === 'jobwise') return loadJobwiseIssued();
    if (activeTab === 'stock-buffer') return;
    return loadItemwise();
  });

  if (els.btnAllSummaryPreset) {
    els.btnAllSummaryPreset.addEventListener('click', () => {
      if (!currentAllSummaryRows.length) return;
      allSummaryPresetAge30Pu1000 = !allSummaryPresetAge30Pu1000;
      updateAllSummaryPresetToolbar();
      applyAllSummaryFilters();
      const filters = getAllSummaryFilterState();
      const base = getAllSummaryRowsAfterPreset(currentAllSummaryRows);
      const visibleCount = base.filter((r) => allSummaryRowMatchesFilters(r, filters)).length;
      setStatus(
        allSummaryPresetAge30Pu1000
          ? `Preset on: ${visibleCount} row(s) match Aging ≥ 30 days and PU ≥ 1000 (column filters still apply).`
          : `Preset off: showing all ${currentAllSummaryRows.length} loaded row(s) (column filters still apply).`
      );
    });
  }

  function bindFilterInputs() {
    const itemwiseInputs = Object.values(els.filterItemwise).filter(Boolean);
    const clientInputs = Object.values(els.filterClient).filter(Boolean);
    const poInputs = Object.values(els.filterPo).filter(Boolean);
    const jobwiseInputs = Object.values(els.filterJobwise || {}).filter(Boolean);
    itemwiseInputs.forEach((el) => {
      el.addEventListener('input', () => {
        if (activeTab === 'itemwise') renderTable(currentRows);
      });
    });
    clientInputs.forEach((el) => {
      el.addEventListener('input', () => {
        if (activeTab === 'clientwise') renderClientTable(currentClientRows);
      });
    });
    poInputs.forEach((el) => {
      el.addEventListener('input', () => {
        if (activeTab === 'po-noclient') renderPoTable(currentPoRows);
      });
    });
    jobwiseInputs.forEach((el) => {
      el.addEventListener('input', () => {
        if (activeTab === 'jobwise') renderJobwiseTable();
      });
    });
    if (els.categorywiseHead) {
      els.categorywiseHead.addEventListener('input', (e) => {
        const t = e.target;
        if (!t || !t.classList || !t.classList.contains('filter-input')) return;
        if (activeTab !== 'categorywise') return;
        readCategorywiseFiltersFromDom();
        renderCategorywiseBody(categorywiseMonths, getFilteredCategorywiseTree());
      });
    }
  }

  setDefaultDates();
  bindFilterInputs();

  if (els.allSummaryPanel) {
    els.allSummaryPanel.addEventListener('click', (e) => {
      const btn = e.target.closest('.aging-filter-trigger');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      toggleAgingFilterPopover(btn);
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAgingFilterPopover();
  });
  window.addEventListener('resize', () => {
    if (agingFilterPopoverEl && !agingFilterPopoverEl.classList.contains('hidden') && agingFilterPopoverAnchor) {
      positionAgingFilterPopover(agingFilterPopoverAnchor);
    }
  });

  setTab('itemwise');
  loadItemwise();
})();
