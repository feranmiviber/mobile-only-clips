-- Add device binding to fan_access table
ALTER TABLE fan_access 
ADD COLUMN IF NOT EXISTS device_id TEXT,
ADD COLUMN IF NOT EXISTS access_code TEXT,
ADD COLUMN IF NOT EXISTS device_bound_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_fan_access_device_id ON fan_access(device_id);
CREATE INDEX IF NOT EXISTS idx_fan_access_access_code ON fan_access(access_code);

-- Add device binding to purchases table for tracking
ALTER TABLE purchases
ADD COLUMN IF NOT EXISTS device_id TEXT,
ADD COLUMN IF NOT EXISTS access_code TEXT;

CREATE INDEX IF NOT EXISTS idx_purchases_device_id ON purchases(device_id);
CREATE INDEX IF NOT EXISTS idx_purchases_access_code ON purchases(access_code);
