export const claveModoPrueba = "clinico:pacientes-prueba:activos";

export function esModoPruebaLocal() {
  return import.meta.env.DEV && localStorage.getItem(claveModoPrueba) === "1";
}
