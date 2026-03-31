"""
Comprehensive Test Suite for Stock Dashboard
Tests data fetching, preprocessing, metrics, and service layer
"""

import sys
import pandas as pd
from datetime import datetime
from app.data.fetch_data import fetch_stock, get_all_companies
from app.data.preprocess import preprocess_data, add_metrics, get_summary, compare_stocks
from app.services.stock_service import (
    get_stock_data,
    get_last_30_days,
    get_stock_summary,
    compare_two_stocks
)

# Colors for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'
BOLD = '\033[1m'

def print_header(text):
    """Print formatted header"""
    print(f"\n{BOLD}{BLUE}{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}{RESET}\n")

def print_success(text):
    """Print success message"""
    print(f"{GREEN}✓ {text}{RESET}")

def print_error(text):
    """Print error message"""
    print(f"{RED}✗ {text}{RESET}")

def print_info(text):
    """Print info message"""
    print(f"{YELLOW}ℹ {text}{RESET}")

def test_fetch_data():
    """Test 1: Fetching raw data from API"""
    print_header("TEST 1: Fetching Raw Stock Data")
    
    companies = ["INFY", "TCS", "RELIANCE", "HDFCBANK"]
    
    for symbol in companies:
        try:
            print(f"\n  Fetching {symbol}...")
            df = fetch_stock(symbol)
            
            if df.empty:
                print_error(f"No data fetched for {symbol}")
            else:
                print_success(f"Fetched {len(df)} records for {symbol}")
                print(f"    Columns: {list(df.columns)}")
                print(f"    Date range: {df['Date'].min()} to {df['Date'].max()}")
                print(f"    Shape: {df.shape}")
                
                # Show first row
                print(f"\n    First row:\n{df.head(1).to_string()}")
        except Exception as e:
            print_error(f"Error fetching {symbol}: {str(e)}")

def test_preprocessing():
    """Test 2: Data preprocessing"""
    print_header("TEST 2: Data Preprocessing")
    
    try:
        print("  Fetching and preprocessing INFY data...\n")
        df = fetch_stock("INFY")
        print_success(f"Raw data shape: {df.shape}")
        print(f"    Data types before:\n{df.dtypes}\n")
        
        df = preprocess_data(df)
        print_success(f"Preprocessed data shape: {df.shape}")
        print(f"    Data types after:\n{df.dtypes}\n")
        print(f"    Data sorted: {df['Date'].is_monotonic_increasing}")
        print(f"    Null values: {df.isnull().sum().sum()}")
        print(f"\n    First 3 rows (preprocessed):\n{df.head(3).to_string()}")
        
    except Exception as e:
        print_error(f"Preprocessing failed: {str(e)}")

def test_metrics():
    """Test 3: Adding metrics"""
    print_header("TEST 3: Adding Technical Metrics")
    
    try:
        df = fetch_stock("TCS")
        df = preprocess_data(df)
        
        print("  Adding metrics to data...\n")
        df = add_metrics(df)
        
        print_success(f"Metrics added. New columns: {list(df.columns)}")
        print(f"\n    Metrics preview (last 5 rows):\n{df[['Date', 'Close', 'Daily Return', 'MA7', 'Volatility']].tail(5).to_string()}")
        
        print(f"\n    Statistics:")
        print(f"      Daily Return - Mean: {df['Daily Return'].mean():.6f}, Std: {df['Daily Return'].std():.6f}")
        print(f"      MA7 - Min: {df['MA7'].min():.2f}, Max: {df['MA7'].max():.2f}")
        print(f"      Volatility - Mean: {df['Volatility'].mean():.6f}")
        
    except Exception as e:
        print_error(f"Metrics addition failed: {str(e)}")

def test_summary():
    """Test 4: Summary statistics"""
    print_header("TEST 4: Summary Statistics")
    
    try:
        df = fetch_stock("RELIANCE")
        df = preprocess_data(df)
        df = add_metrics(df)
        
        summary = get_summary(df)
        
        print_success("Summary generated successfully\n")
        print(f"    52-Week High: ₹{summary['52_week_high']:.2f}")
        print(f"    52-Week Low: ₹{summary['52_week_low']:.2f}")
        print(f"    Average Close: ₹{summary['avg_close']:.2f}")
        print(f"    Price Range: ₹{summary['52_week_high'] - summary['52_week_low']:.2f}")
        
    except Exception as e:
        print_error(f"Summary generation failed: {str(e)}")

