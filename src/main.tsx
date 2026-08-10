import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { ensureConfiguration } from '@/db/repositories/configurationRepository';
import { ensureSyncState } from '@/db/repositories/syncStateRepository';

void Promise.all([ensureConfiguration(), ensureSyncState()]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
