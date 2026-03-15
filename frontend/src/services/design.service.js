import api from './api';

export const getAllDesigns = async (queryString = '') => {
    const response = await api.get(`/designs${queryString}`);
    return response.data;
};

export const getDesignById = async (id) => {
    const response = await api.get(`/designs/${id}`);
    return response.data;
};

export const uploadDesign = async (designData, onUploadProgress) => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/designs`);
        xhr.withCredentials = true;
        
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && onUploadProgress) {
                onUploadProgress({
                    loaded: event.loaded,
                    total: event.total,
                    percentCompleted: Math.round((event.loaded * 100) / event.total)
                });
            }
        };
        
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    resolve(response);
                } catch (e) {
                    resolve(xhr.response);
                }
            } else {
                try {
                    const error = JSON.parse(xhr.responseText);
                    reject(new Error(error.error || error.message || 'Upload failed'));
                } catch (e) {
                    reject(new Error('Upload failed'));
                }
            }
        };
        
        xhr.onerror = () => {
            reject(new Error('Network error. Please check your connection.'));
        };
        
        xhr.send(designData);
    });
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

export const getRelatedDesigns = async (designId) => {
    const response = await api.get(`/designs/${designId}/related`);
    return response.data;
};
