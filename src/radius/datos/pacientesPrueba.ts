import type { PacienteDemo } from "./almacenDemo";
import type { CitaAgendaDemo } from "./agendaDemo";
import type { SolicitudImagenologiaDemo } from "./solicitudesImagenologiaDemo";
import type { RegistroInternacion } from "../../flows/internacion/registroInternaciones";
import type { SolicitudLaboratorio } from "../../flows/laboratorio/almacenLaboratorio";
import type { CuentaEmergencia } from "../../flows/emergencias/emergenciasApi";
import type { CirugiaProgramada } from "../../flows/quirofano/cronogramaQuirofano";
import type { EpisodioClinico, TipoEpisodio } from "../../flows/consultorio/registroHistoria";

const servicios = [
  ["CON", "Consulta"], ["EME", "Emergencias"], ["INT", "Internación"],
  ["UCI", "Terapia intensiva"], ["QUI", "Quirófano"], ["LAB", "Laboratorio"],
  ["RX", "Radiografía"], ["TC", "Tomografía"], ["ECO", "Ecografía"],
  ["ECHO", "Ecocardiograma"], ["ECG", "Electrocardiograma"],
  ["HOL", "Holter"], ["AMB", "Ambulancia"],
] as const;

export function leerListaPrueba<T>(almacen: Storage, clave: string): T[] {
  const valor = almacen.getItem(clave);
  if (!valor) return [];
  const lista: unknown = JSON.parse(valor);
  if (!Array.isArray(lista)) throw new Error(`El almacenamiento ${clave} no es una lista válida.`);
  return lista as T[];
}

