import axiosInstance from './axiosInstance';

export const getInventoryLogsApi = async (params = {}) => {
  const response = await axiosInstance.get('/inventory/logs', { params });
  return response.data;
};

export const manualRestockApi = async (data) => {
  const response = await axiosInstance.post('/inventory/restock', data);
  return response.data;
};
