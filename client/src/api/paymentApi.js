import axiosInstance from './axiosInstance';

export const getPaymentOverviewApi = (params) => axiosInstance.get('/payments/overview', { params });
export const getTransactionsApi = (params) => axiosInstance.get('/payments/transactions', { params });
export const getFeeBreakdownApi = (params) => axiosInstance.get('/payments/fees', { params });
export const exportPaymentsApi = (params) => axiosInstance.get('/payments/export', { params, responseType: 'blob' });
