export type PacienteDemo = {
  id: string;
  nombres: string;
  primerApellido: string;
  segundoApellido: string;
  tipoDocumento: string;
  numeroDocumento: string;
  fechaNacimiento: string;
  sexo: string;
  telefono: string;
  direccion: string;
  sucursal?: string;
  creadoEn: string;
  complementoCi?: string;
  expedidoEn?: string;
  nit?: string;
  razonSocial?: string;
  pais?: string;
  departamento?: string;
  ciudad?: string;
  zonaBarrio?: string;
  ciConQr?: boolean;
  responsableNombre?: string;
  responsableCi?: string;
  responsableTelefono?: string;
  responsableParentesco?: string;
  comoSeEntero?: string;
  observaciones?: string;
  habilitado?: boolean;
};
export type EstudioDemo = {
  id: string;
  pacienteId: string;
  paciente: string;
  titulo: string;
  categoria: string;
  descripcion: string;
  nombreArchivo: string;
  mime: string;
  archivoUrl?: string;
  creadaEn: string;
};
export type InformeDemo = {
  pacienteId: string;
  nombreArchivo: string;
  mime: string;
  creadoEn: string;
};
export type MovimientoPacienteDemo = {
  id: string;
  pacienteId: string;
  tipo: "consumo" | "pago";
  concepto: string;
  categoria: string;
  fecha: string;
  importe: number;
  metodoPago?: string;
  desglosePagos?: { metodo: string; importe: number }[];
  referencia?: string;
};
export type FamiliarPacienteDemo = {
  pacienteId: string;
  familiarId: string;
  parentesco: string;
  vinculadoEn: string;
};

const PACIENTES = "pulso_local_pacientes_v1",
  ESTUDIOS = "pulso_local_estudios_v1",
  SELECCION = "radiuus_estudio_seleccionado",
  INFORMES = "pulso_local_informes_v1",
  MUESTRA_PACIENTES = "pulso_local_pacientes_muestra_v1";
const HISTORIAL_PACIENTES = "pulso_local_historial_pacientes_v1";
const FAMILIARES_PACIENTES = "pulso_local_familiares_pacientes_v1";
const HISTORIAL_LUIS_DEMO: MovimientoPacienteDemo[] = [
  {
    id: "demo-luis-consulta-emergencia",
    pacienteId: "demo-pac-luis-morales",
    tipo: "consumo",
    concepto: "Consulta de emergencia",
    categoria: "Atención médica",
    fecha: "2026-11-08T09:05:00-04:00",
    importe: 80,
  },
  {
    id: "demo-luis-hemograma",
    pacienteId: "demo-pac-luis-morales",
    tipo: "consumo",
    concepto: "Hemograma completo",
    categoria: "Laboratorio",
    fecha: "2026-11-08T09:22:00-04:00",
    importe: 65,
  },
  {
    id: "demo-luis-nebulizacion",
    pacienteId: "demo-pac-luis-morales",
    tipo: "consumo",
    concepto: "Nebulización",
    categoria: "Procedimiento",
    fecha: "2026-11-08T09:40:00-04:00",
    importe: 35,
  },
  {
    id: "demo-luis-pago-efectivo",
    pacienteId: "demo-pac-luis-morales",
    tipo: "pago",
    concepto: "Pago en caja",
    categoria: "Pago recibido",
    fecha: "2026-11-08T10:10:00-04:00",
    importe: 80,
    metodoPago: "Efectivo",
    referencia: "REC-DEMO-001",
  },
  {
    id: "demo-luis-pago-qr",
    pacienteId: "demo-pac-luis-morales",
    tipo: "pago",
    concepto: "Pago parcial de cuenta",
    categoria: "Pago recibido",
    fecha: "2026-11-08T10:24:00-04:00",
    importe: 80,
    metodoPago: "QR",
    desglosePagos: [
      { metodo: "QR", importe: 30 },
      { metodo: "Efectivo", importe: 50 },
    ],
    referencia: "REC-DEMO-002",
  },
];

