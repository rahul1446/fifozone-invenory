import axiosInstance from './axiosInstance';

export const loginApi = async (email, password) => {
  const response = await axiosInstance.post('/auth/login', { email, password });
  return response.data;
};

export const logoutApi = async () => {
  const response = await axiosInstance.post('/auth/logout');
  return response.data;
};

export const fetchMeApi = async () => {
  const response = await axiosInstance.get('/auth/me');
  return response.data;
};

export const changePasswordApi = async (oldPassword, newPassword) => {
  const response = await axiosInstance.patch('/auth/change-password', { oldPassword, newPassword });
  return response.data;
};
