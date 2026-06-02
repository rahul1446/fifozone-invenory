import axiosInstance from './axiosInstance';

export const getMessagesApi = (params) => axiosInstance.get('/messages', { params });
export const getMessageThreadApi = (id) => axiosInstance.get(`/messages/${id}`);
export const replyToMessageApi = (id, data) => axiosInstance.post(`/messages/${id}/reply`, data);
export const markMessageReadApi = (id) => axiosInstance.patch(`/messages/${id}/read`);
export const closeMessageThreadApi = (id) => axiosInstance.patch(`/messages/${id}/close`);
export const getTemplatesApi = () => axiosInstance.get('/messages/templates');
export const createTemplateApi = (data) => axiosInstance.post('/messages/templates', data);
export const updateTemplateApi = (id, data) => axiosInstance.patch(`/messages/templates/${id}`, data);
export const deleteTemplateApi = (id) => axiosInstance.delete(`/messages/templates/${id}`);
