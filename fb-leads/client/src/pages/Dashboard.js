import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import formService from '../services/formService';
import leadService from '../services/leadService';
import { toast } from 'react-toastify';
import { 
  ArrowPathIcon, 
  DocumentTextIcon, 
  DocumentDuplicateIcon,
  ChartBarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

// Stats card component
const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white overflow-hidden shadow rounded-lg">
    <div className="p-5">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd>
              <div className="text-lg font-medium text-gray-900">{value}</div>
            </dd>
          </dl>
        </div>
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalLeads: 0,
    totalForms: 0,
    recentLeads: 0,
    conversionRate: 0
  });
  const [forms, setForms] = useState([]);
  const [recentLeads, setRecentLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch forms
        const formsResponse = await formService.getForms();
        if (formsResponse.success) {
          setForms(formsResponse.data);
        }
        
        // Fetch recent leads
        const leadsResponse = await leadService.getLeads({ 
          page: 1, 
          limit: 5 
        });
        
        if (leadsResponse.success) {
          setRecentLeads(leadsResponse.data);
          
          // Calculate stats
          setStats({
            totalLeads: leadsResponse.total || 0,
            totalForms: formsResponse.count || 0,
            recentLeads: leadsResponse.data.filter(lead => {
              const leadDate = new Date(lead.createdTime);
              const today = new Date();
              const yesterday = new Date(today);
              yesterday.setDate(yesterday.getDate() - 1);
              return leadDate >= yesterday;
            }).length,
            conversionRate: leadsResponse.total > 0 
              ? Math.round((leadsResponse.data.filter(lead => lead.status === 'converted').length / leadsResponse.total) * 100) 
              : 0
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Handle manual sync
  const handleSync = async () => {
    try {
      setSyncing(true);
      toast.info('Syncing leads from Facebook...');
      
      const response = await leadService.fetchLeads();
      
      if (response.success) {
        toast.success(`Successfully synced ${response.totalFetched} leads from Facebook`);
        
        // Refresh dashboard data
        window.location.reload();
      }
    } catch (error) {
      console.error('Error syncing leads:', error);
      toast.error('Failed to sync leads from Facebook');
    } finally {
      setSyncing(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
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

        {/* Stats */}
        <div className="mt-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard 
              title="Total Leads" 
              value={loading ? '...' : stats.totalLeads} 
              icon={DocumentTextIcon} 
              color="text-blue-500" 
            />
            <StatCard 
              title="Active Forms" 
              value={loading ? '...' : stats.totalForms} 
              icon={DocumentDuplicateIcon} 
              color="text-green-500" 
            />
            <StatCard 
              title="Leads (24h)" 
              value={loading ? '...' : stats.recentLeads} 
              icon={ClockIcon} 
              color="text-yellow-500" 
            />
            <StatCard 
              title="Conversion Rate" 
              value={loading ? '...' : `${stats.conversionRate}%`} 
              icon={ChartBarIcon} 
              color="text-purple-500" 
            />
          </div>
        </div>

        {/* Recent Leads */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Recent Leads</h2>
            <Link
              to="/leads"
              className="text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              View all
            </Link>
          </div>
          
          <div className="mt-4 bg-white shadow overflow-hidden sm:rounded-md">
            {loading ? (
              <div className="p-4 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
              </div>
            ) : recentLeads.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {recentLeads.map((lead) => (
                  <li key={lead._id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold">
                              {lead.fullName?.charAt(0) || 'L'}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {lead.fullName || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {lead.email || 'No email'}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="text-sm text-gray-500">
                            {formatDate(lead.createdTime)}
                          </div>
                          <div className="mt-1">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                              lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                              lead.status === 'qualified' ? 'bg-green-100 text-green-800' :
                              lead.status === 'converted' ? 'bg-purple-100 text-purple-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {lead.status || 'new'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 text-center text-gray-500">
                No leads found. Click "Sync Leads" to fetch leads from Facebook.
              </div>
            )}
          </div>
        </div>

        {/* Forms */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Active Forms</h2>
            <Link
              to="/forms"
              className="text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              Manage forms
            </Link>
          </div>
          
          <div className="mt-4 bg-white shadow overflow-hidden sm:rounded-md">
            {loading ? (
              <div className="p-4 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
              </div>
            ) : forms.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {forms.map((form) => (
                  <li key={form._id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {form.formName || 'Unnamed Form'}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {form.formId}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {form.lastFetchedAt ? (
                            <span>Last synced: {formatDate(form.lastFetchedAt)}</span>
                          ) : (
                            <span>Never synced</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 text-center text-gray-500">
                No forms added yet. Go to "Forms" to add Facebook Lead forms.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 