import { useEffect, useCallback, useRef } from 'react';
import { BskyAgent } from '@atproto/api';
import { useAuth } from '../context/AuthContext';
import { useSupabase } from '../context/SupabaseContext';
import { Post } from '../types/bluesky';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { uploadImageBlob } from '../utils/imageUtils';

export const usePostScheduler = (
  scheduledPosts: Post[],
  onPostUpdate: (post: Post) => void
) => {
  const { auth } = useAuth();
  const { user } = useSupabase();
  const processedPosts = useRef<Set<string>>(new Set());

  const savePostToSupabase = async (post: Post) => {
    if (!user?.id || !auth.handle) return;

    try {
      const { error } = await supabase
        .from('scheduled_posts')
        .update({
          status: post.status,
          error: post.error,
          media: post.media,
          updated_at: new Date().toISOString()
        })
        .eq('id', post.id)
        .eq('user_id', user.id)
        .eq('bluesky_handle', auth.handle);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving post to Supabase:', error);
    }
  };

  const publishPost = useCallback(async (post: Post) => {
    if (!auth.isAuthenticated || !auth.handle) {
      const updatedPost = {
        ...post,
        status: 'failed' as const,
        error: 'Not authenticated with Bluesky'
      };
      onPostUpdate(updatedPost);
      await savePostToSupabase(updatedPost);
      return;
    }

    // Skip if already processed
    if (processedPosts.current.has(post.id)) {
      return;
    }

    try {
      // Double-check the post status from the database before publishing
      const { data: currentPost } = await supabase
        .from('scheduled_posts')
        .select('status')
        .eq('id', post.id)
        .eq('user_id', user?.id)
        .eq('bluesky_handle', auth.handle)
        .single();

      if (currentPost?.status !== 'scheduled') {
        return;
      }

      // Mark as processed before attempting to publish
      processedPosts.current.add(post.id);

      // Get the latest credentials from the database
      const { data: credentials, error: credentialsError } = await supabase
        .from('bluesky_credentials')
        .select('handle, password')
        .eq('user_id', user?.id)
        .single();

      if (credentialsError || !credentials?.handle || !credentials?.password) {
        throw new Error('Failed to retrieve Bluesky credentials');
      }

      // Create a new agent instance for this specific publish operation
      const agent = new BskyAgent({
        service: 'https://bsky.social'
      });

      // Login with the latest credentials
      await agent.login({
        identifier: credentials.handle,
        password: credentials.password
      });

      let embed;
      
      if (post.media && post.media.length > 0) {
        const uploadedBlobs = await Promise.all(
          post.media.map(media => uploadImageBlob(agent, media))
        );

        embed = {
          $type: 'app.bsky.embed.images',
          images: uploadedBlobs.map(blob => ({
            alt: 'Image',
            image: blob
          }))
        };
      }

      await agent.post({
        text: post.text,
        embed,
        createdAt: new Date().toISOString()
      });
      
      const updatedPost = {
        ...post,
        status: 'published' as const,
        media: undefined // Clear media after successful publish
      };
      
      onPostUpdate(updatedPost);
      await savePostToSupabase(updatedPost);
      
      toast.success('Post published successfully!');
    } catch (error) {
      console.error('Failed to publish post:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to publish post';
      
      const updatedPost = {
        ...post,
        status: 'failed' as const,
        error: errorMessage
      };

      onPostUpdate(updatedPost);
      await savePostToSupabase(updatedPost);
      
      toast.error(`Failed to publish post: ${errorMessage}`);
    }
  }, [auth.isAuthenticated, auth.handle, user?.id, onPostUpdate]);

  useEffect(() => {
    if (!user?.id || !auth.handle) return;

    const checkScheduledPosts = async () => {
      const now = new Date();

      for (const post of scheduledPosts) {
        if (post.status !== 'scheduled') continue;

        const scheduledTime = new Date(post.scheduledFor);
        if (scheduledTime <= now && !processedPosts.current.has(post.id)) {
          await publishPost(post);
        }
      }
    };

    const interval = setInterval(checkScheduledPosts, 30000); // Check every 30 seconds
    checkScheduledPosts(); // Initial check

    return () => {
      clearInterval(interval);
      processedPosts.current.clear();
    };
  }, [scheduledPosts, publishPost, user?.id, auth.handle]);
};