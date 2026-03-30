import pandas as pd

def preprocess_data(df: pd.DataFrame):
    df['Date'] = pd.to_datetime(df['Date'])
    df[['Open', 'High', 'Low', 'Close', 'Volume']] = df[
        ['Open', 'High', 'Low', 'Close', 'Volume']
    ].astype(float)

    df = df.sort_values(by='Date')

    df = df.dropna()

    return df


def add_metrics(df: pd.DataFrame):
    df['Daily Return'] = (df['Close'] - df['Open']) / df['Open']
    df['MA7'] = df['Close'].rolling(window=7).mean()

    df['Volatility'] = df['Daily Return'].rolling(7).std()

    return df

def get_summary(df: pd.DataFrame):
    return {
        "52_week_high": float(df['High'].max()),
        "52_week_low": float(df['Low'].min()),
        "avg_close": float(df['Close'].mean())
    }

# Additional helper functions 
def compare_stocks(df1, df2):
    df1 = df1.sort_values("Date")
    df2 = df2.sort_values("Date")

    # Align both datasets
    merged = pd.merge(df1, df2, on="Date", suffixes=('_1', '_2'))

    correlation = merged['Close_1'].corr(merged['Close_2'])

    return {
        "correlation": float(correlation)
    }