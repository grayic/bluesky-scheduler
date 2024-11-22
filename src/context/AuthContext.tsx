import React, { createContext, useContext, useEffect, useState } from 'react';
import { BskyAgent } from '@atproto/api';
import { AuthState } from '../types/bluesky';
import { useSupabase } from './SupabaseContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

interface AuthContextType {
  auth: AuthState;
  agent: BskyAgent | null;
  login: (handle: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useSupabase();
  const [auth, setAuth] = useState<AuthState>({
    handle: '',
    password: '',
    isAuthenticated: false
  });
  const [agent, setAgent] = useState<BskyAgent | null>(null);
  const [loading, setLoading] = useState(false);

  const loadSavedCredentials = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data: credentials, error } = await supabase
        .from('bluesky_credentials')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') { // Not found error
          console.error('Error loading credentials:', error);
        }
        return;
      }

      if (credentials?.handle && credentials?.password) {
        const newAgent = new BskyAgent({
          service: 'https://bsky.social'
        });

        try {
          await newAgent.login({
            identifier: credentials.handle,
            password: credentials.password
          });

          setAgent(newAgent);
          setAuth({
            handle: credentials.handle,
            password: credentials.password,
            isAuthenticated: true
          });
        } catch (error) {
          console.error('Auto-login error:', error);
          if (error instanceof Error) {
            toast.error(`Auto-login failed: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadSavedCredentials();
    } else {
      setAuth({
        handle: '',
        password: '',
        isAuthenticated: false
      });
      setAgent(null);
      setLoading(false);
    }
  }, [user]);

  const login = async (handle: string, password: string) => {
    if (!user) {
      toast.error('Please sign in to your account first');
      return;
    }

    try {
      setLoading(true);
      const newAgent = new BskyAgent({
        service: 'https://bsky.social'
      });
      
      await newAgent.login({
        identifier: handle.startsWith('@') ? handle.slice(1) : handle,
        password
      });

      setAgent(newAgent);
      const formattedHandle = handle.startsWith('@') ? handle.slice(1) : handle;
      
      // Save credentials to Supabase
      const { error: saveError } = await supabase
        .from('bluesky_credentials')
        .upsert({
          user_id: user.id,
          handle: formattedHandle,
          password
        }, {
          onConflict: 'user_id'
        });

      if (saveError) throw saveError;

      setAuth({
        handle: formattedHandle,
        password,
        isAuthenticated: true
      });
      
      toast.success('Successfully connected to Bluesky!');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Connection failed. Please check your credentials.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (user) {
        // Remove Bluesky credentials from Supabase
        await supabase
          .from('bluesky_credentials')
          .delete()
          .eq('user_id', user.id);
      }

      // Reset Bluesky auth state
      setAuth({
        handle: '',
        password: '',
        isAuthenticated: false
      });
      setAgent(null);
    } catch (error) {
      console.error('Error during Bluesky disconnect:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ auth, agent, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};