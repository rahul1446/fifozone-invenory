import axiosInstance from './axiosInstance';

export const getShippingQueueApi = (params) => axiosInstance.get('/shipping/queue', { params });
export const markAsPackedApi = (id) => axiosInstance.patch(`/shipping/${id}/pack`);
export const markAsShippedApi = (id, data) => axiosInstance.patch(`/shipping/${id}/ship`, data);
export const generateLabelApi = (id) => axiosInstance.post(`/shipping/label/${id}`);
export const bulkShipApi = (data) => axiosInstance.patch('/shipping/bulk-ship', data);
