import axiosInstance from './axiosInstance';

export const getDashboardStatsApi = async () => {
  const response = await axiosInstance.get('/analytics/dashboard');
  return response.data;
};

export const getDetailedAnalyticsApi = async () => {
  const response = await axiosInstance.get('/analytics/detailed');
  return response.data;
};
