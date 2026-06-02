import { useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import AppRouter from './routes/AppRouter';

const App = () => {
  const { fetchUserProfile } = useAuth();

  useEffect(() => {
    // Silently restore session via the httpOnly refresh cookie on mount
    fetchUserProfile();
  }, []);

  return <AppRouter />;
};

export default App;
