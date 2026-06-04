import axiosInstance from './axiosInstance';

export const getInventoryLogsApi = async (params = {}) => {
  const response = await axiosInstance.get('/inventory/logs', { params });
  return response.data;
};

export const manualRestockApi = async (data) => {
  const response = await axiosInstance.post('/inventory/restock', data);
  return response.data;
};

export const stockUpdateApi = async (data) => {
  const response = await axiosInstance.post('/inventory/stock-update', data);
  return response.data;
};

export const getSuppliersApi = async () => {
  const response = await axiosInstance.get('/inventory/suppliers');
  return response.data;
};

export const createSupplierApi = async (data) => {
  const response = await axiosInstance.post('/inventory/suppliers', data);
  return response.data;
};

export const updateSupplierApi = async (id, data) => {
  const response = await axiosInstance.patch(`/inventory/suppliers/${id}`, data);
  return response.data;
};

export const getPurchasesApi = async () => {
  const response = await axiosInstance.get('/inventory/purchases');
  return response.data;
};

export const createPurchaseApi = async (data) => {
  const response = await axiosInstance.post('/inventory/purchases', data);
  return response.data;
};
