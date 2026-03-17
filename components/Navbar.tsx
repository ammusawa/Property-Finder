'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Sprout } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import { canManageProperties, hasElevatedPrivileges, getRoleDisplayName } from '@/lib/permissions';
import { UserRole } from '@/types';
import LogoutConfirmationModal from './LogoutConfirmationModal';

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const userRole = (session?.user as any)?.role as UserRole | undefined;
  const userId = (session?.user as any)?.id as string | undefined;

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    signOut({ callbackUrl: '/' });
  };

  // Helper function to check if a path is active
  const isActive = (path: string) => {
    if (!pathname) return false;
    
    if (path === '/') {
      return pathname === '/';
    }
    
    // Special handling for properties - should be active on /properties and /properties/[id]
    if (path === '/properties') {
      return pathname === '/properties' || pathname.startsWith('/properties/');
    }
    
    // Special handling for admin - should be active on /admin
    if (path === '/admin') {
      return pathname === '/admin';
    }
    
    // Special handling for my-properties - should be active on /my-properties
    if (path === '/my-properties') {
      return pathname === '/my-properties';
    }
    
    // For other paths, check if pathname starts with the path
    return pathname.startsWith(path);
  };

  // Helper function to get link classes with active state
  const getLinkClasses = (path: string, isMobile = false) => {
    if (isActive(path)) {
      return isMobile
        ? 'block py-2 pl-2 text-green-600 font-semibold border-l-4 border-green-600 bg-green-50 transition'
        : 'text-green-600 font-semibold hover:text-green-700 transition border-b-2 border-green-600 pb-1';
    }
    
    return isMobile
      ? 'block py-2 text-gray-700 hover:text-green-600 transition'
      : 'text-gray-700 hover:text-green-600 transition';
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link 
            href="/" 
            className={`flex items-center space-x-2 ${isActive('/') ? 'opacity-100' : 'opacity-90 hover:opacity-100'} transition-opacity`}
          >
            <Home className="h-8 w-8 text-green-600" strokeWidth={2} />
            <span className={`text-xl font-bold ${isActive('/') ? 'text-green-600' : 'text-gray-900'}`}>
              Property Finder
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            <Link 
              href="/properties" 
              className={getLinkClasses('/properties')}
            >
              Browse Properties
            </Link>
            
            {session ? (
              <>
                {hasElevatedPrivileges(userRole) && (
                  <Link 
                    href="/admin" 
                    className={getLinkClasses('/admin')}
                  >
                    Admin
                  </Link>
                )}
                {(userRole === 'owner' || userRole === 'agent') && (
                  <Link 
                    href="/my-properties" 
                    className={getLinkClasses('/my-properties')}
                  >
                    My Properties
                  </Link>
                )}
                <Link 
                  href="/favorites" 
                  className={getLinkClasses('/favorites')}
                >
                  Favorites
                </Link>
                <Link 
                  href="/messages" 
                  className={getLinkClasses('/messages')}
                >
                  Messages
                </Link>
                <div className="flex items-center space-x-3">
                  {userId ? (
                    <Link
                      href={`/user/${userId}`}
                      className="text-gray-700 hover:text-green-600 transition font-medium"
                    >
                      {session.user?.name}
                    </Link>
                  ) : (
                    <span className="text-gray-700">{session.user?.name}</span>
                  )}
                  <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                    {getRoleDisplayName(userRole)}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-gray-700 hover:text-red-600 transition p-2 rounded hover:bg-gray-100"
                    title="Sign Out"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  className={getLinkClasses('/auth/signin')}
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-gray-700"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link 
              href="/properties" 
              className={getLinkClasses('/properties', true)}
            >
              Browse Properties
            </Link>
            {session ? (
              <>
                {hasElevatedPrivileges(userRole) && (
                  <Link 
                    href="/admin" 
                    className={getLinkClasses('/admin', true)}
                  >
                    Admin
                  </Link>
                )}
                {(userRole === 'owner' || userRole === 'agent') && (
                  <Link 
                    href="/my-properties" 
                    className={getLinkClasses('/my-properties', true)}
                  >
                    My Properties
                  </Link>
                )}
                <Link 
                  href="/favorites" 
                  className={getLinkClasses('/favorites', true)}
                >
                  Favorites
                </Link>
                <Link 
                  href="/messages" 
                  className={getLinkClasses('/messages', true)}
                >
                  Messages
                </Link>
                <div className="pt-2 border-t">
                  {userId ? (
                    <Link
                      href={`/user/${userId}`}
                      className="block text-gray-700 py-2 hover:text-green-600 transition font-medium"
                    >
                      {session.user?.name}
                    </Link>
                  ) : (
                    <p className="text-gray-700 py-2">{session.user?.name}</p>
                  )}
                  <p className="text-xs text-gray-500 mb-2">{getRoleDisplayName(userRole)}</p>
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-2 text-gray-700 hover:text-red-600 hover:bg-red-50 px-4 py-2 rounded transition w-full border border-gray-200"
                    title="Sign Out"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link 
                  href="/auth/signin" 
                  className={getLinkClasses('/auth/signin', true)}
                >
                  Sign In
                </Link>
                <Link 
                  href="/auth/signup" 
                  className="block bg-green-600 text-white px-4 py-2 rounded text-center hover:bg-green-700 transition"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
        userName={session?.user?.name || null}
      />
    </nav>
  );
}
