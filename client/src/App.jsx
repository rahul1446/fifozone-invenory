import { useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import AppRouter from './routes/AppRouter';
import ErrorBoundary from './components/common/ErrorBoundary';

const App = () => {
  const { fetchUserProfile } = useAuth();

  useEffect(() => {
    // Silently restore session via the httpOnly refresh cookie on mount
    fetchUserProfile();
  }, []);

  return (
    <ErrorBoundary>
      <AppRouter />
    </ErrorBoundary>
  );
};

export default App;
