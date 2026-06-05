import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const getSettingsApi = () => {
  return axios.get(`${API_URL}/settings`, { withCredentials: true });
};

export const updateSettingsApi = (data) => {
  return axios.put(`${API_URL}/settings`, data, { withCredentials: true });
};
