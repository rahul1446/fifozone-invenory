import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import AppRouter from './routes/AppRouter';
import { ConfigProvider } from 'antd';
import { antdThemeConfig } from './styles/antd-theme';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';

// Separate wrapper to use Auth hook inside Provider
const AppWrapper = () => {
  const { fetchUserProfile, loading } = useAuth();

  useEffect(() => {
    fetchUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return null; // Or a global loader

  return <AppRouter />;
};

const App = () => {
  return (
    <Provider store={store}>
      <ConfigProvider theme={antdThemeConfig}>
        <BrowserRouter>
          <AppWrapper />
          <Toaster position="top-right" />
        </BrowserRouter>
      </ConfigProvider>
    </Provider>
  );
};

export default App;
