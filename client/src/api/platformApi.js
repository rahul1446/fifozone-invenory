import axiosInstance from './axiosInstance';

export const getSyncStatusApi = async () => {
  const response = await axiosInstance.get('/platforms/sync-status');
  return response.data;
};

export const triggerManualSyncApi = async () => {
  const response = await axiosInstance.post('/platforms/sync-now');
  return response.data;
};

export const updateCredentialsApi = async (platform, credentials) => {
  const response = await axiosInstance.post('/platforms/credentials', { platform, ...credentials });
  return response.data;
};

export const getCredentialsStatusApi = async () => {
  const response = await axiosInstance.get('/platforms/credentials/status');
  return response.data;
};
