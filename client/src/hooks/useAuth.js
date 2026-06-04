import { store } from '../store';
import { useSelector, useDispatch } from 'react-redux';
import { setCredentials, clearCredentials } from '../store/authSlice';
import { loginApi, logoutApi, fetchMeApi } from '../api/authApi';
import toast from 'react-hot-toast';

export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, accessToken, isAuthenticated, loading } = useSelector((state) => state.auth);

  const login = async (email, password) => {
    try {
      const response = await loginApi(email, password);
      const { user: loggedInUser, accessToken: token } = response.data;
      dispatch(setCredentials({ user: loggedInUser, accessToken: token }));
      toast.success('Welcome back to Fifozone Dashboard!');
      return { success: true };
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Login failed. Please verify credentials.';
      toast.error(errMsg);
      return { success: false, error: errMsg };
    }
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch (err) {
      // quiet fail if credentials expired on server
    } finally {
      dispatch(clearCredentials());
      toast.success('Successfully logged out.');
    }
  };

  const fetchUserProfile = async () => {
    // Set a safety timeout — if backend doesn't respond in 5s, clear loading
    const timeout = setTimeout(() => {
      const state = store.getState().auth;
      if (state.loading) {
        store.dispatch(clearCredentials());
      }
    }, 5000);

    try {
      const response = await fetchMeApi();
      clearTimeout(timeout);
      const currentToken = store.getState().auth.accessToken;
      dispatch(setCredentials({ user: response.data, accessToken: currentToken }));
    } catch (err) {
      clearTimeout(timeout);
      dispatch(clearCredentials());
    }
  };

  return {
    user,
    accessToken,
    isAuthenticated,
    loading,
    login,
    logout,
    fetchUserProfile
  };
};
