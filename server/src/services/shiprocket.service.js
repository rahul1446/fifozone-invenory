const axios = require('axios');
const logger = require('../utils/logger');

class ShiprocketService {
  constructor() {
    this.baseURL = 'https://apiv2.shiprocket.in/v1/external';
    this.token = null;
    this.tokenExpiry = null;
  }

  async authenticate() {
    // If token is still valid (give 5 min buffer), reuse it
    if (this.token && this.tokenExpiry && new Date() < new Date(this.tokenExpiry.getTime() - 5 * 60000)) {
      return this.token;
    }

    const email = process.env.SHIPROCKET_EMAIL;
    const password = process.env.SHIPROCKET_PASSWORD;

    if (!email || !password) {
      throw new Error('Shiprocket credentials are not configured in .env');
    }

    try {
      const response = await axios.post(`${this.baseURL}/auth/login`, {
        email,
        password
      });

      this.token = response.data.token;
      // Shiprocket tokens usually expire in 10 days, setting a safe 24hr expiry for in-memory cache
      this.tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); 
      
      logger.info('Successfully authenticated with Shiprocket');
      return this.token;
    } catch (error) {
      logger.error('Shiprocket authentication failed:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Shiprocket');
    }
  }

  async getHeaders() {
    const token = await this.authenticate();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // Maps Fifozone order to Shiprocket payload
  async createOrder(order) {
    try {
      const headers = await this.getHeaders();
      
      const orderItems = order.items.map(item => ({
        name: item.productSnapshot.masterName,
        sku: item.productSnapshot.sku || 'N/A',
        units: item.quantity,
        selling_price: item.unitPrice,
        discount: item.discount || 0,
        tax: item.gstAmount || 0,
        hsn: '' 
      }));

      const payload = {
        order_id: order.orderNumber,
        order_date: new Date(order.orderDate).toISOString().split('T')[0],
        pickup_location: "Primary", // Requires a setup in Shiprocket dashboard
        billing_customer_name: order.customer.name,
        billing_last_name: "",
        billing_address: order.shippingAddress.line1,
        billing_address_2: order.shippingAddress.line2 || "",
        billing_city: order.shippingAddress.city,
        billing_pincode: order.shippingAddress.pincode,
        billing_state: order.shippingAddress.state,
        billing_country: order.shippingAddress.country || "India",
        billing_email: order.customer.email || "customer@example.com",
        billing_phone: order.customer.phone || "9999999999",
        shipping_is_billing: true,
        order_items: orderItems,
        payment_method: order.paymentMethod === 'Prepaid' ? 'Prepaid' : 'COD',
        shipping_charges: order.shippingCharge || 0,
        giftwrap_charges: 0,
        transaction_charges: 0,
        total_discount: order.discount || 0,
        sub_total: order.subtotal,
        length: 10, // Default dimensions in cm, ideally should be dynamic per product
        breadth: 10,
        height: 10,
        weight: 0.5 // Default weight in kg
      };

      const response = await axios.post(`${this.baseURL}/orders/create/adHoc`, payload, { headers });
      
      logger.info(`Shiprocket order created for ${order.orderNumber}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to create Shiprocket order:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to push order to Shiprocket');
    }
  }

  async generateAWB(shipmentId) {
    try {
      const headers = await this.getHeaders();
      const payload = {
        shipment_id: shipmentId
      };
      const response = await axios.post(`${this.baseURL}/courier/assign/awb`, payload, { headers });
      return response.data;
    } catch (error) {
      logger.error('Failed to generate AWB:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to generate AWB');
    }
  }

  async requestPickup(shipmentId) {
    try {
      const headers = await this.getHeaders();
      const payload = {
        shipment_id: [shipmentId]
      };
      const response = await axios.post(`${this.baseURL}/courier/generate/pickup`, payload, { headers });
      return response.data;
    } catch (error) {
      logger.error('Failed to request pickup:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to request pickup');
    }
  }
}

module.exports = new ShiprocketService();
