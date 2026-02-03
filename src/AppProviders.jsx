import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { HelmetProvider } from 'react-helmet-async';
import theme from './theme';
import { AuthProvider } from '@/context/AuthContext';
import { ChatProvider } from '@/context/ChatContext';
import { CustomShanProvider } from '@/context/CustomShanContext';
import { SkillsProvider } from '@/context/SkillsContext';
import { ProjectProvider } from '@/context/ProjectContext';
import { InitialDataProvider } from './context/InitialDataContext.jsx';

export function AppProviders({ children, helmetContext = {}, initialData = {} }) {
  return (
    <HelmetProvider context={helmetContext}>
      <InitialDataProvider value={initialData}>
        <AuthProvider initialData={initialData?.auth}>
          <ChatProvider initialData={initialData?.chat}>
            <CustomShanProvider>
              <SkillsProvider>
                <ProjectProvider>
                  <ThemeProvider theme={theme}>{children}</ThemeProvider>
                </ProjectProvider>
              </SkillsProvider>
            </CustomShanProvider>
          </ChatProvider>
        </AuthProvider>
      </InitialDataProvider>
    </HelmetProvider>
  );
}

export default AppProviders;
