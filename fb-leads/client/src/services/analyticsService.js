import api from './api';

/**
 * Get Facebook Ads insights
 * @param {Object} params - Query parameters
 * @param {string} params.adAccountId - Ad account ID
 * @param {string} params.datePreset - Date preset (today, yesterday, last_7d, etc.)
 * @param {string} [params.breakdown] - Optional breakdown parameter
 * @param {boolean} [params.forceRefresh] - Force refresh from API
 * @param {string} [params.accessToken] - Optional access token
 * @returns {Promise<Object>} - The insights data
 */
export const getInsights = async (params) => {
  try {
    const queryParams = {
      ad_account_id: params.adAccountId,
      date_preset: params.datePreset
    };
    
    // Add optional parameters if provided
    if (params.breakdown) {
      queryParams.breakdown = params.breakdown;
    }
    
    if (params.forceRefresh) {
      queryParams.force_refresh = true;
    }
    
    if (params.accessToken) {
      queryParams.access_token = params.accessToken;
    }
    
    const response = await api.get('/api/analytics/insights', { params: queryParams });
    return response.data;
  } catch (error) {
    let errorMsg = 'Failed to load analytics data';
    if (error.response && error.response.data && error.response.data.error) {
      errorMsg = error.response.data.error;
    } else if (error.message) {
      errorMsg = error.message;
    }
    // Optionally, you could use a toast here, but let the caller handle it
    throw new Error(errorMsg);
  }
};

/**
 * Get available ad accounts
 * @returns {Promise<Object>} - The ad accounts data
 */
export const getAdAccounts = async () => {
  try {
    const response = await api.get('/api/analytics/ad-accounts');
    return response.data;
  } catch (error) {
    let errorMsg = 'Failed to load ad accounts';
    if (error.response && error.response.data && error.response.data.error) {
      errorMsg = error.response.data.error;
    } else if (error.message) {
      errorMsg = error.message;
    }
    throw new Error(errorMsg);
  }
};

/**
 * Generate export URL for insights CSV
 * @param {Object} params - Query parameters
 * @param {string} params.adAccountId - Ad account ID
 * @param {string} params.datePreset - Date preset
 * @param {string} [params.breakdown] - Optional breakdown parameter
 * @returns {string} - The export URL
 */
export const getExportUrl = (params) => {
  const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  const token = localStorage.getItem('token');
  
  // Build query string
  const queryParams = new URLSearchParams({
    ad_account_id: params.adAccountId,
    date_preset: params.datePreset
  });
  
  if (params.breakdown) {
    queryParams.append('breakdown', params.breakdown);
  }
  
  // Return the full URL
  return `${baseUrl}/api/analytics/export?${queryParams.toString()}&token=${token}`;
};

/**
 * Get available Facebook pages
 * @returns {Promise<Object>} - The pages data
 */
export const getPages = async () => {
  try {
    const response = await api.get('/api/analytics/pages');
    return response.data;
  } catch (error) {
    let errorMsg = 'Failed to load pages';
    if (error.response && error.response.data && error.response.data.error) {
      errorMsg = error.response.data.error;
    } else if (error.message) {
      errorMsg = error.message;
    }
    throw new Error(errorMsg);
  }
};

/**
 * Get ad accounts for a specific page
 * @param {string} pageId - The page ID
 * @returns {Promise<Object>} - The ad accounts data
 */
export const getAdAccountsByPage = async (pageId) => {
  try {
    const response = await api.get('/api/analytics/ad-accounts-by-page', {
      params: { pageId }
    });
    return response.data;
  } catch (error) {
    let errorMsg = 'Failed to load ad accounts for page';
    if (error.response && error.response.data && error.response.data.error) {
      errorMsg = error.response.data.error;
    } else if (error.message) {
      errorMsg = error.message;
    }
    throw new Error(errorMsg);
  }
};

const analyticsService = {
  getInsights,
  getAdAccounts,
  getPages,
  getAdAccountsByPage,
  getExportUrl
};

export default analyticsService; 