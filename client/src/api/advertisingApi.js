import axiosInstance from './axiosInstance';

export const getAdOverviewApi = (params) => axiosInstance.get('/advertising/overview', { params });
export const getAmazonCampaignsApi = (params) => axiosInstance.get('/advertising/amazon', { params });
export const getAmazonCampaignDetailApi = (id) => axiosInstance.get(`/advertising/amazon/${id}`);
export const pauseAmazonCampaignApi = (id) => axiosInstance.patch(`/advertising/amazon/${id}/pause`);
export const activateAmazonCampaignApi = (id) => axiosInstance.patch(`/advertising/amazon/${id}/activate`);

export const getFlipkartCampaignsApi = (params) => axiosInstance.get('/advertising/flipkart', { params });
export const pauseFlipkartCampaignApi = (id) => axiosInstance.patch(`/advertising/flipkart/${id}/pause`);
export const activateFlipkartCampaignApi = (id) => axiosInstance.patch(`/advertising/flipkart/${id}/activate`);
