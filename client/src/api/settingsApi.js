import axiosInstance from './axiosInstance';

export const getSettingsApi    = ()     => axiosInstance.get('/settings');
export const updateSettingsApi = (data) => axiosInstance.put('/settings', data);
export const testShiprocketApi = ()     => axiosInstance.post('/settings/test-shiprocket');
