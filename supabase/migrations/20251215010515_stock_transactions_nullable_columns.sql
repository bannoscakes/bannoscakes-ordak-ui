-- Make quantity columns nullable in stock_transactions
-- The trigger populates change_amount, stock_before, stock_after instead of
-- quantity_change, quantity_before, quantity_after - causing silent INSERT failures

ALTER TABLE stock_transactions
  ALTER COLUMN quantity_change DROP NOT NULL,
  ALTER COLUMN quantity_before DROP NOT NULL,
  ALTER COLUMN quantity_after DROP NOT NULL;
