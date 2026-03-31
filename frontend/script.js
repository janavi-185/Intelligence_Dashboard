// Stock Dashboard JS
// Determine API URL based on environment
const API_BASE_URL = (() => {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const port = window.location.port;
    
    if (isLocalhost) {
        // Development: localhost frontend talks to localhost:8000 backend
        return 'http://localhost:8000';
    } else {
        // Production: use relative paths (same origin)
        // Frontend and backend are served from the same domain
        return window.location.origin;
    }
})();

console.log('API Base URL:', API_BASE_URL);

let chart = null;
let comparisonChart = null;
let normalizedChart = null;
let companies = [];
let allStockData = {};
let currentFilter = '30';
let selectedCompany = null;
let currentTab = 'overview';

document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard initializing...');
    updateLiveDate();
    initApp();
    setupEventListeners();
    setupTabListeners();
});

function updateLiveDate() {
    const dateElement = document.getElementById('live-date');
    const today = new Date();
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const formattedDate = today.toLocaleDateString('en-US', options);
    dateElement.textContent = formattedDate;
}

/* ===== INITIALIZATION ===== */
async function initApp() {
    try {
        const response = await fetch(`${API_BASE_URL}/companies`);
        const data = await response.json();
        companies = data.companies;
        console.log('Companies loaded:', companies);
        
        // Load watchlist data
        await loadWatchlist();
        populateCompareSelects();
        loadAllStockData();
        
        // Load gainers/losers for Gainers tab
        loadGainersLosers();
    } catch (error) {
        console.error('Error loading companies:', error);
    }
}

/* ===== TAB MANAGEMENT ===== */
function setupTabListeners() {
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.closest('.tab-button').dataset.tab;
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    currentTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        content.classList.add('hidden');
    });
    
    // Show selected tab content
    const tabContent = document.getElementById(`${tabName}-tab`);
    if (tabContent) {
        tabContent.classList.add('active');
        tabContent.classList.remove('hidden');
    }
    
    // Handle tab-specific actions
    if (tabName === 'metrics' && selectedCompany) {
        loadCorrelationMatrix();
    } else if (tabName === 'metrics') {
        loadCorrelationMatrix();
    } else if (tabName === 'gainers') {
        loadGainersLosers();
    } else if (tabName === 'overview' && selectedCompany) {
        fetchAndRenderChart(selectedCompany, currentFilter);
    }
}

/* ===== EVENT LISTENERS ===== */
function setupEventListeners() {
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', handleFilterChange);
    });

    // Time period buttons
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.addEventListener('click', handleTimePeriodChange);
    });

    // Company list
    const companiesList = document.getElementById('watchlist');
    companiesList.addEventListener('click', (e) => {
        const li = e.target.closest('.watchlist-item');
        if (li) {
            selectCompany(li.dataset.symbol, li);
        }
    });

    // Comparison mode
    document.getElementById('execute-compare').addEventListener('click', executeComparison);
}

/* ===== COMPANY LIST ===== */
async function loadWatchlist() {
    try {
        const response = await fetch(`${API_BASE_URL}/watchlist`);
        const data = await response.json();
        displayWatchlist(data.watchlist);
    } catch (error) {
        console.error('Error loading watchlist:', error);
    }
}

function displayWatchlist(watchlist) {
    const list = document.getElementById('watchlist');
    list.innerHTML = '';
    
    watchlist.forEach(item => {
        const li = document.createElement('li');
        li.className = 'watchlist-item';
        li.dataset.symbol = item.symbol;
        
        const changeSign = item.daily_change >= 0 ? '+' : '';
        const changeClass = item.change_color;
        
        li.innerHTML = `
            <div class="watchlist-item-header">
                <div>
                    <div class="watchlist-symbol">${item.symbol}</div>
                    <div class="watchlist-name">${item.name}</div>
                </div>
                <div style="text-align: right;">
                    <div class="watchlist-price">₹${item.price.toFixed(2)}</div>
                    <div class="watchlist-change ${changeClass}">${changeSign}${item.daily_change.toFixed(2)}%</div>
                </div>
            </div>
        `;
        
        li.addEventListener('click', () => {
            selectCompany(item.symbol, li);
        });
        
        list.appendChild(li);
    });
}

