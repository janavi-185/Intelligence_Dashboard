// Stock Dashboard JS
const API_BASE_URL = 'http://localhost:8000';
let chart = null;
let comparisonChart = null;
let companies = [];
let allStockData = {};
let currentFilter = '30';
let selectedCompany = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard initializing...');
    initApp();
    setupEventListeners();
});

/* ===== INITIALIZATION ===== */
async function initApp() {
    try {
        const response = await fetch(`${API_BASE_URL}/companies`);
        const data = await response.json();
        companies = data.companies;
        console.log('Companies loaded:', companies);
        
        displayCompaniesList();
        populateCompareSelects();
        loadAllStockData();
    } catch (error) {
        console.error('Error loading companies:', error);
    }
}

/* ===== EVENT LISTENERS ===== */
function setupEventListeners() {
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', handleFilterChange);
    });

    // Company list
    const companiesList = document.getElementById('companies-list');
    companiesList.addEventListener('click', (e) => {
        if (e.target.classList.contains('company-item')) {
            selectCompany(e.target.dataset.symbol, e.target);
        }
    });

    // Comparison mode
    document.getElementById('back-from-compare').addEventListener('click', exitCompareMode);
    document.getElementById('execute-compare').addEventListener('click', executeComparison);

    // Compare button
    document.querySelector('[data-filter="compare"]').addEventListener('click', () => {
        enterCompareMode();
    });
}

/* ===== COMPANY LIST ===== */
function displayCompaniesList() {
    const list = document.getElementById('companies-list');
    list.innerHTML = '';
    
    companies.forEach(company => {
        const li = document.createElement('li');
        li.textContent = company;
        li.className = 'company-item';
        li.dataset.symbol = company;
        list.appendChild(li);
    });
}

function selectCompany(symbol, element) {
    selectedCompany = symbol;
    
    // Update active state
    document.querySelectorAll('.company-item').forEach(item => {
        item.classList.remove('active');
    });
    element.classList.add('active');
    
    // Show main view and hide compare
    document.getElementById('compare-mode').classList.add('hidden');
    
    // Update title
    document.getElementById('chart-title').textContent = `${symbol} - Stock Price`;
    
    // Reset filters to 30 days
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector('[data-filter="30"]').classList.add('active');
    currentFilter = '30';
    
    // Fetch and render chart with current filter (30 days by default)
    fetchAndRenderChart(symbol, '30');
}

/* ===== FILTERS ===== */
function handleFilterChange(e) {
    const filterValue = e.target.dataset.filter;
    
    if (filterValue === 'compare') {
        enterCompareMode();
        return;
    }
    
    currentFilter = filterValue;
    
    // Update active state
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    e.target.classList.add('active');
    
    // Re-render chart with new filter
    if (selectedCompany) {
        fetchAndRenderChart(selectedCompany, filterValue);
    }
}

async function fetchAndRenderChart(symbol, days) {
    try {
        let url = `${API_BASE_URL}/data/${symbol}`;
        if (days === '90') {
            url = `${API_BASE_URL}/data/${symbol}/90`;
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${symbol}`);
        const data = await response.json();
        
        // Store in allStockData for local reference
        allStockData[symbol] = data.data;
        
        // Render the chart
        renderChart(data.data, symbol);
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
    // Data already comes filtered from API (30 or 90 days)
    // Just sort by date
    let chartData = [...data].sort((a, b) => new Date(a.Date) - new Date(b.Date));
    
    const dates = chartData.map(d => {
        const date = new Date(d.Date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    const closes = chartData.map(d => parseFloat(d.Close));
    
    const ctx = document.getElementById('stock-chart');
    if (!ctx) return;
    
    if (chart) chart.destroy();
    
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: `${symbol} Price (₹)`,
                data: closes,
                borderColor: '#507782',
                backgroundColor: 'rgba(80, 119, 130, 0.05)',
                borderWidth: 2.5,
                pointRadius: 4,
                pointBackgroundColor: '#507782',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4,
                hoverBackgroundColor: 'rgba(80, 119, 130, 0.15)',
            }]
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
                        usePointStyle: true,
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(26, 26, 26, 0.8)',
                    padding: 12,
                    titleFont: { size: 14 },
                    bodyFont: { size: 13 },
                    borderColor: '#507782',
                    borderWidth: 1,
                    displayColors: false,
                    callbacks: {
                        label: (context) => `Price: ₹${context.parsed.y.toFixed(2)}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(224, 224, 224, 0.5)',
                        drawBorder: false,
                    },
                    ticks: {
                        color: '#666666',
                        font: { size: 12 },
                        callback: (value) => `₹${value.toFixed(0)}`
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#666666',
                        font: { size: 12 }
                    }
                }
            }
        }
    });
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
        
        const sign = item.change >= 0 ? '+' : '';
        const changeClass = item.change >= 0 ? 'gain' : 'loss';
        
        div.innerHTML = `
            <span class="insight-name">${item.name}</span>
            <span class="insight-change ${changeClass}">${sign}${item.change.toFixed(2)}%</span>
        `;
        
        div.addEventListener('click', () => {
            const companyItem = document.querySelector(`.company-item[data-symbol="${item.name}"]`);
            if (companyItem) {
                selectCompany(item.name, companyItem);
            }
        });
        
        container.appendChild(div);
    });
}

/* ===== COMPARISON MODE ===== */
function enterCompareMode() {
    // Hide chart and insights
    document.querySelector('.chart-section').style.display = 'none';
    document.querySelector('.insights-section').style.display = 'none';
    
    // Show compare mode
    document.getElementById('compare-mode').classList.remove('hidden');
    document.getElementById('compare-results').classList.add('hidden');
    selectedCompany = null;
    
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector('[data-filter="compare"]').classList.add('active');
}

function exitCompareMode() {
    // Show chart and insights again
    document.querySelector('.chart-section').style.display = 'block';
    document.querySelector('.insights-section').style.display = 'block';
    
    // Hide compare mode
    document.getElementById('compare-mode').classList.add('hidden');
    document.getElementById('compare-results').classList.add('hidden');
    
    // Reset selects
    document.getElementById('compare-stock1').value = '';
    document.getElementById('compare-stock2').value = '';
    
    // Update filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector('[data-filter="30"]').classList.add('active');
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
                    backgroundColor: 'rgba(26, 26, 26, 0.8)',
                    padding: 12,
                    titleFont: { size: 14 },
                    bodyFont: { size: 13 },
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
