import api from './api';

export const loadRazorpayScript = () => {
    return new Promise((resolve) => {
        // Fix #6: prevent duplicate script injection on rapid double-clicks
        if (document.querySelector('script[src*="razorpay"]')) {
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

export const createOrder = async (designIds) => {
    const response = await api.post('/payments/orders', { designIds });
    return response.data;
};

export const verifyPayment = async (paymentData) => {
    const response = await api.post('/payments/verify', paymentData);
    return response.data;
};