function selectCompany(symbol, element) {
    selectedCompany = symbol;
    
    // Update active state
    document.querySelectorAll('.watchlist-item').forEach(item => {
        item.classList.remove('active');
    });
    element.classList.add('active');
    
    // Switch to overview tab
    switchTab('overview');
    
    // Reset time period buttons to 1M (30 days)
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector('[data-period="30"]').classList.add('active');
    currentFilter = '30';
    
    // Load and display metrics/header
    loadOverviewHeader(symbol);
    
    // Fetch and render chart with current filter (30 days by default)
    fetchAndRenderChart(symbol, '30');
}

async function loadOverviewHeader(symbol) {
    try {
        const response = await fetch(`${API_BASE_URL}/metrics/${symbol}`);
        if (!response.ok) throw new Error('Failed to fetch metrics');
        const metricsData = await response.json();
        displayOverviewHeader(metricsData);
    } catch (error) {
        console.error('Error loading overview header:', error);
    }
}

function displayOverviewHeader(data) {
    const header = document.getElementById('company-header');
    const metrics = document.getElementById('overview-metrics');
    
    // Show header and metrics
    header.classList.remove('hidden');
    metrics.classList.remove('hidden');
    
    // Update header
    document.getElementById('header-company-name').textContent = data.name;
    document.getElementById('header-company-info').textContent = `Finance · ${data.sector}`;
    document.getElementById('header-price').textContent = `₹${data.current_price.toFixed(2)}`;
    
    const changeElement = document.getElementById('header-change');
    const changeSign = data.daily_change >= 0 ? '+' : '';
    changeElement.textContent = `${changeSign}${data.daily_change.toFixed(2)}% today`;
    changeElement.className = `header-change ${data.daily_change_color}`;
    
    // Update metrics
    document.getElementById('metric-52w-high').textContent = `₹${data.high_52w.toFixed(0)}`;
    document.getElementById('metric-52w-high-label').textContent = 'Max in 52 weeks';
    document.getElementById('metric-52w-low').textContent = `₹${data.low_52w.toFixed(0)}`;
    document.getElementById('metric-52w-low-label').textContent = 'Min in 52 weeks';
    document.getElementById('metric-avg-close').textContent = `₹${data.avg_price.toFixed(0)}`;
    document.getElementById('metric-volatility').textContent = `${(data.volatility * 100).toFixed(2)}%`;
}

/* ===== FILTERS ===== */
function handleFilterChange(e) {
    const filterValue = e.target.dataset.filter;
    currentFilter = filterValue;
    
    // Update active state
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    e.target.classList.add('active');
    
    // Re-render chart with new filter (only if in Overview tab)
    if (currentTab === 'overview' && selectedCompany) {
        fetchAndRenderChart(selectedCompany, filterValue);
    }
}

function handleTimePeriodChange(e) {
    const period = e.target.dataset.period;
    currentFilter = period;
    
    // Update active state
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    e.target.classList.add('active');
    
    // Re-render chart with new period
    if (selectedCompany) {
        fetchAndRenderChart(selectedCompany, period);
    }
}

