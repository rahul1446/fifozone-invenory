import axiosInstance from './axiosInstance';

export const getCustomersApi = (params) => axiosInstance.get('/customers', { params });
export const getCustomerApi = (id) => axiosInstance.get(`/customers/${id}`);
export const addCustomerNoteApi = (id, data) => axiosInstance.post(`/customers/${id}/notes`, data);
export const deleteCustomerNoteApi = (id, noteId) => axiosInstance.delete(`/customers/${id}/notes/${noteId}`);
export const exportCustomersApi = (params) => axiosInstance.get('/customers/export-csv', { params, responseType: 'blob' });
