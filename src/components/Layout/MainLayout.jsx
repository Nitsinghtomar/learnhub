import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, BookOpen, BarChart3, LogOut, Brain, Video } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useClickstream } from '../../hooks/useClickstream';
import toast from 'react-hot-toast';

const MainLayout = ({ children }) => {
  const { user, signOut } = useAuth();
  const { trackNavigation, trackEngagement } = useClickstream();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: User },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Quiz Center', href: '/quiz', icon: Brain },
    { name: 'Video Actions', href: '/video-actions', icon: Video },
  ];

  const handleLogout = async () => {
    try {
      console.log('🚪 Starting logout process...');
      
      console.log('🚪 Calling signOut...');
      const { error } = await signOut();
      
      if (error) {
        console.error('🚪 SignOut error:', error);
        toast.error(`Error signing out: ${error.message || 'Unknown error'}`);
      } else {
        console.log('🚪 SignOut successful');
        toast.success('Signed out successfully');
        
        // Track logout after successful signout (non-blocking)
        try {
          await trackEngagement('button', 'clicked', 'logout-button');
          console.log('🚪 Engagement tracked successfully');
        } catch (trackError) {
          console.warn('🚪 Engagement tracking failed (non-critical):', trackError);
        }
      }
    } catch (error) {
      console.error('🚪 Logout process error:', error);
      toast.error(`Error signing out: ${error.message || 'Unknown error'}`);
    }
  };

  const handleNavClick = async (item) => {
    await trackNavigation(location.pathname, item.href);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
        <div className="flex h-16 items-center justify-center border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">LearnHub</h1>
        </div>
        
        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    onClick={() => handleNavClick(item)}
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.email || 'User'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <div className="flex h-16 items-center justify-between bg-white px-6 shadow-sm border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Welcome back, {user?.email?.split('@')[0] || 'User'}
          </h2>
        </div>
        
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
