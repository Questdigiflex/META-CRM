import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import formService from '../services/formService';
import leadService from '../services/leadService';
import api from '../services/api';
import { 
  PlusIcon, 
  TrashIcon, 
  PencilIcon, 
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

const FormManagement = () => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editingForm, setEditingForm] = useState(null);
  const [apps, setApps] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [discovering, setDiscovering] = useState(false);
  const [pages, setPages] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [loadingPages, setLoadingPages] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Add a key to force refresh
  const [selectedPages, setSelectedPages] = useState([]); // Add state for selected pages
  
  const { 
    register, 
    handleSubmit, 
    reset,
    formState: { errors, isSubmitting } 
  } = useForm();

  const { 
    register: registerEdit, 
    handleSubmit: handleSubmitEdit, 
    reset: resetEdit,
    formState: { errors: errorsEdit } 
  } = useForm();

  // Fetch forms
  useEffect(() => {
    const fetchForms = async () => {
      try {
        setLoading(true);
        console.log('Fetching forms...');
        const response = await formService.getForms();
        console.log('Forms response:', response);
        
        if (response.success) {
          setForms(response.data);
        }
      } catch (error) {
        console.error('Error fetching forms:', error);
        toast.error('Failed to load forms');
      } finally {
        setLoading(false);
      }
    };

    fetchForms();
  }, [refreshKey]);

  // Fetch apps
  useEffect(() => {
    const fetchApps = async () => {
      try {
        setLoadingApps(true);
        console.log('Fetching Facebook apps...');
        const response = await api.get('/api/facebook/apps');
        console.log('Apps response:', response.data);
        
        if (response.data.success) {
          const appsList = response.data.data || [];
          
          // Ensure all apps have valid names
          const processedApps = appsList.map(app => {
            const processedApp = { ...app };
            
            // Ensure app has a name
            if (!processedApp.appName || processedApp.appName.trim() === '') {
              processedApp.appName = 'Facebook App';
            }
            
            return processedApp;
          });
          
          setApps(processedApps);
          
          // Set first app as selected if available and none is selected
          if (processedApps.length > 0 && !selectedAppId) {
            setSelectedAppId(processedApps[0]._id);
          }
        }
      } catch (error) {
        console.error('Error fetching Facebook apps:', error);
        toast.error('Failed to load Facebook apps');
      } finally {
        setLoadingApps(false);
      }
    };

    fetchApps();
  }, [refreshKey]);

  // Fetch pages when app is selected
  useEffect(() => {
    if (selectedAppId) {
      const fetchPages = async () => {
        try {
          setLoadingPages(true);
          setPages([]); // Clear previous pages
          setSelectedPages([]); // Clear selected pages when app changes
          console.log('Fetching pages for app:', selectedAppId);
          const response = await api.get('/api/facebook/pages', {
            params: { appId: selectedAppId }
          });
          console.log('Pages response:', response.data);
          
          if (response.data.success) {
            setPages(response.data.data || []);
          }
        } catch (error) {
          console.error('Error fetching pages:', error);
          toast.error('Failed to load Facebook pages');
        } finally {
          setLoadingPages(false);
        }
      };
      
      fetchPages();
    }
  }, [selectedAppId]);

  // Add form
  const onSubmit = async (data) => {
    try {
      console.log('Adding form:', data);
      const response = await formService.addForm(data);
      console.log('Add form response:', response);
      
      if (response.success) {
        toast.success('Form added successfully');
        setForms([...forms, response.data]);
        reset();
      }
    } catch (error) {
      console.error('Error adding form:', error);
      toast.error(error.response?.data?.error || 'Failed to add form');
    }
  };

  // Update form
  const onSubmitEdit = async (data) => {
    try {
      console.log('Updating form:', data);
      const response = await formService.updateForm(editingForm._id, data);
      console.log('Update form response:', response);
      
      if (response.success) {
        toast.success('Form updated successfully');
        
        // Update forms list
        setForms(forms.map(form => 
          form._id === editingForm._id ? response.data : form
        ));
        
        // Reset editing state
        setEditingForm(null);
        resetEdit();
      }
    } catch (error) {
      console.error('Error updating form:', error);
      toast.error(error.response?.data?.error || 'Failed to update form');
    }
  };

  // Delete form
  const handleDelete = async (formId) => {
    if (window.confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
      try {
        console.log('Deleting form:', formId);
        const response = await formService.deleteForm(formId);
        console.log('Delete form response:', response);
        
        if (response.success) {
          toast.success('Form deleted successfully');
          setForms(forms.filter(form => form._id !== formId));
        }
      } catch (error) {
        console.error('Error deleting form:', error);
        toast.error(error.response?.data?.error || 'Failed to delete form');
      }
    }
  };

  // Sync leads for a specific form
  const handleSyncForm = async (formId) => {
    try {
      setSyncing(formId);
      toast.info('Syncing leads for this form...');
      console.log('Syncing leads for form:', formId);
      
      const response = await leadService.fetchLeads(formId);
      console.log('Sync leads response:', response);
      
      if (response.success) {
        toast.success(`Successfully synced ${response.totalFetched} leads from Facebook`);
        
        // Update lastFetchedAt for the form
        setForms(forms.map(form => 
          form._id === formId ? { ...form, lastFetchedAt: new Date().toISOString() } : form
        ));
      }
    } catch (error) {
      console.error('Error syncing leads:', error);
      toast.error('Failed to sync leads from Facebook');
    } finally {
      setSyncing(false);
    }
  };

  // Discover forms
  const handleDiscoverForms = async () => {
    if (!selectedAppId) {
      toast.error('Please select a Facebook app first');
      return;
    }
    
    if (selectedPages.length === 0) {
      toast.error('Please select at least one page to discover forms from');
      return;
    }
    
    try {
      setDiscovering(true);
      toast.info('Discovering forms from selected Facebook pages...');
      console.log('Discovering forms for app:', selectedAppId, 'from pages:', selectedPages);
      console.log('Page IDs being sent:', selectedPages.join(','));
      
      const response = await api.get('/api/facebook/discover', {
        params: { 
          appId: selectedAppId,
          pageIds: selectedPages.join(',')
        }
      });
      console.log('Discover forms response:', response.data);
      
      if (response.data.success) {
        toast.success(`Successfully discovered ${response.data.forms} forms from ${response.data.pages} pages, added ${response.data.newForms} new forms`);
        
        // Log debug information
        if (response.data.debug) {
          console.log('Debug info:', response.data.debug);
        }
        
        // Refresh forms list
        setRefreshKey(prevKey => prevKey + 1);
      }
    } catch (error) {
      console.error('Error discovering forms:', error);
      toast.error(error.response?.data?.error || 'Failed to discover forms');
    } finally {
      setDiscovering(false);
    }
  };

  // Handle page selection
  const handlePageSelection = (pageId) => {
    console.log('Page selection changed for pageId:', pageId);
    setSelectedPages(prev => {
      const newSelection = prev.includes(pageId) 
        ? prev.filter(id => id !== pageId)
        : [...prev, pageId];
      console.log('Updated selected pages:', newSelection);
      return newSelection;
    });
  };

  // Select all pages
  const handleSelectAllPages = () => {
    const allPageIds = pages.map(page => page.pageId);
    console.log('Selecting all pages:', allPageIds);
    setSelectedPages(allPageIds);
  };

  // Deselect all pages
  const handleDeselectAllPages = () => {
    setSelectedPages([]);
  };

  // Start editing a form
  const handleEdit = (form) => {
    setEditingForm(form);
    resetEdit({
      formName: form.formName,
      isActive: form.isActive
    });
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingForm(null);
    resetEdit();
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Group forms by page
  const formsByPage = forms.reduce((acc, form) => {
    const pageName = form.pageName || 'Unknown Page';
    if (!acc[pageName]) {
      acc[pageName] = [];
    }
    acc[pageName].push(form);
    return acc;
  }, {});

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Form Management</h1>
        
        {/* Auto-discover Forms Section */}
        <div className="mt-6 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
          <div className="md:grid md:grid-cols-3 md:gap-6">
            <div className="md:col-span-1">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Discover Forms</h3>
              <p className="mt-1 text-sm text-gray-500">
                Automatically discover lead forms from your selected Facebook pages. Choose which pages you want to scan for forms.
              </p>
            </div>
            <div className="mt-5 md:mt-0 md:col-span-2">
              <div className="space-y-4">
                <div>
                  <label htmlFor="appId" className="block text-sm font-medium text-gray-700">
                    Select Facebook App
                  </label>
                  <div className="mt-1">
                    {loadingApps ? (
                      <div className="animate-pulse h-10 bg-gray-200 rounded"></div>
                    ) : (
                      <select
                        id="appId"
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                        value={selectedAppId}
                        onChange={(e) => setSelectedAppId(e.target.value)}
                      >
                        <option value="">Select an app</option>
                        {apps.map(app => (
                          <option key={app._id} value={app._id}>
                            {app.appName || 'Facebook App'}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  {apps.length === 0 && !loadingApps && (
                    <p className="mt-2 text-sm text-red-600">
                      No Facebook apps found. Please add an access token in the Settings page first.
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Select Pages for Form Discovery
                  </label>
                  <div className="mt-1">
                    {loadingPages ? (
                      <div className="animate-pulse h-20 bg-gray-200 rounded"></div>
                    ) : pages.length > 0 ? (
                      <div className="border border-gray-300 rounded-md p-2 max-h-40 overflow-y-auto">
                        <div className="mb-2 flex space-x-2">
                          <button
                            type="button"
                            onClick={handleSelectAllPages}
                            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            Select All
                          </button>
                          <button
                            type="button"
                            onClick={handleDeselectAllPages}
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          >
                            Deselect All
                          </button>
                          <span className="text-xs text-gray-500 ml-2">
                            {selectedPages.length} of {pages.length} selected
                          </span>
                        </div>
                        <ul className="divide-y divide-gray-200">
                          {pages.map(page => (
                            <li key={page.pageId} className="py-2">
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  id={`page-${page.pageId}`}
                                  checked={selectedPages.includes(page.pageId)}
                                  onChange={() => handlePageSelection(page.pageId)}
                                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                />
                                <label htmlFor={`page-${page.pageId}`} className="ml-3 cursor-pointer">
                                  <p className="text-sm font-medium text-gray-900">{page.name}</p>
                                  <p className="text-xs text-gray-500">{page.category}</p>
                                </label>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : selectedAppId ? (
                      <p className="text-sm text-gray-500">No pages found for this app.</p>
                    ) : (
                      <p className="text-sm text-gray-500">Select an app to see available pages.</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <button
                    type="button"
                    onClick={handleDiscoverForms}
                    disabled={!selectedAppId || selectedPages.length === 0 || discovering}
                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                      !selectedAppId || selectedPages.length === 0 || discovering ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {discovering ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Discovering Forms...
                      </>
                    ) : (
                      <>
                        <MagnifyingGlassIcon className="-ml-1 mr-2 h-5 w-5" />
                        Discover Forms from Selected Pages
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Add Form Section */}
        <div className="mt-8 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
          <div className="md:grid md:grid-cols-3 md:gap-6">
            <div className="md:col-span-1">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Add Facebook Form Manually</h3>
              <p className="mt-1 text-sm text-gray-500">
                Add a Facebook Lead form to fetch leads from. You can find the Form ID in your Facebook Page's Publishing Tools.
              </p>
            </div>
            <div className="mt-5 md:mt-0 md:col-span-2">
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-4">
                    <label htmlFor="formId" className="block text-sm font-medium text-gray-700">
                      Form ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="formId"
                      className={`mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md ${
                        errors.formId ? 'border-red-300' : ''
                      }`}
                      placeholder="e.g. 123456789012345"
                      {...register('formId', { 
                        required: 'Form ID is required' 
                      })}
                    />
                    {errors.formId && (
                      <p className="mt-1 text-sm text-red-600">{errors.formId.message}</p>
                    )}
                  </div>
                  
                  <div className="col-span-6 sm:col-span-4">
                    <label htmlFor="formName" className="block text-sm font-medium text-gray-700">
                      Form Name (Optional)
                    </label>
                    <input
                      type="text"
                      id="formName"
                      className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      placeholder="e.g. Contact Form"
                      {...register('formName')}
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-4">
                    <label htmlFor="facebookAppId" className="block text-sm font-medium text-gray-700">
                      Facebook App
                    </label>
                    <select
                      id="facebookAppId"
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                      {...register('facebookAppId')}
                    >
                      <option value="">Select an app (optional)</option>
                      {apps.map(app => (
                        <option key={app._id} value={app._id}>
                          {app.appName || 'Facebook App'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="mt-5">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                    Add Form
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        
        {/* Forms List */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900">Your Forms</h2>
          
          <div className="mt-4 bg-white shadow overflow-hidden sm:rounded-lg">
            {loading ? (
              <div className="p-4 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
              </div>
            ) : forms.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {Object.entries(formsByPage).map(([pageName, pageForms]) => (
                  <div key={pageName} className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      {pageName}
                    </h3>
                    <ul className="space-y-4">
                      {pageForms.map((form) => (
                        <li key={form._id} className="bg-gray-50 rounded-lg p-4 shadow-sm">
                          {editingForm && editingForm._id === form._id ? (
                            <div className="px-4 py-4 sm:px-6">
                              <form onSubmit={handleSubmitEdit(onSubmitEdit)}>
                                <div className="grid grid-cols-6 gap-4">
                                  <div className="col-span-6 sm:col-span-3">
                                    <label htmlFor="edit-formName" className="block text-sm font-medium text-gray-700">
                                      Form Name
                                    </label>
                                    <input
                                      type="text"
                                      id="edit-formName"
                                      className={`mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md ${
                                        errorsEdit.formName ? 'border-red-300' : ''
                                      }`}
                                      {...registerEdit('formName')}
                                    />
                                  </div>
                                  
                                  <div className="col-span-6 sm:col-span-3 flex items-center">
                                    <div className="flex items-center h-5">
                                      <input
                                        id="edit-isActive"
                                        type="checkbox"
                                        className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                                        {...registerEdit('isActive')}
                                      />
                                    </div>
                                    <div className="ml-3 text-sm">
                                      <label htmlFor="edit-isActive" className="font-medium text-gray-700">
                                        Active
                                      </label>
                                      <p className="text-gray-500">Inactive forms won't be synced automatically</p>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="mt-4 flex space-x-2">
                                  <button
                                    type="submit"
                                    className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                  >
                                    <CheckIcon className="-ml-1 mr-2 h-5 w-5" />
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelEdit}
                                    className="inline-flex justify-center items-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                  >
                                    <XMarkIcon className="-ml-1 mr-2 h-5 w-5" />
                                    Cancel
                                  </button>
                                </div>
                              </form>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center">
                                  <h4 className="text-sm font-medium text-gray-900">
                                    {form.formName || 'Unnamed Form'}
                                  </h4>
                                  {form.isActive ? (
                                    <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                      Active
                                    </span>
                                  ) : (
                                    <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                      Inactive
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 text-sm text-gray-500">
                                  ID: {form.formId}
                                </div>
                                <div className="mt-1 text-sm text-gray-500">
                                  Last synced: {formatDate(form.lastFetchedAt)}
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleSyncForm(form._id)}
                                  disabled={syncing === form._id}
                                  className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                  title="Sync Leads"
                                >
                                  <ArrowPathIcon className={`h-5 w-5 ${syncing === form._id ? 'animate-spin' : ''}`} />
                                </button>
                                <button
                                  onClick={() => handleEdit(form)}
                                  className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                  title="Edit Form"
                                >
                                  <PencilIcon className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(form._id)}
                                  className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                  title="Delete Form"
                                >
                                  <TrashIcon className="h-5 w-5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">
                No forms added yet. Use the form above to add Facebook Lead forms or click "Discover Forms" to find them automatically.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormManagement; 