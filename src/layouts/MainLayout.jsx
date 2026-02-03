import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import { Box } from '@mui/material';
import lazyWithPreload from '@/utils/lazyWithPreload';
import './MainLayout.css';

const ChatHistorySidebar = lazyWithPreload(() => import('../components/ChatHistorySidebar'));

const MainLayout = () => {
  const location = useLocation();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const isCollapsedRef = useRef(false);
  const scrollStateRef = useRef({ lastScrollY: 0, ticking: false });
  const isChatRoute = location.pathname === '/chat';

  // Check if we're on Custom Shan, Skills, Memory, or Project pages (uses sidebar)
  const isCustomShanRoute = location.pathname.startsWith('/custom-shan');
  const isSkillsRoute = location.pathname.startsWith('/skills');
  const isMemoryRoute = location.pathname.startsWith('/memory');
  const isProjectRoute = location.pathname.startsWith('/projects');
  const usesSidebar = isChatRoute || isCustomShanRoute || isSkillsRoute || isMemoryRoute || isProjectRoute;

  useEffect(() => {
    // Show sidebar on chat, custom-shan, skills, memory, and projects pages
    const shouldShowSidebar = isChatRoute || isCustomShanRoute || isSkillsRoute || isMemoryRoute || isProjectRoute;
    setSidebarVisible(shouldShowSidebar);
  }, [location.pathname, isChatRoute, isCustomShanRoute, isSkillsRoute, isMemoryRoute, isProjectRoute]);

  useEffect(() => {
    if (sidebarVisible) {
      ChatHistorySidebar.preload();
    }
  }, [sidebarVisible]);

  useEffect(() => {
    isCollapsedRef.current = false;
    setIsHeaderCollapsed(false);

    if (typeof window !== 'undefined') {
      scrollStateRef.current.lastScrollY = window.scrollY || 0;
      scrollStateRef.current.ticking = false;
    }
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const updateCollapseState = () => {
      const currentScrollY = window.scrollY || 0;
      const { lastScrollY } = scrollStateRef.current;
      const delta = currentScrollY - lastScrollY;

      let nextCollapsed = isCollapsedRef.current;

      if (currentScrollY <= 0) {
        nextCollapsed = false;
      } else if (delta > 8 && currentScrollY > 80) {
        nextCollapsed = true;
      } else if (delta < -8) {
        nextCollapsed = false;
      }

      if (nextCollapsed !== isCollapsedRef.current) {
        isCollapsedRef.current = nextCollapsed;
        setIsHeaderCollapsed(nextCollapsed);
      }

      scrollStateRef.current.lastScrollY = currentScrollY;
      scrollStateRef.current.ticking = false;
    };

    const handleScroll = () => {
      if (scrollStateRef.current.ticking) {
        return;
      }
      scrollStateRef.current.ticking = true;
      window.requestAnimationFrame(updateCollapseState);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleSidebarCollapsedChange = useCallback((collapsed) => {
    setSidebarCollapsed(collapsed);
  }, []);

  return (
    <Box
      className={`layout-root ${isHeaderCollapsed ? 'header-collapsed' : ''} ${usesSidebar ? 'no-header' : ''} ${isChatRoute ? 'chat-route' : ''}`}
    >
      {/* Hide AppHeader when using sidebar */}
      {!usesSidebar && <AppHeader isCollapsed={isHeaderCollapsed} />}
      <Box className={`main-layout ${sidebarVisible ? 'sidebar-visible' : 'sidebar-hidden'} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {sidebarVisible && (
          <Suspense fallback={null}>
            <ChatHistorySidebar onCollapsedChange={handleSidebarCollapsedChange} />
          </Suspense>
        )}
        <Box
          component="main"
          className={`main-content ${isChatRoute ? 'chat-view' : ''} ${usesSidebar ? 'with-sidebar' : ''}`.trim()}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;