export function obtenerHistorialPacienteDemo(
  pacienteId: string,
): MovimientoPacienteDemo[] {
  const historial = leer<MovimientoPacienteDemo[]>(HISTORIAL_PACIENTES, []);
  const iniciales =
    pacienteId === "demo-pac-luis-morales" ? HISTORIAL_LUIS_DEMO : [];
  const combinadosBase = [
    ...iniciales.filter(
      (movimiento) => !historial.some((guardado) => guardado.id === movimiento.id),
    ),
    ...historial,
  ];
  const combinados = combinadosBase.map((movimiento) => {
    const inicial = iniciales.find((item) => item.id === movimiento.id);
    return !movimiento.desglosePagos && inicial?.desglosePagos
      ? { ...movimiento, desglosePagos: inicial.desglosePagos }
      : movimiento;
  });
  if (
    combinados.length !== historial.length ||
    combinados.some((movimiento) => {
      const anterior = historial.find((item) => item.id === movimiento.id);
      return anterior && JSON.stringify(anterior) !== JSON.stringify(movimiento);
    })
  ) {
    localStorage.setItem(HISTORIAL_PACIENTES, JSON.stringify(combinados));
  }
  return combinados
    .filter((movimiento) => movimiento.pacienteId === pacienteId)
    .sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
}

export function obtenerFamiliaresPacienteDemo(
  pacienteId: string,
): FamiliarPacienteDemo[] {
  try {
    const vinculos = JSON.parse(
      localStorage.getItem(FAMILIARES_PACIENTES) || "[]",
    ) as FamiliarPacienteDemo[];
    return vinculos.filter((vinculo) => vinculo.pacienteId === pacienteId);
  } catch {
    return [];
  }
}

