import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createOrGetUser, updateUsername } from '../api';

function generateUUID(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for non-secure contexts (plain HTTP on intranet)
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => {
    const n = Number(c);
    return (n ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (n / 4)))).toString(16);
  });
}

interface UserContextType {
  userId: string;
  username: string;
  setUsername: (name: string) => Promise<void>;
  isRegistered: boolean;
}

const UserContext = createContext<UserContextType>({
  userId: '',
  username: '',
  setUsername: async () => {},
  isRegistered: false,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState(() => {
    const saved = localStorage.getItem('doodle-user-id');
    return saved || generateUUID();
  });
  const [username, setUsernameState] = useState(() => {
    return localStorage.getItem('doodle-username') || '';
  });
  const [isRegistered, setIsRegistered] = useState(false);

  // Persist userId
  useEffect(() => {
    localStorage.setItem('doodle-user-id', userId);
  }, [userId]);

  // Register on first load if we have a username
  useEffect(() => {
    if (username) {
      createOrGetUser(username, userId)
        .then(user => {
          setUserId(user.id);
          setIsRegistered(true);
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setUsername = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem('doodle-username', trimmed);
    setUsernameState(trimmed);
    try {
      if (isRegistered) {
        const user = await updateUsername(userId, trimmed);
        setUserId(user.id);
      } else {
        const user = await createOrGetUser(trimmed, userId);
        setUserId(user.id);
        setIsRegistered(true);
      }
    } catch {
      // Still set locally even if server fails
    }
  };

  return (
    <UserContext.Provider value={{ userId, username, setUsername, isRegistered }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
