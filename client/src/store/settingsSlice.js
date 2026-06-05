import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  generalSettings: null,
  loading: false,
  error: null,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setSettingsStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    setSettingsSuccess: (state, action) => {
      state.loading = false;
      state.generalSettings = action.payload;
    },
    setSettingsFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  setSettingsStart,
  setSettingsSuccess,
  setSettingsFailure,
} = settingsSlice.actions;

export default settingsSlice.reducer;
