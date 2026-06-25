import axiosInstance from './axiosInstance';

export const pushOrderToShiprocketApi = async (id) => {
  const response = await axiosInstance.post(`/shiprocket/orders/${id}/push`);
  return response.data;
};

export const bulkPushOrdersToShiprocketApi = async (orderIds) => {
  const response = await axiosInstance.post(`/shiprocket/orders/bulk-push`, { orderIds });
  return response.data;
};

export const generateAwbApi = async (id) => {
  const response = await axiosInstance.post(`/shiprocket/orders/${id}/awb`);
  return response.data;
};

export const requestPickupApi = async (id) => {
  const response = await axiosInstance.post(`/shiprocket/orders/${id}/pickup`);
  return response.data;
};
