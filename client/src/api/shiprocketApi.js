import axiosInstance from './axiosInstance';

// ─── Order actions ───────────────────────────────────────────
export const pushOrderToShiprocketApi   = (id, pickupLocation) =>
  axiosInstance.post(`/shiprocket/orders/${id}/push`, pickupLocation ? { pickupLocation } : {});
export const bulkPushOrdersToShiprocketApi = (orderIds) => axiosInstance.post(`/shiprocket/orders/bulk-push`, { orderIds });
export const cancelShiprocketOrderApi   = (id)         => axiosInstance.post(`/shiprocket/orders/${id}/cancel`);
export const generateAwbApi             = (id, data)   => axiosInstance.post(`/shiprocket/orders/${id}/awb`, data || {});
export const requestPickupApi           = (id)         => axiosInstance.post(`/shiprocket/orders/${id}/pickup`);
export const printLabelApi              = (id)         => axiosInstance.post(`/shiprocket/orders/${id}/label`);
export const printInvoiceApi            = (id)         => axiosInstance.post(`/shiprocket/orders/${id}/invoice`);
export const trackShipmentApi           = (id)         => axiosInstance.get(`/shiprocket/orders/${id}/track`);
export const getAvailableCouriersApi    = (id)         => axiosInstance.get(`/shiprocket/orders/${id}/couriers`);

// ─── Bulk manifest ───────────────────────────────────────────
export const generateManifestApi        = (shipmentIds) => axiosInstance.post(`/shiprocket/manifest`, { shipmentIds });

// ─── Serviceability ──────────────────────────────────────────
export const checkServiceabilityApi     = (params)     => axiosInstance.get(`/shiprocket/serviceability`, { params });

// ─── Pickup locations ────────────────────────────────────────
export const getPickupLocationsApi      = ()           => axiosInstance.get(`/shiprocket/pickup-locations`);

// ─── All shipments ───────────────────────────────────────────
export const getAllShipmentsApi         = (params)     => axiosInstance.get(`/shiprocket/shipments`, { params });

// ─── NDR ─────────────────────────────────────────────────────
export const getNDRListApi              = ()           => axiosInstance.get(`/shiprocket/ndr`);
export const submitNDRActionApi         = (data)       => axiosInstance.post(`/shiprocket/ndr/action`, data);
