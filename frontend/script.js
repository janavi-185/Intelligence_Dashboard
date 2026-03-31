// Stock Dashboard - Refactored & Compact
const API_URL = (() => {
    const { hostname, origin } = window.location;
    return (hostname === 'localhost' || hostname === '127.0.0.1') ? 'http://localhost:8000' : origin;
})();

const STATE = {
    charts: { main: null, comparison: null, normalized: null },
    companies: [],
    stockData: {},
    selectedCompany: null,
    currentTab: 'overview',
    currentFilter: '30'
};

// Color constants
const COLORS = { green: '#2ecc71', greenLight: 'rgba(46, 204, 113, 0.1)', orange: '#f39c12', teal: '#507782', red: '#e74c3c', text: '#333' };

// Utilities
const q = id => document.getElementById(id);
const qAll = cls => document.querySelectorAll(`.${cls}`);
const qSel = sel => document.querySelectorAll(sel);
const fmt = { 
    price: v => `₹${parseFloat(v).toFixed(2)}`, 
    pct: v => `${v >= 0 ? '+' : ''}${parseFloat(v).toFixed(2)}%`,
    date: d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    vol: v => `${(v / 1e6).toFixed(1)}M`
};

// Async API calls
const API = {
    fetch: (endpoint) => fetch(`${API_URL}${endpoint}`).then(r => r.ok ? r.json() : Promise.reject(r)),
    getCompanies: () => API.fetch('/companies').then(d => d.companies),
    getWatchlist: () => API.fetch('/watchlist').then(d => d.watchlist),
    getData: (sym, days = 90) => API.fetch(`/data/${sym}/${days}`).then(d => d.data),
    getMetrics: (sym) => API.fetch(`/metrics/${sym}`),
    getComparison: (s1, s2) => API.fetch(`/compare?symbol1=${s1}&symbol2=${s2}`),
    getCorrelation: () => API.fetch('/correlation-matrix'),
    getGainersLosers: () => API.fetch('/gainers-losers')
};

// Data processing
const proc = {
    filterDays: (data, days) => {
        const cut = new Date();
        cut.setDate(cut.getDate() - days);
        return data.filter(d => new Date(d.Date) >= cut);
    },
    sortDates: (data) => [...data].sort((a, b) => new Date(a.Date) - new Date(b.Date)),
    trend: (vals) => {
        if (vals.length < 2) return vals;
        const n = vals.length;
        let sx = 0, sy = 0, sxy = 0, sx2 = 0;
        for (let i = 0; i < n; i++) { sx += i; sy += vals[i]; sxy += i * vals[i]; sx2 += i * i; }
        const m = (n * sxy - sx * sy) / (n * sx2 - sx * sx);
        const b = (sy - m * sx) / n;
        return vals.map((_, i) => m * i + b);
    },
    priceChange: (start, end) => ((end - start) / start) * 100
};

// Chart builder
const buildChart = (type, labels, datasets, options = {}) => ({
    type,
    data: { labels, datasets },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: true, labels: { font: { size: 13 }, color: COLORS.text, padding: 12 } },
            tooltip: {
                backgroundColor: 'rgba(255,255,255,0.95)',
                padding: 12,
                titleFont: { size: 14 },
                bodyFont: { size: 13 },
                titleColor: COLORS.text,
                bodyColor: COLORS.text,
                borderColor: COLORS.teal,
                borderWidth: 1,
                ...options.tooltip
            }
        },
        scales: {
            y: {
                beginAtZero: false,
                grid: { color: 'rgba(64,64,64,0.5)', drawBorder: false },
                ticks: { color: '#909090', font: { size: 12 }, ...options.yTicks }
            },
            x: { grid: { display: false }, ticks: { color: '#909090', font: { size: 12 } } }
        }
    }
});

// Chart rendering
const renderChart = (data, symbol) => {
    const canvas = q('stock-chart');
    if (!canvas) return;
    const emptyState = q('empty-state');
    if (emptyState) emptyState.style.display = 'none';
    canvas.style.display = 'block';
    
    const sorted = proc.sortDates(data);
    const dates = sorted.map(d => fmt.date(d.Date));
    const prices = sorted.map(d => parseFloat(d.Close));
    const trend = proc.trend(prices);
    
    if (STATE.charts.main) STATE.charts.main.destroy();
    
    STATE.charts.main = new Chart(canvas, buildChart('line', dates, [
        {
            label: `${symbol} Price (₹)`,
            data: prices,
            borderColor: COLORS.green,
            backgroundColor: COLORS.greenLight,
            borderWidth: 2.5,
            pointRadius: 0,
            fill: true,
            tension: 0.4
        },
        { label: 'Trend', data: trend, borderColor: COLORS.orange, borderWidth: 2, borderDash: [5, 5], fill: false, tension: 0.4 }
    ], { yTicks: { callback: v => fmt.price(v) } }));
};

