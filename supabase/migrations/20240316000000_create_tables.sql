-- Create tables
CREATE TABLE IF NOT EXISTS public.bluesky_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  handle TEXT NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.scheduled_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  bluesky_handle TEXT NOT NULL,
  text TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'published', 'failed')),
  error TEXT,
  media JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.bluesky_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for bluesky_credentials
CREATE POLICY "Users can insert their own credentials"
ON public.bluesky_credentials FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own credentials"
ON public.bluesky_credentials FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own credentials"
ON public.bluesky_credentials FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credentials"
ON public.bluesky_credentials FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create RLS policies for scheduled_posts
CREATE POLICY "Users can insert their own posts"
ON public.scheduled_posts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own posts"
ON public.scheduled_posts FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
ON public.scheduled_posts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
ON public.scheduled_posts FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_bluesky_credentials_updated_at
    BEFORE UPDATE ON public.bluesky_credentials
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduled_posts_updated_at
    BEFORE UPDATE ON public.scheduled_posts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to clear media after publishing
CREATE OR REPLACE FUNCTION public.clear_media_after_publish()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'published' AND OLD.status = 'scheduled' THEN
        NEW.media = NULL;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to clear media after publishing
CREATE TRIGGER clear_media_after_publish
    BEFORE UPDATE ON public.scheduled_posts
    FOR EACH ROW
    EXECUTE FUNCTION public.clear_media_after_publish();

-- Create function to delete old posts
CREATE OR REPLACE FUNCTION public.delete_old_posts()
RETURNS void AS $$
BEGIN
    DELETE FROM public.scheduled_posts
    WHERE status = 'published'
    AND updated_at < NOW() - INTERVAL '90 days';
END;
$$ language 'plpgsql';

-- Create a scheduled job to run delete_old_posts every day
SELECT cron.schedule(
    'delete-old-posts',
    '0 0 * * *', -- Run at midnight every day
    $$SELECT public.delete_old_posts();$$
);