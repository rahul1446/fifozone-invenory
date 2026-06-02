import axiosInstance from './axiosInstance';

export const getPromotionsApi = (params) => axiosInstance.get('/promotions', { params });
export const createCouponApi = (data) => axiosInstance.post('/promotions/coupon', data);
export const createDiscountApi = (data) => axiosInstance.post('/promotions/discount', data);
export const updatePromotionApi = (id, data) => axiosInstance.patch(`/promotions/${id}`, data);
export const pausePromotionApi = (id) => axiosInstance.patch(`/promotions/${id}/pause`);
export const resumePromotionApi = (id) => axiosInstance.patch(`/promotions/${id}/resume`);
export const deletePromotionApi = (id) => axiosInstance.delete(`/promotions/${id}`);
export const getPromotionPerformanceApi = (id) => axiosInstance.get(`/promotions/${id}/performance`);