async function fetchAndRenderChart(symbol, days) {
    try {
        // Get 90-day data for all periods to have sufficient data
        let url = `${API_BASE_URL}/data/${symbol}/90`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${symbol}`);
        const data = await response.json();
        
        // Store in allStockData for local reference
        allStockData[symbol] = data.data;
        
        // Filter data based on period selected
        const filteredData = filterDataByDays(data.data, parseInt(days));
        
        // Render the chart
        renderChart(filteredData, symbol);
    } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error);
    }
}

/* ===== CHART RENDERING ===== */
async function loadAllStockData() {
    for (const company of companies) {
        try {
            const response = await fetch(`${API_BASE_URL}/data/${company}`);
            if (!response.ok) throw new Error(`Failed to load ${company}`);
            const data = await response.json();
            allStockData[company] = data.data;
        } catch (error) {
            console.error(`Error loading data for ${company}:`, error);
        }
    }
    
    // Refresh insights after loading all data
    updateInsights();
}

function renderChart(data, symbol) {
    // Hide empty state and show canvas
    const emptyState = document.getElementById('empty-state');
    const canvas = document.getElementById('stock-chart');
    
    if (emptyState) emptyState.style.display = 'none';
    if (canvas) canvas.style.display = 'block';
    
    // Data already comes filtered from API (30 or 90 days)
    // Just sort by date
    let chartData = [...data].sort((a, b) => new Date(a.Date) - new Date(b.Date));
    
    const dates = chartData.map(d => {
        const date = new Date(d.Date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    const closes = chartData.map(d => parseFloat(d.Close));
    
    // Calculate trend line (using simple linear regression for yellow dashed line)
    const trendData = calculateTrendLine(closes);
    
    const ctx = document.getElementById('stock-chart');
    if (!ctx) return;
    
    if (chart) chart.destroy();
    
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: `${symbol} Price (₹)`,
                    data: closes,
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    borderWidth: 2.5,
                    pointRadius: 0,
                    pointBackgroundColor: '#2ecc71',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4,
                    hoverBackgroundColor: 'rgba(46, 204, 113, 0.2)',
                },
                {
                    label: 'Trend',
                    data: trendData,
                    borderColor: '#f39c12',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false,
                    tension: 0.4,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        font: { size: 13 },
                        color: '#333333',
                        padding: 12,
                        usePointStyle: true,
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    padding: 12,
                    titleFont: { size: 14 },
                    bodyFont: { size: 13 },
                    borderColor: '#507782',
                    borderWidth: 1,
                    displayColors: true,
                    titleColor: '#333333',
                    bodyColor: '#333333',
                    callbacks: {
                        label: (context) => {
                            if (context.datasetIndex === 0) {
                                return `Price: ₹${context.parsed.y.toFixed(2)}`;
                            }
                            return `Trend: ₹${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(64, 64, 64, 0.5)',
                        drawBorder: false,
                    },
                    ticks: {
                        color: '#909090',
                        font: { size: 12 },
                        callback: (value) => `₹${value.toFixed(0)}`
                    }
                },
                x: {
                    grid: { display: false, color: 'transparent' },
                    ticks: {
                        color: '#909090',
                        font: { size: 12 }
                    }
                }
            }
        }
    });
    
    // Update canvas background
    const canvasContainer = canvas.parentElement;
    canvasContainer.style.backgroundColor = '#ffffff';
    canvasContainer.style.borderRadius = '12px';
    canvasContainer.style.border = '1px solid #e0e0e0';
}

function calculateTrendLine(data) {
    if (data.length < 2) return data;
    
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += data[i];
        sumXY += i * data[i];
        sumX2 += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return data.map((_, i) => slope * i + intercept);
}

function filterDataByDays(data, days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return data.filter(d => new Date(d.Date) >= cutoffDate);
}

/* ===== INSIGHTS (TOP GAINERS/LOSERS) ===== */
function updateInsights() {
    const insights = [];
    
    for (const company of companies) {
        if (allStockData[company] && allStockData[company].length > 0) {
            const data = allStockData[company];
            const oldest = parseFloat(data[0].Close);
            const newest = parseFloat(data[data.length - 1].Close);
            const change = ((newest - oldest) / oldest) * 100;
            
            insights.push({
                name: company,
                change: change,
                price: newest
            });
        }
    }
    
    // Sort by change
    insights.sort((a, b) => b.change - a.change);
    
    // Top gainers (top 3)
    const gainers = insights.slice(0, 3);
    const losers = insights.slice(-3).reverse();
    
    displayInsights('top-gainers', gainers, 'gain');
    displayInsights('top-losers', losers, 'loss');
}

function displayInsights(elementId, items, type) {
    const container = document.getElementById(elementId);
    container.innerHTML = '';
    
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'insight-item';
        div.style.cursor = 'pointer';
        
        const change = item.change !== undefined ? item.change : item.daily_change;
        const sign = change >= 0 ? '+' : '';
        const changeClass = change >= 0 ? 'gain' : 'loss';
        
        div.innerHTML = `
            <span class="insight-name">${item.name || item.symbol}</span>
            <span class="insight-change ${changeClass}">${sign}${change.toFixed(2)}%</span>
        `;
        
        div.addEventListener('click', () => {
            const symbol = item.symbol || item.name;
            const companyItem = document.querySelector(`.watchlist-item[data-symbol="${symbol}"]`);
            if (companyItem) {
                selectCompany(symbol, companyItem);
            }
        });
        
        container.appendChild(div);
    });
}

/* ===== METRICS TAB ===== */
async function loadMetrics(symbol) {
    try {
        const response = await fetch(`${API_BASE_URL}/metrics/${symbol}`);
        if (!response.ok) throw new Error('Failed to fetch metrics');
        const metricsData = await response.json();
        displayMetrics(metricsData);
        
        // Also load correlation matrix
        loadCorrelationMatrix();
    } catch (error) {
        console.error('Error loading metrics:', error);
    }
}

