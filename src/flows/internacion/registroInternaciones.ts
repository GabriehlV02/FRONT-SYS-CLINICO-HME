export type EstadoInternacion = "preinternacion" | "confirmada" | "alta";

export type RegistroInternacion = {
  id: string;
  pacienteId?: string;
  profesionalId?: string;
  paciente: string;
  ci: string;
  medico: string;
  motivo: string;
  fecha: string;
  estado: EstadoInternacion;
  sala?: string;
  cama?: string;
  tipoSala?: string;
  datosPaciente?: Record<string, string>;
  fechaIngreso?: string;
  horaIngreso?: string;
  origen?: string;
  servicio?: string;
  observaciones?: string;
  fechaAlta?: string;
};

export type EvolucionEnfermeriaInternacion = {
  id: string;
  pacienteId: string;
  texto: string;
  fecha: string;
  hora: string;
  creadaEn: string;
  editadaEn?: string;
};

export type TomaSignosInternacion = {
  valores?: Record<string, string>;
  observacion?: string;
  id: string;
  pacienteId: string;
  fecha: string;
  hora: string;
  temperatura: number;
  frecuenciaCardiaca: number;
  frecuenciaRespiratoria: number;
  saturacion: number;
  presionSistolica: number;
  presionDiastolica: number;
  registradaEn: string;
};

export type RegistroBalanceInternacion = {
  anotacion?: string;
  id: string;
  pacienteId: string;
  tipo: "ingreso" | "egreso";
  volumen: number;
  detalle: string;
  fecha: string;
  hora: string;
};

const clave = "hme:internaciones";
const claveEvolucionesEnfermeria = "hme:internacion:evoluciones-enfermeria:v1";
const claveSignosInternacion = "hme:internacion:signos-vitales:v1";
const claveBalanceInternacion = "hme:internacion:balance-hidrico:v1";
const evento = "internacion:actualizada";
let cache: RegistroInternacion[] | null = null;
const idsPrueba = ["INT-PRUEBA-LOCAL-001", "INT-PRUEBA-LOCAL-002", "INT-PRUEBA-UCI-001"];
export const esInternacionPruebaLocal = (registro: RegistroInternacion) =>
  (idsPrueba.includes(registro.id) || registro.id.startsWith("prueba-internacion-"));

export function esPacienteUci(registro: Pick<RegistroInternacion, "sala" | "tipoSala" | "servicio">) {
  const ubicacion = [registro.sala, registro.tipoSala, registro.servicio]
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
  return /\buci\b|terapia intensiva|cuidados intensivos|recuperacion/.test(ubicacion);
}

export function obtenerEjemplosInternacion(): RegistroInternacion[] { return []; }

function disponible() {
  return typeof window !== "undefined";
}

export function leerInternaciones(): RegistroInternacion[] {
  if (cache) return cache;
  if (!disponible()) return (cache = []);
  try {
    const guardadas = JSON.parse(window.localStorage.getItem(clave) ?? "[]");
    const registros = Array.isArray(guardadas) ? guardadas : [];
    const completos = registros.filter((registro) => !esInternacionPruebaLocal(registro));
    if (JSON.stringify(completos) !== JSON.stringify(registros)) {
      window.localStorage.setItem(clave, JSON.stringify(completos));
    }
    return (cache = completos);
  } catch {
    return (cache = []);
  }
}

function guardar(registros: RegistroInternacion[]) {
  cache = registros;
  window.localStorage.setItem(clave, JSON.stringify(cache));
  window.dispatchEvent(new Event(evento));
}

export function leerEvolucionesEnfermeriaInternacion(
  pacienteId: string,
): EvolucionEnfermeriaInternacion[] {
  if (!disponible()) return [];
  try {
    const registros = JSON.parse(
      window.localStorage.getItem(claveEvolucionesEnfermeria) ?? "[]",
    );
    return Array.isArray(registros)
      ? registros.filter(
          (item): item is EvolucionEnfermeriaInternacion =>
            item?.pacienteId === pacienteId &&
            typeof item.texto === "string" &&
            typeof item.fecha === "string" &&
            typeof item.hora === "string",
        )
      : [];
  } catch {
    return [];
  }
}

