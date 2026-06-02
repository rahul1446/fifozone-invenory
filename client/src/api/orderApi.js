import axiosInstance from './axiosInstance';

export const getOrdersApi = async (params = {}) => {
  const response = await axiosInstance.get('/orders', { params });
  return response.data;
};

export const getOrderByIdApi = async (id) => {
  const response = await axiosInstance.get(`/orders/${id}`);
  return response.data;
};

export const updateOrderStatusApi = async (id, data) => {
  const response = await axiosInstance.patch(`/orders/${id}/status`, data);
  return response.data;
};

export const bulkUpdateOrderStatusApi = async (orderIds, status, note) => {
  const response = await axiosInstance.post('/orders/bulk-status', { orderIds, status, note });
  return response.data;
};

export const initiateReturnApi = async (data) => {
  const response = await axiosInstance.post('/orders/returns', data);
  return response.data;
};

export const getReturnsApi = async () => {
  const response = await axiosInstance.get('/orders/returns');
  return response.data;
};

export const resolveReturnApi = async (id, data) => {
  const response = await axiosInstance.patch(`/orders/returns/${id}`, data);
  return response.data;
};
