import './styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import './radius/tema/TemaSistema.css';
import './styles/ClinicoAzul.css';
import './styles/ClinicoRefinamiento.css';
import './styles/SidebarProductos.css';
import './styles/SubvistasCompactas.css';


createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