const renderNormalized = (data, symbol) => {
    const canvas = q('normalized-chart');
    if (!canvas) return;
    canvas.style.display = 'block';
    
    const sorted = proc.sortDates(data.map(d => ({ Date: d.date, Close: d.value })));
    const dates = sorted.map(d => fmt.date(d.Date));
    const values = sorted.map(d => parseFloat(d.Close));
    
    if (STATE.charts.normalized) STATE.charts.normalized.destroy();
    
    STATE.charts.normalized = new Chart(canvas, buildChart('line', dates, [{
        label: `${symbol} Performance from 52W Low (%)`,
        data: values,
        borderColor: COLORS.green,
        backgroundColor: COLORS.greenLight,
        borderWidth: 2.5,
        pointRadius: 3,
        fill: true,
        tension: 0.4
    }], { yTicks: { callback: v => `${v.toFixed(0)}%` } }));
};

const renderComparison = (data1, data2, s1, s2) => {
    const comparisonCanvas = q('comparison-chart');
    if (comparisonCanvas) comparisonCanvas.style.display = 'block';
    
    data1.sort((a, b) => new Date(a.Date) - new Date(b.Date));
    data2.sort((a, b) => new Date(a.Date) - new Date(b.Date));
    
    const d1 = proc.filterDays(data1, 30);
    const d2 = proc.filterDays(data2, 30);
    const dates1 = new Set(d1.map(d => d.Date));
    const dates2 = new Set(d2.map(d => d.Date));
    const common = Array.from(dates1).filter(d => dates2.has(d)).sort();
    
    const p1 = common.map(d => parseFloat(data1.find(x => x.Date === d)?.Close || 0));
    const p2 = common.map(d => parseFloat(data2.find(x => x.Date === d)?.Close || 0));
    const dateLabels = common.map(d => fmt.date(d));
    
    if (STATE.charts.comparison) STATE.charts.comparison.destroy();
    
    STATE.charts.comparison = new Chart(q('comparison-chart'), buildChart('line', dateLabels, [
        { label: `${s1} (₹)`, data: p1, borderColor: COLORS.teal, backgroundColor: 'rgba(80,119,130,0.05)', borderWidth: 2.5, pointRadius: 3, fill: true, tension: 0.4 },
        { label: `${s2} (₹)`, data: p2, borderColor: COLORS.red, backgroundColor: 'rgba(231,76,60,0.05)', borderWidth: 2.5, pointRadius: 3, fill: true, tension: 0.4 }
    ], { yTicks: { callback: v => fmt.price(v) } }));
};

// DOM updates
const switchTab = (name) => {
    STATE.currentTab = name;
    qAll('tab-button').forEach(b => b.classList.remove('active'));
    qSel(`[data-tab="${name}"]`)[0]?.classList.add('active');
    qAll('tab-content').forEach(c => { c.classList.remove('active'); c.classList.add('hidden'); });
    const tc = q(`${name}-tab`);
    if (tc) { tc.classList.add('active'); tc.classList.remove('hidden'); }
    
    if (name === 'metrics' && STATE.selectedCompany) { loadMetrics(STATE.selectedCompany); loadCorrelationMatrix(); }
    else if (name === 'metrics') loadCorrelationMatrix();
    else if (name === 'gainers') loadGainersLosers();
    else if (name === 'overview' && STATE.selectedCompany) fetchAndRenderChart(STATE.selectedCompany, STATE.currentFilter);
};

const selectCompany = (symbol, el) => {
    STATE.selectedCompany = symbol;
    qAll('watchlist-item').forEach(i => i.classList.remove('active'));
    el?.classList.add('active');
    switchTab('overview');
    qAll('time-btn').forEach(b => b.classList.remove('active'));
    qSel('[data-period="30"]')[0]?.classList.add('active');
    STATE.currentFilter = '30';
    loadOverviewHeader(symbol);
    fetchAndRenderChart(symbol, '30');
};

