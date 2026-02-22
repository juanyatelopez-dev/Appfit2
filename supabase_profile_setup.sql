-- Add profile columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update RLS policies (assuming they already exist from previous setup)
-- If you need to re-create them:
-- DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
-- CREATE POLICY "Users can view their own data" ON public.users FOR SELECT USING (auth.uid() = id);

-- DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
-- CREATE POLICY "Users can update their own data" ON public.users FOR UPDATE USING (auth.uid() = id);
