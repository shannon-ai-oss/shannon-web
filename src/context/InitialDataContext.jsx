import React, { createContext, useContext } from 'react';

const InitialDataContext = createContext({});

export function InitialDataProvider({ value, children }) {
  return <InitialDataContext.Provider value={value || {}}>{children}</InitialDataContext.Provider>;
}

export function useInitialData() {
  return useContext(InitialDataContext);
}

export default InitialDataContext;
