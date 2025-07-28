import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import analyticsService from '../services/analyticsService';
import { toast } from 'react-toastify';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const Analytics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [adAccounts, setAdAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [datePreset, setDatePreset] = useState('last_7d');
  const [breakdown, setBreakdown] = useState('');
  const [insights, setInsights] = useState(null);
  const [accessToken, setAccessToken] = useState('');
  const [view, setView] = useState('table'); // 'table', 'spend', 'ctr'

  // Load ad accounts on component mount
  useEffect(() => {
    const fetchAdAccounts = async () => {
      try {
        setLoading(true);
        const response = await analyticsService.getAdAccounts();
        
        if (response.success && response.data) {
          setAdAccounts(response.data);
          
          // Set first account as default if available
          if (response.data.length > 0) {
            const accountId = response.data[0].id.replace('act_', '');
            setSelectedAccount(accountId);
          }
        }
      } catch (error) {
        console.error('Error fetching ad accounts:', error);
        toast.error('Failed to load ad accounts. Please check your Facebook connection.');
      } finally {
        setLoading(false);
      }
    };

    fetchAdAccounts();
  }, []);

  // Fetch insights when parameters change
  const fetchInsights = async () => {
    if (!selectedAccount || !datePreset) {
      toast.warning('Please select an ad account and date range');
      return;
    }

    try {
      setLoading(true);
      
      const params = {
        adAccountId: selectedAccount,
        datePreset,
        breakdown: breakdown || undefined,
        accessToken: accessToken || undefined
      };
      
      const response = await analyticsService.getInsights(params);
      
      if (response.success && response.data) {
        setInsights(response.data);
        toast.success('Analytics data loaded successfully');
      } else {
        toast.error('Failed to load analytics data');
      }
    } catch (error) {
      console.error('Error fetching insights:', error);
      
      // Handle specific error messages
      const errorMessage = error.response?.data?.error || 'Failed to load analytics data';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle export click
  const handleExport = () => {
    if (!selectedAccount || !datePreset) {
      toast.warning('Please select an ad account and date range');
      return;
    }

    const exportUrl = analyticsService.getExportUrl({
      adAccountId: selectedAccount,
      datePreset,
      breakdown: breakdown || undefined
    });

    // Open export URL in new tab
    window.open(exportUrl, '_blank');
  };

  // Prepare data for charts
  const prepareChartData = () => {
    if (!insights || !insights.data || !Array.isArray(insights.data)) {
      return [];
    }

    return insights.data.map(item => ({
      name: item.campaign_name || item.ad_name || 'Unknown',
      spend: parseFloat(item.spend || 0),
      clicks: parseInt(item.clicks || 0, 10),
      impressions: parseInt(item.impressions || 0, 10),
      ctr: parseFloat(item.ctr || 0) * 100, // Convert to percentage
      cpc: parseFloat(item.cpc || 0),
      reach: parseInt(item.reach || 0, 10)
    }));
  };

  const chartData = prepareChartData();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Facebook Ads Analytics</h1>

      {/* Filter Controls */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Ad Account Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ad Account
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              disabled={loading}
            >
              <option value="">Select Ad Account</option>
              {adAccounts.map((account) => (
                <option 
                  key={account.id} 
                  value={account.id.replace('act_', '')}
                >
                  {account.name || account.id}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              disabled={loading}
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last_7d">Last 7 Days</option>
              <option value="last_30d">Last 30 Days</option>
              <option value="last_90d">Last 90 Days</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
            </select>
          </div>

          {/* Breakdown Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Breakdown
              <span title="Break down results by demographic or platform (e.g., gender, age, device, publisher)" className="ml-1 text-gray-400 cursor-help">&#9432;</span>
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              value={breakdown}
              onChange={(e) => setBreakdown(e.target.value)}
              disabled={loading}
            >
              <option value="">No Breakdown</option>
              <option value="gender">Gender</option>
              <option value="age">Age</option>
              <option value="device_platform">Platform</option>
              <option value="publisher_platform">Publisher</option>
              {/* Add more breakdowns as needed */}
            </select>
          </div>

          {/* Custom Access Token (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Access Token (Optional)
            </label>
            <input
              type="password"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="Use saved token if empty"
              disabled={loading}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between mt-6">
          <div className="space-x-2">
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              onClick={fetchInsights}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Load Analytics'}
            </button>
            <button
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              onClick={handleExport}
              disabled={loading || !insights}
            >
              Export to CSV
            </button>
          </div>
          
          {/* View Toggle */}
          <div className="flex space-x-2">
            <button
              className={`px-4 py-2 rounded-md ${
                view === 'table' ? 'bg-gray-800 text-white' : 'bg-gray-200'
              }`}
              onClick={() => setView('table')}
            >
              Table
            </button>
            <button
              className={`px-4 py-2 rounded-md ${
                view === 'spend' ? 'bg-gray-800 text-white' : 'bg-gray-200'
              }`}
              onClick={() => setView('spend')}
            >
              Spend
            </button>
            <button
              className={`px-4 py-2 rounded-md ${
                view === 'ctr' ? 'bg-gray-800 text-white' : 'bg-gray-200'
              }`}
              onClick={() => setView('ctr')}
            >
              CTR
            </button>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {loading ? (
        <div className="text-center py-12">
          <div className="spinner"></div>
          <p className="mt-4 text-gray-600">Loading analytics data...</p>
        </div>
      ) : insights ? (
        <div className="bg-white shadow rounded-lg p-6">
          {/* Table View */}
          {view === 'table' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" title="Campaign or Ad Name">Campaign/Ad</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" title="Number of times your ads were shown">Impressions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" title="Number of clicks on your ads">Clicks</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" title="Click-through rate (percentage of impressions that resulted in a click)">CTR</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" title="Cost per click">CPC</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" title="Total amount spent">Spend</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {insights.data && insights.data.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.campaign_name || item.ad_name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {parseInt(item.impressions || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {parseInt(item.clicks || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(parseFloat(item.ctr || 0) * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        ${parseFloat(item.cpc || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        ${parseFloat(item.spend || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Spend Chart View */}
          {view === 'spend' && (
            <div className="h-96">
              <h3 className="text-lg font-medium mb-4">Campaign Spend</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 120 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end"
                    height={100}
                    interval={0}
                  />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="spend" fill="#3b82f6" name="Spend ($)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* CTR Chart View */}
          {view === 'ctr' && (
            <div className="h-96">
              <h3 className="text-lg font-medium mb-4">Campaign CTR</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 120 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end"
                    height={100}
                    interval={0}
                  />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="ctr" 
                    stroke="#10b981" 
                    name="CTR (%)" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <p className="text-gray-500">
            {/** Improved error message for empty state */}
            {insights === null
              ? 'Select an ad account and date range, then click "Load Analytics" to view your Facebook Ads performance data.'
              : 'No analytics data available for the selected filters. Try changing the date range or breakdown.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default Analytics; 