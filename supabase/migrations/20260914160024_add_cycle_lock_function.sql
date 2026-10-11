-- Migration: Add Row Lock Function for Stock Cycles
-- Description: Creates database function for row-level locking during payment allocation

CREATE OR REPLACE FUNCTION lock_and_get_stock_cycle(cycle_id UUID)
RETURNS TABLE (
  id UUID,
  stock_request_id UUID,
  vendor_id UUID,
  cycle_number INTEGER,
  cycle_amount DECIMAL(10,2),
  paid_amount DECIMAL(10,2),
  balance DECIMAL(10,2),
  cycle_status TEXT,
  due_date DATE,
  start_date DATE,
  end_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sc.id,
    sc.stock_request_id,
    sc.vendor_id,
    sc.cycle_number,
    sc.cycle_amount,
    sc.paid_amount,
    sc.cycle_amount - sc.paid_amount AS balance,
    sc.cycle_status,
    sc.due_date,
    sc.start_date,
    sc.end_date
  FROM stock_cycles sc
  WHERE sc.id = cycle_id
  FOR UPDATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION lock_and_get_stock_cycle IS 'Locks a stock cycle row and returns its data for atomic payment allocation';
