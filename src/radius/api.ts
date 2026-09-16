import { leerSesion } from './types/sesion';

export async function apiFetch(input: string, init: RequestInit = {}) {
  const token = leerSesion()?.token;
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(input, { ...init, headers });
  if (response.status === 401) {
    localStorage.removeItem('pulso_session');
    sessionStorage.removeItem('pulso_session');
    window.dispatchEvent(new Event('sesion-expirada'));
  }
  return response;
}
