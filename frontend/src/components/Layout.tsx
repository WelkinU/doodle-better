import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import UserBar from './UserBar';

export default function Layout() {
  const { dark, toggle } = useTheme();
  const location = useLocation();

  return (
    <div className="layout">
      <header className="app-header">
        <div className="header-left">
          <Link to="/" className="logo-link">
            <span className="logo-emoji">🐐</span>
            <h1 className="logo-text">Doodle Better</h1>
          </Link>
        </div>
        <nav className="header-nav">
          <Link to="/" className={location.pathname === '/' || location.pathname.startsWith('/week/') ? 'active' : ''}>
            This Week
          </Link>
          <Link to="/my-polls" className={location.pathname === '/my-polls' ? 'active' : ''}>
            My Polls
          </Link>
          <Link to="/history" className={location.pathname === '/history' ? 'active' : ''}>
            History
          </Link>
          <Link to="/admin" className={location.pathname === '/admin' ? 'active' : ''}>
            Admin
          </Link>
        </nav>
        <div className="header-right">
          <button
            className="theme-toggle"
            onClick={toggle}
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
      </header>
      <div className="user-bar-container">
        <UserBar />
      </div>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <p>Doodle Better — Made with 🐐 energy</p>
      </footer>
    </div>
  );
}
