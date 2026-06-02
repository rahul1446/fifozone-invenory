import axiosInstance from './axiosInstance';

export const getHealthOverviewApi = () => axiosInstance.get('/account-health/overview');
export const getAmazonHealthApi = () => axiosInstance.get('/account-health/amazon');
export const getFlipkartHealthApi = () => axiosInstance.get('/account-health/flipkart');
export const getListingQualityApi = (params) => axiosInstance.get('/account-health/listing-quality', { params });
