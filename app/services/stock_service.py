from app.data.fetch_data import fetch_stock
from app.data.preprocess import preprocess_data, add_metrics, get_summary
from app.data.db_operations import (
    save_stock_data, 
    get_stock_data_by_days, 
    get_all_stock_data
)
from app.models.database import SessionLocal
import pandas as pd
from datetime import datetime

# Company metadata mapping
COMPANY_METADATA = {
    # Indian Stocks
    "INFY": {"name": "Infosys", "sector": "IT Services"},
    "TCS": {"name": "Tata Consultancy", "sector": "IT Services"},
    "RELIANCE": {"name": "Reliance Industries", "sector": "Energy"},
    "HDFCBANK": {"name": "HDFC Bank", "sector": "Banking"},
    
    # US Tech
    "AAPL": {"name": "Apple", "sector": "Technology"},
    "MSFT": {"name": "Microsoft", "sector": "Technology"},
    "GOOGL": {"name": "Google", "sector": "Technology"},
    "AMZN": {"name": "Amazon", "sector": "Consumer"},
    "TSLA": {"name": "Tesla", "sector": "Automotive"},
    "META": {"name": "Meta", "sector": "Technology"},
    "NVDA": {"name": "NVIDIA", "sector": "Technology"},
    "AMD": {"name": "AMD", "sector": "Technology"},
    "INTC": {"name": "Intel", "sector": "Technology"},
}

def get_stock_data(symbol: str):
    """Fetch stock data from database or API if not available"""
    db = SessionLocal()
    try:
        # Try to get data from database (all available data)
        df = get_all_stock_data(db, symbol)
        
        # If database is empty or data is stale, fetch from API
        if df.empty:
            df = fetch_stock(symbol)
            if not df.empty:
                df = preprocess_data(df)
                save_stock_data(db, symbol, df)
        
        if df.empty:
            raise ValueError(f"No data found for {symbol}")
        
        # Apply preprocessing and metrics if not already applied
        if 'Daily Return' not in df.columns:
            df = add_metrics(df)
        
        return df
    finally:
        db.close()

def get_last_30_days(symbol: str):
    """Get last 30 days of stock data"""
    df = get_stock_data(symbol)
    return df.tail(30).to_dict(orient="records")

def get_last_90_days(symbol: str):
    """Get last 90 days of stock data"""
    df = get_stock_data(symbol)
    return df.tail(90).to_dict(orient="records")

def get_stock_summary(symbol: str):
    df = get_stock_data(symbol)
    return get_summary(df)

def compare_two_stocks(symbol1: str, symbol2: str):
    try:
        df1 = get_stock_data(symbol1)
        df2 = get_stock_data(symbol2)
    except ValueError as e:
        return {"error": str(e)}

    merged = df1.merge(df2, on="Date", suffixes=('_1', '_2'))

    correlation = merged['Close_1'].corr(merged['Close_2'])

    return {
        "symbol1": symbol1,
        "symbol2": symbol2,
        "correlation": float(correlation)
    }

def get_watchlist(symbols: list = None):
    """Get watchlist data with current prices and daily % change"""
    if symbols is None:
        from app.data.fetch_data import AVAILABLE_COMPANIES
        symbols = AVAILABLE_COMPANIES
    
    watchlist = []
    
    for symbol in symbols:
        try:
            df = get_stock_data(symbol)
            if df.empty:
                continue
            
            # Get latest and previous close
            latest = df.iloc[-1]
            previous = df.iloc[-2] if len(df) > 1 else df.iloc[-1]
            
            current_price = float(latest['Close'])
            prev_price = float(previous['Close'])
            daily_change = ((current_price - prev_price) / prev_price) * 100
            
            metadata = COMPANY_METADATA.get(symbol, {"name": symbol, "sector": "N/A"})
            
            watchlist.append({
                "symbol": symbol,
                "name": metadata["name"],
                "sector": metadata["sector"],
                "price": current_price,
                "daily_change": daily_change,
                "change_color": "gain" if daily_change >= 0 else "loss"
            })
        except Exception as e:
            continue
    
    # Sort by symbol for consistent order
    watchlist.sort(key=lambda x: x['symbol'])
    return watchlist

