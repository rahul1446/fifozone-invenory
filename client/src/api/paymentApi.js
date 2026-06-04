import axiosInstance from './axiosInstance';

export const getPaymentOverviewApi = async () => {
  const response = await axiosInstance.get('/payments/overview');
  return response.data;
};

export const getTransactionsApi = async (params = {}) => {
  const response = await axiosInstance.get('/payments/transactions', { params });
  return response.data;
};

export const getSettlementsApi = async (params = {}) => {
  const response = await axiosInstance.get('/payments/settlements', { params });
  return response.data;
};

export const getInvoicesApi = async () => {
  const response = await axiosInstance.get('/payments/invoices');
  return response.data;
};

export const createInvoiceApi = async (data) => {
  const response = await axiosInstance.post('/payments/invoices', data);
  return response.data;
};

export const getRefundsApi = async () => {
  const response = await axiosInstance.get('/payments/refunds');
  return response.data;
};
