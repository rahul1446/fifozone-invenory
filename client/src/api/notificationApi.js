import axiosInstance from './axiosInstance';

export const getNotificationsApi = async (params = {}) => {
  const response = await axiosInstance.get('/notifications', { params });
  return response.data;
};

export const markAsReadApi = async (id) => {
  const response = await axiosInstance.patch(`/notifications/${id}/read`);
  return response.data;
};

export const markAllAsReadApi = async () => {
  const response = await axiosInstance.patch('/notifications/mark-all');
  return response.data;
};
