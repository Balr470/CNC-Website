import api from './api';

export const getAllDesigns = async (queryString = '') => {
    const response = await api.get(`/designs${queryString}`);
    return response.data;
};

export const getDesignById = async (id) => {
    const response = await api.get(`/designs/${id}`);
    return response.data;
};

export const uploadDesign = async (designData) => {
    // Axios will automatically handle the Content-Type and boundary for FormData
    const response = await api.post('/designs', designData);
    return response.data;
};

export const getDownloadLink = async (designId) => {
    const response = await api.get(`/downloads/${designId}`);
    return response.data;
};

export const deleteDesign = async (designId) => {
    const response = await api.delete(`/designs/${designId}`);
    return response.data;
};

export const updateDesign = async (designId, updateData) => {
    const response = await api.put(`/designs/${designId}`, updateData);
    return response.data;
};
