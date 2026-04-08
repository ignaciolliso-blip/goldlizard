
-- Add yahoo_symbol to copper_equity_names
ALTER TABLE copper_equity_names ADD COLUMN IF NOT EXISTS yahoo_symbol text;

-- Add new columns to copper_equity_financials
ALTER TABLE copper_equity_financials ADD COLUMN IF NOT EXISTS guidance_production text;
ALTER TABLE copper_equity_financials ADD COLUMN IF NOT EXISTS guidance_aisc text;
ALTER TABLE copper_equity_financials ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE copper_equity_financials ADD COLUMN IF NOT EXISTS data_tier text DEFAULT 'manual';

-- Populate Yahoo Finance symbols
UPDATE copper_equity_names SET yahoo_symbol = 'TECK-B.TO' WHERE ticker = 'TECK.B';
UPDATE copper_equity_names SET yahoo_symbol = 'FCX' WHERE ticker = 'FCX';
UPDATE copper_equity_names SET yahoo_symbol = 'LUN.TO' WHERE ticker = 'LUN';
UPDATE copper_equity_names SET yahoo_symbol = 'CS.TO' WHERE ticker = 'CS';
UPDATE copper_equity_names SET yahoo_symbol = 'SCCO' WHERE ticker = 'SCCO';
UPDATE copper_equity_names SET yahoo_symbol = 'IVN.TO' WHERE ticker = 'IVN';
UPDATE copper_equity_names SET yahoo_symbol = 'MARI.TO' WHERE ticker = 'MARI';
UPDATE copper_equity_names SET yahoo_symbol = 'MUX.TO' WHERE ticker = 'MUX';
UPDATE copper_equity_names SET yahoo_symbol = 'SURG.V' WHERE ticker = 'SURG';
UPDATE copper_equity_names SET yahoo_symbol = 'KC.V' WHERE ticker = 'KC';
UPDATE copper_equity_names SET yahoo_symbol = 'GLAD.V' WHERE ticker = 'GLAD';
UPDATE copper_equity_names SET yahoo_symbol = 'TBC.AX' WHERE ticker = 'TBC';
UPDATE copper_equity_names SET yahoo_symbol = 'COPX.L' WHERE name LIKE '%UCITS%';
UPDATE copper_equity_names SET yahoo_symbol = 'COPX' WHERE name LIKE '%ETF (US)%';
UPDATE copper_equity_names SET yahoo_symbol = 'COPJ' WHERE ticker = 'COPJ';
