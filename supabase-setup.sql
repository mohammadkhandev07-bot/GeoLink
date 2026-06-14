-- =============================================
-- STEP 1: Profiles table RLS fix
-- =============================================

-- Pehle sab policies hata do
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Naye sahi policies
CREATE POLICY "Profiles viewable by everyone"
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Service role ko bhi allow karo (trigger ke liye)
CREATE POLICY "Service role can do anything"
ON public.profiles FOR ALL
USING (true)
WITH CHECK (true);

-- =============================================
-- STEP 2: Auto profile create trigger fix
-- =============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  username_val TEXT;
  fullname_val TEXT;
BEGIN
  -- Username aur full_name metadata se lo
  username_val := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  
  fullname_val := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  -- Profile insert karo
  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    bio,
    avatar_url,
    cover_photo_url,
    is_private,
    is_verified,
    posts_count,
    followers_count,
    following_count,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    username_val,
    fullname_val,
    NULL,
    NULL,
    NULL,
    false,
    false,
    0,
    0,
    0,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Trigger banao
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- STEP 3: Helper functions ensure karo
-- =============================================

CREATE OR REPLACE FUNCTION increment_likes(post_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = post_id;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_likes(post_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = post_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_comments(post_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = post_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_followers(profile_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = profile_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_following(profile_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.profiles SET following_count = following_count + 1 WHERE id = profile_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_posts_count(profile_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.profiles SET posts_count = posts_count + 1 WHERE id = profile_id;
END;
$$;

-- =============================================
-- STEP 4: Storage buckets ensure karo
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('posts', 'posts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their avatar" ON storage.objects;
DROP POLICY IF EXISTS "Cover images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their cover" ON storage.objects;
DROP POLICY IF EXISTS "Post media is publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload post media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own post media" ON storage.objects;

CREATE POLICY "Public read all buckets" ON storage.objects
FOR SELECT USING (bucket_id IN ('avatars', 'covers', 'posts'));

CREATE POLICY "Auth users can upload" ON storage.objects
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  bucket_id IN ('avatars', 'covers', 'posts')
);

CREATE POLICY "Users can update own files" ON storage.objects
FOR UPDATE USING (auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own files" ON storage.objects
FOR DELETE USING (auth.uid()::text = (storage.foldername(name))[1]);
