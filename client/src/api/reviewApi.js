import axiosInstance from './axiosInstance';

export const getReviewsApi = (params) => axiosInstance.get('/reviews', { params });
export const getReviewSummaryApi = () => axiosInstance.get('/reviews/summary');
export const replyToReviewApi = (id, data) => axiosInstance.post(`/reviews/${id}/reply`, data);
export const flagReviewApi = (id, data) => axiosInstance.post(`/reviews/${id}/flag`, data);
export const markReviewReadApi = (id) => axiosInstance.patch(`/reviews/${id}/read`);