export function vincularFamiliarPacienteDemo(
  pacienteId: string,
  familiarId: string,
  parentesco: string,
): FamiliarPacienteDemo[] {
  if (pacienteId === familiarId)
    throw new Error("El paciente no puede vincularse consigo mismo.");
  const guardados = JSON.parse(
    localStorage.getItem(FAMILIARES_PACIENTES) || "[]",
  ) as FamiliarPacienteDemo[];
  if (
    guardados.some(
      (vinculo) =>
        vinculo.pacienteId === pacienteId && vinculo.familiarId === familiarId,
    )
  )
    throw new Error("Este familiar ya está vinculado a la ficha.");
  const siguientes = [
    ...guardados,
    { pacienteId, familiarId, parentesco, vinculadoEn: new Date().toISOString() },
  ];
  localStorage.setItem(FAMILIARES_PACIENTES, JSON.stringify(siguientes));
  window.dispatchEvent(new Event("radiuus:datos-demo"));
  return obtenerFamiliaresPacienteDemo(pacienteId);
}
export const pacientesIniciales: PacienteDemo[] = [
  {
    id: "demo-pac-001",
    nombres: "María Fernanda",
    primerApellido: "López",
    segundoApellido: "García",
    tipoDocumento: "CI",
    numeroDocumento: "6845210",
    fechaNacimiento: "1988-04-12",
    sexo: "femenino",
    telefono: "70712345",
    direccion: "Av. Blanco Galindo, zona central",
    sucursal: "Central",
    creadoEn: "2026-10-01T08:00:00.000Z",
  },
  {
    id: "demo-pac-002",
    nombres: "Carlos Alberto",
    primerApellido: "Mendoza",
    segundoApellido: "Rojas",
    tipoDocumento: "CI",
    numeroDocumento: "5987412",
    fechaNacimiento: "1975-09-23",
    sexo: "masculino",
    telefono: "76423018",
    direccion: "Barrio Queru Queru",
    sucursal: "Central",
    creadoEn: "2026-10-01T08:05:00.000Z",
  },
  {
    id: "demo-pac-003",
    nombres: "Ana Sofía",
    primerApellido: "Quispe",
    segundoApellido: "Vargas",
    tipoDocumento: "CI",
    numeroDocumento: "7319845",
    fechaNacimiento: "1995-02-18",
    sexo: "femenino",
    telefono: "69984021",
    direccion: "Zona Norte",
    sucursal: "Norte",
    creadoEn: "2026-10-01T08:10:00.000Z",
  },
  {
    id: "demo-pac-004",
    nombres: "Jorge Luis",
    primerApellido: "Torrez",
    segundoApellido: "Flores",
    tipoDocumento: "CI",
    numeroDocumento: "4567812",
    fechaNacimiento: "1969-11-05",
    sexo: "masculino",
    telefono: "70356219",
    direccion: "Av. Petrolera",
    sucursal: "Sur",
    creadoEn: "2026-10-01T08:15:00.000Z",
  },
  {
    id: "demo-pac-005",
    nombres: "Lucía",
    primerApellido: "Fernández",
    segundoApellido: "Arce",
    tipoDocumento: "CI",
    numeroDocumento: "8201456",
    fechaNacimiento: "2001-07-29",
    sexo: "femenino",
    telefono: "74561802",
    direccion: "Tiquipaya",
    sucursal: "Norte",
    creadoEn: "2026-10-01T08:20:00.000Z",
  },
  {
    id: "demo-pac-006",
    nombres: "Diego Andrés",
    primerApellido: "Salazar",
    segundoApellido: "Cruz",
    tipoDocumento: "CI",
    numeroDocumento: "6120934",
    fechaNacimiento: "1983-01-16",
    sexo: "masculino",
    telefono: "72139450",
    direccion: "Cala Cala",
    sucursal: "Central",
    creadoEn: "2026-10-01T08:25:00.000Z",
  },
  {
    id: "demo-pac-007",
    nombres: "Elena Patricia",
    primerApellido: "Castillo",
    segundoApellido: "Mamani",
    tipoDocumento: "CI",
    numeroDocumento: "7942018",
    fechaNacimiento: "1992-05-08",
    sexo: "femenino",
    telefono: "76824591",
    direccion: "Valle Hermoso",
    sucursal: "Sur",
    creadoEn: "2026-10-01T08:30:00.000Z",
  },
  {
    id: "demo-pac-008",
    nombres: "Roberto",
    primerApellido: "Paredes",
    segundoApellido: "Soto",
    tipoDocumento: "CI",
    numeroDocumento: "5371649",
    fechaNacimiento: "1958-12-14",
    sexo: "masculino",
    telefono: "71456038",
    direccion: "Sacaba",
    sucursal: "Central",
    creadoEn: "2026-10-01T08:35:00.000Z",
  },
  {
    id: "demo-pac-009",
    nombres: "Valentina",
    primerApellido: "Ramos",
    segundoApellido: "Molina",
    tipoDocumento: "CI",
    numeroDocumento: "8923751",
    fechaNacimiento: "1998-03-27",
    sexo: "femenino",
    telefono: "79018342",
    direccion: "Colcapirhua",
    sucursal: "Norte",
    creadoEn: "2026-10-01T08:40:00.000Z",
  },
  {
    id: "demo-pac-010",
    nombres: "Miguel Ángel",
    primerApellido: "Herrera",
    segundoApellido: "Pérez",
    tipoDocumento: "CI",
    numeroDocumento: "4692830",
    fechaNacimiento: "1980-08-31",
    sexo: "masculino",
    telefono: "73502916",
    direccion: "Zona Sud",
    sucursal: "Sur",
    creadoEn: "2026-10-01T08:45:00.000Z",
  },
  {
    id: "demo-pac-luis-morales",
    nombres: "Luis Eduardo",
    primerApellido: "Morales",
    segundoApellido: "Rojas",
    tipoDocumento: "CI",
    numeroDocumento: "6543210",
    fechaNacimiento: "1986-06-14",
    sexo: "masculino",
    telefono: "70765432",
    direccion: "Av. América, Cochabamba",
    sucursal: "Central",
    creadoEn: "2026-11-01T08:00:00.000Z",
  },
  {
    id: "demo-pac-consultorio-prueba",
    nombres: "Paciente de prueba",
    primerApellido: "Consultorio",
    segundoApellido: "Medico",
    tipoDocumento: "CI",
    numeroDocumento: "PRUEBA-CLINICA-0001",
    fechaNacimiento: "1990-01-01",
    sexo: "no_especifica",
    telefono: "",
    direccion: "Registro ficticio para pruebas del consultorio",
    sucursal: "Central",
    creadoEn: "2026-11-11T08:00:00.000Z",
    comoSeEntero: "Prueba del sistema",
    observaciones: "Paciente ficticio para practicar el flujo de consulta médica.",
  },
  {
    id: "demo-pac-uci-prueba",
    nombres: "Paciente de prueba",
    primerApellido: "Unidad UCI",
    segundoApellido: "Demo",
    tipoDocumento: "CI",
    numeroDocumento: "TEST-UCI-20261111",
    fechaNacimiento: "1990-01-01",
    sexo: "no_especifica",
    telefono: "",
    direccion: "Registro ficticio para pruebas de terapia intensiva",
    sucursal: "Central",
    creadoEn: "2026-11-11T08:00:00.000Z",
    comoSeEntero: "Prueba del sistema",
    observaciones: "Paciente ficticio para practicar el flujo de terapia intensiva.",
  },
  {
    id: "demo-pac-yarela-copa",
    nombres: "Yarela Heydi",
    primerApellido: "Copa",
    segundoApellido: "Villca",
    tipoDocumento: "CI",
    numeroDocumento: "",
    fechaNacimiento: "",
    sexo: "no_especifica",
    telefono: "",
    direccion: "",
    sucursal: "Central",
    creadoEn: "2026-10-27T00:00:00.000Z",
  },
];
export const estudiosIniciales: EstudioDemo[] = [
  {
    id: "demo-tc-craneo-yarela-copa",
    pacienteId: "demo-pac-yarela-copa",
    paciente: "Yarela Heydi Copa Villca",
    titulo: "TAC de cráneo con contraste",
    categoria: "Tomografía",
    descripcion: "Estudio demostrativo DICOM · TAC de cráneo con contraste",
    nombreArchivo: "YARELA HEYDI COPA VILLCA TAC CRANEO CON CONTRASTE.zip",
    mime: "application/zip",
    archivoUrl:
      "/estudios-demo/yarela-heidi-copa-villca-tac-craneo-con-contraste.zip",
    creadaEn: "2026-10-27T00:00:00.000Z",
  },
];

