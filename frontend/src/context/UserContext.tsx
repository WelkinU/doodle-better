import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createOrGetUser, updateUsername } from '../api';

function generateUUID(): string {
  return crypto.randomUUID();
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
