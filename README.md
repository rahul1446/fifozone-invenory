# Fifozone MERN Dashboard 🚀

A production-grade, full-stack MERN internal dashboard for Fifozone. This dashboard centralizes and automates multi-channel inventory and order management across four major platforms:
- **WooCommerce (Fifozone)**
- **Amazon India**
- **Flipkart**
- **Meesho**

## 🌟 Key Features

- **Multi-Channel Inventory Sync:** Centralized product catalog that syncs stock and pricing across all four platforms simultaneously.
- **Unified Order Management:** View, process, and track orders from WooCommerce, Amazon, Flipkart, and Meesho in one single interface.
- **Analytics & Dashboard:** Real-time metrics for revenue, total orders, low stock alerts, and platform performance.
- **Optimistic UI:** Blazing-fast, premium user interface with instant feedback using React, Tailwind CSS, and Ant Design.
- **Mock Mode:** Built-in mock servers for Amazon, Flipkart, and Meesho to test the system without hitting live production APIs or exceeding rate limits.
- **Promotions & Coupons:** Manage platform-specific sales and discounts directly from the dashboard.

## 🛠️ Technology Stack

**Frontend (Client):**
- React.js (Vite)
- Tailwind CSS (Styling)
- Ant Design (UI Components)
- Recharts (Analytics Charts)
- React Router (Routing)
- Lucide React (Icons)

**Backend (Server):**
- Node.js & Express.js
- MongoDB & Mongoose (Database)
- Axios (API requests)
- Winston (Logging)

## ⚙️ Local Setup Instructions

### 1. Prerequisites
- Node.js (v18+)
- MongoDB running locally or a MongoDB Atlas URI

### 2. Installation
Clone the repository, then install dependencies for both the frontend and backend:

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 3. Environment Variables
Create a `.env` file in the `server` directory based on the provided `.env.example`. At a minimum, you need:

```env
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/fifozone
USE_MOCK_API=true
JWT_SECRET=your_jwt_secret_here
```

### 4. Running the App
You will need two terminal windows to run both servers simultaneously.

**Terminal 1 (Backend):**
```bash
cd server
npm run dev
```
*(Runs on `http://localhost:5001`)*

**Terminal 2 (Frontend):**
```bash
cd client
npm run dev
```
*(Runs on `http://localhost:5173`)*

## 📦 Mock Servers
By default, `USE_MOCK_API=true` is set to ensure safe local development. This utilizes the embedded mock routers located in `server/src/mocks/` for Amazon, Flipkart, and Meesho to simulate real API interactions.
