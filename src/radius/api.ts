import { leerSesion } from "./types/sesion";
import { esModoPruebaLocal } from "./datos/modoPrueba";

export async function apiFetch(input: string, init: RequestInit = {}) {
  if (import.meta.env.DEV && esModoPruebaLocal()) {
    const { respuestaPrueba } = await import("./datos/apiPrueba");
    const respuesta = await respuestaPrueba(input, init);
    if (respuesta) return respuesta;
  }
  const token = leerSesion()?.token;
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  return fetch(input, { ...init, headers });
}

export async function apiContableFetch(input: string, init: RequestInit = {}) {
  if (import.meta.env.DEV && esModoPruebaLocal() && !["GET", "HEAD", "OPTIONS"].includes((init.method || "GET").toUpperCase())) {
    return Response.json({ message: "Las operaciones contables requieren datos reales; los pacientes de prueba permanecen en el navegador." }, { status: 501 });
  }
  const baseUrl = import.meta.env.VITE_API_CONTABLE_URL || "/api-contable";
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  const path = input.startsWith("/") ? input : `/${input}`;
  return fetch(`${baseUrl.replace(/\/$/, "")}${path}`, { ...init, headers });
}