function displayMetrics(data) {
    const metricsContent = document.getElementById('metrics-content');
    const metricsTitleElement = document.getElementById('metrics-title');
    const normalizedChartSection = document.getElementById('normalized-chart-section');
    
    // Update title
    metricsTitleElement.textContent = `${data.symbol} - ${data.name} (${data.sector})`;
    
    // Create metrics grid
    const metricsGrid = document.createElement('div');
    metricsGrid.className = 'metrics-grid';
    
    const dailyChangeColor = data.daily_change >= 0 ? 'positive' : 'negative';
    const dailyChangeSign = data.daily_change >= 0 ? '+' : '';
    
    metricsGrid.innerHTML = `
        <div class="metric-card">
            <div class="metric-label">Current Price</div>
            <div class="metric-value">₹${data.current_price.toFixed(2)}</div>
        </div>
        
        <div class="metric-card">
            <div class="metric-label">Daily Change</div>
            <div class="metric-value ${dailyChangeColor}">${dailyChangeSign}${data.daily_change.toFixed(2)}%</div>
        </div>
        
        <div class="metric-card">
            <div class="metric-label">52W High</div>
            <div class="metric-value">₹${data.high_52w.toFixed(2)}</div>
        </div>
        
        <div class="metric-card">
            <div class="metric-label">52W Low</div>
            <div class="metric-value">₹${data.low_52w.toFixed(2)}</div>
        </div>
        
        <div class="metric-card">
            <div class="metric-label">Average Price</div>
            <div class="metric-value">₹${data.avg_price.toFixed(2)}</div>
        </div>
        
        <div class="metric-card">
            <div class="metric-label">Volatility (7D)</div>
            <div class="metric-value">${(data.volatility * 100).toFixed(2)}%</div>
        </div>
        
        <div class="metric-card">
            <div class="metric-label">Volume</div>
            <div class="metric-value">${(data.volume / 1000000).toFixed(1)}M</div>
        </div>
        
        <div class="metric-card">
            <div class="metric-label">From 52W Low</div>
            <div class="metric-value positive">+${data.performance_from_low.toFixed(2)}%</div>
        </div>
    `;
    
    // Clear and populate metrics content
    metricsContent.innerHTML = '';
    metricsContent.appendChild(metricsGrid);
    
    // Render normalized performance chart
    renderNormalizedChart(data.normalized_data, data.symbol);
    normalizedChartSection.style.display = 'block';
}

function renderNormalizedChart(normalizedData, symbol) {
    const normalizedChartElement = document.getElementById('normalized-chart');
    
    // Sort data by date
    const sortedData = [...normalizedData].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const dates = sortedData.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    const values = sortedData.map(d => parseFloat(d.value));
    
    if (normalizedChart) normalizedChart.destroy();
    
    normalizedChart = new Chart(normalizedChartElement, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: `${symbol} Performance from 52W Low (%)`,
                data: values,
                borderColor: '#2ecc71',
                backgroundColor: 'rgba(46, 204, 113, 0.1)',
                borderWidth: 2.5,
                pointRadius: 3,
                pointBackgroundColor: '#2ecc71',
                fill: true,
                tension: 0.4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: { font: { size: 13 }, color: '#1a1a1a', padding: 12 }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    padding: 12,
                    titleFont: { size: 14 },
                    bodyFont: { size: 13 },
                    titleColor: '#333333',
                    bodyColor: '#333333',
                    borderColor: '#507782',
                    borderWidth: 1,
                    callbacks: {
                        label: (context) => `Performance: ${context.parsed.y.toFixed(2)}%`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(224, 224, 224, 0.5)' },
                    ticks: {
                        color: '#666666',
                        font: { size: 12 },
                        callback: (value) => `${value.toFixed(0)}%`
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#666666', font: { size: 12 } }
                }
            }
        }
    });
}

/* ===== GAINERS/LOSERS TAB ===== */
async function loadGainersLosers() {
    try {
        const response = await fetch(`${API_BASE_URL}/gainers-losers`);
        if (!response.ok) throw new Error('Failed to fetch gainers/losers');
        const data = await response.json();
        displayGainersLosers(data);
    } catch (error) {
        console.error('Error loading gainers/losers:', error);
    }
}

function displayGainersLosers(data) {
    displayInsights('top-gainers', data.gainers, 'gain');
    displayInsights('top-losers', data.losers, 'loss');
}

