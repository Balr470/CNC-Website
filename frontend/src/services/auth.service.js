import api from './api';

export const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data;
};

export const register = async (name, email, password) => {
    const response = await api.post('/auth/register', { name, email, password });
    if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data;
};

export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
};

export const getCurrentUser = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
};

export const getMe = async () => {
    const response = await api.get('/auth/me');
    return response.data;
};

export const toggleWishlist = async (designId) => {
    const response = await api.post(`/auth/wishlist/${designId}`);
    return response.data;
};

export const getMyWishlist = async () => {
    const response = await api.get('/auth/my-wishlist');
    return response.data;
};

export const toggleCart = async (designId) => {
    const response = await api.post(`/auth/cart/${designId}`);
    return response.data;
};

export const getMyCart = async () => {
    const response = await api.get('/auth/my-cart');
    return response.data;
};
