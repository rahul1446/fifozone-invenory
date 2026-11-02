import { createSlice } from '@reduxjs/toolkit';

const getStoredToken = () => {
  try {
    return localStorage.getItem('fifozone_access_token') || null;
  } catch (e) {
    return null;
  }
};

const getStoredUser = () => {
  try {
    const stored = localStorage.getItem('fifozone_user');
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    return null;
  }
};

const initialToken = getStoredToken();
const initialUser = getStoredUser();

const initialState = {
  user: initialUser,
  accessToken: initialToken,
  isAuthenticated: !!initialToken,
  loading: false
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, accessToken, refreshToken } = action.payload;
      if (user) {
        state.user = user;
        try {
          localStorage.setItem('fifozone_user', JSON.stringify(user));
        } catch (e) {}
      }
      if (accessToken) {
        state.accessToken = accessToken;
        try {
          localStorage.setItem('fifozone_access_token', accessToken);
        } catch (e) {}
      }
      if (refreshToken) {
        try {
          localStorage.setItem('fifozone_refresh_token', refreshToken);
        } catch (e) {}
      }
      state.isAuthenticated = true;
      state.loading = false;
    },
    clearCredentials: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.loading = false;
      try {
        localStorage.removeItem('fifozone_access_token');
        localStorage.removeItem('fifozone_user');
        localStorage.removeItem('fifozone_refresh_token');
      } catch (e) {}
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    updateUserProfile: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        try {
          localStorage.setItem('fifozone_user', JSON.stringify(state.user));
        } catch (e) {}
      }
    }
  }
});

export const { setCredentials, clearCredentials, setLoading, updateUserProfile } = authSlice.actions;
export default authSlice.reducer;
