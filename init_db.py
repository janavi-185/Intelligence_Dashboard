"""
Database initialization script.
Creates tables and optionally populates with historical stock data.
"""

import os
import sys
from app.models.database import engine, Base, SessionLocal
from app.data.fetch_data import fetch_stock
from app.data.preprocess import preprocess_data
from app.data.db_operations import save_stock_data

# Stocks to populate
STOCKS = [
    "INFY", "TCS", "HDFCBANK", "RELIANCE",
    "AAPL", "MSFT", "GOOGL", "AMZN",
    "TSLA", "META", "NVDA", "AMD", "INTC"
]

def init_database():
    """Create all database tables"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created")

def populate_stock_data():
    """Fetch and populate stock data"""
    db = SessionLocal()
    try:
        print(f"\nPopulating data for {len(STOCKS)} stocks...")
        
        for idx, symbol in enumerate(STOCKS, 1):
            try:
                print(f"[{idx}/{len(STOCKS)}] Fetching data for {symbol}...", end=" ", flush=True)
                
                df = fetch_stock(symbol)
                if df is not None and not df.empty:
                    df = preprocess_data(df)
                    save_stock_data(db, symbol, df)
                    print("✅")
                else:
                    print("⚠️  No data")
                    
            except Exception as e:
                print(f"❌ Error: {str(e)}")
                continue
        
        print("\n✅ Database populated successfully!")
        
    finally:
        db.close()

def main():
    """Main initialization function"""
    print("=" * 50)
    print("Stock Dashboard - Database Initialization")
    print("=" * 50)
    
    # Create tables
    init_database()
    
    # Ask user if they want to populate data
    print("\nDo you want to fetch and populate stock data now?")
    response = input("Enter 'y' for yes or 'n' for no: ").strip().lower()
    
    if response == 'y':
        populate_stock_data()
    else:
        print("Skipping data population. Run this script again to populate data later.")
    
    print("\n" + "=" * 50)
    print("✅ Initialization complete!")
    print("=" * 50)

if __name__ == "__main__":
    main()
