import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  HomeIcon, 
  DocumentTextIcon, 
  DocumentDuplicateIcon, 
  CogIcon, 
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Leads', href: '/leads', icon: DocumentTextIcon },
    { name: 'Forms', href: '/forms', icon: DocumentDuplicateIcon },
    { name: 'Settings', href: '/settings', icon: CogIcon },
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar */}
      <div className="lg:hidden">
        <div className="fixed inset-0 z-40 flex">
          {/* Sidebar overlay */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-gray-600 bg-opacity-75" 
              onClick={toggleSidebar}
            ></div>
          )}
          
          {/* Sidebar */}
          <div className={`
            fixed inset-y-0 left-0 flex flex-col w-64 max-w-xs bg-white transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}>
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
              <h1 className="text-xl font-semibold text-gray-800">FB Leads</h1>
              <button 
                className="text-gray-500 hover:text-gray-700"
                onClick={toggleSidebar}
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <nav className="mt-5 px-2 space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`
                      group flex items-center px-2 py-2 text-base font-medium rounded-md
                      ${isActive(item.href)
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                    `}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon
                      className={`
                        mr-4 h-6 w-6
                        ${isActive(item.href)
                          ? 'text-primary-600'
                          : 'text-gray-400 group-hover:text-gray-500'}
                      `}
                    />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
            
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={logout}
                className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 w-full"
              >
                <ArrowRightOnRectangleIcon className="mr-4 h-6 w-6 text-gray-400 group-hover:text-gray-500" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:border-r lg:border-gray-200 lg:bg-white">
        <div className="flex items-center h-16 px-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-800">FB Leads</h1>
        </div>
        
        <div className="flex-1 flex flex-col overflow-y-auto">
          <nav className="mt-5 flex-1 px-2 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  group flex items-center px-2 py-2 text-sm font-medium rounded-md
                  ${isActive(item.href)
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                `}
              >
                <item.icon
                  className={`
                    mr-3 h-5 w-5
                    ${isActive(item.href)
                      ? 'text-primary-600'
                      : 'text-gray-400 group-hover:text-gray-500'}
                  `}
                />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={logout}
            className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 w-full"
          >
            <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top header */}
        <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white border-b border-gray-200">
          <button
            type="button"
            className="lg:hidden px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            onClick={toggleSidebar}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" />
          </button>
          
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex items-center">
              {/* Empty space for search or other elements */}
            </div>
            <div className="ml-4 flex items-center md:ml-6">
              <div className="flex items-center">
                <div className="text-sm font-medium text-gray-700 mr-2">
                  {user?.name || 'User'}
                </div>
                <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white">
                  {user?.name?.charAt(0) || 'U'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout; 