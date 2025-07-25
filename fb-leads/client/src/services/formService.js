import api from './api';

const formService = {
  // Get all forms
  getForms: async () => {
    try {
      const response = await api.get('/api/forms/list');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Add a new form
  addForm: async (formData) => {
    try {
      const response = await api.post('/api/forms/add', formData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Update a form
  updateForm: async (formId, formData) => {
    try {
      const response = await api.put(`/api/forms/update/${formId}`, formData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Delete a form
  deleteForm: async (formId) => {
    try {
      const response = await api.delete(`/api/forms/delete/${formId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default formService; 