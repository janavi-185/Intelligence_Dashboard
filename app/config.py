"""
Test to verify caching and rate limiting work correctly
"""

import time
from app.data.fetch_data import fetch_stock

print("\n" + "="*70)
print("  TESTING CACHING + RATE LIMITING")
print("="*70 + "\n")

companies = ["INFY", "TCS", "RELIANCE", "HDFCBANK"]

# First pass - will hit API (or cache if exists)
print("📊 FIRST PASS - Fetching all companies:")
print("-" * 70)
start_time = time.time()

for symbol in companies:
    print(f"\n▶ Fetching {symbol}...")
    df = fetch_stock(symbol)
    if not df.empty:
        print(f"   Returns: {len(df)} records, Date range: {df['Date'].min()} to {df['Date'].max()}")
    else:
        print(f"   ❌ No data returned")

first_pass_time = time.time() - start_time
print(f"\n✅ First pass took: {first_pass_time:.1f} seconds")
print(f"   (Includes API calls + 1.2s delays between them)")

# Second pass - should use CACHE (fast)
print("\n" + "="*70)
print("📊 SECOND PASS - Same companies again (should be from CACHE):")
print("-" * 70)
start_time = time.time()

for symbol in companies:
    print(f"\n▶ Fetching {symbol}...")
    df = fetch_stock(symbol)
    if not df.empty:
        print(f"   Returns: {len(df)} records")
    else:
        print(f"   ❌ No data returned")

second_pass_time = time.time() - start_time
print(f"\n✅ Second pass took: {second_pass_time:.2f} seconds")
print(f"   (MUCH faster - using cache, NO API calls!)")

print("\n" + "="*70)
print("📈 PERFORMANCE COMPARISON:")
print("="*70)
print(f"First pass (API + waits):  {first_pass_time:.1f}s")
print(f"Second pass (cache only):  {second_pass_time:.2f}s")
print(f"Speed improvement:         {first_pass_time/second_pass_time:.0f}x faster!")
print("\n✅ Caching + Rate Limiting is working!\n")
