import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Settings = () => {
  const { user, updateAccessToken } = useAuth();
  const [showToken, setShowToken] = useState(false);
  const [showAppSecret, setShowAppSecret] = useState(false);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [tokenSaving, setTokenSaving] = useState(false);
  const [appCredentialsSaving, setAppCredentialsSaving] = useState(false);
  const [appCredentialsStatus, setAppCredentialsStatus] = useState('');
  const [refreshKey, setRefreshKey] = useState(0); // Add a key to force refresh
  
  const { 
    register, 
    handleSubmit, 
    reset,
    formState: { errors, isSubmitting } 
  } = useForm({
    defaultValues: {
      accessToken: '',
      appName: ''
    }
  });

  // Fetch apps on component mount and when refreshKey changes
  useEffect(() => {
    const fetchApps = async () => {
      try {
        setLoading(true);
        console.log('Fetching Facebook apps...');
        const response = await api.get('/api/facebook/apps');
        console.log('Apps response:', response.data);
        if (response.data.success) {
          // Ensure all apps have valid _id fields and names
          const processedApps = (response.data.data || []).map(app => {
            const processedApp = { ...app };
            
            // Ensure app has an ID
            if (!processedApp._id) {
              console.warn('App missing _id, generating temporary one:', app);
              processedApp._id = `temp_${Math.random().toString(36).substring(2, 9)}`;
            }
            
            // Ensure app has a name
            if (!processedApp.appName || processedApp.appName.trim() === '') {
              processedApp.appName = 'Facebook App';
            }
            
            return processedApp;
          });
          console.log('Processed apps:', processedApps);
          setApps(processedApps);
        }
      } catch (error) {
        console.error('Error fetching Facebook apps:', error);
        toast.error('Failed to load Facebook apps');
      } finally {
        setLoading(false);
      }
    };

    fetchApps();
  }, [refreshKey]); // Depend on refreshKey to trigger refetch
  
  // Fetch app credentials on component mount
  useEffect(() => {
    const fetchAppCredentials = async () => {
      try {
        const response = await api.get('/api/facebook/app-credentials');
        if (response.data.success) {
          // Set form values if available
          if (response.data.facebookAppId) {
            reset({
              ...getValues(),
              facebookAppId: response.data.facebookAppId
            });
          }
        }
      } catch (error) {
        console.error('Error fetching app credentials:', error);
      }
    };
    
    fetchAppCredentials();
  }, []);

  const onSubmit = async (data) => {
    try {
      // Validate token format
      if (!data.accessToken || data.accessToken.trim().length < 20) {
        toast.error('Please enter a valid Facebook access token');
        return;
      }
      
      setTokenSaving(true);
      
      // Ensure we have an app name - never send empty string or undefined
      const appName = data.appName && data.appName.trim() 
        ? data.appName.trim() 
        : `Facebook App ${new Date().toLocaleTimeString()}`;
      
      console.log('Saving token with name:', appName);
      
      const payload = {
        accessToken: data.accessToken.trim(),
        appName: appName
      };
      
      console.log('Sending payload to server:', payload);
      
      const response = await api.post('/api/facebook/token', payload);
      
      console.log('Token save response:', response.data);
      
      if (response.data.success) {
        toast.success('Access token saved successfully');
        
        // Reset form
        reset({
          accessToken: '',
          appName: ''
        });
        
        // Force refresh of apps list
        setRefreshKey(prevKey => prevKey + 1);
      }
    } catch (error) {
      console.error('Error saving access token:', error);
      let errorMessage = 'Failed to save access token';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setTokenSaving(false);
    }
  };
  
  const onSubmitAppCredentials = async (data) => {
    try {
      setAppCredentialsSaving(true);
      setAppCredentialsStatus('');
      
      // Prepare payload
      const payload = {};
      
      if (data.facebookAppId) {
        payload.facebookAppId = data.facebookAppId.trim();
      }
      
      if (data.facebookAppSecret) {
        payload.facebookAppSecret = data.facebookAppSecret.trim();
      }
      
      // Only proceed if we have at least one field
      if (!payload.facebookAppId && !payload.facebookAppSecret) {
        toast.error('Please enter at least one credential');
        setAppCredentialsSaving(false);
        return;
      }
      
      console.log('Saving app credentials...');
      
      const response = await api.post('/api/facebook/app-credentials', payload);
      
      if (response.data.success) {
        toast.success('Facebook App credentials saved successfully');
        setAppCredentialsStatus('Credentials saved successfully');
        
        // Clear the app secret field for security
        reset({
          ...getValues(),
          facebookAppSecret: ''
        });
      }
    } catch (error) {
      console.error('Error saving app credentials:', error);
      let errorMessage = 'Failed to save app credentials';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setAppCredentialsSaving(false);
    }
  };

  const handleConvertToken = async (appId) => {
    try {
      if (!appId) {
        toast.error('Invalid app ID');
        return;
      }
      
      setConverting(appId);
      console.log('Converting token for app ID:', appId);
      const response = await api.post('/api/facebook/token/exchange', { appId });
      
      if (response.data.success) {
        toast.success('Token successfully converted to long-lived token');
        
        // Force refresh of apps list
        setRefreshKey(prevKey => prevKey + 1);
      }
    } catch (error) {
      console.error('Error converting token:', error);
      let errorMessage = 'Failed to convert token';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setConverting(null);
    }
  };

  const handleDeleteApp = async (appId) => {
    if (!appId) {
      toast.error('Invalid app ID');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this app? This will remove the access token and all associated data.')) {
      try {
        setDeleting(appId);
        
        // Make sure appId is a string
        const appIdString = String(appId);
        console.log('Deleting app with ID:', appIdString);
        
        // Log the app being deleted for debugging
        const appToDelete = apps.find(app => app._id === appIdString);
        console.log('App being deleted:', appToDelete ? {
          _id: appToDelete._id,
          appName: appToDelete.appName,
          tokenType: appToDelete.tokenType
        } : 'App not found');
        
        const response = await api.delete(`/api/facebook/apps/${appIdString}`);
        
        if (response.data.success) {
          toast.success('Facebook app deleted successfully');
          
          // Remove the app from local state immediately
          setApps(prevApps => prevApps.filter(app => app._id !== appIdString));
          
          // Force refresh of apps list
          setRefreshKey(prevKey => prevKey + 1);
        }
      } catch (error) {
        console.error('Error deleting app:', error);
        let errorMessage = 'Failed to delete app';
        
        if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        toast.error(errorMessage);
      } finally {
        setDeleting(null);
      }
    }
  };

  const handleDeleteAppDirect = async (appId) => {
    if (!appId) {
      toast.error('Invalid app ID');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this app? This will remove the access token and all associated data.')) {
      try {
        setDeleting(appId);
        
        // Make sure appId is a string
        const appIdString = String(appId);
        console.log('Deleting app with direct method, ID:', appIdString);
        
        // Log the app being deleted for debugging
        const appToDelete = apps.find(app => app._id === appIdString);
        console.log('App being deleted (direct):', appToDelete ? {
          _id: appToDelete._id,
          appName: appToDelete.appName,
          tokenType: appToDelete.tokenType
        } : 'App not found');
        
        const response = await api.delete(`/api/facebook/apps/direct/${appIdString}`);
        
        if (response.data.success) {
          toast.success('Facebook app deleted successfully (direct method)');
          
          // Remove the app from local state immediately
          setApps(prevApps => prevApps.filter(app => app._id !== appIdString));
          
          // Force refresh of apps list
          setRefreshKey(prevKey => prevKey + 1);
        }
      } catch (error) {
        console.error('Error deleting app (direct):', error);
        let errorMessage = 'Failed to delete app';
        
        if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        toast.error(errorMessage);
      } finally {
        setDeleting(null);
      }
    }
  };

  const toggleShowToken = () => {
    setShowToken(!showToken);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'No expiration';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Mask token for display
  const maskToken = (token) => {
    if (!token) return '';
    if (token.length <= 8) return token;
    return `${token.substring(0, 8)}...${token.substring(token.length - 4)}`;
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        
        {/* Facebook Apps Section */}
        <div className="mt-6 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
          <div className="md:grid md:grid-cols-3 md:gap-6">
            <div className="md:col-span-1">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Facebook Apps</h3>
              <p className="mt-1 text-sm text-gray-500">
                Manage your Facebook apps and access tokens. You can add multiple apps to fetch leads from different Facebook accounts.
              </p>
              <div className="mt-4 text-sm">
                <a 
                  href="https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-500"
                >
                  How to get a long-lived access token
                </a>
              </div>
            </div>
            <div className="mt-5 md:mt-0 md:col-span-2">
              {/* Add new token form */}
              <form onSubmit={handleSubmit(onSubmit)} className="mb-8 border-b border-gray-200 pb-8">
                <h4 className="text-md font-medium text-gray-900 mb-4">Add New Access Token</h4>
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="appName" className="block text-sm font-medium text-gray-700">
                      App Name (Optional)
                    </label>
                    <input
                      type="text"
                      id="appName"
                      className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      placeholder="e.g. Marketing App"
                      {...register('appName')}
                    />
                  </div>
                  
                  <div className="col-span-6">
                    <label htmlFor="accessToken" className="block text-sm font-medium text-gray-700">
                      Access Token
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <input
                        type={showToken ? 'text' : 'password'}
                        id="accessToken"
                        className={`block w-full pr-16 sm:text-sm rounded-md ${
                          errors.accessToken
                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                            : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                        }`}
                        placeholder="Enter your Facebook access token"
                        {...register('accessToken', { 
                          required: 'Access token is required' 
                        })}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center">
                        <button
                          type="button"
                          onClick={toggleShowToken}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 mr-2"
                        >
                          {showToken ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>
                    {errors.accessToken && (
                      <p className="mt-2 text-sm text-red-600">{errors.accessToken.message}</p>
                    )}
                    <p className="mt-2 text-sm text-gray-500">
                      This token will be securely stored and used to fetch leads from Facebook.
                    </p>
                  </div>
                </div>
                
                <div className="mt-5">
                  <button
                    type="submit"
                    disabled={isSubmitting || tokenSaving}
                    className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                      (isSubmitting || tokenSaving) ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {tokenSaving ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : 'Save Token'}
                  </button>
                </div>
              </form>
              
              {/* Apps list */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Your Facebook Apps</h4>
                
                {loading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
                  </div>
                ) : apps && apps.length > 0 ? (
                  <div className="space-y-4">
                    {apps.map(app => {
                      // Ensure we have a valid ID for this app
                      const appId = app._id;
                      
                      // Log app details for debugging
                      console.log('App details:', {
                        id: appId,
                        name: app.appName,
                        type: app.tokenType
                      });
                      
                      return (
                        <div key={appId} className="border border-gray-200 rounded-md p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="text-sm font-medium text-gray-900">
                                {app.appName || 'Facebook App'}
                              </h5>
                              <p className="mt-1 text-xs text-gray-500">Token: {showToken ? app.accessToken : maskToken(app.accessToken)}</p>
                              <div className="mt-1 flex items-center">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  app.tokenType === 'long_lived' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {app.tokenType === 'long_lived' ? 'Long-lived Token' : 'Short-lived Token'}
                                </span>
                                {app.expiresAt && (
                                  <span className="ml-2 text-xs text-gray-500">
                                    Expires: {formatDate(app.expiresAt)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              {app.tokenType !== 'long_lived' && (
                                <button
                                  onClick={() => handleConvertToken(appId)}
                                  disabled={converting === appId}
                                  className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                                    converting === appId ? 'opacity-70 cursor-not-allowed' : ''
                                  }`}
                                >
                                  {converting === appId ? (
                                    <>
                                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      Converting...
                                    </>
                                  ) : 'Convert to Long-lived'}
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  console.log('Delete button clicked for app:', {
                                    id: appId,
                                    name: app.appName
                                  });
                                  handleDeleteApp(appId);
                                }}
                                disabled={deleting === appId}
                                className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                                  deleting === appId ? 'opacity-70 cursor-not-allowed' : ''
                                }`}
                              >
                                {deleting === appId ? (
                                  <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Deleting...
                                  </>
                                ) : 'Delete'}
                              </button>
                              <button
                                onClick={() => {
                                  console.log('Direct delete button clicked for app:', {
                                    id: appId,
                                    name: app.appName
                                  });
                                  handleDeleteAppDirect(appId);
                                }}
                                disabled={deleting === appId}
                                className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${
                                  deleting === appId ? 'opacity-70 cursor-not-allowed' : ''
                                }`}
                                title="Alternative deletion method"
                              >
                                {deleting === appId ? (
                                  <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Deleting...
                                  </>
                                ) : 'Delete Alt'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No Facebook apps added yet. Use the form above to add a new access token.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Facebook App Credentials */}
        <div className="mt-8 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
          <div className="md:grid md:grid-cols-3 md:gap-6">
            <div className="md:col-span-1">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Facebook App Credentials</h3>
              <p className="mt-1 text-sm text-gray-500">
                Enter your Facebook App ID and App Secret to generate long-lived tokens. These are optional but recommended.
              </p>
            </div>
            <div className="mt-5 md:mt-0 md:col-span-2">
              <form onSubmit={handleSubmit(onSubmitAppCredentials)} className="space-y-6">
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="facebookAppId" className="block text-sm font-medium text-gray-700">
                      Facebook App ID
                    </label>
                    <input
                      type="text"
                      id="facebookAppId"
                      className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      placeholder="Enter your Facebook App ID"
                      {...register('facebookAppId')}
                    />
                  </div>
                  
                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="facebookAppSecret" className="block text-sm font-medium text-gray-700">
                      Facebook App Secret
                    </label>
                    <input
                      type={showAppSecret ? 'text' : 'password'}
                      id="facebookAppSecret"
                      className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      placeholder="Enter your Facebook App Secret"
                      {...register('facebookAppSecret')}
                    />
                    <div className="mt-1 flex items-center">
                      <button
                        type="button"
                        onClick={() => setShowAppSecret(!showAppSecret)}
                        className="text-xs text-primary-600 hover:text-primary-500"
                      >
                        {showAppSecret ? 'Hide Secret' : 'Show Secret'}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div>
                  <button
                    type="submit"
                    disabled={appCredentialsSaving}
                    className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                      appCredentialsSaving ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {appCredentialsSaving ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : 'Save Credentials'}
                  </button>
                  {appCredentialsStatus && (
                    <span className="ml-3 text-sm text-green-600">
                      {appCredentialsStatus}
                    </span>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
        
        {/* Account Information */}
        <div className="mt-8 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
          <div className="md:grid md:grid-cols-3 md:gap-6">
            <div className="md:col-span-1">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Account Information</h3>
              <p className="mt-1 text-sm text-gray-500">
                Your account details and information.
              </p>
            </div>
            <div className="mt-5 md:mt-0 md:col-span-2">
              <div className="grid grid-cols-6 gap-6">
                <div className="col-span-6 sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <div className="mt-1 py-2 px-3 bg-gray-50 border border-gray-300 rounded-md text-gray-900">
                    {user?.name || 'Not available'}
                  </div>
                </div>
                
                <div className="col-span-6 sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <div className="mt-1 py-2 px-3 bg-gray-50 border border-gray-300 rounded-md text-gray-900">
                    {user?.email || 'Not available'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Help & Resources */}
        <div className="mt-8 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Help & Resources</h3>
          <div className="mt-4 space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-primary-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-gray-900">Facebook Lead Ads Documentation</h4>
                <p className="mt-1 text-sm text-gray-500">
                  Learn more about Facebook Lead Ads and how to set them up.
                </p>
                <a 
                  href="https://www.facebook.com/business/help/1481110642181372" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex text-sm text-primary-600 hover:text-primary-500"
                >
                  View Documentation
                </a>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-primary-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-gray-900">Facebook Graph API</h4>
                <p className="mt-1 text-sm text-gray-500">
                  Technical documentation for the Facebook Graph API used to fetch leads.
                </p>
                <a 
                  href="https://developers.facebook.com/docs/graph-api/reference/form/leads" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex text-sm text-primary-600 hover:text-primary-500"
                >
                  View API Reference
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 