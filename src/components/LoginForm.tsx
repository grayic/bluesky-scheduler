import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSupabase } from '../context/SupabaseContext';
import { LogIn, LogOut } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export const LoginForm: React.FC = () => {
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const { logout: supabaseLogout } = useSupabase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(handle, password);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="flex justify-end mb-4 gap-2">
        <ThemeToggle />
        <button
          onClick={supabaseLogout}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2">
          <LogIn className="w-6 h-6" />
          Connect to Bluesky
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="handle" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Handle
            </label>
            <input
              type="text"
              id="handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="@username.bsky.social"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              App Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Your app password"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Connect
          </button>
        </form>
      </div>
    </div>
  );
};