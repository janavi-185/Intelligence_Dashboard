"""
Background scheduler for automatic stock data updates.
Updates all tracked stocks daily without manual intervention.
"""

from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
import logging

from app.data.fetch_data import fetch_stock
from app.data.preprocess import preprocess_data
from app.data.db_operations import save_stock_data
from app.models.database import SessionLocal

logger = logging.getLogger(__name__)

# List of all stocks to update
STOCKS_TO_UPDATE = [
    "INFY", "TCS", "HDFCBANK", "RELIANCE",  # Indian stocks
    "AAPL", "MSFT", "GOOGL", "AMZN",          # Large cap tech
    "TSLA", "META", "NVDA", "AMD", "INTC"     # Tech/Semis
]

scheduler = BackgroundScheduler()


def update_all_stocks():
    """
    Fetch latest data for all stocks and update database.
    Runs daily at scheduled time.
    """
    db = SessionLocal()
    try:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        logger.info(f"[{timestamp}] Starting automatic stock data update...")
        
        updated_count = 0
        for symbol in STOCKS_TO_UPDATE:
            try:
                logger.info(f"  Updating {symbol}...")
                
                # Fetch latest data
                df = fetch_stock(symbol)
                
                if df is not None and not df.empty:
                    # Preprocess for consistency
                    df = preprocess_data(df)
                    
                    # Save to database
                    save_stock_data(db, symbol, df)
                    updated_count += 1
                    logger.info(f"  ✓ {symbol} updated successfully")
                else:
                    logger.warning(f"  ✗ No data for {symbol}")
                    
            except Exception as e:
                logger.error(f"  ✗ Error updating {symbol}: {str(e)}")
                continue
        
        logger.info(f"[{timestamp}] Update complete! Updated {updated_count}/{len(STOCKS_TO_UPDATE)} stocks")
        
    except Exception as e:
        logger.error(f"Scheduler error: {str(e)}")
    finally:
        db.close()


def start_scheduler():
    """Initialize and start the background scheduler."""
    try:
        # Check if already running
        if scheduler.running:
            logger.warning("Scheduler already running")
            return
            
        # Add job: Update all stocks daily at 10 PM (22:00)
        scheduler.add_job(
            update_all_stocks,
            'cron',
            hour=22,              # 10 PM
            minute=0,
            id='update_stocks_daily',
            name='Daily Stock Data Update',
            replace_existing=True
        )
        
        scheduler.start()
        logger.info("✓ Background scheduler started (daily updates at 10 PM UTC)")
        
    except Exception as e:
        logger.error(f"Failed to start scheduler: {str(e)}")


def stop_scheduler():
    """Stop the background scheduler gracefully."""
    try:
        if scheduler.running:
            scheduler.shutdown()
            logger.info("✓ Background scheduler stopped")
    except Exception as e:
        logger.error(f"Error stopping scheduler: {str(e)}")
