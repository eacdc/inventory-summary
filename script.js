(function () {
  'use strict';

  const isLocalHost = typeof window !== 'undefined' && /localhost|127\.0\.0\.1/i.test(window.location.hostname);
  const API_BASE = isLocalHost ? 'http://localhost:3001/api' : 'https://cdcapi.onrender.com/api';

  const els = {
    tabItemwise: document.getElementById('tab-itemwise'),
    tabClientwise: document.getElementById('tab-clientwise'),
    tabPonoNoClient: document.getElementById('tab-pono-noclient'),
    tabAllSummary: document.getElementById('tab-all-summary'),
    itemwisePanel: document.getElementById('itemwise-panel'),
    clientwisePanel: document.getElementById('clientwise-panel'),
    poPanel: document.getElementById('po-noclient-panel'),
    allSummaryPanel: document.getElementById('all-summary-panel'),
    database: document.getElementById('database'),
    fromDate: document.getElementById('from-date'),
    toDate: document.getElementById('to-date'),
    btnLoad: document.getElementById('btn-load'),
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
    }
  };

  let activeTab = 'itemwise';
  let currentRows = [];
  let currentClientRows = [];
  let currentPoRows = [];
  let currentAllSummaryRows = [];
  let allSummaryColumns = [];
  let allSummaryColumnWidths = {};
  const expandedGroups = new Set();
  const expandedClientGroups = new Set();

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

  function setTab(which) {
    const isItemwise = which === 'itemwise';
    const isClientwise = which === 'clientwise';
    const isPo = which === 'po-noclient';
    const isAllSummary = which === 'all-summary';

    activeTab = isItemwise
      ? 'itemwise'
      : (isClientwise ? 'clientwise' : (isPo ? 'po-noclient' : 'all-summary'));

    if (els.tabItemwise) els.tabItemwise.classList.toggle('active', isItemwise);
    if (els.tabClientwise) els.tabClientwise.classList.toggle('active', isClientwise);
    if (els.tabPonoNoClient) els.tabPonoNoClient.classList.toggle('active', isPo);
    if (els.tabAllSummary) els.tabAllSummary.classList.toggle('active', isAllSummary);

    if (els.itemwisePanel) els.itemwisePanel.classList.toggle('hidden', !isItemwise);
    if (els.clientwisePanel) els.clientwisePanel.classList.toggle('hidden', !isClientwise);
    if (els.poPanel) els.poPanel.classList.toggle('hidden', !isPo);
    if (els.allSummaryPanel) els.allSummaryPanel.classList.toggle('hidden', !isAllSummary);

    toggleDateFilters(!isAllSummary);
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

  function getAllSummaryColumns(rows) {
    const cols = [];
    const seen = new Set();
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
      if (els.allSummaryHead) {
        els.allSummaryHead.innerHTML = '<tr><th class="sticky-header">No data</th></tr>';
      }
      if (els.allSummaryBody) {
        els.allSummaryBody.innerHTML = '<tr><td class="empty">No records found.</td></tr>';
      }
      return;
    }

    const columns = getAllSummaryColumns(rows);
    allSummaryColumns = columns;
    allSummaryColumnWidths = calculateAllSummaryColumnWidths(rows, columns);
    if (!columns.length) {
      if (els.allSummaryHead) {
        els.allSummaryHead.innerHTML = '<tr><th class="sticky-header">No columns</th></tr>';
      }
      if (els.allSummaryBody) {
        els.allSummaryBody.innerHTML = '<tr><td class="empty">No records found.</td></tr>';
      }
      return;
    }

    if (els.allSummaryHead) {
      els.allSummaryHead.innerHTML = `
        <tr>${columns.map((col) => `<th class="sticky-header">${escapeHtml(col)}</th>`).join('')}</tr>
        <tr class="filter-row">
          ${columns.map((col) => `
            <th class="sticky-filter">
              <input
                type="search"
                class="filter-input filter-text all-summary-filter-input"
                data-col="${escapeHtml(col)}"
                placeholder="Filter..."
                autocomplete="off"
              >
            </th>
          `).join('')}
        </tr>
      `;
    }

    renderAllSummaryBody(rows, columns);
    applyAllSummaryColumnWidths(columns);
    bindAllSummaryFilterInputs();
  }

  function renderAllSummaryBody(rows, columns) {
    if (!els.allSummaryBody) return;
    if (!Array.isArray(rows) || rows.length === 0) {
      els.allSummaryBody.innerHTML = `<tr><td colspan="${Math.max(columns.length, 1)}" class="empty">No rows match filters.</td></tr>`;
      return;
    }
    els.allSummaryBody.innerHTML = rows.map((row) => {
      return `<tr>${columns.map((col) => `<td>${escapeHtml(row[col] == null ? '' : String(row[col]))}</td>`).join('')}</tr>`;
    }).join('');
    applyAllSummaryColumnWidths(columns);
  }

  function calculateAllSummaryColumnWidths(rows, columns) {
    const widths = {};
    columns.forEach((col) => {
      let maxLen = String(col || '').length;
      rows.forEach((row) => {
        const cell = String(row?.[col] == null ? '' : row[col]);
        if (cell.length > maxLen) maxLen = cell.length;
      });
      const widthCh = Math.max(8, Math.min(maxLen + 2, 80));
      widths[col] = widthCh;
    });
    return widths;
  }

  function applyAllSummaryColumnWidths(columns) {
    if (!Array.isArray(columns) || !columns.length) return;
    if (!els.allSummaryHead || !els.allSummaryBody) return;
    const headerRows = els.allSummaryHead.querySelectorAll('tr');
    headerRows.forEach((row) => {
      const cells = row.children;
      for (let i = 0; i < cells.length; i += 1) {
        const col = columns[i];
        const width = allSummaryColumnWidths[col];
        if (width) cells[i].style.width = `${width}ch`;
      }
    });
    const bodyRows = els.allSummaryBody.querySelectorAll('tr');
    bodyRows.forEach((row) => {
      const cells = row.children;
      for (let i = 0; i < cells.length; i += 1) {
        const col = columns[i];
        const width = allSummaryColumnWidths[col];
        if (width) cells[i].style.width = `${width}ch`;
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
    const visible = currentAllSummaryRows.filter((row) => {
      return allSummaryColumns.every((col) => {
        const needle = filters[col];
        if (!needle) return true;
        return String(row[col] == null ? '' : row[col]).toLowerCase().includes(needle);
      });
    });
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

  function exportAllSummaryToExcel() {
    if (!Array.isArray(currentAllSummaryRows) || currentAllSummaryRows.length === 0 || !allSummaryColumns.length) {
      setStatus('No rows to export.', true);
      return;
    }

    const filters = getAllSummaryFilterState();
    const rowsToExport = currentAllSummaryRows.filter((row) => {
      return allSummaryColumns.every((col) => {
        const needle = filters[col];
        if (!needle) return true;
        return String(row[col] == null ? '' : row[col]).toLowerCase().includes(needle);
      });
    });

    const headerLine = allSummaryColumns.map((col) => toCsvCell(col)).join(',');
    const bodyLines = rowsToExport.map((row) => allSummaryColumns.map((col) => toCsvCell(row[col])).join(','));
    const csv = [headerLine, ...bodyLines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `all-tab-summary-${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
  if (els.btnExportAllSummary) {
    els.btnExportAllSummary.addEventListener('click', exportAllSummaryToExcel);
  }
  els.btnLoad.addEventListener('click', () => {
    if (activeTab === 'clientwise') return loadClientwise();
    if (activeTab === 'po-noclient') return loadPoNoClientTop200();
    if (activeTab === 'all-summary') return loadAllTabSummary();
    return loadItemwise();
  });

  function bindFilterInputs() {
    const itemwiseInputs = Object.values(els.filterItemwise).filter(Boolean);
    const clientInputs = Object.values(els.filterClient).filter(Boolean);
    const poInputs = Object.values(els.filterPo).filter(Boolean);
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
  }

  setDefaultDates();
  bindFilterInputs();
  setTab('itemwise');
  loadItemwise();
})();
