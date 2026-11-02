import axios from 'axios';
import { store } from '../store';
import { setCredentials, clearCredentials } from '../store/authSlice';

const axiosInstance = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Attach access token from Redux store memory or localStorage
axiosInstance.interceptors.request.use(
  (config) => {
    const token = store.getState().auth.accessToken || localStorage.getItem('fifozone_access_token');
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
        const storedRefreshToken = localStorage.getItem('fifozone_refresh_token');
        const refreshHeaders = {};
        if (storedRefreshToken) {
          refreshHeaders['x-refresh-token'] = storedRefreshToken;
        }

        const response = await axios.post(
          '/api/auth/refresh',
          { refreshToken: storedRefreshToken },
          {
            withCredentials: true,
            headers: refreshHeaders
          }
        );

        const resData = response.data?.data || response.data;
        const accessToken = resData.accessToken;
        const newRefreshToken = resData.refreshToken;

        const currentUser = store.getState().auth.user;
        store.dispatch(setCredentials({
          user: currentUser,
          accessToken,
          refreshToken: newRefreshToken || storedRefreshToken
        }));

        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        store.dispatch(clearCredentials());
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
