import requests
import pandas as pd
import os
import json
import time
from pathlib import Path
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")

# Cache configuration
CACHE_DIR = Path(__file__).parent.parent.parent / "data" / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)
CACHE_EXPIRY_HOURS = 24  # Cache valid for 24 hours
LAST_API_CALL = {"time": 0}  # Track last API call time

def get_cache_file(symbol: str):
    """Get cache file path for a symbol"""
    return CACHE_DIR / f"{symbol}_data.json"

def is_cache_valid(symbol: str) -> bool:
    """Check if cached data exists and is still valid"""
    cache_file = get_cache_file(symbol)
    if not cache_file.exists():
        return False
    
    # Check file age
    file_time = datetime.fromtimestamp(cache_file.stat().st_mtime)
    is_valid = datetime.now() - file_time < timedelta(hours=CACHE_EXPIRY_HOURS)
    return is_valid

def load_from_cache(symbol: str) -> pd.DataFrame:
    """Load data from local cache file"""
    try:
        cache_file = get_cache_file(symbol)
        if cache_file.exists() and is_cache_valid(symbol):
            print(f"  📁 [CACHE] Loading {symbol} from cache...")
            with open(cache_file, 'r') as f:
                data = json.load(f)
            df = pd.DataFrame(data)
            if 'Date' in df.columns:
                df['Date'] = pd.to_datetime(df['Date'])
            return df
    except Exception as e:
        print(f"  ⚠️  [CACHE ERROR] {symbol}: {e}")
    
    return pd.DataFrame()

def save_to_cache(symbol: str, df: pd.DataFrame):
    """Save fetched data to local cache"""
    try:
        cache_file = get_cache_file(symbol)
        df_copy = df.copy()
        if 'Date' in df_copy.columns:
            df_copy['Date'] = df_copy['Date'].astype(str)
        
        with open(cache_file, 'w') as f:
            json.dump(df_copy.to_dict('records'), f, indent=2)
        print(f"  💾 [CACHE] Saved {symbol} to cache")
    except Exception as e:
        print(f"  ⚠️  [CACHE ERROR] Failed to save {symbol}: {e}")

def rate_limit_wait():
    """Enforce 1.2 second delay between API calls to respect rate limit"""
    global LAST_API_CALL
    time_since_last_call = time.time() - LAST_API_CALL["time"]
    
    if time_since_last_call < 1.2:
        wait_time = 1.2 - time_since_last_call
        print(f"  ⏳ [RATE LIMIT] Waiting {wait_time:.2f}s to respect 1 req/sec limit...")
        time.sleep(wait_time)
    
    LAST_API_CALL["time"] = time.time()

def fetch_stock(symbol="INFY"):
    """
    Fetch stock data with intelligent caching and rate limiting.
    
    Strategy:
    1. Check cache first (if valid, return immediately - no API call)
    2. Enforce rate limit (wait 1.2 seconds since last API call)
    3. Fetch from API if cache miss
    4. Save to cache for future use
    """
    
    # Try cache first (fast path - no API call needed)
    cached_df = load_from_cache(symbol)
    if not cached_df.empty:
        return cached_df
    
    # Cache miss - need to fetch from API
    print(f"  🌐 [API] Fetching {symbol} from Alpha Vantage...")
    
    # Enforce rate limit before API call
    rate_limit_wait()
    
    url = "https://www.alphavantage.co/query"
    
    params = {
        "function": "TIME_SERIES_DAILY",
        "symbol": symbol,
        "apikey": API_KEY,
        "outputsize": "full"  # Get full data, not just compact
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        data = response.json()

        if "Time Series (Daily)" not in data:
            error_msg = data.get("Information", data.get("Error Message", "Unknown error"))
            print(f"  ❌ [API ERROR] {error_msg}")
            return pd.DataFrame()

        time_series = data["Time Series (Daily)"]

        df = pd.DataFrame.from_dict(time_series, orient="index")

        df.rename(columns={
            "1. open": "Open",
            "2. high": "High",
            "3. low": "Low",
            "4. close": "Close",
            "5. volume": "Volume"
        }, inplace=True)

        df.reset_index(inplace=True)
        df.rename(columns={"index": "Date"}, inplace=True)
        
        # Convert Date to datetime
        df['Date'] = pd.to_datetime(df['Date'])
        
        # Save to cache for next time
        save_to_cache(symbol, df)
        
        print(f"  ✅ [API] Successfully fetched {len(df)} records for {symbol}")
        return df
    
    except requests.exceptions.Timeout:
        print(f"  ❌ [API ERROR] Request timeout for {symbol}")
        return pd.DataFrame()
    except Exception as e:
        print(f"  ❌ [API ERROR] {symbol}: {str(e)}")
        return pd.DataFrame()

AVAILABLE_COMPANIES = ["INFY", "TCS", "RELIANCE", "HDFCBANK"]

def get_all_companies():
    return AVAILABLE_COMPANIES




# import requests
# import pandas as pd
# import os
# from dotenv import load_dotenv

# load_dotenv()

# API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")

# def fetch_stock(symbol="INFY"):
#     url = "https://www.alphavantage.co/query"
    
#     params = {
#         "function": "TIME_SERIES_DAILY",
#         "symbol": symbol,
#         "apikey": API_KEY,
#         "outputsize": "compact"
#     }

#     response = requests.get(url, params=params)
#     data = response.json()

#     if "Time Series (Daily)" not in data:
#         print("API ERROR:", data)
#         return pd.DataFrame()

#     time_series = data["Time Series (Daily)"]

#     df = pd.DataFrame.from_dict(time_series, orient="index")

#     df.rename(columns={
#         "1. open": "Open",
#         "2. high": "High",
#         "3. low": "Low",
#         "4. close": "Close",
#         "5. volume": "Volume"
#     }, inplace=True)

#     # Keep raw values (no heavy processing here)
#     df.reset_index(inplace=True)
#     df.rename(columns={"index": "Date"}, inplace=True)

#     return df

# AVAILABLE_COMPANIES = ["INFY", "TCS", "RELIANCE", "HDFCBANK"]

# def get_all_companies():
#     return AVAILABLE_COMPANIES