const displayWatchlist = (items) => {
    const list = q('watchlist');
    list.innerHTML = '';
    items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'watchlist-item';
        li.dataset.symbol = item.symbol;
        const sign = item.daily_change >= 0 ? '+' : '';
        li.innerHTML = `<div class="watchlist-item-header"><div><div class="watchlist-symbol">${item.symbol}</div><div class="watchlist-name">${item.name}</div></div><div style="text-align:right"><div class="watchlist-price">${fmt.price(item.price)}</div><div class="watchlist-change ${item.change_color}">${sign}${item.daily_change.toFixed(2)}%</div></div></div>`;
        li.addEventListener('click', () => selectCompany(item.symbol, li));
        list.appendChild(li);
    });
};

const displayComparisons = (id, items) => {
    const container = q(id);
    container.innerHTML = '';
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'insight-item';
        div.style.cursor = 'pointer';
        const change = item.change !== undefined ? item.change : item.daily_change;
        const sign = change >= 0 ? '+' : '';
        const cls = change >= 0 ? 'gain' : 'loss';
        div.innerHTML = `<span class="insight-name">${item.name || item.symbol}</span><span class="insight-change ${cls}">${sign}${change.toFixed(2)}%</span>`;
        div.addEventListener('click', () => {
            const sym = item.symbol || item.name;
            const el = qSel(`.watchlist-item[data-symbol="${sym}"]`)[0];
            if (el) selectCompany(sym, el);
        });
        container.appendChild(div);
    });
};

const displayCorrelationMatrix = (data) => {
    const container = q('correlation-matrix-container');
    const section = q('correlation-section');
    if (!data.symbols || !data.matrix) {
        section.style.display = 'none';
        return;
    }
    const table = document.createElement('table');
    table.className = 'correlation-table';
    const head = document.createElement('tr');
    head.appendChild(document.createElement('th'));
    data.symbols.forEach(s => {
        const th = document.createElement('th');
        th.textContent = s;
        head.appendChild(th);
    });
    table.appendChild(head);
    data.matrix.forEach((row, i) => {
        const tr = document.createElement('tr');
        const th = document.createElement('th');
        th.textContent = data.symbols[i];
        th.style.textAlign = 'left';
        tr.appendChild(th);
        row.forEach(v => {
            const td = document.createElement('td');
            let cls = 'correlation-cell';
            if (v === 1.0) cls += ' correlation-perfect';
            else if (v >= 0.8) cls += ' correlation-high';
            else if (v >= 0.5) cls += ' correlation-moderate';
            else cls += ' correlation-low';
            td.className = cls;
            td.textContent = v.toFixed(2);
            tr.appendChild(td);
        });
        table.appendChild(tr);
    });
    container.innerHTML = '';
    container.appendChild(table);
    section.style.display = 'block';
};

const updateGainersLosers = () => {
    const insights = [];
    STATE.companies.forEach(sym => {
        if (STATE.stockData[sym]?.length > 0) {
            const data = STATE.stockData[sym];
            const change = proc.priceChange(parseFloat(data[0].Close), parseFloat(data[data.length - 1].Close));
            insights.push({ symbol: sym, name: sym, change, price: parseFloat(data[data.length - 1].Close) });
        }
    });
    insights.sort((a, b) => b.change - a.change);
    displayComparisons('top-gainers', insights.slice(0, 3));
    displayComparisons('top-losers', insights.slice(-3).reverse());
};

const displayOverviewHeader = (data) => {
    const h = q('company-header');
    const m = q('overview-metrics');
    h.classList.remove('hidden');
    m.classList.remove('hidden');
    q('header-company-name').textContent = data.name;
    q('header-company-info').textContent = `Finance · ${data.sector}`;
    q('header-price').textContent = fmt.price(data.current_price);
    const ce = q('header-change');
    const sign = data.daily_change >= 0 ? '+' : '';
    ce.textContent = `${sign}${data.daily_change.toFixed(2)}% today`;
    ce.className = `header-change ${data.daily_change_color}`;
    q('metric-52w-high').textContent = fmt.price(data.high_52w);
    q('metric-52w-low').textContent = fmt.price(data.low_52w);
    q('metric-avg-close').textContent = fmt.price(data.avg_price);
    q('metric-volatility').textContent = `${(data.volatility * 100).toFixed(2)}%`;
};

