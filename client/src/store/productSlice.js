import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  products: [],
  categories: [],
  brands: [],
  pagination: {
    total: 0,
    page: 1,
    limit: 25,
    pages: 1
  },
  loading: false,
  error: null
};

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setProductsStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    setProductsSuccess: (state, action) => {
      const { products, categories, brands, pagination } = action.payload;
      state.products = products;
      state.categories = categories || [];
      state.brands = brands || [];
      state.pagination = pagination || state.pagination;
      state.loading = false;
    },
    setProductsFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    updateSingleProduct: (state, action) => {
      const index = state.products.findIndex(p => p._id === action.payload._id);
      if (index !== -1) {
        state.products[index] = action.payload;
      }
    }
  }
});

export const { setProductsStart, setProductsSuccess, setProductsFailure, updateSingleProduct } = productSlice.actions;
export default productSlice.reducer;
