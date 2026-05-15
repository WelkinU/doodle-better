import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface ShowResponsesContextType {
  showByDefault: boolean;
  toggle: () => void;
}

const ShowResponsesContext = createContext<ShowResponsesContextType>({ showByDefault: false, toggle: () => {} });

export function ShowResponsesProvider({ children }: { children: ReactNode }) {
  const [showByDefault, setShowByDefault] = useState(() => {
    const saved = localStorage.getItem('doodle-show-responses');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('doodle-show-responses', String(showByDefault));
  }, [showByDefault]);

  return (
    <ShowResponsesContext.Provider value={{ showByDefault, toggle: () => setShowByDefault(v => !v) }}>
      {children}
    </ShowResponsesContext.Provider>
  );
}

export const useShowResponses = () => useContext(ShowResponsesContext);
