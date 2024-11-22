import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSupabase } from '../context/SupabaseContext';
import { Post } from '../types/bluesky';
import { LogOut, RefreshCw } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { PostForm } from './PostForm';
import { ScheduledPosts } from './ScheduledPosts';
import { EditPostModal } from './EditPostModal';
import { usePostScheduler } from '../hooks/usePostScheduler';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

export const Dashboard: React.FC = () => {
  const { auth, logout: blueskyLogout } = useAuth();
  const { user } = useSupabase();
  const [scheduledPosts, setScheduledPosts] = useState<Post[]>([]);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const lastFetch = useRef<number>(0);
  const abortController = useRef<AbortController | null>(null);

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('bluesky_credentials')
          .select('first_name')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        setFirstName(data?.first_name || null);
      } catch (error) {
        console.error('Error fetching user details:', error);
      }
    };

    fetchUserDetails();
  }, [user?.id]);

  const loadScheduledPosts = useCallback(async (force: boolean = false) => {
    if (!user?.id || !auth.handle) {
      setLoading(false);
      return;
    }

    const now = Date.now();
    if (!force && now - lastFetch.current < CACHE_DURATION) {
      return;
    }
    
    // Cancel any ongoing fetch
    if (abortController.current) {
      abortController.current.abort();
    }
    
    abortController.current = new AbortController();
    
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('user_id', user.id)
        .eq('bluesky_handle', auth.handle)
        .order('scheduled_for', { ascending: false });

      if (fetchError) throw fetchError;

      const transformedPosts = (data || []).map(post => ({
        id: post.id,
        text: post.text,
        scheduledFor: new Date(post.scheduled_for).toISOString(),
        status: post.status,
        error: post.error,
        media: post.media,
        bluesky_handle: post.bluesky_handle
      }));

      setScheduledPosts(transformedPosts);
      lastFetch.current = now;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Error loading scheduled posts:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to load scheduled posts';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      abortController.current = null;
    }
  }, [user?.id, auth.handle]);

  useEffect(() => {
    loadScheduledPosts();
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [loadScheduledPosts]);

  const handleDisconnect = async () => {
    try {
      await blueskyLogout();
      setScheduledPosts([]);
      setError(null);
      setFirstName(null);
      toast.success('Successfully disconnected from Bluesky');
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Failed to disconnect from Bluesky');
    }
  };

  usePostScheduler(scheduledPosts, async (updatedPost) => {
    setScheduledPosts(prev => 
      prev.map(p => p.id === updatedPost.id ? updatedPost : p)
    );
  });

  const handleSchedulePost = async (post: { text: string; scheduledFor: string; media?: any[] }) => {
    if (!user?.id || !auth.handle) {
      toast.error('Please login to schedule posts');
      return;
    }

    try {
      const newPost: Post = {
        id: crypto.randomUUID(),
        ...post,
        status: 'scheduled',
        bluesky_handle: auth.handle
      };
      
      const { error: insertError } = await supabase
        .from('scheduled_posts')
        .insert({
          id: newPost.id,
          user_id: user.id,
          text: newPost.text,
          scheduled_for: new Date(newPost.scheduledFor).toISOString(),
          status: newPost.status,
          media: newPost.media,
          bluesky_handle: auth.handle
        });

      if (insertError) throw insertError;
      
      setScheduledPosts(prev => [newPost, ...prev]);
      toast.success('Post scheduled successfully');
    } catch (error) {
      console.error('Error scheduling post:', error);
      toast.error('Failed to schedule post');
    }
  };

  const handleEditPost = async (post: Post) => {
    if (!user?.id || !auth.handle) return;

    try {
      const { error: updateError } = await supabase
        .from('scheduled_posts')
        .update({
          text: post.text,
          scheduled_for: new Date(post.scheduledFor).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', post.id)
        .eq('user_id', user.id)
        .eq('bluesky_handle', auth.handle);

      if (updateError) throw updateError;

      setScheduledPosts(prev => 
        prev.map(p => p.id === post.id ? post : p)
      );
      
      toast.success('Post updated successfully');
      setEditingPost(null);
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error('Failed to update post');
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!user?.id || !auth.handle) return;

    try {
      const { error: deleteError } = await supabase
        .from('scheduled_posts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .eq('bluesky_handle', auth.handle);

      if (deleteError) throw deleteError;

      setScheduledPosts(prev => prev.filter(p => p.id !== id));
      toast.success('Post deleted successfully');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {firstName ? `Welcome ${firstName} 👋` : 'Welcome 👋'}
        </h1>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            <LogOut className="w-4 h-4" />
            Disconnect
          </button>
        </div>
      </div>
      
      <PostForm onPostScheduled={handleSchedulePost} />
      
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            Scheduled Posts
          </h2>
          {!loading && (
            <button
              onClick={() => loadScheduledPosts(true)}
              className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
          </div>
        ) : error ? (
          <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={() => loadScheduledPosts(true)}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        ) : (
          <ScheduledPosts
            posts={scheduledPosts}
            onEdit={setEditingPost}
            onDelete={handleDeletePost}
          />
        )}
      </div>

      {editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSave={handleEditPost}
        />
      )}
    </div>
  );
};