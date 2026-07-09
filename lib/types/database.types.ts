export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Profile = {
  id: string
  username: string
  full_name: string | null
  bio: string | null
  avatar_url: string | null
  cover_photo_url: string | null
  is_private: boolean
  is_verified: boolean
  posts_count: number
  followers_count: number
  following_count: number
  created_at: string
  updated_at: string
}

export type Post = {
  id: string
  user_id: string
  content: string | null
  media_url: string | null
  media_type: 'image' | 'video' | 'none' | null
  likes_count: number
  comments_count: number
  shares_count: number
  created_at: string
  updated_at: string
}

export type Like = {
  id: string
  post_id: string
  user_id: string
  created_at: string
}

export type Comment = {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
}

export type Follow = {
  id: string
  follower_id: string
  following_id: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
}

export type Chat = {
  id: string
  participant1_id: string
  participant2_id: string
  last_message: string | null
  last_message_time: string | null
  last_message_type: 'text' | 'post' | 'reel' | null
  created_at: string
}

export type Message = {
  id: string
  chat_id: string
  sender_id: string
  content: string
  post_id: string | null
  is_read: boolean
  created_at: string
}

export type Share = {
  id: string
  post_id: string
  shared_by_id: string
  shared_to_chat_id: string | null
  created_at: string
}

export type Notification = {
  id: string
  user_id: string
  actor_id: string
  type: 'like' | 'comment' | 'follow' | 'unfollow' | 'message'
  message: string | null
  post_id: string | null
  is_read: boolean
  created_at: string
}

export type SavedFolder = {
  id: string
  user_id: string
  name: string
  created_at: string
}

export type SavedPost = {
  id: string
  user_id: string
  post_id: string
  folder_id: string
  created_at: string
}

export type PostWithProfile = Post & {
  profiles: Profile
  is_liked?: boolean
}

export type CommentWithProfile = Comment & {
  profiles: Profile
}

export type ChatWithProfiles = Chat & {
  participant1: Profile
  participant2: Profile
}

// Simple Database type for Supabase client
export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string; username: string }; Update: Partial<Profile> }
      posts: { Row: Post; Insert: Omit<Post, 'id' | 'created_at' | 'updated_at' | 'likes_count' | 'comments_count' | 'shares_count'> & { id?: string }; Update: Partial<Post> }
      likes: { Row: Like; Insert: Omit<Like, 'id' | 'created_at'>; Update: Partial<Like> }
      comments: { Row: Comment; Insert: Omit<Comment, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Comment> }
      follows: { Row: Follow; Insert: Omit<Follow, 'id' | 'created_at'>; Update: Partial<Follow> }
      chats: { Row: Chat; Insert: Omit<Chat, 'id' | 'created_at'>; Update: Partial<Chat> }
      messages: { Row: Message; Insert: Omit<Message, 'id' | 'created_at'>; Update: Partial<Message> }
      shares: { Row: Share; Insert: Omit<Share, 'id' | 'created_at'>; Update: Partial<Share> }
      notifications: { Row: Notification; Insert: Omit<Notification, 'id' | 'created_at' | 'is_read'> & { is_read?: boolean }; Update: Partial<Notification> }
      saved_folders: { Row: SavedFolder; Insert: Omit<SavedFolder, 'id' | 'created_at'>; Update: Partial<SavedFolder> }
      saved_posts: { Row: SavedPost; Insert: Omit<SavedPost, 'id' | 'created_at'>; Update: Partial<SavedPost> }
    }
  }
}