export function guardarEvolucionEnfermeriaInternacion(
  pacienteId: string,
  datos: Pick<EvolucionEnfermeriaInternacion, "texto" | "fecha" | "hora">,
  id?: string,
) {
  if (!disponible()) throw new Error("No se pudo guardar la evolución.");
  let registros: EvolucionEnfermeriaInternacion[] = [];
  try {
    const guardados = JSON.parse(
      window.localStorage.getItem(claveEvolucionesEnfermeria) ?? "[]",
    );
    if (Array.isArray(guardados)) registros = guardados;
  } catch {
    registros = [];
  }
  const existente = id
    ? registros.find((item) => item.id === id && item.pacienteId === pacienteId)
    : undefined;
  const registro: EvolucionEnfermeriaInternacion = {
    id: existente?.id ?? crypto.randomUUID(),
    pacienteId,
    ...datos,
    creadaEn: existente?.creadaEn ?? new Date().toISOString(),
    ...(existente ? { editadaEn: new Date().toISOString() } : {}),
  };
  const siguientes = existente
    ? registros.map((item) => (item.id === existente.id ? registro : item))
    : [...registros, registro];
  window.localStorage.setItem(
    claveEvolucionesEnfermeria,
    JSON.stringify(siguientes),
  );
  return registro;
}

export function leerSignosInternacion(pacienteId: string): TomaSignosInternacion[] {
  if (!disponible()) return [];
  try {
    const registros = JSON.parse(window.localStorage.getItem(claveSignosInternacion) ?? "[]");
    return Array.isArray(registros)
      ? registros.filter((item): item is TomaSignosInternacion =>
          item?.pacienteId === pacienteId &&
          typeof item.fecha === "string" &&
          typeof item.hora === "string" &&
          Number.isFinite(item.temperatura) &&
          Number.isFinite(item.frecuenciaCardiaca) &&
          Number.isFinite(item.frecuenciaRespiratoria) &&
          Number.isFinite(item.saturacion) &&
          Number.isFinite(item.presionSistolica) &&
          Number.isFinite(item.presionDiastolica),
        ).sort((a, b) => `${a.fecha}T${a.hora}`.localeCompare(`${b.fecha}T${b.hora}`))
      : [];
  } catch {
    return [];
  }
}

export function guardarSignosInternacion(
  pacienteId: string,
  toma: Omit<TomaSignosInternacion, "id" | "pacienteId" | "registradaEn">,
) {
  if (!disponible()) throw new Error("No se pudieron guardar los signos vitales.");
  let registros: TomaSignosInternacion[] = [];
  try {
    const guardados = JSON.parse(window.localStorage.getItem(claveSignosInternacion) ?? "[]");
    if (Array.isArray(guardados)) registros = guardados;
  } catch {
    registros = [];
  }
  const registro: TomaSignosInternacion = {
    ...toma,
    id: crypto.randomUUID(),
    pacienteId,
    registradaEn: new Date().toISOString(),
  };
  window.localStorage.setItem(claveSignosInternacion, JSON.stringify([...registros, registro]));
  return registro;
}

export function leerBalanceInternacion(pacienteId: string): RegistroBalanceInternacion[] {
  if (!disponible()) return [];
  try {
    const registros = JSON.parse(window.localStorage.getItem(claveBalanceInternacion) ?? "[]");
    return Array.isArray(registros)
      ? registros.filter((item): item is RegistroBalanceInternacion =>
          item?.pacienteId === pacienteId &&
          (item.tipo === "ingreso" || item.tipo === "egreso") &&
          Number.isFinite(item.volumen) &&
          typeof item.detalle === "string" &&
          typeof item.fecha === "string" &&
          typeof item.hora === "string",
        ).sort((a, b) => `${a.fecha}T${a.hora}`.localeCompare(`${b.fecha}T${b.hora}`))
      : [];
  } catch {
    return [];
  }
}

export function guardarRegistroBalanceInternacion(
  pacienteId: string,
  datos: Omit<RegistroBalanceInternacion, "id" | "pacienteId">,
) {
  if (!disponible()) throw new Error("No se pudo guardar el registro del balance.");
  let registros: RegistroBalanceInternacion[] = [];
  try {
    const guardados = JSON.parse(window.localStorage.getItem(claveBalanceInternacion) ?? "[]");
    if (Array.isArray(guardados)) registros = guardados;
  } catch {
    registros = [];
  }
  const registro: RegistroBalanceInternacion = { ...datos, id: crypto.randomUUID(), pacienteId };
  window.localStorage.setItem(claveBalanceInternacion, JSON.stringify([...registros, registro]));
  return registro;
}

