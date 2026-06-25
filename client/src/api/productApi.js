import axiosInstance from './axiosInstance';

export const getProductsApi = async (params = {}) => {
  const response = await axiosInstance.get('/products', { params });
  return response.data;
};

export const getProductByIdApi = async (id) => {
  const response = await axiosInstance.get(`/products/${id}`);
  return response.data;
};

export const createProductApi = async (data) => {
  const response = await axiosInstance.post('/products', data);
  return response.data;
};

export const updateProductApi = async (id, data) => {
  const response = await axiosInstance.patch(`/products/${id}`, data);
  return response.data;
};

export const deleteProductApi = async (id) => {
  const response = await axiosInstance.delete(`/products/${id}`);
  return response.data;
};

export const bulkEditProductsApi = async (productIds, updates) => {
  const response = await axiosInstance.post('/products/bulk-edit', { productIds, updates });
  return response.data;
};

export const bulkDeleteProductsApi = async (productIds) => {
  const response = await axiosInstance.post('/products/bulk-delete', { productIds });
  return response.data;
};

export const bulkSyncProductsApi = async (productIds) => {
  const response = await axiosInstance.post('/products/bulk-sync', { productIds });
  return response.data;
};

export const importCSVApi = async (products) => {
  const response = await axiosInstance.post('/products/import-csv', { products });
  return response.data;
};

export const uploadImageApi = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  const response = await axiosInstance.post('/upload/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const bulkUpdateHsnApi = async (entries) => {
  const response = await axiosInstance.post('/products/bulk-update-hsn', { entries });
  return response.data;
};
