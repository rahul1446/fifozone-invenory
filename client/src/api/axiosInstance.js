import axios from 'axios';
import { store } from '../store';
import { setCredentials, clearCredentials } from '../store/authSlice';

const axiosInstance = axios.create({
  baseURL: '/api',
  withCredentials: true, // Crucial for sending httpOnly refresh token cookie
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Attach access token from Redux store memory
axiosInstance.interceptors.request.use(
  (config) => {
    const token = store.getState().auth.accessToken;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Seamless silent 401 token refresh rotation
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Trigger if status is 401, token is expired or missing, and it has not been retried yet
    if (
      error.response &&
      error.response.status === 401 &&
      (error.response.data.message === 'Access token expired' || error.response.data.message === 'Authentication token missing') &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        // Silently request a rotated access token using the httpOnly cookie
        const response = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        const { accessToken } = response.data.data;

        // Dispatch updated credentials to Redux
        const currentUser = store.getState().auth.user;
        store.dispatch(setCredentials({ user: currentUser, accessToken }));

        // Retry the original failed request with the new authorization header
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // If refresh fails (e.g., refresh cookie is invalid/expired), log the user out
        store.dispatch(clearCredentials());
        // Rely on React Router (PrivateRoute) to redirect instead of reloading the page
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
