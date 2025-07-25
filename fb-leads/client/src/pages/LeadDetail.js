import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import leadService from '../services/leadService';
import {
  ArrowLeftIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const LeadDetail = () => {
  const { id } = useParams();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Status options
  const statusOptions = [
    { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-800' },
    { value: 'contacted', label: 'Contacted', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'qualified', label: 'Qualified', color: 'bg-green-100 text-green-800' },
    { value: 'converted', label: 'Converted', color: 'bg-purple-100 text-purple-800' },
    { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-800' }
  ];

  // Fetch lead data
  useEffect(() => {
    const fetchLead = async () => {
      try {
        setLoading(true);
        const response = await leadService.getLead(id);
        
        if (response.success) {
          setLead(response.data);
          setNotes(response.data.notes || '');
          setStatus(response.data.status || 'new');
        }
      } catch (error) {
        console.error('Error fetching lead:', error);
        toast.error('Failed to load lead data');
      } finally {
        setLoading(false);
      }
    };

    fetchLead();
  }, [id]);

  // Handle save changes
  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      
      const response = await leadService.updateLeadStatus(id, {
        status,
        notes
      });
      
      if (response.success) {
        toast.success('Lead updated successfully');
        setEditing(false);
        setLead({
          ...lead,
          status,
          notes
        });
      }
    } catch (error) {
      console.error('Error updating lead:', error);
      toast.error('Failed to update lead');
    } finally {
      setSaving(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Group field data by category
  const groupFieldData = (fieldData) => {
    if (!fieldData || !Array.isArray(fieldData)) return {};
    
    return fieldData.reduce((acc, field) => {
      const category = field.name.includes('_') ? field.name.split('_')[0] : 'other';
      
      if (!acc[category]) {
        acc[category] = [];
      }
      
      acc[category].push(field);
      return acc;
    }, {});
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/leads" className="mr-4">
              <ArrowLeftIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </Link>
            <h1 className="text-2xl font-semibold text-gray-900">Lead Details</h1>
          </div>
          
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <PencilIcon className="-ml-0.5 mr-2 h-4 w-4" />
              Edit Lead
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleSaveChanges}
                disabled={saving}
                className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                  saving ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-0.5 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckIcon className="-ml-0.5 mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setNotes(lead.notes || '');
                  setStatus(lead.status || 'new');
                }}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <XMarkIcon className="-ml-0.5 mr-2 h-4 w-4" />
                Cancel
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="mt-6 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : lead ? (
          <div className="mt-6 space-y-6">
            {/* Basic Info Card */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <div>
                  <h2 className="text-lg leading-6 font-medium text-gray-900">
                    {lead.fullName || 'Unnamed Lead'}
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    Lead ID: {lead.leadId}
                  </p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  statusOptions.find(s => s.value === lead.status)?.color || 'bg-gray-100 text-gray-800'
                }`}>
                  {statusOptions.find(s => s.value === lead.status)?.label || 'Unknown'}
                </span>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                <dl className="sm:divide-y sm:divide-gray-200">
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {lead.email || 'Not provided'}
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {lead.phone || 'Not provided'}
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Created</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {formatDate(lead.createdTime)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Source Info Card */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h2 className="text-lg leading-6 font-medium text-gray-900">
                  Source Information
                </h2>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                <dl className="sm:divide-y sm:divide-gray-200">
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Facebook Page</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {lead.pageName || 'Unknown'}
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Form</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {lead.formName || lead.formId}
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Campaign</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {lead.rawData?.campaignName || 'Not available'}
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Ad Set</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {lead.rawData?.adsetName || 'Not available'}
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Ad</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {lead.rawData?.adName || 'Not available'}
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Platform</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {lead.rawData?.platform || 'Not available'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Custom Fields Card */}
            {lead.fieldData && lead.fieldData.length > 0 && (
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h2 className="text-lg leading-6 font-medium text-gray-900">
                    Form Fields
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    All data submitted through the lead form.
                  </p>
                </div>
                <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                    {lead.fieldData.map((field, index) => (
                      <div key={index} className="border-b border-gray-200 pb-4 sm:pb-5">
                        <dt className="text-sm font-medium text-gray-500 capitalize">
                          {field.name.replace(/_/g, ' ')}
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {field.value || 'Not provided'}
                        </dd>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Status and Notes Card */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h2 className="text-lg leading-6 font-medium text-gray-900">
                  Status and Notes
                </h2>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                <div className="space-y-6">
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                      Status
                    </label>
                    {editing ? (
                      <select
                        id="status"
                        name="status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                      >
                        {statusOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          statusOptions.find(s => s.value === lead.status)?.color || 'bg-gray-100 text-gray-800'
                        }`}>
                          {statusOptions.find(s => s.value === lead.status)?.label || 'Unknown'}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                      Notes
                    </label>
                    {editing ? (
                      <div className="mt-1">
                        <textarea
                          id="notes"
                          name="notes"
                          rows={4}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          placeholder="Add notes about this lead..."
                        />
                      </div>
                    ) : (
                      <div className="mt-1 text-sm text-gray-900 border border-gray-200 rounded-md p-3 min-h-[100px] bg-gray-50">
                        {lead.notes || 'No notes added yet.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg p-6 text-center">
            <p className="text-gray-500">Lead not found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadDetail; 