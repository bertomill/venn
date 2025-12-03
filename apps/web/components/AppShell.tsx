'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import NotificationBell from './NotificationBell'
import MessageIcon from './MessageIcon'

interface AppShellProps {
  children: React.ReactNode
  profile?: {
    id: string
    full_name: string
    avatar_url?: string
  } | null
  showHeader?: boolean
  headerLeft?: React.ReactNode
  onSignOut?: () => void
}

export default function AppShell({
  children,
  profile,
  showHeader = true,
  headerLeft,
  onSignOut
}: AppShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  // Persist collapsed state in localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) {
      setCollapsed(saved === 'true')
    }
  }, [])

  const toggleCollapsed = () => {
    const newState = !collapsed
    setCollapsed(newState)
    localStorage.setItem('sidebar-collapsed', String(newState))
  }

  const navItems = [
    {
      name: 'Home',
      href: '/dashboard',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: 'Events',
      href: '/events',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: 'Discover',
      href: '/discover',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      name: 'Groups',
      href: '/groups',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      name: 'Saved',
      href: '/saved',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      ),
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Desktop Sidebar - hidden on mobile */}
      <aside className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 bg-black/40 border-r border-white/5 z-50 transition-all duration-300 ${collapsed ? 'lg:w-16' : 'lg:w-64 xl:w-72'}`}>
        {/* Logo + Collapse Toggle */}
        <div className={`flex items-center py-6 ${collapsed ? 'px-3 justify-center' : 'px-6 justify-between'}`}>
          <div className="flex items-center gap-3">
            <img src="/Venn-Logo.png" alt="Venn" className="w-10 h-10 flex-shrink-0" />
            {!collapsed && <span className="text-xl font-bold text-white">Venn</span>}
          </div>
          {!collapsed && (
            <button
              onClick={toggleCollapsed}
              className="p-2 rounded-lg text-white/40 hover:bg-white/5 hover:text-white transition-all"
              title="Collapse sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          )}
          {collapsed && (
            <button
              onClick={toggleCollapsed}
              className="p-2 rounded-lg text-white/40 hover:bg-white/5 hover:text-white transition-all mt-2"
              title="Expand sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href)
            return (
              <button
                key={item.name}
                onClick={() => router.push(item.href)}
                title={collapsed ? item.name : undefined}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                  active
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                } ${collapsed ? 'justify-center px-2' : ''}`}
              >
                {item.icon(active)}
                {!collapsed && <span className="text-base">{item.name}</span>}
              </button>
            )
          })}

          {/* Create Button */}
          <button
            onClick={() => router.push('/create')}
            title={collapsed ? 'Create' : undefined}
            className={`w-full flex items-center gap-4 px-4 py-3 mt-4 rounded-xl bg-gradient-to-r from-primary-400 to-primary-600 text-white font-semibold hover:opacity-90 transition-opacity ${collapsed ? 'justify-center px-2' : ''}`}
          >
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            {!collapsed && <span className="text-base">Create</span>}
          </button>
        </nav>

        {/* Sidebar Footer - Messages, Notifications, Profile */}
        <div className="px-3 py-4 border-t border-white/5 space-y-1">
          <button
            onClick={() => router.push('/messages')}
            title={collapsed ? 'Messages' : undefined}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
              pathname.startsWith('/messages')
                ? 'bg-white/10 text-white font-semibold'
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            } ${collapsed ? 'justify-center px-2' : ''}`}
          >
            <MessageIcon showBadgeOnly />
            {!collapsed && <span className="text-base">Messages</span>}
          </button>

          <button
            onClick={() => router.push('/notifications')}
            title={collapsed ? 'Notifications' : undefined}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
              pathname === '/notifications'
                ? 'bg-white/10 text-white font-semibold'
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            } ${collapsed ? 'justify-center px-2' : ''}`}
          >
            <NotificationBell iconOnly />
            {!collapsed && <span className="text-base">Notifications</span>}
          </button>

          {/* Profile Section */}
          {profile && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <button
                onClick={() => router.push('/profile')}
                title={collapsed ? profile.full_name || 'Profile' : undefined}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-white/5 hover:text-white transition-all ${collapsed ? 'justify-center px-2' : ''}`}
              >
                <div className={`bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${collapsed ? 'w-8 h-8' : 'w-10 h-10'}`}>
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    profile.full_name?.[0]?.toUpperCase() || '?'
                  )}
                </div>
                {!collapsed && (
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-white font-medium truncate">{profile.full_name || 'User'}</div>
                    <div className="text-white/40 text-sm truncate">View profile</div>
                  </div>
                )}
              </button>
              {onSignOut && (
                <button
                  onClick={onSignOut}
                  title={collapsed ? 'Sign Out' : undefined}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-white/60 hover:bg-white/5 hover:text-red-400 transition-all mt-1 ${collapsed ? 'justify-center px-2' : ''}`}
                >
                  <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  {!collapsed && <span className="text-base">Sign Out</span>}
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`transition-all duration-300 ${collapsed ? 'lg:pl-16' : 'lg:pl-64 xl:pl-72'}`}>
        {/* Mobile Header - hidden on desktop */}
        {showHeader && (
          <header className="lg:hidden sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5">
            <div className="px-4 py-4">
              <div className="flex justify-between items-center">
                {/* Left side */}
                <div className="flex items-center gap-3">
                  <img src="/Venn-Logo.png" alt="Venn" className="w-8 h-8" />
                  {headerLeft}
                </div>

                {/* Right side - Icons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => router.push('/activity')}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </button>
                  <MessageIcon />
                  <NotificationBell />
                  {profile && (
                    <button
                      onClick={() => router.push('/profile')}
                      className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold"
                    >
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.full_name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        profile.full_name?.[0]?.toUpperCase() || '?'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Page Content */}
        <main className="pb-24 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation - hidden on desktop */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-black/60 backdrop-blur-xl border-t border-white/10 safe-area-bottom z-50">
        <div className="max-w-2xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/dashboard')}
              className={`flex flex-col items-center gap-1 px-4 py-2 ${
                pathname === '/dashboard' ? 'rounded-full bg-white/10' : ''
              }`}
            >
              <svg className={`w-6 h-6 ${pathname === '/dashboard' ? 'text-white' : 'text-white/40'}`} fill={pathname === '/dashboard' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className={`text-xs ${pathname === '/dashboard' ? 'text-white font-medium' : 'text-white/40'}`}>Home</span>
            </button>

            <button
              onClick={() => router.push('/events')}
              className={`flex flex-col items-center gap-1 px-4 py-2 ${
                pathname.startsWith('/events') ? 'rounded-full bg-white/10' : ''
              }`}
            >
              <svg className={`w-6 h-6 ${pathname.startsWith('/events') ? 'text-white' : 'text-white/40'}`} fill={pathname.startsWith('/events') ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className={`text-xs ${pathname.startsWith('/events') ? 'text-white font-medium' : 'text-white/40'}`}>Events</span>
            </button>

            {/* Create Button - Center */}
            <button
              onClick={() => router.push('/create')}
              className="flex flex-col items-center gap-1 px-4 py-2"
            >
              <div className="w-12 h-12 bg-gradient-to-r from-primary-400 to-primary-600 rounded-full flex items-center justify-center -mt-6 shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-xs text-white/40">Create</span>
            </button>

            <button
              onClick={() => router.push('/discover')}
              className={`flex flex-col items-center gap-1 px-4 py-2 ${
                pathname === '/discover' ? 'rounded-full bg-white/10' : ''
              }`}
            >
              <svg className={`w-6 h-6 ${pathname === '/discover' ? 'text-white' : 'text-white/40'}`} fill={pathname === '/discover' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className={`text-xs ${pathname === '/discover' ? 'text-white font-medium' : 'text-white/40'}`}>Discover</span>
            </button>

            <button
              onClick={() => router.push('/profile')}
              className={`flex flex-col items-center gap-1 px-4 py-2 ${
                pathname === '/profile' ? 'rounded-full bg-white/10' : ''
              }`}
            >
              <svg className={`w-6 h-6 ${pathname === '/profile' ? 'text-white' : 'text-white/40'}`} fill={pathname === '/profile' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className={`text-xs ${pathname === '/profile' ? 'text-white font-medium' : 'text-white/40'}`}>Profile</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  )
}