const displayMetrics = (data) => {
    const mc = q('metrics-content');
    const mt = q('metrics-title');
    const ncs = q('normalized-chart-section');
    mt.textContent = `${data.symbol} - ${data.name} (${data.sector})`;
    const dcc = data.daily_change >= 0 ? 'positive' : 'negative';
    const dcs = data.daily_change >= 0 ? '+' : '';
    mc.innerHTML = `<div class="metrics-grid">
        <div class="metric-card"><div class="metric-label">Current Price</div><div class="metric-value">${fmt.price(data.current_price)}</div></div>
        <div class="metric-card"><div class="metric-label">Daily Change</div><div class="metric-value ${dcc}">${dcs}${data.daily_change.toFixed(2)}%</div></div>
        <div class="metric-card"><div class="metric-label">52W High</div><div class="metric-value">${fmt.price(data.high_52w)}</div></div>
        <div class="metric-card"><div class="metric-label">52W Low</div><div class="metric-value">${fmt.price(data.low_52w)}</div></div>
        <div class="metric-card"><div class="metric-label">Average Price</div><div class="metric-value">${fmt.price(data.avg_price)}</div></div>
        <div class="metric-card"><div class="metric-label">Volatility (7D)</div><div class="metric-value">${(data.volatility * 100).toFixed(2)}%</div></div>
        <div class="metric-card"><div class="metric-label">Volume</div><div class="metric-value">${fmt.vol(data.volume)}</div></div>
        <div class="metric-card"><div class="metric-label">From 52W Low</div><div class="metric-value positive">+${data.performance_from_low.toFixed(2)}%</div></div>
    </div>`;
    ncs.style.display = 'block';
};

const displayComparisonStats = (corr, s1, s2) => {
    const ci = q('correlation-info');
    const mi = q('comparison-metrics');
    const cv = parseFloat(corr).toFixed(3);
    let interpretation = '', color = '#666';
    if (cv > 0.7) { interpretation = 'Strong positive - move together'; color = '#27ae60'; }
    else if (cv > 0.3) { interpretation = 'Moderate positive - similar trends'; color = COLORS.green; }
    else if (cv > -0.3) { interpretation = 'Weak/none - independent'; color = COLORS.orange; }
    else if (cv > -0.7) { interpretation = 'Moderate negative - inverse'; color = '#e67e22'; }
    else { interpretation = 'Strong negative - opposite'; color = COLORS.red; }
    
    const d1 = STATE.stockData[s1];
    const d2 = STATE.stockData[s2];
    const c1 = proc.priceChange(parseFloat(d1[0].Close), parseFloat(d1[d1.length - 1].Close)).toFixed(2);
    const c2 = proc.priceChange(parseFloat(d2[0].Close), parseFloat(d2[d2.length - 1].Close)).toFixed(2);
    const cc1 = c1 >= 0 ? COLORS.green : COLORS.red;
    const cc2 = c2 >= 0 ? COLORS.green : COLORS.red;
    
    ci.innerHTML = `<strong style="font-size:16px;color:${COLORS.teal}">Correlation</strong><div style="font-size:24px;font-weight:700;color:${color};margin:10px 0">${cv}</div><div style="font-size:13px;color:#666">${interpretation}</div>`;
    mi.innerHTML = `<strong style="font-size:16px;color:${COLORS.teal}">Performance</strong><div style="margin-top:10px"><div style="display:flex;justify-content:space-between;margin:8px 0"><span>${s1}</span><span style="font-weight:600;color:${cc1}">${fmt.pct(c1)}</span></div><div style="display:flex;justify-content:space-between;margin:8px 0"><span>${s2}</span><span style="font-weight:600;color:${cc2}">${fmt.pct(c2)}</span></div></div>`;
};

const displayComparisonHeader = (s1, s2) => {
    const h = qSel('.compare-results')[0];
    let header = h?.querySelector('.comparison-header');
    if (!header) {
        header = document.createElement('div');
        header.className = 'comparison-header';
        h?.insertBefore(header, h.firstChild);
    }
    header.innerHTML = `<h3 style="font-size:22px;color:${COLORS.teal};margin:0">${s1} vs ${s2}</h3><p style="color:#666;margin:8px 0;font-size:14px">Last 30 days comparison</p>`;
};

// Async data loading
const loadWatchlist = async () => {
    try {
        const items = await API.getWatchlist();
        displayWatchlist(items);
    } catch (e) { console.error('Error loading watchlist:', e); }
};

const fetchAndRenderChart = async (symbol, days) => {
    try {
        const data = await API.getData(symbol, 90);
        STATE.stockData[symbol] = data;
        const filtered = proc.filterDays(data, parseInt(days));
        renderChart(filtered, symbol);
    } catch (e) { console.error(`Error fetching ${symbol}:`, e); }
};

