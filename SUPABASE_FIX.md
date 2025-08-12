# Supabase Project Setup Instructions

The "Database error saving new user" error (HTTP 500) typically occurs due to:

## Common Causes:
1. **Database triggers failing** - Supabase tries to create a user profile in a `profiles` table
2. **Row Level Security (RLS) policies** blocking the user creation
3. **Missing database schema** that Supabase expects
4. **Database functions or triggers** with errors

## Quick Fix Options:

### Option 1: Disable Email Confirmation (Temporary)
1. Go to your Supabase Dashboard: https://app.supabase.com/project/pqwmyizpzbceyivaorcm
2. Navigate to Authentication > Settings
3. Turn OFF "Enable email confirmations"
4. Turn OFF "Enable phone confirmations"

### Option 2: Check Database Triggers
1. Go to Database > Functions in your Supabase dashboard
2. Look for any functions related to user creation
3. Check if there are any errors in the functions

### Option 3: Check RLS Policies
1. Go to Database > Tables
2. Check if there's a `profiles` table
3. If yes, check its RLS policies and make sure they allow INSERT

### Option 4: Create Missing Schema
If your project expects a profiles table, you might need to create it:

```sql
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create trigger to auto-create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Recommended First Step:
Try Option 1 first (disable email confirmation) as it's the quickest fix.
