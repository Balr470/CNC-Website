const { successResponse } = require('../utils/responseHandler');
const adminService = require('../services/admin.service');

exports.getDashboardStats = async (req, res, next) => {
    try {
        const statsData = await adminService.getDashboardStats();
        successResponse(res, 200, { data: statsData });
    } catch (error) {
        next(error);
    }
};

exports.getUsers = async (req, res, next) => {
    try {
        const { page, limit, search, role, sortBy, dateFrom, dateTo } = req.query;
        const data = await adminService.getAllUsers({
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 10,
            search: search || '',
            role: role || '',
            sortBy: sortBy || 'newest',
            dateFrom: dateFrom || '',
            dateTo: dateTo || '',
        });
        successResponse(res, 200, data);
    } catch (error) {
        next(error);
    }
};


