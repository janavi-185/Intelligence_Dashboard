import requests
import pandas as pd
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")

def fetch_stock(symbol="INFY"):
    url = "https://www.alphavantage.co/query"
    
    params = {
        "function": "TIME_SERIES_DAILY",
        "symbol": symbol,
        "apikey": API_KEY,
        "outputsize": "compact"
    }

    response = requests.get(url, params=params)
    data = response.json()

    if "Time Series (Daily)" not in data:
        print("API ERROR:", data)
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

    # Keep raw values (no heavy processing here)
    df.reset_index(inplace=True)
    df.rename(columns={"index": "Date"}, inplace=True)

    return df

AVAILABLE_COMPANIES = ["INFY", "TCS", "RELIANCE", "HDFCBANK"]

def get_all_companies():
    return AVAILABLE_COMPANIES