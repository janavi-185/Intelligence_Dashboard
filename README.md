# Stock Intelligence Dashboard

A full-stack stock market analysis platform with RESTful API, clean data processing, and interactive financial visualization for real-time market insights.

---

## Table of Contents

- [Overview](#overview)
- [Python & Data Handling](#python--data-handling)
- [API Design & Logic](#api-design--logic)
- [Creativity in Data Insights](#creativity-in-data-insights)
- [Visualization & UI](#visualization--ui)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)

---

## Overview

Stock Intelligence Dashboard is a comprehensive financial analytics application designed for institutional and retail investors. The platform integrates Alpha Vantage API with a robust backend architecture and modern frontend to deliver actionable market intelligence.

**Core Capabilities:**
- Real-time stock price tracking and analysis
- Data-driven performance comparisons
- Automated market insights (top gainers/losers)
- Historical trend analysis (30/90-day windows)
- 52-week performance metrics

---

## Python & Data Handling

### Clean, Efficient Code Architecture

**Data Processing Pipeline:**

1. **Fetch Module** (`app/data/fetch_data.py`):
   - Integrates with Alpha Vantage API for real-time data
   - Implements client-side caching with JSON persistence
   - Rate limiting (1.2s delays between API calls)
   - Graceful error handling and fallbacks

2. **Preprocessing Module** (`app/data/preprocess.py`):
   - Data cleaning and normalization using Pandas
   - Metrics calculation:
     - Percentage change: `((newest - oldest) / oldest) * 100`
     - 52-week high/low identification
     - Average closing price aggregation
   - Handles missing/invalid data gracefully

3. **Business Logic** (`app/services/stock_service.py`):
   - Stock correlation analysis
   - Performance ranking algorithms
   - Data transformation and formatting
   - Well-structured, reusable functions

### Data Flow

```
Alpha Vantage API → Fetch (with rate limiting) → 
Preprocess (clean, normalize) → Service Layer (calculate metrics) → 
Cache (JSON persistence) → Frontend
```

### Key Technologies
- **Pandas**: Efficient data manipulation and time-series analysis
- **NumPy**: Numerical computations for metrics
- **Python-dotenv**: Secure environment variable management

---

## API Design & Logic

### RESTful Endpoints

**Base URL**: `http://localhost:8000`

#### 1. Health Check
```http
GET /health
```
Verifies API operational status

#### 2. Get Available Companies
```http
GET /companies
```
Returns available stock symbols: `["INFY", "TCS", "RELIANCE", "HDFCBANK"]`

#### 3. Fetch Stock Data
```http
GET /data/{symbol}
```
Returns historical price data with OHLCV (Open, High, Low, Close, Volume)

#### 4. Stock Summary
```http
GET /summary/{symbol}
```
Returns: 52-week high, 52-week low, average closing price

#### 5. Correlation Comparison
```http
GET /compare?symbol1=INFY&symbol2=TCS
```
Returns correlation coefficient and dual stock data for comparative analysis

### Architecture

- **Framework**: FastAPI with automatic API documentation
- **Middleware**: CORS enabled for frontend integration
- **Error Handling**: Comprehensive try-catch with meaningful messages
- **Caching**: Server-side JSON caching reduces API redundancy
- **Route Organization**: Modular endpoint definitions in `app/api/routes.py`

---

## Creativity in Data Insights

### Automated Performance Analytics

**Top Gainers/Losers Calculation:**
- Automatically calculates percentage change for all tracked stocks
- Compares earliest vs. latest closing prices in dataset
- Ranks companies by performance in real-time
- Displays top 3 gainers and losers with color-coded indicators

**Stock Correlation Analysis:**
- Computes statistical correlation between any two stocks
- Enables investors to identify correlated movements
- Useful for portfolio diversification decisions
- Correlation range: -1 (inverse) to +1 (identical movement)

**52-Week Performance Metrics:**
- Identifies annual highs and lows
- Calculates average pricing for trend baseline
- Provides fundamental analysis benchmarks
- Automatically updated with fresh data

**Original Insights:**
- Real-time calculation of performance trends
- Client-side aggregation reduces server load
- Dynamic filtering (30/90-day windows) adapts to user analysis needs
- Correlation insights inform investment strategy

---

## Visualization & UI

### Interactive Charts

- **Chart.js Integration**: Professional line charts with:
  - Date-based X-axis
  - Price-based Y-axis
  - Smooth animations and hover effects
  - Legend and responsive sizing

### Responsive Design

- **Sidebar Navigation**: Fixed left panel with company list
- **Main Content Area**: Responsive grid layout
- **Mobile-Friendly**: Adapts to various screen sizes
- **Professional Color Scheme**:
  - Primary: Teal (#507782) - Professional, trustworthy
  - Background: Light Gray (#f8f9fa) - Low-contrast, easy on eyes
  - Success: Green (#2ecc71) - Positive indicators
  - Danger: Red (#e74c3c) - Negative indicators

### User Experience

- **Live Indicator**: Green pulsing dot shows data freshness
- **Real-time Updates**: Charts render instantly on company selection
- **Interactive Elements**: 
  - Click companies to switch views
  - Toggle time periods (30/90 days)
  - Compare mode for side-by-side analysis
- **Visual Feedback**: Hover effects, active states, color-coded metrics

### UI Components

- Filter buttons with active state styling
- Gain/loss indicators with color coding
- Responsive grid for insights panels
- Clean typography hierarchy

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend Framework** | FastAPI | RESTful API with automatic docs |
| **Server** | Uvicorn | ASGI application server |
| **Data Processing** | Pandas, NumPy | Data manipulation & analysis |
| **Data Source** | Alpha Vantage | Financial data API |
| **Caching** | JSON files | Session-based data persistence |
| **Frontend Rendering** | Chart.js | Interactive financial charts |
| **UI Framework** | HTML5, CSS3, Vanilla JS | No external dependencies |
| **Icons** | Font Awesome 6.4.0 | UI iconography |
| **Configuration** | Python-dotenv | Environment variables |

---

## Project Structure

```
Jarnox/
├── app/
│   ├── main.py                    # FastAPI app initialization & CORS
│   ├── config.py                  # Configuration constants
│   ├── api/
│   │   └── routes.py              # RESTful endpoint definitions
│   ├── services/
│   │   └── stock_service.py       # Business logic & calculations
│   ├── data/
│   │   ├── fetch_data.py          # Alpha Vantage integration + caching
│   │   └── preprocess.py          # Data cleaning & metric computation
│   └── models/
│       └── database.py            # Reserved for future DB integration
│
├── frontend/
│   ├── index.html                 # Dashboard UI layout
│   ├── style.css                  # Responsive styling & theme
│   └── script.js                  # Frontend logic & API integration
│
├── data/
│   └── cache/                     # JSON-persisted stock data cache
│
└── requirements.txt               # Python dependencies

```

**Code Organization Principles:**
- Separation of concerns (fetch, preprocess, serve)
- Modular routing and service layers
- Clean function interfaces
- Comprehensive error handling
- Reusable data processing components

---

**Last Updated**: March 31, 2026 | **Version**: 1.0.0
