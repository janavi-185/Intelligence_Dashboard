from fastapi import APIRouter
from app.services.stock_service import (
    get_last_30_days,
    get_stock_summary,
    compare_two_stocks
)
from app.data.fetch_data import get_all_companies

router = APIRouter()

@router.get("/companies")
def get_companies():
    return {"companies": get_all_companies()}

@router.get("/data/{symbol}")
def get_data(symbol: str):
    return {
        "symbol": symbol,
        "data": get_last_30_days(symbol)
    }

@router.get("/summary/{symbol}")
def get_summary(symbol: str):
    return get_stock_summary(symbol)

@router.get("/compare")
def compare(symbol1: str, symbol2: str):
    return compare_two_stocks(symbol1, symbol2)
