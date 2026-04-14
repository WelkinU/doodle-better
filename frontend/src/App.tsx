import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import HistoryPage from './pages/HistoryPage';
import AdminPage from './pages/AdminPage';
import MyPollsPage from './pages/MyPollsPage';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/my-polls" element={<MyPollsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/week/:weekStart" element={<HomePage />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
