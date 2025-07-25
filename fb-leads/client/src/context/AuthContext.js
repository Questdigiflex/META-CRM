import React, { createContext, useState, useContext, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is logged in on page load
  useEffect(() => {
    const checkLoggedIn = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          setLoading(false);
          return;
        }
        
        // Set default headers for all requests
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Get user profile
        const response = await api.get('/api/auth/profile');
        
        if (response.data.success) {
          setUser(response.data.data);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        // Clear invalid token
        localStorage.removeItem('token');
        api.defaults.headers.common['Authorization'] = '';
      } finally {
        setLoading(false);
      }
    };

    checkLoggedIn();
  }, []);

  // Register user
  const register = async (userData) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Registering user:', userData.email);
      const response = await api.post('/api/auth/register', userData);
      
      if (response.data.success) {
        const { token, ...user } = response.data.data;
        
        // Save token to localStorage
        localStorage.setItem('token', token);
        
        // Set default headers for all requests
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Set user in state
        setUser(user);
        
        toast.success('Registration successful!');
        return true;
      } else {
        // Handle unexpected response format
        const errorMsg = 'Registration failed: Unexpected response format';
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      }
    } catch (error) {
      console.error('Registration error:', error);
      // Get detailed error message from response if available
      let errorMsg;
      if (error.response && error.response.data) {
        errorMsg = error.response.data.error || error.response.data.message || 'Registration failed';
      } else if (error.message) {
        errorMsg = `Registration failed: ${error.message}`;
      } else {
        errorMsg = 'Registration failed: Network error';
      }
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Logging in user:', credentials.email);
      const response = await api.post('/api/auth/login', credentials);
      
      if (response.data.success) {
        const { token, ...user } = response.data.data;
        
        // Save token to localStorage
        localStorage.setItem('token', token);
        
        // Set default headers for all requests
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Set user in state
        setUser(user);
        
        toast.success('Login successful!');
        return true;
      } else {
        // Handle unexpected response format
        const errorMsg = 'Login failed: Unexpected response format';
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      // Get detailed error message from response if available
      let errorMsg;
      if (error.response && error.response.data) {
        errorMsg = error.response.data.error || error.response.data.message || 'Login failed';
      } else if (error.message) {
        errorMsg = `Login failed: ${error.message}`;
      } else {
        errorMsg = 'Login failed: Network error';
      }
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = () => {
    // Remove token from localStorage
    localStorage.removeItem('token');
    
    // Remove Authorization header
    api.defaults.headers.common['Authorization'] = '';
    
    // Clear user from state
    setUser(null);
    
    toast.info('You have been logged out');
  };

  // Update access token
  const updateAccessToken = async (accessToken) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.put('/api/auth/access-token', { accessToken });
      
      if (response.data.success) {
        // Update user in state
        setUser(response.data.data);
        
        toast.success('Access token updated successfully!');
        return true;
      }
    } catch (error) {
      console.error('Update access token error:', error);
      const errorMsg = error.response?.data?.error || 'Failed to update access token';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    register,
    login,
    logout,
    updateAccessToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 