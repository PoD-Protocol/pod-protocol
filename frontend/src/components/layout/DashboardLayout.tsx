'use client';

import { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bars3Icon, 
  XMarkIcon,
  HomeIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  CogIcon,
  BellIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import useStore from '../store/useStore';
import MatrixRain from '../ui/MatrixRain';

interface DashboardLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Channels', href: '/channels', icon: ChatBubbleLeftRightIcon },
  { name: 'Agents', href: '/agents', icon: UserGroupIcon },
  { name: 'Settings', href: '/settings', icon: CogIcon },
];

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { sidebarCollapsed, setSidebarCollapsed, user, notifications } = useStore();
  
  const unreadNotifications = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Matrix Rain Background */}
      <MatrixRain />
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}>
        <div className="flex h-full flex-col bg-gray-900/95 backdrop-blur-sm border-r border-purple-500/20">
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center px-4">
            <motion.div
              animate={{ scale: sidebarCollapsed ? 0.8 : 1 }}
              className="flex items-center space-x-3"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="text-white font-bold text-lg whitespace-nowrap overflow-hidden"
                  >
                    PoD Protocol
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  group flex items-center px-3 py-2 text-sm font-medium rounded-lg
                  text-gray-300 hover:text-white hover:bg-purple-600/20
                  transition-all duration-200
                  ${sidebarCollapsed ? 'justify-center' : ''}
                `}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="ml-3 whitespace-nowrap overflow-hidden"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            ))}
          </nav>
          
          {/* User Profile */}
          <div className="p-4 border-t border-purple-500/20">
            <div className={`flex items-center space-x-3 ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}>
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.username?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="flex-1 min-w-0 overflow-hidden"
                  >
                    <p className="text-sm font-medium text-white truncate">
                      {user?.username || 'Anonymous'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {user?.walletAddress ? 
                        `${user.walletAddress.slice(0, 4)}...${user.walletAddress.slice(-4)}` : 
                        'Not connected'
                      }
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className={`transition-all duration-300 ${
        sidebarCollapsed ? 'ml-16' : 'ml-64'
      }`}>
        {/* Top Bar */}
        <header className="bg-gray-900/50 backdrop-blur-sm border-b border-purple-500/20 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Sidebar Toggle */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 text-gray-400 hover:text-white hover:bg-purple-600/20 rounded-lg transition-colors"
              >
                {sidebarCollapsed ? (
                  <Bars3Icon className="h-5 w-5" />
                ) : (
                  <XMarkIcon className="h-5 w-5" />
                )}
              </button>
              
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  aria-label="Search agents and channels"
                  placeholder="Search agents, channels..."
                  className="
                    pl-10 pr-4 py-2 w-64
                    bg-gray-800/50 border border-purple-500/20
                    rounded-lg text-white placeholder-gray-400
                    focus:outline-none focus:ring-2 focus:ring-purple-500/50
                    transition-all duration-200
                  "
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="relative p-2 text-gray-400 hover:text-white hover:bg-purple-600/20 rounded-lg transition-colors">
                <BellIcon className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </button>
              
              {/* Wallet */}
              <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-blue-600 hover:!from-purple-700 hover:!to-blue-700" />
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <main className="relative z-10 p-6">
          {children}
        </main>
      </div>
      
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardLayout;