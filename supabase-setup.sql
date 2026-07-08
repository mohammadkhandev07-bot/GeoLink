-- ============================================================
-- GeoLink - Complete Supabase Database Setup
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- TABLES
-- ============================================================

CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    cover_photo_url TEXT,
    is_private BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    posts_count INT DEFAULT 0,
    followers_count INT DEFAULT 0,
    following_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT,
    media_url TEXT,
    media_type TEXT CHECK (media_type IN ('image', 'video', 'none')),
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    shares_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

CREATE TABLE public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.follows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);

CREATE TABLE public.chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    participant1_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    participant2_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    last_message TEXT,
    last_message_time TIMESTAMPTZ,
    last_message_type TEXT DEFAULT 'text' CHECK (last_message_type IN ('text', 'post', 'reel')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    shared_by_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    shared_to_chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'unfollow', 'message')),
    message TEXT,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- POSTS policies
CREATE POLICY "Posts respect author privacy" ON public.posts FOR SELECT USING (
    auth.uid() = user_id
    OR NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = user_id AND is_private = true
    )
    OR EXISTS (
        SELECT 1 FROM public.follows
        WHERE follower_id = auth.uid() AND following_id = user_id AND status = 'accepted'
    )
);
CREATE POLICY "Users can insert own posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- LIKES policies
CREATE POLICY "Likes are viewable by everyone" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike own likes" ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- COMMENTS policies
CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- FOLLOWS policies
CREATE POLICY "Follows are viewable by everyone" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can follow others" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can update follow status" ON public.follows FOR UPDATE USING (auth.uid() = following_id OR auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- CHATS policies
CREATE POLICY "Users can view own chats" ON public.chats FOR SELECT USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);
CREATE POLICY "Users can create chats" ON public.chats FOR INSERT WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);
CREATE POLICY "Users can update own chats" ON public.chats FOR UPDATE USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);
CREATE POLICY "Users can delete own chats" ON public.chats FOR DELETE USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

-- MESSAGES policies
CREATE POLICY "Chat participants can view messages" ON public.messages FOR SELECT USING (
    auth.uid() IN (
        SELECT participant1_id FROM public.chats WHERE id = chat_id
        UNION
        SELECT participant2_id FROM public.chats WHERE id = chat_id
    )
);
CREATE POLICY "Chat participants can send messages" ON public.messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    auth.uid() IN (
        SELECT participant1_id FROM public.chats WHERE id = chat_id
        UNION
        SELECT participant2_id FROM public.chats WHERE id = chat_id
    )
);
CREATE POLICY "Users can mark own messages as read" ON public.messages FOR UPDATE USING (
    auth.uid() IN (
        SELECT participant1_id FROM public.chats WHERE id = chat_id
        UNION
        SELECT participant2_id FROM public.chats WHERE id = chat_id
    )
);
CREATE POLICY "Chat participants can delete messages" ON public.messages FOR DELETE USING (
    auth.uid() IN (
        SELECT participant1_id FROM public.chats WHERE id = chat_id
        UNION
        SELECT participant2_id FROM public.chats WHERE id = chat_id
    )
);

-- SHARES policies
CREATE POLICY "Users can view own shares" ON public.shares FOR SELECT USING (auth.uid() = shared_by_id);
CREATE POLICY "Users can share posts" ON public.shares FOR INSERT WITH CHECK (auth.uid() = shared_by_id);

-- NOTIFICATIONS policies
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert notifications for others" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = actor_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- HELPER FUNCTIONS (for counter increments)
-- ============================================================

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

CREATE OR REPLACE FUNCTION decrement_followers(profile_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.profiles SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = profile_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_following(profile_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.profiles SET following_count = following_count + 1 WHERE id = profile_id;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_following(profile_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = profile_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_posts_count(profile_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.profiles SET posts_count = posts_count + 1 WHERE id = profile_id;
END;
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STORAGE BUCKETS
-- Create these in Supabase Dashboard > Storage:
-- 1. avatars    (public)
-- 2. covers     (public)
-- 3. posts      (public)
-- ============================================================

-- Storage policies (run after creating buckets)
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('posts', 'posts', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Cover images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'covers');
CREATE POLICY "Users can upload their cover" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their cover" ON storage.objects FOR UPDATE USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Post media is publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'posts');
CREATE POLICY "Users can upload post media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own post media" ON storage.objects FOR DELETE USING (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);
