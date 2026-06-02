import axiosInstance from './axiosInstance';

export const getAlertRulesApi = () => axiosInstance.get('/alerts');
export const createAlertRuleApi = (data) => axiosInstance.post('/alerts', data);
export const updateAlertRuleApi = (id, data) => axiosInstance.patch(`/alerts/${id}`, data);
export const deleteAlertRuleApi = (id) => axiosInstance.delete(`/alerts/${id}`);
