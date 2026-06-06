const axios = require('axios');
(async () => {
  try {
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@fifozone.com',
      password: 'password123'
    });
    const token = loginRes.data.data.accessToken;
    
    const supRes = await axios.get('http://localhost:5000/api/inventory/suppliers', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('SUPPLIERS RESPONSE:', supRes.data);
  } catch (err) {
    if (err.response) {
      console.error('ERROR DATA:', err.response.data);
    } else {
      console.error(err);
    }
  }
})();