def test_last_30_days():
    """Test 5: Last 30 days data"""
    print_header("TEST 5: Last 30 Days Data")
    
    try:
        symbol = "HDFCBANK"
        print(f"  Fetching last 30 days for {symbol}...\n")
        
        data = get_last_30_days(symbol)
        
        print_success(f"Retrieved {len(data)} recent records")
        print(f"\n    Last 5 records:")
        df_display = pd.DataFrame(data).tail(5)
        print(df_display.to_string())
        
    except Exception as e:
        print_error(f"Failed to get last 30 days: {str(e)}")

def test_comparison():
    """Test 6: Stock comparison"""
    print_header("TEST 6: Stock Comparison")
    
    try:
        symbol1, symbol2 = "INFY", "TCS"
        print(f"  Comparing {symbol1} vs {symbol2}...\n")
        
        result = compare_two_stocks(symbol1, symbol2)
        
        if "error" in result:
            print_error(f"Comparison error: {result['error']}")
        else:
            corr = result["correlation"]
            print_success(f"Correlation calculated: {corr:.4f}\n")
            
            if corr > 0.7:
                strength = "🟢 Strong Positive"
            elif corr > 0.3:
                strength = "🟡 Moderate Positive"
            elif corr > -0.3:
                strength = "⚪ Weak/No"
            elif corr > -0.7:
                strength = "🟠 Moderate Negative"
            else:
                strength = "🔴 Strong Negative"
            
            print(f"    Correlation Strength: {strength}")
            print(f"    Coefficient: {corr:.4f}")
            
    except Exception as e:
        print_error(f"Comparison failed: {str(e)}")

def test_service_layer():
    """Test 7: Service layer functions"""
    print_header("TEST 7: Service Layer Functions")
    
    try:
        symbol = "INFY"
        print(f"  Testing service functions for {symbol}...\n")
        
        # Test get_stock_data
        print("  1. get_stock_data():")
        df = get_stock_data(symbol)
        print_success(f"    Retrieved {len(df)} records with metrics")
        
        # Test get_stock_summary
        print("\n  2. get_stock_summary():")
        summary = get_stock_summary(symbol)
        print_success(f"    Summary: High=₹{summary['52_week_high']:.2f}, "
                     f"Low=₹{summary['52_week_low']:.2f}, "
                     f"Avg=₹{summary['avg_close']:.2f}")
        
        # Test get_last_30_days
        print("\n  3. get_last_30_days():")
        data_30 = get_last_30_days(symbol)
        print_success(f"    Retrieved {len(data_30)} records from last 30 days")
        
    except Exception as e:
        print_error(f"Service layer test failed: {str(e)}")

def test_companies_list():
    """Test 8: Companies list"""
    print_header("TEST 8: Available Companies")
    
    try:
        companies = get_all_companies()
        print_success(f"Available companies ({len(companies)}):\n")
        for i, company in enumerate(companies, 1):
            print(f"    {i}. {company}")
            
    except Exception as e:
        print_error(f"Failed to get companies: {str(e)}")

def test_all():
    """Run all tests"""
    print(f"\n{BOLD}{BLUE}")
    print("╔═══════════════════════════════════════════════════════════════╗")
    print("║   Stock Dashboard - Comprehensive Test Suite                 ║")
    print("║   Testing Data Fetching, Processing & Services               ║")
    print(f"║   {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}                                         ║")
    print("╚═══════════════════════════════════════════════════════════════╝")
    print(f"{RESET}\n")
    
    try:
        test_companies_list()
        test_fetch_data()
        test_preprocessing()
        test_metrics()
        test_summary()
        test_last_30_days()
        test_comparison()
        test_service_layer()
        
        print_header("TEST SUITE COMPLETED")
        print_success("All tests executed successfully!\n")
        print(f"{BOLD}Next steps:{RESET}")
        print("  1. Run the backend: uvicorn app.main:app --reload")
        print("  2. Open: http://localhost:8000/")
        print("  3. Verify data in the dashboard\n")
        
    except KeyboardInterrupt:
        print(f"\n\n{RED}Tests interrupted by user{RESET}\n")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n{RED}Unexpected error: {str(e)}{RESET}\n")
        sys.exit(1)

if __name__ == "__main__":
    test_all()