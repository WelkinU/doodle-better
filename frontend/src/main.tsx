import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { ShowResponsesProvider } from './context/ShowResponsesContext';
import { UserProvider } from './context/UserContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ShowResponsesProvider>
          <UserProvider>
            <App />
          </UserProvider>
        </ShowResponsesProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