/** Agrega escenarios ficticios sin reemplazar registros ni avances existentes. */
export function cargarPacientesPrueba(
  almacen: Storage,
  almacenSesion: Storage,
  ahora = new Date(),
  medico = "Administrador temporal",
) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(ahora);
  const parte = (tipo: string) => partes.find((p) => p.type === tipo)?.value || "";
  const fecha = `${parte("year")}-${parte("month")}-${parte("day")}`;
  const instante = ahora.toISOString();
  const pendientes: { almacen: Storage; clave: string; valor: string }[] = [];
  const agregar = <T extends { id: string }>(clave: string, nuevos: T[], destino = almacen) => {
    const actuales = leerListaPrueba<T>(destino, clave);
    const ids = new Set(actuales.map((item) => item.id));
    const faltantes = nuevos.filter((item) => !ids.has(item.id));
    if (faltantes.length) pendientes.push({ almacen: destino, clave, valor: JSON.stringify([...actuales, ...faltantes]) });
  };
  const pacientes: PacienteDemo[] = servicios.flatMap(([codigo, nombre]) =>
    [1, 2].map((numero) => ({
      id: `prueba-clinico-${codigo}-${numero}`,
      nombres: "Paciente de prueba",
      primerApellido: nombre,
      segundoApellido: numero === 1 ? "Uno" : "Dos",
      tipoDocumento: "CI", numeroDocumento: `TEST-${codigo}-00${numero}`,
      fechaNacimiento: numero === 1 ? "1990-04-12" : "1985-09-23",
      sexo: numero === 1 ? "femenino" : "masculino", telefono: "",
      direccion: "Dirección ficticia para desarrollo", sucursal: "Central",
      creadoEn: instante, pais: "Bolivia", departamento: "Cochabamba",
      ciudad: "Cochabamba", comoSeEntero: "Otro", habilitado: true,
      observaciones: "PACIENTE FICTICIO. Pruebas locales de interfaz; no corresponde a una persona real.",
    })),
  );
  const grupo = (codigo: string) => pacientes.filter((p) => p.id.startsWith(`prueba-clinico-${codigo}-`));
  const nombre = (p: PacienteDemo) => `${p.nombres} ${p.primerApellido} ${p.segundoApellido}`;
  agregar("pulso_local_pacientes_v1", pacientes);

  const citas: CitaAgendaDemo[] = grupo("CON").map((p, i) => ({
    id: `prueba-cita-${i + 1}`, pacienteId: p.id, paciente: nombre(p), ci: p.numeroDocumento,
    doctor: medico, especialidad: "Medicina general", fecha, hora: i ? "10:30" : "09:00",
    estado: "confirmada", consultorio: `Consultorio ${i + 1}`,
    motivoOperativo: "Consulta ficticia para probar recepción, triaje y atención médica", edad: i ? 41 : 36,
  }));
  agregar("clinico.agenda-demo.v2", citas);
  agregar("clinico.triaje.cola-demo.v2", citas.map((cita) => ({ ...cita, motivoConsulta: cita.motivoOperativo })));

  const internaciones: RegistroInternacion[] = ["INT", "UCI"].flatMap((codigo) =>
    grupo(codigo).map((p, i) => ({
      id: `prueba-internacion-${codigo}-${i + 1}`, pacienteId: p.id,
      paciente: nombre(p), ci: p.numeroDocumento, medico,
      motivo: "Ingreso ficticio para desarrollar el flujo asistencial", fecha,
      estado: "confirmada", sala: codigo === "UCI" ? "UCI" : `${105 + i}`,
      cama: codigo === "UCI" ? `${i + 1}` : "A",
      tipoSala: codigo === "UCI" ? "Terapia intensiva" : "Sala compartida",
      servicio: codigo === "UCI" ? "Terapia intensiva" : "Medicina general",
      fechaIngreso: fecha, horaIngreso: i ? "10:00" : "09:00",
      datosPaciente: { nombres: p.nombres, apellidoPaterno: p.primerApellido, apellidoMaterno: p.segundoApellido, fechaNacimiento: p.fechaNacimiento },
    })),
  );
  agregar("hme:internaciones", internaciones);
  agregar("hme:terapia-intensiva:pacientes-demo:v1", internaciones.filter((p) => p.servicio === "Terapia intensiva").map((p) => ({
    ...p, hora: p.horaIngreso!, pacienteId: p.pacienteId!, fechaIngreso: p.fechaIngreso!, sala: "UCI",
  })));

  const solicitudes: SolicitudLaboratorio[] = grupo("LAB").map((p, i) => ({
    id: `prueba-laboratorio-${i + 1}`, pacienteId: p.id, paciente: nombre(p), ci: p.numeroDocumento,
    medico, origen: "ambulatorio", consultaId: `prueba-consulta-lab-${i + 1}`,
    fecha: instante, estado: "pendiente", estudios: [{
      id: `prueba-estudio-lab-${i + 1}`, nombre: i ? "Glucemia" : "Hemograma",
      resultados: [{ id: `prueba-parametro-${i + 1}`, parametro: i ? "Glucosa" : "Hemoglobina", valor: "", unidad: i ? "mg/dL" : "g/dL", referencia: "", tipo: "numero" }],
    }], observacion: "Solicitud ficticia; resultados pendientes de registrar.", actualizadoEn: instante,
    procedencia: "recepcion", prioridad: "normal", solicitadoPor: medico,
  }));
  agregar("clinico.laboratorio.solicitudes.v1", [...solicitudes, ...grupo("INT").map((p, i): SolicitudLaboratorio => ({
    ...solicitudes[i], id: `prueba-laboratorio-internacion-${i + 1}`, pacienteId: p.id,
    paciente: nombre(p), ci: p.numeroDocumento, origen: "internacion", consultaId: `prueba-solicitud-int-${i + 1}`,
  }))]);

  const imagenes: SolicitudImagenologiaDemo[] = servicios.slice(6, 12).flatMap(([codigo, modalidad]) =>
    grupo(codigo).map((p, i) => ({
      id: `prueba-imagen-${codigo}-${i + 1}`, paciente: nombre(p), ci: p.numeroDocumento,
      estudio: modalidad, pieza: "Solicitud ficticia para desarrollo", precio: 0,
      estado: "pendiente", cobradaEn: instante,
    })),
  );
  agregar("pulso_local_solicitudes_imagenologia_v1", imagenes);
  agregar("clinico.prueba.estudios-agenda.v1", imagenes.map((imagen) => {
    const paciente = pacientes.find((p) => p.numeroDocumento === imagen.ci)!;
    return { id: imagen.id, paciente_id: paciente.id, nombres: paciente.nombres,
      apellido_paterno: paciente.primerApellido, apellido_materno: paciente.segundoApellido,
      ci: imagen.ci, tipo: imagen.estudio.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase(),
      nombre: imagen.estudio, estado: "pendiente", solicitado_en: `${fecha}T09:00:00-04:00` };
  }));

  const cirugias: CirugiaProgramada[] = grupo("QUI").map((p, i) => ({
    id: `prueba-cirugia-${i + 1}`, cuenta: `PRUEBA-QUI-00${i + 1}`, pacienteId: p.id,
    paciente: nombre(p), ci: p.numeroDocumento, medico,
    tipo: i ? "Procedimiento de prueba Dos" : "Procedimiento de prueba Uno",
    quirofano: `Quirófano ${i + 1}`, fecha, hora: i ? "11:00" : "09:00",
  }));
  agregar("hme-cronograma-quirofanos-v1", cirugias);

  const tipos: Record<string, TipoEpisodio> = { EME: "Emergencias", INT: "Internación", UCI: "Terapia intensiva", QUI: "Quirófano" };
  const episodios: EpisodioClinico[] = pacientes.map((p, i) => {
    const codigo = p.id.split("-")[2];
    return {
      episodioId: `prueba-historia-${codigo}-${i % 2 + 1}`, origenId: `prueba:${p.id}`, correlativo: i + 1,
      tipo: tipos[codigo] || "Consulta médica",
      paciente: { id: `prueba-atencion-${codigo}-${i % 2 + 1}`, pacienteId: p.id,
        paciente: nombre(p), ci: p.numeroDocumento, doctor: medico, fecha, hora: "09:00",
        especialidad: p.primerApellido, fechaNacimiento: p.fechaNacimiento },
      medico, fecha, motivo: `Escenario ficticio de ${p.primerApellido}`,
      enfermedadActual: "Datos ficticios para desarrollo del sistema.", examenFisico: "", antecedentes: "",
      notas: "Registro de prueba; no corresponde a una atención real.", signosVitales: {},
      recetas: codigo === "INT" ? [{ tipo: "Receta de prueba", detalle: "Solicitud ficticia para probar farmacia", medico, fecha,
        receta: { id: `prueba-receta-${p.id}`, fecha, indicaciones: "SIMULACIÓN: no dispensar a una persona real.", medicamentos: [{
          id: `prueba-item-${p.id}`, nombre: "Insumo ficticio de desarrollo", dosis: "No aplica", via: "No aplica",
          frecuencia: "No aplica", duracion: "No aplica", cantidad: "1",
        }] } }] : [],
      ordenes: [], resultados: [], reconsultas: [], actualizadoEn: instante,
    };
  });
  agregar("hme-episodios-clinicos-v1", episodios.map((episodio) => ({ ...episodio, id: episodio.episodioId })));

  const emergencias: CuentaEmergencia[] = grupo("EME").map((p, i) => ({
    id: `prueba-emergencia-${i + 1}`, pacienteId: p.id, cubiculo: `${i + 2}`,
    inicio: instante, fin: null, revision: 1,
    identidad: { nombres: p.nombres, apellidos: `${p.primerApellido} ${p.segundoApellido}`,
      documento: p.numeroDocumento, nacimiento: p.fechaNacimiento,
      sexo: i ? "Masculino" : "Femenino", historiaClinica: `HC-${p.numeroDocumento}`, medicoAdmision: medico },
    signos: [], consumos: [], evaluaciones: [], ordenes: [], registrosEnfermeria: [],
  }));
  agregar("clinico-emergencias-demo-v1", emergencias, almacenSesion);

  const claveAmbulancia = "clinico-ambulancia-v1";
  const actualAmbulancia = JSON.parse(almacen.getItem(claveAmbulancia) || "null") as { traslados?: { id: number }[]; [campo: string]: unknown } | null;
  if (actualAmbulancia && !Array.isArray(actualAmbulancia.traslados)) throw new Error("Los traslados guardados no son válidos.");
  const traslados = actualAmbulancia?.traslados || [];
  const nuevosTraslados = grupo("AMB").map((p, i) => ({
    id: 990001 + i, fecha, paciente: nombre(p), origen: "Origen ficticio",
    destino: "Hospital María Esperanza", tipo: "Programado", responsable: "Personal de prueba",
    estado: "Programado", kilometrajeInicial: 0,
  })).filter((nuevo) => !traslados.some((actual) => actual.id === nuevo.id));
  if (nuevosTraslados.length) pendientes.push({ almacen, clave: claveAmbulancia, valor: JSON.stringify({
    insumos: [], cargas: [], kilometrajeActual: 0, ...actualAmbulancia, traslados: [...traslados, ...nuevosTraslados],
  }) });

  for (const item of pendientes) item.almacen.setItem(item.clave, item.valor);
  return { pacientes: pacientes.length, servicios: servicios.length };
}
