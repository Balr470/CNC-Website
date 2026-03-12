import api from './api';

export const getAdminStats = async () => {
    const response = await api.get('/admin/stats');
    return response.data;
};

export const getAdminUsers = async (filters = {}) => {
    const params = new URLSearchParams({
        page: filters.page || 1,
        limit: 20,
        search: filters.search || '',
        role: filters.role || '',
        sortBy: filters.sortBy || 'newest',
        dateFrom: filters.dateFrom || '',
        dateTo: filters.dateTo || '',
    });
    const response = await api.get(`/admin/users?${params.toString()}`);
    return response.data;
};

