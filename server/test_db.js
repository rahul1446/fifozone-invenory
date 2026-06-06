require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const db = mongoose.connection.useDb('fifozone');
    const user = await db.collection('users').findOne({});
    if (!user) throw new Error("No user found in DB");
    
    console.log("Found user:", user.email, "Role:", user.role);
    
    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'supersecretfifozonekeychangeinproduction',
      { expiresIn: '1h' }
    );
    
    console.log("Token generated.");
    
    console.log("Testing Suppliers API...");
    const supRes = await axios.get('http://localhost:5000/api/inventory/suppliers', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Suppliers Status:", supRes.status);
    
    console.log("Testing Purchases API...");
    const purRes = await axios.get('http://localhost:5000/api/inventory/purchases', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Purchases Status:", purRes.status);

    console.log("Testing Products API...");
    const prodRes = await axios.get('http://localhost:5000/api/products?limit=1', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Products Status:", prodRes.status);

  } catch (err) {
    if (err.response) {
      console.error('API ERROR RESPONSE:', err.response.status, err.response.data);
    } else {
      console.error('ERROR:', err);
    }
  } finally {
    process.exit(0);
  }
});
