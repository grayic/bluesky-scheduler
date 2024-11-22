import React from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SupabaseProvider } from './context/SupabaseContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './components/Dashboard';
import { AuthForm } from './components/AuthForm';
import { useSupabase } from './context/SupabaseContext';
import { useAuth } from './context/AuthContext';

const AppContent: React.FC = () => {
  const { auth } = useAuth();
  const { user, loading: supabaseLoading } = useSupabase();

  if (supabaseLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return auth.isAuthenticated ? <Dashboard /> : <LoginForm />;
};

const App: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="light">
      <SupabaseProvider>
        <AuthProvider>
          <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
            <AppContent />
            <Toaster position="bottom-right" />
          </div>
        </AuthProvider>
      </SupabaseProvider>
    </ThemeProvider>
  );
};

export default App;