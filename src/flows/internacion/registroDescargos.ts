export type EstadoDescargo = {
  estado: "pendiente" | "recibido" | "anulado";
  codigo?: string;
  anuladoPor?: string;
  anuladoEn?: string;
  recibidoPor?: string;
  recibidoEn?: string;
};

type Descargos = Record<string, EstadoDescargo>;

const clave = "hme:descargos-internacion";
const evento = "internacion:descargos-actualizados";
let cache: Descargos | null = null;

function disponible() {
  return typeof window !== "undefined";
}

export function leerDescargos(): Descargos {
  if (cache) return cache;
  if (!disponible()) return (cache = {});
  try {
    const guardados: unknown = JSON.parse(
      window.localStorage.getItem(clave) ?? "{}",
    );
    return (cache =
      guardados && typeof guardados === "object" && !Array.isArray(guardados)
        ? (guardados as Descargos)
        : {});
  } catch {
    return (cache = {});
  }
}

export function registrarRecepcionDescargo(id: string, recibidoPor: string) {
  if (leerDescargos()[id]?.estado === "anulado") throw new Error("No se puede descargar una solicitud anulada.");
  if (leerDescargos()[id]?.estado === "recibido") return;
  const descargos = {
    ...leerDescargos(),
    [id]: {
      estado: "recibido" as const,
      codigo: codigoDescargo(id),
      recibidoPor,
      recibidoEn: new Date().toISOString(),
    },
  };
  window.localStorage.setItem(clave, JSON.stringify(descargos));
  cache = descargos;
  window.dispatchEvent(new Event(evento));
}

export function codigoDescargo(id: string): string {
  return leerDescargos()[id]?.codigo || `DESC-${encodeURIComponent(id)}`;
}

export function anularDescargo(id: string, responsable: string) {
  if (leerDescargos()[id]?.estado === "recibido") throw new Error("Un descargo realizado debe gestionarse mediante devoluciones.");
  if (leerDescargos()[id]?.estado === "anulado") return;
  const descargos: Descargos = { ...leerDescargos(), [id]: {
    estado: "anulado", codigo: codigoDescargo(id), anuladoPor: responsable, anuladoEn: new Date().toISOString(),
  } };
  window.localStorage.setItem(clave, JSON.stringify(descargos));
  cache = descargos;
  window.dispatchEvent(new Event(evento));
}

export function suscribirDescargos(actualizar: () => void) {
  if (!disponible()) return () => undefined;
  const manejar = () => {
    cache = null;
    actualizar();
  };
  window.addEventListener(evento, manejar);
  window.addEventListener("storage", manejar);
  return () => {
    window.removeEventListener(evento, manejar);
    window.removeEventListener("storage", manejar);
  };
}
