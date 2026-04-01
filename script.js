(function () {
  'use strict';

  const isLocalHost = typeof window !== 'undefined' && /localhost|127\.0\.0\.1/i.test(window.location.hostname);
  const API_BASE = isLocalHost ? 'http://localhost:3001/api' : 'https://cdcapi.onrender.com/api';

  const els = {
    tabItemwise: document.getElementById('tab-itemwise'),
    tabClientwise: document.getElementById('tab-clientwise'),
    itemwisePanel: document.getElementById('itemwise-panel'),
    clientwisePanel: document.getElementById('clientwise-panel'),
    database: document.getElementById('database'),
    fromDate: document.getElementById('from-date'),
    toDate: document.getElementById('to-date'),
    btnLoad: document.getElementById('btn-load'),
    status: document.getElementById('status'),
    tableBody: document.getElementById('table-body'),
    clientTableBody: document.getElementById('client-table-body')
  };

  let activeTab = 'itemwise';
  let currentRows = [];
  let currentClientRows = [];
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
    activeTab = isItemwise ? 'itemwise' : 'clientwise';
    els.tabItemwise.classList.toggle('active', isItemwise);
    els.tabClientwise.classList.toggle('active', !isItemwise);
    els.itemwisePanel.classList.toggle('hidden', !isItemwise);
    els.clientwisePanel.classList.toggle('hidden', isItemwise);
  }

  function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function fmt(v) {
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(Math.round(num(v)));
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

    const grouped = groupRows(rows);
    let html = '';
    grouped.forEach((g) => {
      const expanded = expandedGroups.has(g.key);
      html += `
        <tr class="group-row">
          <td><button type="button" class="toggle-btn" data-group="${escapeHtml(g.key)}">${expanded ? '−' : '+'}</button></td>
          <td>${escapeHtml(g.key)}</td>
          <td class="numeric">${fmt(g.opening)}</td>
          <td class="numeric">${fmt(g.in)}</td>
          <td class="numeric">${fmt(g.out)}</td>
          <td class="numeric">${fmt(g.closing)}</td>
        </tr>
      `;
      if (expanded) {
        g.items.forEach((r) => {
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
    const grouped = groupClientRows(rows);
    let html = '';
    grouped.forEach((g) => {
      const expanded = expandedClientGroups.has(g.key);
      html += `
        <tr class="group-row">
          <td><button type="button" class="toggle-btn-client" data-client="${escapeHtml(g.key)}">${expanded ? '−' : '+'}</button></td>
          <td>${escapeHtml(g.key)}</td>
          <td class="numeric">${fmt(g.opening)}</td>
          <td class="numeric">${fmt(g.receipt)}</td>
          <td class="numeric">${fmt(g.issue)}</td>
          <td class="numeric">${fmt(g.closing)}</td>
        </tr>
      `;
      if (expanded) {
        g.items.forEach((r) => {
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
    const grouped = Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
    grouped.forEach((g) => {
      g.items.sort((a, b) => {
        const aGroupId = Number(a.itemGroupId ?? a.itemgroupid ?? Number.MAX_SAFE_INTEGER);
        const bGroupId = Number(b.itemGroupId ?? b.itemgroupid ?? Number.MAX_SAFE_INTEGER);
        if (aGroupId !== bGroupId) return aGroupId - bGroupId;
        return num(b.closingStockKg) - num(a.closingStockKg);
      });
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
      currentClientRows = Array.isArray(data.records) ? data.records : [];
      renderClientTable(currentClientRows);
      setStatus(`Loaded ${currentClientRows.length} rows.`);
    } catch (e) {
      currentClientRows = [];
      renderClientTable(currentClientRows);
      setStatus(e.message || 'Failed to load clientwise stock movement.', true);
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
  els.btnLoad.addEventListener('click', () => {
    if (activeTab === 'clientwise') {
      loadClientwise();
      return;
    }
    loadItemwise();
  });

  setDefaultDates();
  setTab('itemwise');
  loadItemwise();
})();
