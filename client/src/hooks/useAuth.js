import { store } from '../store';
import { useSelector, useDispatch } from 'react-redux';
import { setCredentials, clearCredentials, setLoading } from '../store/authSlice';
import { loginApi, logoutApi, fetchMeApi } from '../api/authApi';
import toast from 'react-hot-toast';

export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, accessToken, isAuthenticated, loading } = useSelector((state) => state.auth);

  const login = async (email, password) => {
    try {
      const response = await loginApi(email, password);
      const data = response?.data || response;
      const loggedInUser = data.user;
      const token = data.accessToken;
      const refreshToken = data.refreshToken;
      dispatch(setCredentials({ user: loggedInUser, accessToken: token, refreshToken }));
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
    const currentToken = store.getState().auth.accessToken || localStorage.getItem('fifozone_access_token');
    if (!currentToken) {
      dispatch(clearCredentials());
      return;
    }

    try {
      const response = await fetchMeApi();
      const userData = response?.data || response;
      dispatch(setCredentials({ user: userData, accessToken: currentToken }));
    } catch (err) {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        dispatch(clearCredentials());
      } else {
        dispatch(setLoading(false));
      }
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
