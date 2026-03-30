from app.data.fetch_data import fetch_stock
from app.data.preprocess import preprocess_data, add_metrics, get_summary

df = fetch_stock("INFY")
df = preprocess_data(df)

df = add_metrics(df)

print(df.tail())
summary = get_summary(df)
print("\nSummary:", summary)