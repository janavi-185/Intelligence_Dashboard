from app.data.fetch_data import fetch_stock
from app.data.preprocess import preprocess_data, add_metrics, get_summary

def get_stock_data(symbol: str):
    df = fetch_stock(symbol)

    if df.empty:
        raise ValueError(f"No data found for {symbol}")

    df = preprocess_data(df)
    df = add_metrics(df)
    return df

def get_last_30_days(symbol: str):
    df = get_stock_data(symbol)
    return df.tail(30).to_dict(orient="records")

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