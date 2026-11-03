import axiosInstance from './axiosInstance';

export const validateImportApi = async (products) => {
  const response = await axiosInstance.post('/import/validate', { products });
  return response.data;
};

export const uploadImportApi = async (products, batchId) => {
  const response = await axiosInstance.post('/import/upload', { products, batchId });
  return response.data;
};

export const downloadImportTemplateApi = () => {
  // Direct link to backend via relative URL so it works on VPS host or any environment
  window.open('/api/import/template', '_blank');
};
