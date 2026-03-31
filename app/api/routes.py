from fastapi import APIRouter, HTTPException
from app.services.stock_service import (
    get_last_30_days,
    get_last_90_days,
    get_stock_summary,
    compare_two_stocks,
    get_watchlist,
    get_gainers_losers,
    get_stock_metrics,
    get_correlation_matrix
)
from app.data.fetch_data import get_all_companies

router = APIRouter()

@router.get("/companies")
def get_companies():
    try:
        companies = get_all_companies()
        return {"companies": companies}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/{symbol}")
def get_data(symbol: str):
    try:
        data = get_last_30_days(symbol)
        return {
            "symbol": symbol,
            "data": data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data for {symbol}: {str(e)}")

@router.get("/data/{symbol}/90")
def get_data_90(symbol: str):
    try:
        data = get_last_90_days(symbol)
        return {
            "symbol": symbol,
            "data": data,
            "days": 90
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching 90-day data for {symbol}: {str(e)}")

@router.get("/summary/{symbol}")
def get_summary(symbol: str):
    try:
        summary = get_stock_summary(symbol)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching summary for {symbol}: {str(e)}")

@router.get("/compare")
def compare(symbol1: str, symbol2: str):
    try:
        result = compare_two_stocks(symbol1, symbol2)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error comparing {symbol1} and {symbol2}: {str(e)}")

@router.get("/watchlist")
def watchlist():
    try:
        data = get_watchlist()
        return {"watchlist": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching watchlist: {str(e)}")

@router.get("/gainers-losers")
def gainers_losers():
    try:
        data = get_gainers_losers()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching gainers/losers: {str(e)}")

@router.get("/metrics/{symbol}")
def metrics(symbol: str):
    try:
        data = get_stock_metrics(symbol)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching metrics for {symbol}: {str(e)}")

@router.get("/correlation-matrix")
def correlation_matrix():
    try:
        data = get_correlation_matrix()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching correlation matrix: {str(e)}")
