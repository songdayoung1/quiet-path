import React, { createContext, useContext } from 'react';

export type RefreshRecordImageUrl = (recordId: string) => Promise<string | null>;

const RecordImageRefreshContext = createContext<RefreshRecordImageUrl | null>(null);

interface RecordImageRefreshProviderProps {
  refreshImageUrl: RefreshRecordImageUrl;
  children: React.ReactNode;
}

export const RecordImageRefreshProvider: React.FC<RecordImageRefreshProviderProps> = ({
  refreshImageUrl,
  children,
}) => (
  <RecordImageRefreshContext.Provider value={refreshImageUrl}>
    {children}
  </RecordImageRefreshContext.Provider>
);

export const useRecordImageRefresh = () => useContext(RecordImageRefreshContext);
