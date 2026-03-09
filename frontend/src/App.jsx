import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute, { GuestRoute } from './components/ProtectedRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import UploadDesign from './pages/UploadDesign';
import DesignDetails from './pages/DesignDetails';
import AdminDashboard from './pages/AdminDashboard';
import MyPurchases from './pages/MyPurchases';
import MyWishlist from './pages/MyWishlist';
import Cart from './pages/Cart';
import NotFound from './pages/NotFound';
import Category from './pages/Category';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="flex flex-col min-h-screen bg-[#f8f9fc] text-gray-900 font-sans selection:bg-black selection:text-white">
          <Navbar />
          <main className="flex-grow w-full">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
              <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
              <Route path="/design/:id" element={<DesignDetails />} />
              <Route path="/category/:categoryId" element={<Category />} />
              <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
              <Route path="/reset-password/:token" element={<GuestRoute><ResetPassword /></GuestRoute>} />

              {/* Protected Routes */}
              <Route path="/upload" element={
                <ProtectedRoute requireAdmin={true}>
                  <UploadDesign />
                </ProtectedRoute>
              } />

              <Route path="/admin" element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />

              <Route path="/my-purchases" element={
                <ProtectedRoute>
                  <MyPurchases />
                </ProtectedRoute>
              } />

              <Route path="/my-wishlist" element={
                <ProtectedRoute>
                  <MyWishlist />
                </ProtectedRoute>
              } />

              <Route path="/cart" element={
                <ProtectedRoute>
                  <Cart />
                </ProtectedRoute>
              } />

              {/* 404 catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
        <Toaster position="bottom-right" toastOptions={{
          style: {
            background: '#111',
            color: '#fff',
            borderRadius: '100px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
          },
        }} />
      </AuthProvider>
    </Router>
  );
}

export default App;
