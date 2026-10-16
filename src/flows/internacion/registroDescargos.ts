export type EstadoDescargo = {
  estado: 'pendiente' | 'recibido';
  recibidoPor?: string;
  recibidoEn?: string;
};

type Descargos = Record<string, EstadoDescargo>;

const clave = 'hme:descargos-internacion';
const evento = 'internacion:descargos-actualizados';
let cache: Descargos | null = null;

function disponible() {
  return typeof window !== 'undefined';
}

export function leerDescargos(): Descargos {
  if (cache) return cache;
  if (!disponible()) return (cache = {});
  try {
    const guardados: unknown = JSON.parse(window.localStorage.getItem(clave) ?? '{}');
    return (cache = guardados && typeof guardados === 'object' && !Array.isArray(guardados) ? guardados as Descargos : {});
  } catch {
    return (cache = {});
  }
}

export function registrarRecepcionDescargo(id: string, recibidoPor: string) {
  const descargos = {
    ...leerDescargos(),
    [id]: { estado: 'recibido' as const, recibidoPor, recibidoEn: new Date().toISOString() },
  };
  cache = descargos;
  window.localStorage.setItem(clave, JSON.stringify(descargos));
  window.dispatchEvent(new Event(evento));
}

export function suscribirDescargos(actualizar: () => void) {
  if (!disponible()) return () => undefined;
  const manejar = () => { cache = null; actualizar(); };
  window.addEventListener(evento, manejar);
  window.addEventListener('storage', manejar);
  return () => {
    window.removeEventListener(evento, manejar);
    window.removeEventListener('storage', manejar);
  };
}
