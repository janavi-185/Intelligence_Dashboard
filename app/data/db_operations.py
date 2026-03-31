from sqlalchemy.orm import Session
from app.models.database import StockData
from datetime import datetime, timedelta
from typing import List
import pandas as pd

def save_stock_data(db: Session, symbol: str, df: pd.DataFrame):
    """Save stock data to database"""
    # Delete old data for this symbol to avoid duplicates
    db.query(StockData).filter(StockData.symbol == symbol).delete()
    db.commit()
    
    # Insert new data
    for idx, row in df.iterrows():
        stock_record = StockData(
            symbol=symbol,
            date=row['Date'],
            open_price=row['Open'],
            high=row['High'],
            low=row['Low'],
            close=row['Close'],
            volume=int(row['Volume'])
        )
        db.add(stock_record)
    db.commit()

def get_stock_data_by_days(db: Session, symbol: str, days: int) -> pd.DataFrame:
    """Get stock data from database for last N days"""
    cutoff_date = datetime.utcnow().date() - timedelta(days=days)
    
    records = db.query(StockData).filter(
        StockData.symbol == symbol,
        StockData.date >= cutoff_date
    ).all()
    
    if not records:
        return pd.DataFrame()
    
    data = {
        'Date': [r.date for r in records],
        'Open': [r.open_price for r in records],
        'High': [r.high for r in records],
        'Low': [r.low for r in records],
        'Close': [r.close for r in records],
        'Volume': [r.volume for r in records],
    }
    
    df = pd.DataFrame(data)
    df['Date'] = pd.to_datetime(df['Date'])
    return df.sort_values('Date')

def get_all_stock_data(db: Session, symbol: str) -> pd.DataFrame:
    """Get all stock data for a symbol from database"""
    records = db.query(StockData).filter(
        StockData.symbol == symbol
    ).all()
    
    if not records:
        return pd.DataFrame()
    
    data = {
        'Date': [r.date for r in records],
        'Open': [r.open_price for r in records],
        'High': [r.high for r in records],
        'Low': [r.low for r in records],
        'Close': [r.close for r in records],
        'Volume': [r.volume for r in records],
    }
    
    df = pd.DataFrame(data)
    df['Date'] = pd.to_datetime(df['Date'])
    return df.sort_values('Date')

def truncate_old_data(db: Session, days_to_keep: int = 90):
    """Delete stock data older than specified days"""
    cutoff_date = datetime.utcnow().date() - timedelta(days=days_to_keep)
    db.query(StockData).filter(StockData.date < cutoff_date).delete()
    db.commit()