function leer<T>(clave: string, inicial: T): T {
  try {
    const valor = localStorage.getItem(clave);
    if (valor) return JSON.parse(valor) as T;
    localStorage.setItem(clave, JSON.stringify(inicial));
  } catch {}
  return inicial;
}
export const obtenerPacientes = () => {
  const pacientes = leer(PACIENTES, pacientesIniciales),
    actualizados = [
      ...pacientesIniciales.filter(
        (muestra) => !pacientes.some((paciente) => paciente.id === muestra.id),
      ),
      ...pacientes,
    ];
  try {
    if (actualizados.length !== pacientes.length)
      localStorage.setItem(PACIENTES, JSON.stringify(actualizados));
    if (!actualizados.length && !localStorage.getItem(MUESTRA_PACIENTES)) {
      localStorage.setItem(PACIENTES, JSON.stringify(pacientesIniciales));
      localStorage.setItem(MUESTRA_PACIENTES, "1");
      return pacientesIniciales;
    }
  } catch {}
  return actualizados;
};
export const guardarPacientes = (datos: PacienteDemo[]) => {
  localStorage.setItem(PACIENTES, JSON.stringify(datos));
  window.dispatchEvent(new Event("radiuus:datos-demo"));
};
export const obtenerEstudios = () => {
  const estudios = leer(ESTUDIOS, estudiosIniciales),
    actualizados = [
      ...estudiosIniciales.filter(
        (muestra) => !estudios.some((estudio) => estudio.id === muestra.id),
      ),
      ...estudios,
    ];
  try {
    if (actualizados.length !== estudios.length)
      localStorage.setItem(ESTUDIOS, JSON.stringify(actualizados));
  } catch {}
  return actualizados;
};
export const guardarEstudios = (datos: EstudioDemo[]) => {
  localStorage.setItem(ESTUDIOS, JSON.stringify(datos));
  window.dispatchEvent(new Event("radiuus:datos-demo"));
};
export const seleccionarEstudio = (id: string) => {
  localStorage.setItem(SELECCION, id);
  const estudio = obtenerEstudios().find((item) => item.id === id);
  const destino =
    estudio?.categoria === "Tomografía"
      ? "visor-tomografias"
      : estudio?.categoria === "Ecografía"
        ? "visor-ecografias"
        : estudio?.categoria === "Ecocardiograma"
          ? "visor-ecocardiogramas"
          : "visor-radiografias";
  window.dispatchEvent(new CustomEvent("radiuus:navegar", { detail: destino }));
};
export const obtenerEstudioSeleccionado = () => {
  const id = localStorage.getItem(SELECCION);
  return obtenerEstudios().find((e) => e.id === id) || null;
};

const abrirDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const solicitud = indexedDB.open("pulso-local", 1);
    solicitud.onupgradeneeded = () =>
      solicitud.result.createObjectStore("archivos");
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () => reject(solicitud.error);
  });
export async function guardarArchivoEstudio(id: string, archivo: File) {
  const db = await abrirDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("archivos", "readwrite");
    tx.objectStore("archivos").put(archivo, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
export const obtenerInformes = () =>
  leer<Record<string, InformeDemo>>(INFORMES, {});
export async function guardarInformePaciente(
  pacienteId: string,
  archivo: File,
) {
  const db = await abrirDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("archivos", "readwrite");
    tx.objectStore("archivos").put(archivo, `informe:${pacienteId}`);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  const informes = obtenerInformes(),
    informe: InformeDemo = {
      pacienteId,
      nombreArchivo: archivo.name,
      mime: archivo.type,
      creadoEn: new Date().toISOString(),
    };
  informes[pacienteId] = informe;
  localStorage.setItem(INFORMES, JSON.stringify(informes));
  return informe;
}
export async function obtenerArchivoInforme(pacienteId: string) {
  const db = await abrirDb();
  const archivo = await new Promise<File | undefined>((resolve, reject) => {
    const tx = db.transaction("archivos", "readonly"),
      solicitud = tx.objectStore("archivos").get(`informe:${pacienteId}`);
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () => reject(solicitud.error);
  });
  db.close();
  if (!archivo)
    throw new Error("El archivo del informe ya no está disponible.");
  return archivo;
}
export async function obtenerArchivoEstudio(estudio: EstudioDemo) {
  if (estudio.archivoUrl) {
    const respuesta = await fetch(estudio.archivoUrl);
    if (!respuesta.ok)
      throw new Error("No se encontró el archivo de demostración.");
    return new File([await respuesta.blob()], estudio.nombreArchivo, {
      type: estudio.mime,
    });
  }
  const db = await abrirDb();
  const archivo = await new Promise<File | undefined>((resolve, reject) => {
    const tx = db.transaction("archivos", "readonly"),
      solicitud = tx.objectStore("archivos").get(estudio.id);
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () => reject(solicitud.error);
  });
  db.close();
  if (!archivo)
    throw new Error(
      "El archivo local ya no está disponible. Vuelve a cargarlo.",
    );
  return archivo;
}
