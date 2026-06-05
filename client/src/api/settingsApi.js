import axiosInstance from './axiosInstance';

export const getSettingsApi = () => {
  return axiosInstance.get('/settings');
};

export const updateSettingsApi = (data) => {
  return axiosInstance.put('/settings', data);
};