async function loadCorrelationMatrix() {
    try {
        const response = await fetch(`${API_BASE_URL}/correlation-matrix`);
        if (!response.ok) throw new Error('Failed to fetch correlation matrix');
        const data = await response.json();
        if (!data.error) {
            renderCorrelationMatrix(data);
        }
    } catch (error) {
        console.error('Error loading correlation matrix:', error);
    }
}

function renderCorrelationMatrix(data) {
    const container = document.getElementById('correlation-matrix-container');
    const correlationSection = document.getElementById('correlation-section');
    
    if (!data.symbols || !data.matrix) {
        correlationSection.style.display = 'none';
        return;
    }
    
    // Create table
    const table = document.createElement('table');
    table.className = 'correlation-table';
    
    // Header row
    const headerRow = document.createElement('tr');
    const headerCell = document.createElement('th');
    headerCell.textContent = '';
    headerRow.appendChild(headerCell);
    
    data.symbols.forEach(symbol => {
        const th = document.createElement('th');
        th.textContent = symbol;
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);
    
    // Data rows
    data.matrix.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        
        // Row header
        const rowHeader = document.createElement('th');
        rowHeader.textContent = data.symbols[rowIndex];
        rowHeader.style.textAlign = 'left';
        tr.appendChild(rowHeader);
        
        // Correlation cells
        row.forEach((value, colIndex) => {
            const td = document.createElement('td');
            
            // Determine color class based on correlation value
            let cellClass = 'correlation-cell';
            if (value === 1.0) {
                cellClass += ' correlation-perfect';
            } else if (value >= 0.8) {
                cellClass += ' correlation-high';
            } else if (value >= 0.5) {
                cellClass += ' correlation-moderate';
            } else {
                cellClass += ' correlation-low';
            }
            
            td.className = cellClass;
            td.textContent = value.toFixed(2);
            tr.appendChild(td);
        });
        
        table.appendChild(tr);
    });
    
    container.innerHTML = '';
    container.appendChild(table);
    correlationSection.style.display = 'block';
}

function populateCompareSelects() {
    const select1 = document.getElementById('compare-stock1');
    const select2 = document.getElementById('compare-stock2');
    
    select1.innerHTML = '<option value="">Select First Stock</option>';
    select2.innerHTML = '<option value="">Select Second Stock</option>';
    
    companies.forEach(company => {
        const option1 = document.createElement('option');
        option1.value = company;
        option1.textContent = company;
        select1.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = company;
        option2.textContent = company;
        select2.appendChild(option2);
    });
}

async function executeComparison() {
    const stock1 = document.getElementById('compare-stock1').value;
    const stock2 = document.getElementById('compare-stock2').value;
    
    if (!stock1 || !stock2) {
        alert('Please select both stocks');
        return;
    }
    
    if (stock1 === stock2) {
        alert('Please select different stocks');
        return;
    }
    
    try {
        // Fetch correlation
        const correlationResponse = await fetch(`${API_BASE_URL}/compare?symbol1=${stock1}&symbol2=${stock2}`);
        const correlationData = await correlationResponse.json();
        
        // Get data from cache
        const data1 = allStockData[stock1];
        const data2 = allStockData[stock2];
        
        // Render comparison
        renderComparisonChart(data1, data2, stock1, stock2);
        displayComparisonStats(correlationData.correlation, stock1, stock2);
        displayComparisonHeader(stock1, stock2);
        
        document.getElementById('compare-results').classList.remove('hidden');
    } catch (error) {
        console.error('Comparison error:', error);
        alert('Failed to execute comparison');
    }
}

function displayComparisonHeader(symbol1, symbol2) {
    const chartHeader = document.querySelector('.compare-results');
    let header = chartHeader.querySelector('.comparison-header');
    if (!header) {
        header = document.createElement('div');
        header.className = 'comparison-header';
        chartHeader.insertBefore(header, chartHeader.firstChild);
    }
    header.innerHTML = `
        <h3 style="font-size: 22px; color: #507782; margin: 0;">${symbol1} vs ${symbol2}</h3>
        <p style="color: #666; margin: 8px 0; font-size: 14px;">Last 30 days price comparison</p>
    `;
}

