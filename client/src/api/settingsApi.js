import axiosInstance from './axiosInstance';

export const getSettingsApi        = ()     => axiosInstance.get('/settings');
export const updateSettingsApi     = (data) => axiosInstance.put('/settings', data);
export const testShiprocketApi     = (data) => axiosInstance.post('/settings/test-shiprocket', data || {});
export const testFifozoneOmsApi    = (data) => axiosInstance.post('/settings/test-fifozone-oms', data);
