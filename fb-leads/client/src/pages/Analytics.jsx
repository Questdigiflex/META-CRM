import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import analyticsService from '../services/analyticsService';
import { toast } from 'react-toastify';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  EyeIcon, CursorArrowRaysIcon, CurrencyDollarIcon, ChartBarIcon
} from '@heroicons/react/24/outline';

const TABS = [
  { label: 'Campaigns', value: 'campaigns' },
  { label: 'Ad Sets', value: 'adsets' },
  { label: 'Ads', value: 'ads' },
  { label: 'Demographics', value: 'demographics' },
  { label: 'Custom Conversions', value: 'custom_conversions' },
  { label: 'Custom Events', value: 'custom_events' }
];

const DEMO_COLORS = ['#60a5fa', '#fbbf24', '#34d399', '#f472b6', '#a78bfa', '#f87171'];

// Custom label renderer for pie charts to prevent overlapping
const renderCustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  // Only show label if slice is at least 3%
  if (percent < 0.03) return null;
  
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.2;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#333"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={12}
      fontWeight={500}
    >
      {`${name} ${(percent * 100).toFixed(1)}%`}
    </text>
  );
};

// Professional summary card component
const SummaryCard = ({ icon, iconBg, label, value, sub, color }) => (
  <div className="flex flex-col items-center justify-center bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-5 min-w-[150px] min-h-[110px] mx-auto">
    <div className={`flex items-center justify-center w-9 h-9 rounded-full mb-2 ${iconBg}`}>{icon}</div>
    <div className="text-xs font-medium text-gray-500 mb-1 text-center">{label}</div>
    <div className={`text-2xl font-bold text-center ${color || 'text-gray-900'}`}>{value}</div>
    {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
  </div>
);

const Analytics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [adAccounts, setAdAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [datePreset, setDatePreset] = useState('last_7d');
  const [insights, setInsights] = useState(null);
  const [accessToken, setAccessToken] = useState('');
  const [summaryMetrics, setSummaryMetrics] = useState(null);
  const [campaignTable, setCampaignTable] = useState([]);
  const [conversionChart, setConversionChart] = useState([]);
  const [barChartData, setBarChartData] = useState([]);
  // Ad Sets state
  const [adSetSummary, setAdSetSummary] = useState(null);
  const [adSetTable, setAdSetTable] = useState([]);
  const [adSetLineChart, setAdSetLineChart] = useState([]);
  const [adSetBarChart, setAdSetBarChart] = useState([]);
  // Ads state
  const [adsSummary, setAdsSummary] = useState(null);
  const [adsTable, setAdsTable] = useState([]);
  const [adsLineChart, setAdsLineChart] = useState([]);
  const [adsBarChart, setAdsBarChart] = useState([]);
  // Demographics state
  const [genderData, setGenderData] = useState([]);
  const [ageData, setAgeData] = useState([]);
  const [demoSummary, setDemoSummary] = useState(null);
  const [demoTable, setDemoTable] = useState([]);
  // Custom Conversions state
  const [customConvSummary, setCustomConvSummary] = useState(null);
  const [customConvLine, setCustomConvLine] = useState([]);
  const [customConvTable, setCustomConvTable] = useState([]);
  // Custom Events state
  const [customEventSummary, setCustomEventSummary] = useState(null);
  const [customEventLine, setCustomEventLine] = useState([]);
  const [customEventPie, setCustomEventPie] = useState([]);
  const [customEventTable, setCustomEventTable] = useState([]);
  const [tab, setTab] = useState('campaigns');
  // Page-wise filtering state
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState('');
  const [pageAdAccounts, setPageAdAccounts] = useState([]);
  const [usePageFilter, setUsePageFilter] = useState(false);

  // Load ad accounts on component mount
  useEffect(() => {
    const fetchAdAccounts = async () => {
      try {
        setLoading(true);
        const response = await analyticsService.getAdAccounts();
        if (response.success && response.data) {
          setAdAccounts(response.data);
          if (response.data.length > 0) {
            const accountId = response.data[0].id.replace('act_', '');
            setSelectedAccount(accountId);
          }
        }
      } catch (error) {
        toast.error('Failed to load ad accounts. Please check your Facebook connection.');
      } finally {
        setLoading(false);
      }
    };
    fetchAdAccounts();
  }, []);

  // Load pages on component mount
  useEffect(() => {
    const fetchPages = async () => {
      try {
        console.log('Fetching pages...');
        const response = await analyticsService.getPages();
        console.log('Pages response:', response);
        if (response.success && response.data) {
          setPages(response.data);
          console.log('Pages loaded:', response.data.length);
        } else {
          console.error('Failed to load pages:', response);
          // Don't show toast for pages as it's optional - user can still use all ad accounts
        }
      } catch (error) {
        console.error('Failed to load pages:', error);
        // Show a more helpful message for page loading issues
        if (error.message && error.message.includes('Facebook API Error')) {
          console.warn('Facebook pages not available - user may need to connect Facebook account with page permissions');
        }
      }
    };
    fetchPages();
  }, []);

  // Load ad accounts for selected page
  useEffect(() => {
    const fetchPageAdAccounts = async () => {
      if (!selectedPage) {
        setPageAdAccounts([]);
        return;
      }
      
      try {
        setLoading(true);
        const response = await analyticsService.getAdAccountsByPage(selectedPage);
        if (response.success && response.data) {
          setPageAdAccounts(response.data);
          // Auto-select first ad account if available
          if (response.data.length > 0) {
            const accountId = response.data[0].id.replace('act_', '');
            setSelectedAccount(accountId);
          }
        }
      } catch (error) {
        toast.error('Failed to load ad accounts for selected page.');
        setPageAdAccounts([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPageAdAccounts();
  }, [selectedPage]);

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
        accessToken: accessToken || undefined
      };
      const response = await analyticsService.getInsights(params);
      if (response.success && response.data) {
        setInsights(response.data);
        processCampaignData(response.data);
        processAdSetData(response.data);
        processAdsData(response.data);
        processDemographicsData(response.data);
        toast.success('Analytics data loaded successfully');
      } else {
        toast.error('Failed to load analytics data');
      }
    } catch (error) {
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch demographic breakdowns for gender and age
  const fetchDemographicBreakdowns = async () => {
    if (!selectedAccount || !datePreset) {
      toast.warning('Please select an ad account and date range');
      return;
    }
    
    try {
      setLoading(true);
      // Gender breakdown
      const genderRes = await analyticsService.getInsights({
        adAccountId: selectedAccount,
        datePreset,
        breakdown: 'gender',
        accessToken: accessToken || undefined,
      });
      if (genderRes.success && genderRes.data && Array.isArray(genderRes.data.data)) {
        const genderCounts = {};
        genderRes.data.data.forEach(item => {
          if (item.gender) {
            genderCounts[item.gender] = (genderCounts[item.gender] || 0) + parseInt(item.impressions || 0);
          }
        });
        // Filter out zero values and sort by value descending
        const genderDataArray = Object.entries(genderCounts)
          .filter(([name, value]) => value > 0)
          .sort(([, a], [, b]) => b - a)
          .map(([name, value]) => ({ name, value }));
        
        // Calculate total for percentage filtering
        const totalGender = genderDataArray.reduce((sum, item) => sum + item.value, 0);
        
        // Filter out slices that are less than 1% of total to prevent overlapping
        const filteredGenderData = genderDataArray.filter(item => (item.value / totalGender) >= 0.01);
        
        // If we filtered out too much, keep at least the top 3
        const finalGenderData = filteredGenderData.length >= 3 ? filteredGenderData : genderDataArray.slice(0, 3);
        
        setGenderData(finalGenderData);
      } else {
        setGenderData([]);
      }
      // Age breakdown
      const ageRes = await analyticsService.getInsights({
        adAccountId: selectedAccount,
        datePreset,
        breakdown: 'age',
        accessToken: accessToken || undefined,
      });
      if (ageRes.success && ageRes.data && Array.isArray(ageRes.data.data)) {
        const ageCounts = {};
        ageRes.data.data.forEach(item => {
          if (item.age) {
            ageCounts[item.age] = (ageCounts[item.age] || 0) + parseInt(item.impressions || 0);
          }
        });
        // Filter out zero values and sort by value descending
        const ageDataArray = Object.entries(ageCounts)
          .filter(([name, value]) => value > 0)
          .sort(([, a], [, b]) => b - a)
          .map(([name, value]) => ({ name, value }));
        
        // Calculate total for percentage filtering
        const totalAge = ageDataArray.reduce((sum, item) => sum + item.value, 0);
        
        // Filter out slices that are less than 1% of total to prevent overlapping
        const filteredAgeData = ageDataArray.filter(item => (item.value / totalAge) >= 0.01);
        
        // If we filtered out too much, keep at least the top 5
        const finalAgeData = filteredAgeData.length >= 5 ? filteredAgeData : ageDataArray.slice(0, 5);
        
        setAgeData(finalAgeData);
      } else {
        setAgeData([]);
      }
      
      // Also fetch regular insights to populate the demographics table and summary
      await fetchInsights();
      
      toast.success('Demographics data loaded successfully');
    } catch (err) {
      setGenderData([]);
      setAgeData([]);
      toast.error('Failed to load demographic breakdowns');
    } finally {
      setLoading(false);
    }
  };

  // Process campaign data for summary, table, and charts
  const processCampaignData = (data) => {
    if (!data || !data.data || !Array.isArray(data.data)) {
      setSummaryMetrics(null);
      setCampaignTable([]);
      setConversionChart([]);
      setBarChartData([]);
      return;
    }
    // Mock conversion data if not present
    const withConversions = data.data.map((item, idx) => ({
      ...item,
      conversions: item.conversions !== undefined ? item.conversions : Math.floor(Math.random() * 50) + 10,
      cost_per_conversion: item.spend && item.conversions ? (parseFloat(item.spend) / item.conversions).toFixed(2) : '0.00',
      custom_event: item.custom_event || ['Acme Law', 'Acme Dental', 'Acme Auto Body', 'default'][idx % 4],
      events: item.events || Math.floor(Math.random() * 50) + 10,
      avg_cpc: item.cpc || (Math.random() * 2 + 1).toFixed(2),
      avg_cpm: item.cpm || (Math.random() * 10 + 5).toFixed(2),
      page_likes: item.page_likes || Math.floor(Math.random() * 100),
      post_reactions: item.post_reactions || Math.floor(Math.random() * 100),
      cost_per_page_like: item.cost_per_page_like || (Math.random() * 10 + 1).toFixed(2),
      cost_per_post_reaction: item.cost_per_post_reaction || (Math.random() * 10 + 1).toFixed(2),
      unique_link_clicks: item.unique_link_clicks || Math.floor(Math.random() * 100),
      unique_ctr: item.unique_ctr || (Math.random() * 5).toFixed(2)
    }));
    setCampaignTable(withConversions);
    // Summary metrics
    const metrics = withConversions.reduce((acc, item) => {
      acc.impressions += parseInt(item.impressions || 0);
      acc.clicks += parseInt(item.clicks || 0);
      acc.spend += parseFloat(item.spend || 0);
      acc.reach += parseInt(item.reach || 0);
      acc.conversions += parseInt(item.conversions || 0);
      return acc;
    }, {
      impressions: 0,
      clicks: 0,
      spend: 0,
      reach: 0,
      conversions: 0
    });
    metrics.ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
    metrics.cpc = metrics.clicks > 0 ? metrics.spend / metrics.clicks : 0;
    metrics.cpm = metrics.impressions > 0 ? (metrics.spend / metrics.impressions) * 1000 : 0;
    metrics.cost_per_conversion = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0;
    setSummaryMetrics(metrics);
    // Line chart for conversions over time (mocked by index)
    setConversionChart(withConversions.map((item, idx) => ({
      date: `Day ${idx + 1}`,
      conversions: item.conversions
    })));
    // Bar chart for conversions by campaign
    setBarChartData(withConversions.map(item => ({
      campaign: item.campaign_name || item.ad_name || 'Unknown',
      conversions: item.conversions
    })));
  };

  // Process ad set data for summary, table, and charts
  const processAdSetData = (data) => {
    if (!data || !data.data || !Array.isArray(data.data)) {
      setAdSetSummary(null);
      setAdSetTable([]);
      setAdSetLineChart([]);
      setAdSetBarChart([]);
      return;
    }
    // Mock conversion data if not present
    const adSets = data.data.map((item, idx) => {
      // Extract actions
      const actions = Array.isArray(item.actions) ? item.actions : [];
      const getAction = (type) => {
        const found = actions.find(a => a.action_type === type);
        return found ? parseInt(found.value) : 0;
      };
      const getActionCost = (type) => {
        const found = actions.find(a => a.action_type === type);
        return found && item.spend && found.value ? (parseFloat(item.spend) / found.value).toFixed(2) : '0.00';
      };
      // Mock conversions if not present
      const conversions = item.conversions !== undefined ? item.conversions : Math.floor(Math.random() * 50) + 10;
      return {
        campaign_name: item.campaign_name || 'Unknown',
        adset_name: item.adset_name || `Ad Set ${idx + 1}`,
        clicks: parseInt(item.clicks || 0),
        impressions: parseInt(item.impressions || 0),
        reach: parseInt(item.reach || 0),
        spend: parseFloat(item.spend || 0),
        avg_cpc: item.cpc || (item.clicks ? (parseFloat(item.spend || 0) / item.clicks).toFixed(2) : '0.00'),
        avg_cpm: item.cpm || (item.impressions ? (parseFloat(item.spend || 0) / item.impressions * 1000).toFixed(2) : '0.00'),
        ctr: item.ctr || (item.impressions ? ((item.clicks / item.impressions) * 100).toFixed(2) : '0.00'),
        page_likes: getAction('page_like'),
        post_reactions: getAction('post_reaction'),
        cost_per_page_like: getActionCost('page_like'),
        cost_per_post_reaction: getActionCost('post_reaction'),
        unique_link_clicks: getAction('link_click'),
        unique_ctr: item.unique_ctr || '',
        conversions, // <-- ensure conversions is always present
      };
    });
    setAdSetTable(adSets);
    // Summary metrics
    const metrics = adSets.reduce((acc, item) => {
      acc.impressions += item.impressions;
      acc.clicks += item.clicks;
      acc.spend += item.spend;
      acc.reach += item.reach;
      acc.conversions += item.conversions;
      return acc;
    }, {
      impressions: 0,
      clicks: 0,
      spend: 0,
      reach: 0,
      conversions: 0
    });
    metrics.ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
    metrics.cpc = metrics.clicks > 0 ? metrics.spend / metrics.clicks : 0;
    metrics.cpm = metrics.impressions > 0 ? (metrics.spend / metrics.impressions) * 1000 : 0;
    metrics.cost_per_conversion = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0;
    setAdSetSummary(metrics);
    // Line chart for conversions over time (mocked by index)
    setAdSetLineChart(adSets.map((item, idx) => ({
      date: `Day ${idx + 1}`,
      conversions: item.conversions
    })));
    // Bar chart for conversions by ad set
    setAdSetBarChart(adSets.map(item => ({
      adset: item.adset_name,
      conversions: item.conversions
    })));
  };

  // Process ads data for summary, table, and charts
  const processAdsData = (data) => {
    if (!data || !data.data || !Array.isArray(data.data)) {
      setAdsSummary(null);
      setAdsTable([]);
      setAdsLineChart([]);
      setAdsBarChart([]);
      return;
    }
    // Mock conversion data if not present
    const ads = data.data.map((item, idx) => {
      const actions = Array.isArray(item.actions) ? item.actions : [];
      const getAction = (type) => {
        const found = actions.find(a => a.action_type === type);
        return found ? parseInt(found.value) : 0;
      };
      const getActionCost = (type) => {
        const found = actions.find(a => a.action_type === type);
        return found && item.spend && found.value ? (parseFloat(item.spend || 0) / found.value).toFixed(2) : '0.00';
      };
      // Mock conversions if not present
      const conversions = item.conversions !== undefined ? item.conversions : Math.floor(Math.random() * 50) + 10;
      return {
        campaign_name: item.campaign_name || 'Unknown',
        ad_name: item.ad_name || `Ad ${idx + 1}`,
        adset_name: item.adset_name || `Ad Set ${idx + 1}`,
        clicks: parseInt(item.clicks || 0),
        impressions: parseInt(item.impressions || 0),
        reach: parseInt(item.reach || 0),
        spend: parseFloat(item.spend || 0),
        avg_cpc: item.cpc || (item.clicks ? (parseFloat(item.spend || 0) / item.clicks).toFixed(2) : '0.00'),
        avg_cpm: item.cpm || (item.impressions ? (parseFloat(item.spend || 0) / item.impressions * 1000).toFixed(2) : '0.00'),
        ctr: item.ctr || (item.impressions ? ((item.clicks / item.impressions) * 100).toFixed(2) : '0.00'),
        page_likes: getAction('page_like'),
        post_reactions: getAction('post_reaction'),
        cost_per_page_like: getActionCost('page_like'),
        cost_per_post_reaction: getActionCost('post_reaction'),
        unique_link_clicks: getAction('link_click'),
        unique_ctr: item.unique_ctr || '',
        conversions, // <-- ensure conversions is always present
      };
    });
    setAdsTable(ads);
    // Summary metrics
    const metrics = ads.reduce((acc, item) => {
      acc.impressions += item.impressions;
      acc.clicks += item.clicks;
      acc.spend += item.spend;
      acc.reach += item.reach;
      acc.conversions += item.conversions;
      return acc;
    }, {
      impressions: 0,
      clicks: 0,
      spend: 0,
      reach: 0,
      conversions: 0
    });
    metrics.ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
    metrics.cpc = metrics.clicks > 0 ? metrics.spend / metrics.clicks : 0;
    metrics.cpm = metrics.impressions > 0 ? (metrics.spend / metrics.impressions) * 1000 : 0;
    metrics.cost_per_conversion = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0;
    setAdsSummary(metrics);
    // Line chart for conversions over time (mocked by index)
    setAdsLineChart(ads.map((item, idx) => ({
      date: `Day ${idx + 1}`,
      conversions: item.conversions
    })));
    // Bar chart for conversions by ad
    setAdsBarChart(ads.map(item => ({
      ad: item.ad_name,
      conversions: item.conversions
    })));
  };

  // Process demographics data for charts and table
  const processDemographicsData = (data) => {
    if (!data || !data.data || !Array.isArray(data.data)) {
      setDemoTable([]);
      setDemoSummary(null);
      return;
    }
    // Mock conversion data if not present
    const demoRows = data.data.map((item, idx) => {
      const actions = Array.isArray(item.actions) ? item.actions : [];
      const getAction = (type) => {
        const found = actions.find(a => a.action_type === type);
        return found ? parseInt(found.value) : 0;
      };
      const getActionCost = (type) => {
        const found = actions.find(a => a.action_type === type);
        return found && item.spend && found.value ? (parseFloat(item.spend) / found.value).toFixed(2) : '0.00';
      };
      // Mock conversions if not present
      const conversions = item.conversions !== undefined ? item.conversions : Math.floor(Math.random() * 50) + 10;
      return {
        ...item,
        conversions,
        page_likes: getAction('page_like'),
        post_reactions: getAction('post_reaction'),
        cost_per_page_like: getActionCost('page_like'),
        cost_per_post_reaction: getActionCost('post_reaction'),
        unique_link_clicks: getAction('link_click'),
      };
    });
    setDemoTable(demoRows);
    
    // Calculate summary metrics for demographics
    const metrics = demoRows.reduce((acc, item) => {
      acc.impressions += parseInt(item.impressions || 0);
      acc.clicks += parseInt(item.clicks || 0);
      acc.spend += parseFloat(item.spend || 0);
      acc.reach += parseInt(item.reach || 0);
      acc.conversions += parseInt(item.conversions || 0);
      return acc;
    }, {
      impressions: 0,
      clicks: 0,
      spend: 0,
      reach: 0,
      conversions: 0
    });
    
    // Calculate derived metrics
    metrics.ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
    metrics.cpc = metrics.clicks > 0 ? metrics.spend / metrics.clicks : 0;
    metrics.cpm = metrics.impressions > 0 ? (metrics.spend / metrics.impressions) * 1000 : 0;
    metrics.cost_per_conversion = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0;
    
    setDemoSummary(metrics);
  };

  // Process custom conversions data for charts and table
  const processCustomConversionsData = () => {
    // Mock data for custom conversions
    const summary = {
      events: 189,
      conversions: 292,
      cost_per_conversion: 41.23
    };
    setCustomConvSummary(summary);
    // Line chart for events and conversions over time
    setCustomConvLine([
      { date: '30 Jun', events: 5, conversions: 7 },
      { date: '7 Jul', events: 6, conversions: 8 },
      { date: '14 Jul', events: 7, conversions: 10 },
      { date: '21 Jul', events: 7, conversions: 12 },
      { date: '28 Jul', events: 6, conversions: 11 }
    ]);
    // Table data
    setCustomConvTable([
      { id: 1, name: 'Acme Auto Body', type: 'other', source: 'mobile', default: 5, last: 'Jul 19, 2025 6:22 A', retention: 37, unavailable: true, archived: true },
      { id: 2, name: 'default', type: 'add to wishlist', source: 'desktop', default: 5, last: 'Jul 24, 2025 6:14 F', retention: 48, unavailable: false, archived: false },
      { id: 3, name: 'default', type: 'purchase', source: 'desktop', default: 7, last: 'Jul 11, 2025 8:03 P', retention: 43, unavailable: false, archived: false },
      { id: 4, name: 'default', type: 'add to cart', source: 'desktop', default: 6, last: 'Jul 17, 2025 11:40 A', retention: 28, unavailable: false, archived: false },
      { id: 5, name: 'Acme Dental', type: 'add to wishlist', source: 'desktop', default: 6, last: 'Jul 27, 2025 2:53 A', retention: 44, unavailable: false, archived: false },
      { id: 6, name: 'Acme Auto Body', type: 'other', source: 'desktop', default: 6, last: 'Jul 21, 2025 1:07 P', retention: 58, unavailable: true, archived: true }
    ]);
  };

  // Process custom events data for charts and table
  const processCustomEventsData = () => {
    // Mock data for custom events
    const summary = {
      events: 76,
      conversions: 189
    };
    setCustomEventSummary(summary);
    // Line chart for events and conversions over time
    setCustomEventLine([
      { date: '30 Jun', events: 5, conversions: 7 },
      { date: '7 Jul', events: 6, conversions: 8 },
      { date: '14 Jul', events: 7, conversions: 10 },
      { date: '21 Jul', events: 7, conversions: 12 },
      { date: '28 Jul', events: 6, conversions: 11 }
    ]);
    // Pie chart for event source breakdown (more detailed)
    setCustomEventPie([
      { name: 'iOS', value: 18 },
      { name: 'Android', value: 22 },
      { name: 'Web', value: 20 },
      { name: 'Desktop', value: 16 }
    ]);
    // Table data
    setCustomEventTable([
      { id: 1, name: 'Acme Auto Body', type: 'other', source: 'iOS', events: 10, conversions: 5, last: 'Jul 19, 2025 6:22 A', retention: 37, unavailable: true, archived: true },
      { id: 2, name: 'default', type: 'add to wishlist', source: 'Android', events: 13, conversions: 32, last: 'Jul 24, 2025 6:14 F', retention: 48, unavailable: false, archived: false },
      { id: 3, name: 'default', type: 'purchase', source: 'Web', events: 24, conversions: 39, last: 'Jul 11, 2025 8:03 P', retention: 43, unavailable: false, archived: false },
      { id: 4, name: 'default', type: 'add to cart', source: 'Desktop', events: 11, conversions: 60, last: 'Jul 17, 2025 11:40 A', retention: 28, unavailable: false, archived: false },
      { id: 5, name: 'Acme Dental', type: 'add to wishlist', source: 'iOS', events: 8, conversions: 35, last: 'Jul 27, 2025 2:53 A', retention: 44, unavailable: false, archived: false },
      { id: 6, name: 'Acme Auto Body', type: 'other', source: 'Android', events: 10, conversions: 18, last: 'Jul 21, 2025 1:07 P', retention: 58, unavailable: true, archived: true }
    ]);
  };

  // Table columns
  const campaignColumns = [
    { label: 'CAMPAIGN', key: 'campaign_name' },
    { label: 'CLICKS', key: 'clicks' },
    { label: 'IMPRESSIONS', key: 'impressions' },
    { label: 'REACH', key: 'reach' },
    { label: 'AMOUNT SPENT', key: 'spend' },
    { label: 'AVG CPC', key: 'avg_cpc' },
    { label: 'AVG CPM', key: 'avg_cpm' },
    { label: 'CTR', key: 'ctr' },
    { label: 'PAGE LIKES', key: 'page_likes' },
    { label: 'POST REACTIONS', key: 'post_reactions' },
    { label: 'COST PER PAGE LIKE', key: 'cost_per_page_like' },
    { label: 'COST PER POST REACTION', key: 'cost_per_post_reaction' },
    { label: 'UNIQUE LINK CLICKS', key: 'unique_link_clicks' },
    { label: 'UNIQUE CTR', key: 'unique_ctr' }
  ];
  const adSetColumns = [
    { label: 'CAMPAIGN', key: 'campaign_name' },
    { label: 'AD SET', key: 'adset_name' },
    { label: 'CLICKS', key: 'clicks' },
    { label: 'IMPRESSIONS', key: 'impressions' },
    { label: 'REACH', key: 'reach' },
    { label: 'AMOUNT SPENT', key: 'spend' },
    { label: 'AVERAGE CPC', key: 'avg_cpc' },
    { label: 'AVERAGE CPM', key: 'avg_cpm' },
    { label: 'CTR', key: 'ctr' },
    { label: 'PAGE LIKES', key: 'page_likes' },
    { label: 'POST REACTIONS', key: 'post_reactions' },
    { label: 'COST PER PAGE LIKE', key: 'cost_per_page_like' },
    { label: 'COST PER POST REACTION', key: 'cost_per_post_reaction' },
    { label: 'UNIQUE LINK CLICKS', key: 'unique_link_clicks' },
    { label: 'UNIQUE CTR', key: 'unique_ctr' }
  ];
  const adsColumns = [
    { label: 'CAMPAIGN', key: 'campaign_name' },
    { label: 'AD', key: 'ad_name' },
    { label: 'AD SET', key: 'adset_name' },
    { label: 'CLICKS', key: 'clicks' },
    { label: 'IMPRESSIONS', key: 'impressions' },
    { label: 'REACH', key: 'reach' },
    { label: 'AMOUNT SPENT', key: 'spend' },
    { label: 'AVERAGE CPC', key: 'avg_cpc' },
    { label: 'AVERAGE CPM', key: 'avg_cpm' },
    { label: 'CTR', key: 'ctr' },
    { label: 'PAGE LIKES', key: 'page_likes' },
    { label: 'POST REACTIONS', key: 'post_reactions' },
    { label: 'COST PER PAGE LIKE', key: 'cost_per_page_like' },
    { label: 'COST PER POST REACTION', key: 'cost_per_post_reaction' },
    { label: 'UNIQUE LINK CLICKS', key: 'unique_link_clicks' },
    { label: 'UNIQUE CTR', key: 'unique_ctr' }
  ];
  const demoColumns = [
    { label: 'COUNTRY', key: 'country' },
    { label: 'CLICKS', key: 'clicks' },
    { label: 'IMPRESSIONS', key: 'impressions' },
    { label: 'REACH', key: 'reach' },
    { label: 'AMOUNT SPENT', key: 'spend' },
    { label: 'AVERAGE CPC', key: 'avg_cpc' },
    { label: 'AVERAGE CPM', key: 'avg_cpm' },
    { label: 'CTR', key: 'ctr' },
    { label: 'PAGE LIKES', key: 'page_likes' },
    { label: 'POST REACTIONS', key: 'post_reactions' },
    { label: 'COST PER PAGE LIKE', key: 'cost_per_page_like' },
    { label: 'COST PER POST REACTION', key: 'cost_per_post_reaction' },
    { label: 'UNIQUE LINK CLICKS', key: 'unique_link_clicks' },
    { label: 'UNIQUE CTR', key: 'unique_ctr' }
  ];
  const customConvColumns = [
    { label: 'CONVERSION ID', key: 'id' },
    { label: 'CONVERSION NAME', key: 'name' },
    { label: 'EVENT TYPE', key: 'type' },
    { label: 'SOURCE TYPE', key: 'source' },
    { label: 'DEFAULT CONVERSIONS', key: 'default' },
    { label: 'LAST OCCURRED', key: 'last' },
    { label: 'RETENTION DAYS', key: 'retention' },
    { label: 'UNAVAILABLE', key: 'unavailable' },
    { label: 'ARCHIVED', key: 'archived' }
  ];
  const customEventColumns = [
    { label: 'EVENT ID', key: 'id' },
    { label: 'EVENT NAME', key: 'name' },
    { label: 'EVENT TYPE', key: 'type' },
    { label: 'SOURCE TYPE', key: 'source' },
    { label: 'EVENTS', key: 'events' },
    { label: 'CONVERSIONS', key: 'conversions' },
    { label: 'LAST OCCURRED', key: 'last' },
    { label: 'RETENTION DAYS', key: 'retention' },
    { label: 'UNAVAILABLE', key: 'unavailable' },
    { label: 'ARCHIVED', key: 'archived' }
  ];

  // Call processCustomConversionsData after fetchInsights
  useEffect(() => {
    if (tab === 'custom_conversions') {
      processCustomConversionsData();
    }
    // eslint-disable-next-line
  }, [tab]);

  // Call processCustomEventsData after fetchInsights
  useEffect(() => {
    if (tab === 'custom_events') {
      processCustomEventsData();
    }
    // eslint-disable-next-line
  }, [tab]);

  // Handle page selection
  const handlePageChange = (pageId) => {
    console.log('Page selected:', pageId);
    setSelectedPage(pageId);
    setSelectedAccount(''); // Reset ad account selection
  };

  // Handle toggle between page filter and all ad accounts
  const handleFilterToggle = () => {
    console.log('Filter toggle:', !usePageFilter);
    console.log('Available pages:', pages.length);
    setUsePageFilter(!usePageFilter);
    setSelectedPage('');
    setSelectedAccount('');
    setPageAdAccounts([]);
  };

  // Get current ad accounts list based on filter mode
  const getCurrentAdAccounts = () => {
    if (usePageFilter && selectedPage) {
      return pageAdAccounts;
    }
    return adAccounts;
  };

  // Fetch insights and demographic breakdowns when parameters change
  useEffect(() => {
    if (!selectedAccount || !datePreset) return;
    fetchInsights();
    if (tab === 'demographics') {
      fetchDemographicBreakdowns();
    }
    // eslint-disable-next-line
  }, [selectedAccount, datePreset, tab]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
              {/* Tab Navigation */}
              <nav className="flex space-x-4">
                {TABS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTab(t.value)}
                    className={`py-2 px-4 rounded-md text-sm font-medium focus:outline-none ${tab === t.value ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </nav>
            </div>
            <button
              onClick={tab === 'demographics' ? fetchDemographicBreakdowns : fetchInsights}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <ChartBarIcon className="h-4 w-4 mr-2" />
              {tab === 'demographics' ? 'Load Demographics' : 'Load Analytics'}
            </button>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Filter Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          {/* Filter Toggle */}
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={usePageFilter}
                onChange={handleFilterToggle}
                disabled={pages.length === 0}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 disabled:opacity-50"
              />
              <span className={`ml-2 text-sm font-medium ${pages.length === 0 ? 'text-gray-400' : 'text-gray-700'}`}>
                Filter by Page {pages.length === 0 && '(No pages available)'}
              </span>
            </label>
            {pages.length === 0 && (
              <div className="mt-2 ml-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-xs text-yellow-800">
                  <strong>No Facebook pages found.</strong> To enable page filtering, connect a Facebook account with page access permissions.
                </p>
              </div>
            )}
            {pages.length > 0 && usePageFilter && (
              <div className="mt-2 ml-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-xs text-blue-800">
                  <strong>Page filtering enabled.</strong> You can now filter analytics data by specific Facebook pages.
                </p>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Page Dropdown (only show when page filter is enabled) */}
            {usePageFilter && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Page ({pages.length} available)
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={selectedPage}
                  onChange={(e) => handlePageChange(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Select Page</option>
                  {pages.length > 0 ? (
                    pages.map((page) => (
                      <option key={page.id} value={page.id}>
                        {page.name}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No pages available - check Facebook connection</option>
                  )}
                </select>
                {pages.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    No Facebook pages found. Make sure you have connected a Facebook account with page access.
                  </p>
                )}
              </div>
            )}
            
            {/* Ad Account Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {usePageFilter ? 'Page Ad Accounts' : 'Ad Account'}
              </label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                disabled={loading || (usePageFilter && !selectedPage)}
              >
                <option value="">
                  {usePageFilter && !selectedPage 
                    ? 'Select a page first' 
                    : 'Select Ad Account'
                  }
                </option>
                {getCurrentAdAccounts().map((account) => (
                  <option key={account.id} value={account.id.replace('act_', '')}>
                    {account.name || account.id}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
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
            
            {/* Access Token */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Access Token (Optional)</label>
              <input
                type="password"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Use saved token if empty"
                disabled={loading}
              />
            </div>
          </div>
        </div>
        {/* Campaigns Tab */}
        {tab === 'campaigns' && summaryMetrics && (
          <>
            {/* Summary Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
              <SummaryCard icon={<EyeIcon className="h-5 w-5 text-blue-600" />} iconBg="bg-blue-100" label="Impressions" value={summaryMetrics.impressions.toLocaleString()} />
              <SummaryCard icon={<CursorArrowRaysIcon className="h-5 w-5 text-green-600" />} iconBg="bg-green-100" label="Clicks" value={summaryMetrics.clicks.toLocaleString()} />
              <SummaryCard icon={<CurrencyDollarIcon className="h-5 w-5 text-yellow-600" />} iconBg="bg-yellow-100" label="Spend" value={`$${summaryMetrics.spend.toFixed(2)}`} />
              <SummaryCard icon={<CurrencyDollarIcon className="h-5 w-5 text-purple-600" />} iconBg="bg-purple-100" label="Cost/Conversion" value={`$${summaryMetrics.cost_per_conversion.toFixed(2)}`} />
              <SummaryCard icon={<CurrencyDollarIcon className="h-5 w-5 text-red-600" />} iconBg="bg-red-100" label="CTR" value={`${summaryMetrics.ctr.toFixed(2)}%`} />
              <SummaryCard icon={<CurrencyDollarIcon className="h-5 w-5 text-blue-600" />} iconBg="bg-blue-100" label="CPC" value={`$${summaryMetrics.cpc.toFixed(2)}`} />
              <SummaryCard icon={<CurrencyDollarIcon className="h-5 w-5 text-green-600" />} iconBg="bg-green-100" label="Conversions" value={summaryMetrics.conversions.toLocaleString()} />
            </div>
            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Conversions Over Time</h3>
                {conversionChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={conversionChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="conversions" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-40 text-gray-400">No data</div>
                )}
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Conversions by Campaign</h3>
                {barChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={barChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="campaign" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="conversions" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-40 text-gray-400">No data</div>
                )}
      </div>
        </div>
            {/* Campaign Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Campaign Details</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                      {campaignColumns.map(col => (
                        <th key={col.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {col.label}
                    </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {campaignTable.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.campaign_name || row.ad_name || 'Unknown'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.clicks}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.impressions}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.reach}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${row.spend}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${row.avg_cpc}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${row.avg_cpm}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.ctr}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.page_likes}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.post_reactions}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${row.cost_per_page_like}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${row.cost_per_post_reaction}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.unique_link_clicks}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.unique_ctr}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
        {/* Ad Sets Tab */}
        {tab === 'adsets' && adSetSummary && (
          <>
            {/* Summary Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
              <SummaryCard icon={<EyeIcon className="h-5 w-5 text-blue-600" />} iconBg="bg-blue-100" label="Impressions" value={adSetSummary.impressions.toLocaleString()} />
              <SummaryCard icon={<CursorArrowRaysIcon className="h-5 w-5 text-green-600" />} iconBg="bg-green-100" label="Clicks" value={adSetSummary.clicks.toLocaleString()} />
              <SummaryCard icon={<CurrencyDollarIcon className="h-5 w-5 text-yellow-600" />} iconBg="bg-yellow-100" label="Spend" value={`$${adSetSummary.spend.toFixed(2)}`} />
              <SummaryCard icon={<CurrencyDollarIcon className="h-5 w-5 text-purple-600" />} iconBg="bg-purple-100" label="Cost/Conversion" value={`$${adSetSummary.cost_per_conversion.toFixed(2)}`} />
              <SummaryCard icon={<CurrencyDollarIcon className="h-5 w-5 text-red-600" />} iconBg="bg-red-100" label="CTR" value={`${adSetSummary.ctr.toFixed(2)}%`} />
              <SummaryCard icon={<CurrencyDollarIcon className="h-5 w-5 text-blue-600" />} iconBg="bg-blue-100" label="CPC" value={`$${adSetSummary.cpc.toFixed(2)}`} />
              <SummaryCard icon={<CurrencyDollarIcon className="h-5 w-5 text-green-600" />} iconBg="bg-green-100" label="Conversions" value={adSetSummary.conversions.toLocaleString()} />
            </div>
            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Conversions Over Time</h3>
                {adSetLineChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={adSetLineChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="conversions" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-40 text-gray-400">No data</div>
                )}
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Conversions by Ad Set</h3>
                {adSetBarChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={adSetBarChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="adset" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="conversions" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-40 text-gray-400">No data</div>
                )}
              </div>
            </div>
            {/* Ad Set Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Ad Set Details</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {adSetColumns.map(col => (
                        <th key={col.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {col.label}
                    </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {adSetTable.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.campaign_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.adset_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.clicks}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.impressions}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.reach}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${row.spend}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${row.avg_cpc}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${row.avg_cpm}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.ctr}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.page_likes}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.post_reactions}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${row.cost_per_page_like}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${row.cost_per_post_reaction}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.unique_link_clicks}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.unique_ctr}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
        {/* Ads Tab */}
        {tab === 'ads' && adsSummary && (
          <>
            {/* Summary Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
              <SummaryCard icon={<EyeIcon className="h-5 w-5 text-blue-600" />} iconBg="bg-blue-100" label="Impressions" value={adsSummary.impressions.toLocaleString()} />
              <SummaryCard icon={<CursorArrowRaysIcon className="h-5 w-5 text-green-600" />} iconBg="bg-green-100" label="Clicks" value={adsSummary.clicks.toLocaleString()} />
              <SummaryCard icon={<CurrencyDollarIcon className="h-5 w-5 text-yellow-600" />} iconBg="bg-yellow-100" label="Spend" value={`$${adsSummary.spend.toFixed(2)}`} />
              <SummaryCard icon={<CurrencyDollarIcon className="h-5 w-5 text-purple-600" />} iconBg="bg-purple-100" label="Cost/Conversion" value={`$${adsSummary.cost_per_conversion.toFixed(2)}`} />
              <SummaryCard icon={<CurrencyDollarIcon className="h-5 w-5 text-red-600" />} iconBg="bg-red-100" label="CTR" value={`${adsSummary.ctr.toFixed(2)}%`} />
              <SummaryCard icon={<CurrencyDollarIcon className="h-5 w-5 text-blue-600" />} iconBg="bg-blue-100" label="CPC" value={`$${adsSummary.cpc.toFixed(2)}`} />
              <SummaryCard icon={<CurrencyDollarIcon className="h-5 w-5 text-green-600" />} iconBg="bg-green-100" label="Conversions" value={adsSummary.conversions.toLocaleString()} />
            </div>
            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Conversions Over Time</h3>
                {adsLineChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={adsLineChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="conversions" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-40 text-gray-400">No data</div>
                )}
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Conversions by Ad</h3>
                {adsBarChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={adsBarChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="ad" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="conversions" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-40 text-gray-400">No data</div>
                )}
              </div>
            </div>
            {/* Ads Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Ad Details</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {adsColumns.map(col => (
                        <th key={col.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {col.label}
                    </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {adsTable.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.campaign_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.ad_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.adset_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.clicks}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.impressions}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.reach}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${row.spend}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${row.avg_cpc}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${row.avg_cpm}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.ctr}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.page_likes}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.post_reactions}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${row.cost_per_page_like}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${row.cost_per_post_reaction}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.unique_link_clicks}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.unique_ctr}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
        {/* Demographics Tab */}
        {tab === 'demographics' && (
          <>
            {demoSummary ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
                  <SummaryCard icon={<CursorArrowRaysIcon className="h-5 w-5 text-green-600" />} iconBg="bg-green-100" label="Clicks" value={`${(demoSummary.clicks ?? 0).toLocaleString()}`} />
                  <SummaryCard icon={<EyeIcon className="h-5 w-5 text-blue-600" />} iconBg="bg-blue-100" label="Impressions" value={`${(demoSummary.impressions ?? 0).toLocaleString()}`} />
                  <SummaryCard icon={<CurrencyDollarIcon className="h-5 w-5 text-yellow-600" />} iconBg="bg-yellow-100" label="Spend" value={`$${(demoSummary.spend ?? 0).toFixed(2)}`} />
                  <SummaryCard icon={<CurrencyDollarIcon className="h-5 w-5 text-purple-600" />} iconBg="bg-purple-100" label="Cost/Conversion" value={`$${(demoSummary.cost_per_conversion ?? 0).toFixed(2)}`} />
                  <SummaryCard icon={<CurrencyDollarIcon className="h-5 w-5 text-red-600" />} iconBg="bg-red-100" label="CTR" value={`${(demoSummary.ctr ?? 0).toFixed(2)}%`} />
                  <SummaryCard icon={<CurrencyDollarIcon className="h-5 w-5 text-green-600" />} iconBg="bg-green-100" label="CPM" value={`$${(demoSummary.cpm ?? 0).toFixed(2)}`} />
                  <SummaryCard icon={<CurrencyDollarIcon className="h-5 w-5 text-blue-600" />} iconBg="bg-blue-100" label="CPC" value={`$${(demoSummary.cpc ?? 0).toFixed(2)}`} />
                </div>
            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Gender Breakdown</h3>
                {loading ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : genderData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={genderData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        innerRadius={20}
                        label={renderCustomPieLabel}
                        labelLine={false}
                      >
                        {genderData.map((entry, idx) => (
                          <Cell key={`cell-gender-${idx}`} fill={DEMO_COLORS[idx % DEMO_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value.toLocaleString(), name]} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-40 text-gray-400">
                    No gender data available
                  </div>
                )}
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Age Breakdown</h3>
                {loading ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : ageData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={ageData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        innerRadius={20}
                        label={renderCustomPieLabel}
                        labelLine={false}
                      >
                        {ageData.map((entry, idx) => (
                          <Cell key={`cell-age-${idx}`} fill={DEMO_COLORS[idx % DEMO_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value.toLocaleString(), name]} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-40 text-gray-400">
                    No age data available
                  </div>
                )}
              </div>
            </div>
            {/* Demographics Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Demographics Details</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {demoColumns.map(col => (
                        <th key={col.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {demoTable.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.country}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.clicks}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.impressions}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.reach}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${row.spend}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${row.avg_cpc}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${row.avg_cpm}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.ctr}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.page_likes}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.post_reactions}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${row.cost_per_page_like}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${row.cost_per_post_reaction}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.unique_link_clicks}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.unique_ctr}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
              </>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="text-center py-12">
                  <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No demographics data</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Select an ad account and date range, then click "Load Demographics" to see demographics breakdown.
                  </p>
                  <div className="mt-4">
                    <button
                      onClick={fetchDemographicBreakdowns}
                      disabled={!selectedAccount || !datePreset || loading}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <ChartBarIcon className="h-4 w-4 mr-2" />
                      Load Demographics
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        {/* Custom Conversions Tab */}
        {tab === 'custom_conversions' && customConvSummary && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <SummaryCard icon={<CurrencyDollarIcon className="h-5 w-5 text-purple-600" />} iconBg="bg-purple-100" label="Events" value={customConvSummary.events} />
              <SummaryCard icon={<CurrencyDollarIcon className="h-5 w-5 text-green-600" />} iconBg="bg-green-100" label="Conversions" value={customConvSummary.conversions} />
              <SummaryCard icon={<CurrencyDollarIcon className="h-5 w-5 text-yellow-600" />} iconBg="bg-yellow-100" label="Cost/Conversion" value={`$${customConvSummary.cost_per_conversion}`} />
            </div>
            {/* Line Chart */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Custom Conversion Events Over Time</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={customConvLine}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="events" stroke="#3b82f6" strokeWidth={2} />
                  <Line type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Custom Conversions Details</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {customConvColumns.map(col => (
                        <th key={col.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {customConvTable.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.source}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.default}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.last}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.retention}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.unavailable ? <span className="text-green-600 font-bold">YES</span> : <span className="text-red-600 font-bold">NO</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.archived ? <span className="text-green-600 font-bold">YES</span> : <span className="text-red-600 font-bold">NO</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
        {/* Custom Events Tab */}
        {tab === 'custom_events' && customEventSummary && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <SummaryCard icon={<CurrencyDollarIcon className="h-5 w-5 text-purple-600" />} iconBg="bg-purple-100" label="Events" value={customEventSummary.events} />
              <SummaryCard icon={<CurrencyDollarIcon className="h-5 w-5 text-green-600" />} iconBg="bg-green-100" label="Conversions" value={customEventSummary.conversions} />
            </div>
            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Custom Events Over Time</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={customEventLine}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="events" stroke="#3b82f6" strokeWidth={2} />
                    <Line type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Event Source Breakdown</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={customEventPie}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      innerRadius={20}
                      label={renderCustomPieLabel}
                      labelLine={false}
                    >
                      {customEventPie.map((entry, idx) => (
                        <Cell key={`cell-source-${idx}`} fill={DEMO_COLORS[idx % DEMO_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Custom Events Details</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {customEventColumns.map(col => (
                        <th key={col.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {customEventTable.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.source}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.events}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.conversions}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.last}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.retention}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.unavailable ? <span className="text-green-600 font-bold">YES</span> : <span className="text-red-600 font-bold">NO</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.archived ? <span className="text-green-600 font-bold">YES</span> : <span className="text-red-600 font-bold">NO</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
        </div>
    </div>
  );
};

export default Analytics; 