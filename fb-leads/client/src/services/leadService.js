import api from './api';

const leadService = {
  // Get leads with pagination and filters
  getLeads: async (params = {}) => {
    try {
      const response = await api.get('/api/leads', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Get a specific lead
  getLead: async (leadId) => {
    try {
      const response = await api.get(`/api/leads/${leadId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Update lead status
  updateLeadStatus: async (leadId, statusData) => {
    try {
      const response = await api.put(`/api/leads/${leadId}`, statusData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Manually fetch leads from Facebook
  fetchLeads: async (formId = null, pageId = null, appId = null) => {
    try {
      const params = {};
      
      if (formId) params.formId = formId;
      if (pageId) params.pageId = pageId;
      if (appId) params.appId = appId;
      
      const response = await api.get('/api/leads/fetch', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Export leads to CSV
  exportLeads: async (params = {}) => {
    try {
      // Get the token from localStorage
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      // Build the query string from params
      const queryParams = new URLSearchParams(params).toString();
      
      // Get API base URL from environment or default to localhost
      const baseUrl = process.env.REACT_APP_API_URL || '';
      
      // Create a hidden iframe for downloading
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      // Create a form within the iframe
      const form = iframe.contentDocument.createElement('form');
      form.method = 'GET';
      form.action = `${baseUrl}/api/leads/export?${queryParams}`;
      
      // Add auth token as hidden field
      const tokenField = iframe.contentDocument.createElement('input');
      tokenField.type = 'hidden';
      tokenField.name = 'authorization';
      tokenField.value = `Bearer ${token}`;
      form.appendChild(tokenField);
      
      // Add the form to the iframe document
      iframe.contentDocument.body.appendChild(form);
      
      // Submit the form
      form.submit();
      
      // Clean up after a delay
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 5000);
      
      return true;
    } catch (error) {
      console.error('Error exporting leads:', error);
      throw error;
    }
  }
};

export default leadService; 