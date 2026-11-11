export type MovimientoItemAmbulatorio = {
  id: string;
  fechaHora: string;
  tipo: "Pendiente" | "Dispensado" | "Utilizado" | "Anulado";
  consultorio?: string;
  medico?: string;
  item: string;
  codigo: string;
  cantidad: number;
  unidad: string;
  paciente: string;
  ci: string;
  responsable: string;
  observacion: string;
};

const CLAVE = "hme-uso-items-ambulatorio-v1";
const oyentes = new Set<() => void>();
const leer = (): MovimientoItemAmbulatorio[] => {
  try {
    const valor: unknown = JSON.parse(localStorage.getItem(CLAVE) || "[]");
    return Array.isArray(valor)
      ? valor.filter((item): item is MovimientoItemAmbulatorio =>
          Boolean(
            item &&
            typeof item === "object" &&
            "id" in item &&
            "fechaHora" in item,
          ),
        )
      : [];
  } catch {
    return [];
  }
};
let movimientos = leer();

export const obtenerMovimientosItems = () => movimientos;
export const registrarMovimientosItems = (
  borradores: Omit<MovimientoItemAmbulatorio, "id">[],
) => {
  const nuevos = borradores.map((borrador) => ({ ...borrador, id: crypto.randomUUID() }));
  const siguientes = [...nuevos, ...movimientos];
  localStorage.setItem(CLAVE, JSON.stringify(siguientes));
  movimientos = siguientes;
  oyentes.forEach((oyente) => oyente());
};
export const suscribirMovimientosItems = (oyente: () => void) => {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
};
export const registrarMovimientoItem = (
  borrador: Omit<MovimientoItemAmbulatorio, "id">,
) => {
  const movimiento = { ...borrador, id: crypto.randomUUID() };
  const siguientes = [movimiento, ...movimientos];
  localStorage.setItem(CLAVE, JSON.stringify(siguientes));
  movimientos = siguientes;
  oyentes.forEach((oyente) => oyente());
  return movimiento;
};
