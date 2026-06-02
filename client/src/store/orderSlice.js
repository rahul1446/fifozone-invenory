import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  orders: [],
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    pages: 1
  },
  loading: false,
  error: null
};

const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setOrdersStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    setOrdersSuccess: (state, action) => {
      const { orders, pagination } = action.payload;
      state.orders = orders;
      state.pagination = pagination || state.pagination;
      state.loading = false;
    },
    setOrdersFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    updateSingleOrder: (state, action) => {
      const index = state.orders.findIndex(o => o._id === action.payload._id);
      if (index !== -1) {
        state.orders[index] = action.payload;
      }
    }
  }
});

export const { setOrdersStart, setOrdersSuccess, setOrdersFailure, updateSingleOrder } = orderSlice.actions;
export default orderSlice.reducer;