function renderComparisonChart(data1, data2, symbol1, symbol2) {
    // Sort data
    data1.sort((a, b) => new Date(a.Date) - new Date(b.Date));
    data2.sort((a, b) => new Date(a.Date) - new Date(b.Date));
    
    // Get last 30 days
    const filtered1 = filterDataByDays(data1, 30);
    const filtered2 = filterDataByDays(data2, 30);
    
    const dates1 = new Set(filtered1.map(d => d.Date));
    const dates2 = new Set(filtered2.map(d => d.Date));
    const commonDates = Array.from(dates1).filter(d => dates2.has(d)).sort();
    
    const closes1 = commonDates.map(date => parseFloat(data1.find(d => d.Date === date)?.Close || 0));
    const closes2 = commonDates.map(date => parseFloat(data2.find(d => d.Date === date)?.Close || 0));
    const dateLabels = commonDates.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    
    const ctx = document.getElementById('comparison-chart');
    if (comparisonChart) comparisonChart.destroy();
    
    comparisonChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dateLabels,
            datasets: [
                {
                    label: `${symbol1} (₹)`,
                    data: closes1,
                    borderColor: '#507782',
                    backgroundColor: 'rgba(80, 119, 130, 0.05)',
                    borderWidth: 2.5,
                    pointRadius: 3,
                    fill: true,
                    tension: 0.4,
                },
                {
                    label: `${symbol2} (₹)`,
                    data: closes2,
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.05)',
                    borderWidth: 2.5,
                    pointRadius: 3,
                    fill: true,
                    tension: 0.4,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        font: { size: 13 },
                        color: '#1a1a1a',
                        padding: 12,
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    padding: 12,
                    titleFont: { size: 14 },
                    bodyFont: { size: 13 },
                    titleColor: '#333333',
                    bodyColor: '#333333',
                    borderColor: '#507782',
                    borderWidth: 1,
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ₹${context.parsed.y.toFixed(2)}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { color: 'rgba(224, 224, 224, 0.5)' },
                    ticks: {
                        color: '#666666',
                        font: { size: 12 },
                        callback: (value) => `₹${value.toFixed(0)}`
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#666666', font: { size: 12 } }
                }
            }
        }
    });
}

function displayComparisonStats(correlation, symbol1, symbol2) {
    const correlationInfo = document.getElementById('correlation-info');
    const metricsInfo = document.getElementById('comparison-metrics');
    const correlationValue = parseFloat(correlation).toFixed(3);
    
    let interpretation = '';
    let color = '#666';
    
    if (correlationValue > 0.7) {
        interpretation = 'Strong positive correlation - Stocks move together';
        color = '#27ae60';
    } else if (correlationValue > 0.3) {
        interpretation = 'Moderate positive correlation - Similar trends';
        color = '#2ecc71';
    } else if (correlationValue > -0.3) {
        interpretation = 'Weak/no correlation - Independent movement';
        color = '#f39c12';
    } else if (correlationValue > -0.7) {
        interpretation = 'Moderate negative correlation - Inverse trends';
        color = '#e67e22';
    } else {
        interpretation = 'Strong negative correlation - Opposite movement';
        color = '#e74c3c';
    }
    
    // Get data for price info
    const data1 = allStockData[symbol1];
    const data2 = allStockData[symbol2];
    
    const latest1 = data1[data1.length - 1];
    const latest2 = data2[data2.length - 1];
    const earliest1 = data1[0];
    const earliest2 = data2[0];
    
    const change1 = ((parseFloat(latest1.Close) - parseFloat(earliest1.Close)) / parseFloat(earliest1.Close) * 100).toFixed(2);
    const change2 = ((parseFloat(latest2.Close) - parseFloat(earliest2.Close)) / parseFloat(earliest2.Close) * 100).toFixed(2);
    
    const changeColor1 = change1 >= 0 ? '#2ecc71' : '#e74c3c';
    const changeColor2 = change2 >= 0 ? '#2ecc71' : '#e74c3c';
    
    correlationInfo.innerHTML = `
        <strong style="font-size: 16px; color: #507782;">Correlation Coefficient</strong>
        <div style="font-size: 24px; font-weight: 700; color: ${color}; margin: 10px 0;">${correlationValue}</div>
        <div style="font-size: 13px; color: #666; line-height: 1.6;">${interpretation}</div>
    `;
    
    metricsInfo.innerHTML = `
        <strong style="font-size: 16px; color: #507782;">Performance (All data)</strong>
        <div style="margin-top: 10px;">
            <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                <span>${symbol1}</span>
                <span style="font-weight: 600; color: ${changeColor1};">${change1 >= 0 ? '+' : ''}${change1}%</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                <span>${symbol2}</span>
                <span style="font-weight: 600; color: ${changeColor2};">${change2 >= 0 ? '+' : ''}${change2}%</span>
            </div>
        </div>
    `;
}
