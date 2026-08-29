import duckdb
from typing import List, Dict, Any

class FundamentalEngine:
    def __init__(self, db_path: str):
        self.db_path = db_path

    def get_connection(self):
        return duckdb.connect(self.db_path)

    def filter_by_eps_growth(self, symbols: List[str], min_eps_growth: float = 20.0) -> List[Dict[str, Any]]:
        """
        Filters input candidates to only those satisfying the EPS QoQ growth criteria
        based on the most recent quarterly reports.
        """
        if not symbols:
            return []
            
        # Format symbols for SQL list query
        symbols_str = ", ".join(f"'{s}'" for s in symbols)
        
        query = f"""
            WITH latest_fundamentals AS (
                SELECT 
                    symbol,
                    report_date,
                    fiscal_quarter,
                    eps_diluted,
                    eps_qoq_growth,
                    total_revenue,
                    ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY fiscal_quarter DESC) as rn
                FROM quarterly_fundamentals
                WHERE symbol IN ({symbols_str})
            )
            SELECT symbol, report_date, fiscal_quarter, eps_diluted, eps_qoq_growth, total_revenue
            FROM latest_fundamentals
            WHERE rn = 1 
              AND eps_qoq_growth IS NOT NULL 
              AND eps_qoq_growth >= {min_eps_growth}
            ORDER BY eps_qoq_growth DESC;
        """
        
        passing_candidates = []
        with self.get_connection() as conn:
            try:
                results = conn.execute(query).fetchall()
                for row in results:
                    symbol, report_date, fiscal_q, eps, eps_growth, revenue = row
                    passing_candidates.append({
                        "symbol": symbol,
                        "report_date": report_date.strftime("%Y-%m-%d") if report_date else None,
                        "fiscal_quarter": fiscal_q,
                        "eps_diluted": eps,
                        "eps_qoq_growth": eps_growth,
                        "total_revenue": revenue
                    })
            except Exception as e:
                print(f"Error querying fundamental acceleration: {e}")
                
        return passing_candidates