const loadAllStockData = async () => {
    for (const company of STATE.companies) {
        try {
            STATE.stockData[company] = await API.getData(company);
        } catch (e) { console.error(`Error loading ${company}:`, e); }
    }
    updateGainersLosers();
};

const loadOverviewHeader = async (symbol) => {
    try {
        const metrics = await API.getMetrics(symbol);
        displayOverviewHeader(metrics);
    } catch (e) { console.error('Error loading header:', e); }
};

const loadMetrics = async (symbol) => {
    try {
        const metrics = await API.getMetrics(symbol);
        displayMetrics(metrics);
        renderNormalized(metrics.normalized_data, metrics.symbol);
        const ci = q('correlation-section');
        if (ci) ci.style.display = 'block';
    } catch (e) { console.error('Error loading metrics:', e); }
};

const loadCorrelationMatrix = async () => {
    try {
        const data = await API.getCorrelation();
        if (!data.error) displayCorrelationMatrix(data);
    } catch (e) { console.error('Error loading correlation matrix:', e); }
};

const loadGainersLosers = async () => {
    try {
        const { gainers, losers } = await API.getGainersLosers();
        displayComparisons('top-gainers', gainers);
        displayComparisons('top-losers', losers);
    } catch (e) { console.error('Error loading gainers/losers:', e); }
};

const populateSelects = () => {
    const s1 = q('compare-stock1');
    const s2 = q('compare-stock2');
    s1.innerHTML = '<option value="">Select First Stock</option>';
    s2.innerHTML = '<option value="">Select Second Stock</option>';
    STATE.companies.forEach(c => {
        const o1 = document.createElement('option');
        o1.value = c;
        o1.textContent = c;
        s1.appendChild(o1);
        const o2 = document.createElement('option');
        o2.value = c;
        o2.textContent = c;
        s2.appendChild(o2);
    });
};

const executeComparison = async () => {
    const s1 = q('compare-stock1').value;
    const s2 = q('compare-stock2').value;
    if (!s1 || !s2) { alert('Select both stocks'); return; }
    if (s1 === s2) { alert('Select different stocks'); return; }
    
    try {
        if (!STATE.stockData[s1]) { alert(`No data for ${s1}`); return; }
        if (!STATE.stockData[s2]) { alert(`No data for ${s2}`); return; }
        
        const { correlation } = await API.getComparison(s1, s2);
        renderComparison(STATE.stockData[s1], STATE.stockData[s2], s1, s2);
        displayComparisonStats(correlation, s1, s2);
        displayComparisonHeader(s1, s2);
        q('compare-results').classList.remove('hidden');
    } catch (e) { alert(`Comparison failed: ${e.message}`); }
};

const updateDate = () => {
    const de = q('live-date');
    if (de) de.textContent = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Initialize
const initApp = async () => {
    try {
        STATE.companies = await API.getCompanies();
        console.log('Companies loaded:', STATE.companies);
        await loadWatchlist();
        populateSelects();
        await loadAllStockData();
        await loadGainersLosers();
    } catch (e) { console.error('Init error:', e); }
};

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Dashboard initializing...');
    console.log('API Base URL:', API_URL);
    
    updateDate();
    initApp();
    
    // Tab setup
    qAll('tab-button').forEach(btn => btn.addEventListener('click', e => {
        const tab = e.target.closest('.tab-button')?.dataset.tab;
        if (tab) switchTab(tab);
    }));
    
    // Filter buttons
    qAll('filter-btn').forEach(btn => btn.addEventListener('click', e => {
        const filter = e.target.dataset.filter;
        STATE.currentFilter = filter;
        qAll('filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        if (STATE.currentTab === 'overview' && STATE.selectedCompany) fetchAndRenderChart(STATE.selectedCompany, filter);
    }));
    
    // Time period buttons
    qAll('time-btn').forEach(btn => btn.addEventListener('click', e => {
        const period = e.target.dataset.period;
        STATE.currentFilter = period;
        qAll('time-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        if (STATE.selectedCompany) fetchAndRenderChart(STATE.selectedCompany, period);
    }));
    
    // Watchlist
    q('watchlist').addEventListener('click', e => {
        const li = e.target.closest('.watchlist-item');
        if (li) selectCompany(li.dataset.symbol, li);
    });
    
    // Compare
    q('execute-compare').addEventListener('click', executeComparison);
});
