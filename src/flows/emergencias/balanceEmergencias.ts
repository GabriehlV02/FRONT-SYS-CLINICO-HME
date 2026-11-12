export type RegistroBalanceEmergencia = {
  id: string;
  cuentaId: string;
  tipo: "ingreso" | "egreso";
  volumen: number;
  detalle: string;
  fecha: string;
  hora: string;
};

const CLAVE = "hme:emergencias:balance-hidrico:v1";
const EVENTO = "emergencias:balance-hidrico:actualizado";

export function leerBalanceEmergencia(cuentaId: string): RegistroBalanceEmergencia[] {
  if (!cuentaId || typeof window === "undefined") return [];
  try {
    const registros: unknown = JSON.parse(window.localStorage.getItem(CLAVE) ?? "[]");
    return Array.isArray(registros)
      ? registros
          .filter((item): item is RegistroBalanceEmergencia =>
            item?.cuentaId === cuentaId &&
            (item.tipo === "ingreso" || item.tipo === "egreso") &&
            Number.isFinite(item.volumen) &&
            typeof item.detalle === "string" &&
            typeof item.fecha === "string" &&
            typeof item.hora === "string" &&
            typeof item.id === "string",
          )
          .sort((a, b) => `${a.fecha}T${a.hora}`.localeCompare(`${b.fecha}T${b.hora}`))
      : [];
  } catch {
    return [];
  }
}

export function guardarBalanceEmergencia(
  cuentaId: string,
  datos: Omit<RegistroBalanceEmergencia, "id" | "cuentaId">,
) {
  if (!cuentaId || typeof window === "undefined") {
    throw new Error("No se pudo identificar la atención de emergencia.");
  }
  try {
    const guardados: unknown = JSON.parse(window.localStorage.getItem(CLAVE) ?? "[]");
    const existentes = Array.isArray(guardados) ? guardados : [];
    const registro: RegistroBalanceEmergencia = {
      ...datos,
      id: crypto.randomUUID(),
      cuentaId,
    };
    window.localStorage.setItem(CLAVE, JSON.stringify([...existentes, registro]));
    window.dispatchEvent(new CustomEvent(EVENTO, { detail: cuentaId }));
    return registro;
  } catch {
    throw new Error("No se pudo guardar el registro del balance hídrico.");
  }
}

export function suscribirBalanceEmergencia(cuentaId: string, actualizar: () => void) {
  const alCambiarStorage = (evento: StorageEvent) => {
    if (evento.key === CLAVE) actualizar();
  };
  const alCambiarMismoDocumento = (evento: Event) => {
    if ((evento as CustomEvent<string>).detail === cuentaId) actualizar();
  };
  window.addEventListener("storage", alCambiarStorage);
  window.addEventListener(EVENTO, alCambiarMismoDocumento);
  return () => {
    window.removeEventListener("storage", alCambiarStorage);
    window.removeEventListener(EVENTO, alCambiarMismoDocumento);
  };
}
