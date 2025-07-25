import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import leadService from '../services/leadService';
import formService from '../services/formService';
import {
  ArrowPathIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

const LeadsList = () => {
  const [leads, setLeads] = useState([]);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [totalLeads, setTotalLeads] = useState(0);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1
  });
  
  // Filters
  const [filters, setFilters] = useState({
    formId: '',
    pageId: '',
    status: '',
    dateRange: 'all',
    searchTerm: ''
  });
  
  // Pages list (extracted from forms)
  const [pages, setPages] = useState([]);
  
  // Status options
  const statusOptions = [
    { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-800' },
    { value: 'contacted', label: 'Contacted', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'qualified', label: 'Qualified', color: 'bg-green-100 text-green-800' },
    { value: 'converted', label: 'Converted', color: 'bg-purple-100 text-purple-800' },
    { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-800' }
  ];

  // Date range options
  const dateRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' }
  ];

  // Fetch leads
  const fetchLeads = async () => {
    try {
      setLoading(true);
      
      // Prepare filter parameters
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };
      
      const response = await leadService.getLeads(params);
      
      if (response.success) {
        setLeads(response.data);
        setTotalLeads(response.total || 0);
        setPagination(prev => ({
          ...prev,
          totalPages: Math.ceil((response.total || 0) / prev.limit)
        }));
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  // Fetch forms for filter
  const fetchForms = async () => {
    try {
      const response = await formService.getForms();
      if (response.success) {
        setForms(response.data);
        
        // Extract unique pages from forms
        const uniquePages = [...new Set(
          response.data
            .filter(form => form.pageId && form.pageName)
            .map(form => JSON.stringify({
              id: form.pageId,
              name: form.pageName
            }))
        )].map(page => JSON.parse(page));
        
        setPages(uniquePages);
      }
    } catch (error) {
      console.error('Error fetching forms:', error);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchForms();
  }, []);

  // Fetch leads when filters or pagination changes
  useEffect(() => {
    fetchLeads();
  }, [pagination.page, pagination.limit, filters]);

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page on filter change
  };

  // Handle status update
  const handleStatusUpdate = async (leadId, newStatus) => {
    try {
      const response = await leadService.updateLeadStatus(leadId, { status: newStatus });
      
      if (response.success) {
        toast.success('Lead status updated successfully');
        
        // Update local state
        setLeads(prevLeads => 
          prevLeads.map(lead => 
            lead._id === leadId ? { ...lead, status: newStatus } : lead
          )
        );
      }
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast.error('Failed to update lead status');
    }
  };

  // Handle manual sync
  const handleSync = async () => {
    try {
      setSyncing(true);
      toast.info('Syncing leads from Facebook...');
      
      const response = await leadService.fetchLeads(filters.formId || null, filters.pageId || null);
      
      if (response.success) {
        toast.success(`Successfully synced ${response.totalFetched} leads from Facebook`);
        fetchLeads(); // Refresh leads
      }
    } catch (error) {
      console.error('Error syncing leads:', error);
      toast.error('Failed to sync leads from Facebook');
    } finally {
      setSyncing(false);
    }
  };

  // Handle export
  const handleExport = () => {
    try {
      // Prepare export parameters (same as current filters)
      leadService.exportLeads(filters);
      toast.info('Preparing CSV export...');
    } catch (error) {
      console.error('Error exporting leads:', error);
      toast.error('Failed to export leads');
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Pagination controls
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  // Find form name by ID
  const getFormName = (formId) => {
    const form = forms.find(f => f.formId === formId);
    return form ? form.formName || formId : formId;
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Leads</h1>
          <div className="flex space-x-3">
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <ArrowDownTrayIcon className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
              Export CSV
            </button>
            <button
              onClick={handleSync}
              disabled={syncing}
              className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                syncing ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {syncing ? (
                <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-5 w-5" />
              ) : (
                <ArrowPathIcon className="-ml-1 mr-2 h-5 w-5" />
              )}
              Sync Leads
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-1">
              <label htmlFor="pageId" className="block text-sm font-medium text-gray-700">
                Page
              </label>
              <select
                id="pageId"
                name="pageId"
                value={filters.pageId}
                onChange={handleFilterChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value="">All Pages</option>
                {pages.map(page => (
                  <option key={page.id} value={page.id}>
                    {page.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-1">
              <label htmlFor="formId" className="block text-sm font-medium text-gray-700">
                Form
              </label>
              <select
                id="formId"
                name="formId"
                value={filters.formId}
                onChange={handleFilterChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value="">All Forms</option>
                {forms
                  .filter(form => !filters.pageId || form.pageId === filters.pageId)
                  .map(form => (
                    <option key={form._id} value={form.formId}>
                      {form.formName || form.formId}
                    </option>
                  ))}
              </select>
            </div>

            <div className="sm:col-span-1">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value="">All Status</option>
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-1">
              <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700">
                Date Range
              </label>
              <select
                id="dateRange"
                name="dateRange"
                value={filters.dateRange}
                onChange={handleFilterChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                {dateRangeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="searchTerm" className="block text-sm font-medium text-gray-700">
                Search
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="text"
                  name="searchTerm"
                  id="searchTerm"
                  value={filters.searchTerm}
                  onChange={handleFilterChange}
                  className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-3 pr-10 sm:text-sm border-gray-300 rounded-md"
                  placeholder="Name, email, phone..."
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <FunnelIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Leads Table */}
        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                        Lead
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Contact
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Source
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Campaign
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Date
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {loading ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
                          </div>
                        </td>
                      </tr>
                    ) : leads.length > 0 ? (
                      leads.map((lead) => (
                        <tr key={lead._id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                            <div className="flex items-center">
                              <div className="h-10 w-10 flex-shrink-0 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold">
                                {lead.fullName?.charAt(0) || 'L'}
                              </div>
                              <div className="ml-4">
                                <div className="font-medium text-gray-900">{lead.fullName || 'Unknown'}</div>
                                <div className="text-gray-500">ID: {lead.leadId}</div>
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            <div>{lead.email || 'No email'}</div>
                            <div>{lead.phone || 'No phone'}</div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            <div className="font-medium">{lead.pageName || 'Unknown Page'}</div>
                            <div>{lead.formName || getFormName(lead.formId)}</div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {lead.rawData?.campaignName || 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {formatDate(lead.createdTime)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            <select
                              value={lead.status}
                              onChange={(e) => handleStatusUpdate(lead._id, e.target.value)}
                              className={`rounded-md text-xs font-medium px-2 py-1 ${
                                statusOptions.find(s => s.value === lead.status)?.color || 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {statusOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <Link to={`/leads/${lead._id}`} className="text-primary-600 hover:text-primary-900">
                              <EyeIcon className="h-5 w-5" />
                              <span className="sr-only">View lead {lead._id}</span>
                            </Link>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                          No leads found. Try adjusting your filters or sync leads from Facebook.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Pagination */}
        {!loading && leads.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-md shadow">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 ${
                  pagination.page === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                }`}
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 ${
                  pagination.page === pagination.totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                }`}
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, totalLeads)}
                  </span>{' '}
                  of <span className="font-medium">{totalLeads}</span> results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 ${
                      pagination.page === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                  
                  {/* Page numbers */}
                  {[...Array(pagination.totalPages).keys()].map(i => {
                    const pageNum = i + 1;
                    // Show current page, first, last, and pages around current
                    if (
                      pageNum === 1 ||
                      pageNum === pagination.totalPages ||
                      (pageNum >= pagination.page - 1 && pageNum <= pagination.page + 1)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                            pageNum === pagination.page
                              ? 'bg-primary-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600'
                              : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    } else if (
                      (pageNum === 2 && pagination.page > 3) ||
                      (pageNum === pagination.totalPages - 1 && pagination.page < pagination.totalPages - 2)
                    ) {
                      return (
                        <span
                          key={pageNum}
                          className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300"
                        >
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                  
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 ${
                      pagination.page === pagination.totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">Next</span>
                    <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadsList; 