def get_gainers_losers():
    """Get top gainers and losers from watchlist"""
    watchlist = get_watchlist()
    
    # Sort by daily change
    sorted_list = sorted(watchlist, key=lambda x: x['daily_change'], reverse=True)
    
    return {
        "gainers": sorted_list[:5],
        "losers": sorted_list[-5:][::-1]
    }

def get_stock_metrics(symbol: str):
    """Get detailed metrics for a stock"""
    try:
        df = get_stock_data(symbol)
        if df.empty:
            raise ValueError(f"No data found for {symbol}")
        
        latest = df.iloc[-1]
        previous = df.iloc[-2] if len(df) > 1 else df.iloc[-1]
        
        current_price = float(latest['Close'])
        prev_price = float(previous['Close'])
        
        # Calculate metrics
        daily_change = ((current_price - prev_price) / prev_price) * 100
        high_52w = float(df['High'].max())
        low_52w = float(df['Low'].min())
        avg_price = float(df['Close'].mean())
        volatility = float(df['Volatility'].iloc[-1]) if 'Volatility' in df.columns else 0
        volume = float(latest['Volume'])
        
        # Calculate normalized performance (percentage from 52w low)
        performance_from_low = ((current_price - low_52w) / low_52w) * 100
        
        # Get data for all data points for normalized chart
        normalized_data = []
        for idx, row in df.iterrows():
            norm_price = ((float(row['Close']) - low_52w) / low_52w) * 100
            normalized_data.append({
                "date": row['Date'].strftime('%Y-%m-%d'),
                "value": norm_price,
                "close": float(row['Close'])
            })
        
        metadata = COMPANY_METADATA.get(symbol, {"name": symbol, "sector": "N/A"})
        
        return {
            "symbol": symbol,
            "name": metadata["name"],
            "sector": metadata["sector"],
            "current_price": current_price,
            "daily_change": daily_change,
            "daily_change_color": "gain" if daily_change >= 0 else "loss",
            "high_52w": high_52w,
            "low_52w": low_52w,
            "avg_price": avg_price,
            "volatility": volatility,
            "volume": volume,
            "performance_from_low": performance_from_low,
            "normalized_data": normalized_data
        }
    except Exception as e:
        raise ValueError(f"Error calculating metrics for {symbol}: {str(e)}")

def get_correlation_matrix():
    """Calculate correlation matrix for available stocks (60-day returns)"""
    import pandas as pd
    from app.models.database import SessionLocal
    from app.data.db_operations import get_stock_data_by_days
    
    try:
        db = SessionLocal()
        
        # Get 60 days of data for each stock directly from database
        stocks_data = {}
        
        # Query database for available symbols
        from sqlalchemy import func
        from app.models.database import StockData
        available_symbols = db.query(func.distinct(StockData.symbol)).all()
        available_symbols = [s[0] for s in available_symbols]
        
        # Limit to max 8 stocks for correlation matrix
        for symbol in available_symbols[:8]:
            try:
                df = get_stock_data_by_days(db, symbol, 60)
                if not df.empty and len(df) >= 20:  # Need at least 20 days
                    df_sorted = df.sort_values('Date').set_index('Date')
                    stocks_data[symbol] = df_sorted['Close']
            except Exception:
                continue
        
        db.close()
        
        # Need at least 2 stocks
        if len(stocks_data) < 2:
            return {"error": "Insufficient data (need at least 2 stocks)"}
        
        # Align all stocks to same date range (inner join on dates)
        df_combined = pd.DataFrame(stocks_data)
        df_combined = df_combined.dropna()  # Remove any NaN values
        
        if len(df_combined) < 5:
            return {"error": "Insufficient overlapping data points"}
        
        # Calculate correlation
        correlation_matrix = df_combined.corr().round(2)
        
        # Convert to dictionary format for JSON response
        result = {
            "symbols": list(correlation_matrix.columns),
            "matrix": correlation_matrix.values.tolist(),
            "period": "60-day",
            "data_points": len(df_combined)
        }
        return result
    except Exception as e:
        return {"error": str(e)}