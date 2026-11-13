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
  import.meta.env.DEV && (idsPrueba.includes(registro.id) || registro.id.startsWith("prueba-internacion-"));

export function esPacienteUci(registro: Pick<RegistroInternacion, "sala" | "tipoSala" | "servicio">) {
  const ubicacion = [registro.sala, registro.tipoSala, registro.servicio]
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
  return /\buci\b|terapia intensiva|cuidados intensivos|recuperacion/.test(ubicacion);
}

function agregarPacientesPrueba(registros: RegistroInternacion[]) {
  if (!import.meta.env.DEV) return registros.filter((registro) => !idsPrueba.includes(registro.id));
  if (registros.some((registro) => registro.id.startsWith("prueba-internacion-"))) return registros;
  const ahora = new Date();
  const fecha = ahora.toLocaleDateString("es-BO");
  const nuevos = idsPrueba.filter((id) => !registros.some((registro) => registro.id === id)).map((id): RegistroInternacion => {
    const numero = idsPrueba.indexOf(id) + 1;
    const esTerapiaIntensiva = numero === 3;
    return {
      id,
      pacienteId: `paciente-prueba-internacion-${numero}`,
      paciente: esTerapiaIntensiva ? "Paciente de prueba UCI" : `Paciente de prueba Internación ${numero === 1 ? "Uno" : "Dos"}`,
      ci: `TEST-INT-00${numero}`,
      medico: esTerapiaIntensiva ? "Dr. Ejemplo UCI" : "Administrador local",
      motivo: esTerapiaIntensiva ? "Neumonia grave - vigilancia intensiva" : "Paciente ficticio para pruebas de internación",
      fecha,
      fechaIngreso: fecha,
      horaIngreso: esTerapiaIntensiva ? "08:15" : numero === 1 ? "09:20" : "11:40",
      estado: "confirmada",
      sala: esTerapiaIntensiva ? "UCI" : numero === 1 ? "105" : "106",
      cama: esTerapiaIntensiva ? "A" : "A",
      tipoSala: esTerapiaIntensiva ? "Terapia intensiva" : "Sala compartida",
      servicio: esTerapiaIntensiva ? "Terapia intensiva" : "Medicina interna",
      origen: "Prueba local",
      observaciones: "Datos ficticios para comprobar enfermería, médico y cola de atención.",
      datosPaciente: {
        nacimiento: esTerapiaIntensiva ? "1978-04-12" : numero === 1 ? "1990-01-15" : "1985-06-20",
        sexo: esTerapiaIntensiva || numero === 1 ? "Masculino" : "Femenino",
        responsableNombre: esTerapiaIntensiva ? "Familiar de prueba" : "Responsable de prueba",
      },
    };
  });
  return [...registros, ...nuevos].map((registro) => {
    if (!idsPrueba.includes(registro.id)) return registro;
    const numero = idsPrueba.indexOf(registro.id) + 1;
    if (numero === 1) return { ...registro, sala: "105", cama: "A", tipoSala: "Sala compartida" };
    if (numero === 2) return { ...registro, sala: "106", cama: "A", tipoSala: "Sala compartida" };
    return { ...registro, sala: "UCI", cama: "A", tipoSala: "Terapia intensiva", servicio: "Terapia intensiva" };
  });
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
    const completos = agregarPacientesPrueba(registros);
    if (import.meta.env.DEV && JSON.stringify(completos) !== JSON.stringify(registros)) {
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