const normalizarCi = (ci: string) =>
  ci
    .trim()
    .replace(/[\s-]+/g, "")
    .toLocaleUpperCase("es");

export function pacienteDisponible(ci: string, exceptoId = "") {
  const documento = normalizarCi(ci);
  return (
    documento !== "" &&
    !leerInternaciones().some(
      (item) =>
        item.id !== exceptoId &&
        item.estado !== "alta" &&
        normalizarCi(item.ci) === documento,
    )
  );
}

export function crearPreinternacion(
  datos: Omit<RegistroInternacion, "id" | "fecha" | "estado">,
) {
  if (!pacienteDisponible(datos.ci))
    throw new Error(
      "Este CI ya tiene una internación activa o pendiente. No se puede registrar al mismo paciente dos veces.",
    );
  const registro: RegistroInternacion = {
    ...datos,
    id: `PRE-${Date.now()}`,
    fecha: new Date().toLocaleDateString("es-BO"),
    estado: "preinternacion",
  };
  guardar([
    ...leerInternaciones(),
    registro,
  ]);
  return registro;
}

export function camaDisponible(sala: string, cama: string, exceptoId = "") {
  const ubicacion = `${sala.trim().toLocaleLowerCase("es")}|${cama.trim().toLocaleLowerCase("es")}`;
  return !leerInternaciones().some(
    (item) =>
      item.id !== exceptoId &&
      item.estado === "confirmada" &&
      `${item.sala?.trim().toLocaleLowerCase("es")}|${item.cama?.trim().toLocaleLowerCase("es")}` ===
        ubicacion,
  );
}

export function salaDisponibleEnHorario(sala: string, fecha: string, hora: string, exceptoId = "") {
  const ubicacion = sala.trim().toLocaleLowerCase("es");
  return !leerInternaciones().some((item) =>
    item.id !== exceptoId &&
    item.estado === "preinternacion" &&
    item.sala?.trim().toLocaleLowerCase("es") === ubicacion &&
    item.fechaIngreso === fecha &&
    item.horaIngreso === hora,
  );
}

export function confirmarInternacion(
  id: string,
  asignacion: Pick<RegistroInternacion, "sala" | "cama" | "tipoSala">,
) {
  const paciente = leerInternaciones().find((item) => item.id === id);
  if (!paciente || !pacienteDisponible(paciente.ci, id))
    throw new Error(
      "Este CI ya tiene una internación activa. No se puede confirmar una segunda internación para el mismo paciente.",
    );
  if (!camaDisponible(asignacion.sala ?? "", asignacion.cama ?? "", id))
    throw new Error(
      "La sala y cama seleccionadas ya están ocupadas. Elige una ubicación libre.",
    );
  const fechaIngreso = new Date().toLocaleDateString("es-BO");
  guardar(
    leerInternaciones().map((item) =>
      item.id === id
        ? {
            ...item,
            ...asignacion,
            fechaIngreso: item.fechaIngreso ?? fechaIngreso,
            estado: "confirmada" as const,
          }
        : item,
    ),
  );
}

export function actualizarInternacion(
  id: string,
  cambios: Pick<RegistroInternacion, "sala" | "cama" | "fechaIngreso">,
) {
  if (!camaDisponible(cambios.sala ?? "", cambios.cama ?? "", id))
    throw new Error(
      "La sala y cama seleccionadas ya están ocupadas. Elige una ubicación libre.",
    );
  guardar(
    leerInternaciones().map((item) =>
      item.id === id && item.estado === "confirmada"
        ? { ...item, ...cambios }
        : item,
    ),
  );
}

export function registrarAltaInternacion(id: string) {
  const fechaAlta = new Date().toLocaleDateString("es-BO");
  guardar(
    leerInternaciones().map((item) =>
      item.id === id && item.estado === "confirmada"
        ? { ...item, estado: "alta" as const, fechaAlta }
        : item,
    ),
  );
}

export function cancelarPreinternacion(id: string) {
  guardar(leerInternaciones().filter((item) => item.id !== id || item.estado !== "preinternacion"));
}

export function suscribirInternaciones(actualizar: () => void) {
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
