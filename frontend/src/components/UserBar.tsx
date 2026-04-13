import { useState, useRef, useEffect } from 'react';
import { useUser } from '../context/UserContext';

export default function UserBar() {
  const { username, setUsername, isRegistered } = useUser();
  const [value, setValue] = useState(username);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [showRegistered, setShowRegistered] = useState(false);
  const fadeRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setValue(username);
  }, [username]);

  const triggerRegisteredFlash = () => {
    setShowRegistered(true);
    if (fadeRef.current) clearTimeout(fadeRef.current);
    fadeRef.current = setTimeout(() => setShowRegistered(false), 5000);
  };

  const handleChange = (newVal: string) => {
    setValue(newVal);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (newVal.trim()) {
        setUsername(newVal.trim());
        triggerRegisteredFlash();
      }
    }, 800);
  };

  const handleBlur = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim() && value.trim() !== username) {
      setUsername(value.trim());
      triggerRegisteredFlash();
    }
  };

  return (
    <div className="user-bar">
      <label htmlFor="username-input" className="user-label">
        Your Name:
      </label>
      <input
        id="username-input"
        type="text"
        className="user-input"
        value={value}
        onChange={e => handleChange(e.target.value)}
        onBlur={handleBlur}
        placeholder="Enter your name to vote..."
        maxLength={50}
        autoComplete="off"
      />
      {isRegistered && showRegistered && (
        <span className="user-status user-status-fade">✓ Registered</span>
      )}
    </div>
  );
}
