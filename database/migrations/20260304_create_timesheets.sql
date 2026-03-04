-- Create timesheets table
CREATE TABLE IF NOT EXISTS timesheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    entry_1 TEXT,
    exit_1 TEXT,
    entry_2 TEXT,
    exit_2 TEXT,
    is_no_work BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure user can only have one entry per day
    UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Users can view their own timesheets
CREATE POLICY "Users can view own timesheets" 
ON timesheets FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Admins can view all timesheets
CREATE POLICY "Admins can view all timesheets" 
ON timesheets FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_permissions 
    WHERE user_permissions.email = auth.jwt()->>'email' 
    AND role = 'admin'
  )
);

-- 3. Users can insert their own timesheets for present or past dates
CREATE POLICY "Users can insert own timesheets" 
ON timesheets FOR INSERT 
WITH CHECK (
    auth.uid() = user_id 
    AND date <= CURRENT_DATE
);

-- 4. Users can update their own timesheets (only for past/present dates)
--    Admins can update any timesheet
CREATE POLICY "Users and admins can update timesheets" 
ON timesheets FOR UPDATE 
USING (
  (auth.uid() = user_id AND date <= CURRENT_DATE)
  OR
  EXISTS (
    SELECT 1 FROM user_permissions 
    WHERE user_permissions.email = auth.jwt()->>'email' 
    AND role = 'admin'
  )
);

-- 5. Only Admins can delete timesheets
CREATE POLICY "Only admins can delete timesheets" 
ON timesheets FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM user_permissions 
    WHERE user_permissions.email = auth.jwt()->>'email' 
    AND role = 'admin'
  )
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_timesheets_user_date ON timesheets(user_id, date);
