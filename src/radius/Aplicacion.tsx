import React, { Suspense, lazy, useEffect, useState } from "react";
import { apiFetch } from "./api";
import Icon, { type IconName } from "./componentes/Icono";
import CentroNotificaciones from "./componentes/Notificaciones";
import { obtenerEstudios, obtenerInformes, obtenerPacientes } from "./datos/almacenDemo";
import { obtenerSolicitudesImagenologia } from "./datos/solicitudesImagenologiaDemo";
import { leerSesion, type Sesion } from "./types/sesion";
import VistaInicioSesion from "./vistas/autenticacion/VistaInicioSesion";
import "./vistas/visor/BibliotecaImagenes.css";
import "./vistas/visor/PaletaClara.css";
import "./vistas/visor/PaletaPlomo.css";
import "./vistas/visor/PaletaGris.css";
import "./vistas/visor/SidebarMejoras.css";
import "./vistas/visor/SubvistasGlobal.css";
import "./vistas/visor/TitulosUnicos.css";
import "./vistas/visor/ResponsividadGlobal.css";
import "./vistas/visor/PerfilAcceso.css";

import type { CitaConfirmada } from '../flows/consultorio/AgendaAmbulatoriaView';
import type { SignoVitalConfig } from '../flows/triaje/ConfiguracionSignosVitalesView';
import { HorizontalSubvistaNav } from '../ui/components/HorizontalSubvistaNav';
import { InstrumentistaPreparacionView } from '../flows/quirofano/InstrumentistaPreparacionView';
import { CirculanteAsistenciaView } from '../flows/quirofano/CirculanteAsistenciaView';
import { AlmacenQuirofanoView } from '../flows/quirofano/AlmacenQuirofanoView';
import { MedicoQuirofanoView } from '../flows/quirofano/MedicoQuirofanoView';
import { buscarAsignacionQuirofano, normalizarNombre } from '../flows/quirofano/asignacionesQuirofano';
import '../flows/quirofano/EnfermeriaQuirofano.css';
import './vistas/visor-tomografias/SubvistasTomografias.css';

// Cada flujo se descarga solo cuando se abre. Al desmontarse también desaparecen
// sus efectos, temporizadores y listeners, sin conservar pantallas ocultas.
const RecepcionView = lazy(() => import('../flows/recepcion/RecepcionView').then(m => ({ default: m.RecepcionView })));
const CitasRecepcionView = lazy(() => import('../flows/recepcion/subvistas/CitasRecepcionView').then(m => ({ default: m.CitasRecepcionView })));
const CronogramaEstudiosView = lazy(() => import('../flows/recepcion/subvistas/CronogramaEstudiosView').then(m => ({ default: m.CronogramaEstudiosView })));
const AgendaImagenologiaView = lazy(() => import('./vistas/AgendaImagenologiaView'));
const FarmaciaView = lazy(() => import('../flows/farmacia/FarmaciaView').then(m => ({ default: m.FarmaciaView })));
const AdministracionFarmaciaView = lazy(() => import('../flows/farmacia/AdministracionFarmaciaView').then(m => ({ default: m.AdministracionFarmaciaView })));
const ConsultorioView = lazy(() => import('../flows/consultorio/ConsultorioView').then(m => ({ default: m.ConsultorioView })));
const HistoriasClinicasView = lazy(() => import('../flows/consultorio/ConsultorioView').then(m => ({ default: m.HistoriasClinicasView })));
const LaboratorioView = lazy(() => import('../flows/laboratorio/LaboratorioView').then(m => ({ default: m.LaboratorioView })));
const ConfiguracionLaboratorioView = lazy(() => import('../flows/laboratorio/ConfiguracionLaboratorioView').then(m => ({ default: m.ConfiguracionLaboratorioView })));
const LaboratorioAlmacenView = lazy(() => import('../flows/laboratorio/LaboratorioAlmacenView').then(m => ({ default: m.LaboratorioAlmacenView })));
const SignosVitalesView = lazy(() => import('../flows/triaje/SignosVitalesView').then(m => ({ default: m.SignosVitalesView })));
const RegistroUsoTriajeView = lazy(() => import('../flows/triaje/RegistroUsoTriajeView').then(m => ({ default: m.RegistroUsoTriajeView })));
const ConfiguracionSignosVitalesView = lazy(() => import('../flows/triaje/ConfiguracionSignosVitalesView').then(m => ({ default: m.ConfiguracionSignosVitalesView })));
const TriajeEmergenciasView = lazy(() => import('../flows/emergencias/TriajeEmergenciasView').then(m => ({ default: m.TriajeEmergenciasView })));
const AtencionMedicaEmergenciasView = lazy(() => import('../flows/emergencias/AtencionMedicaEmergenciasView').then(m => ({ default: m.AtencionMedicaEmergenciasView })));
const EnfermeraInternacionView = lazy(() => import('../flows/internacion/EnfermeraInternacionView').then(m => ({ default: m.EnfermeraInternacionView })));
const MedicoInternacionView = lazy(() => import('../flows/internacion/MedicoInternacionView').then(m => ({ default: m.MedicoInternacionView })));
const TerapiaIntensivaView = lazy(() => import('../flows/internacion/TerapiaIntensivaView').then(m => ({ default: m.TerapiaIntensivaView })));
const RegistroEnfermeriaTerapiaView = lazy(() => import('../flows/internacion/RegistroEnfermeriaTerapiaView').then(m => ({ default: m.RegistroEnfermeriaTerapiaView })));
const FarmaciaInternacionView = lazy(() => import('../flows/internacion/FarmaciaInternacionView').then(m => ({ default: m.FarmaciaInternacionView })));
const CocinaVentasView = lazy(() => import('../flows/cocina/CocinaVentasView').then(m => ({ default: m.CocinaVentasView })));
const CocinaInternacionView = lazy(() => import('../flows/cocina/CocinaInternacionView').then(m => ({ default: m.CocinaInternacionView })));
const CocinaAdministracionView = lazy(() => import('../flows/cocina/CocinaAdministracionView').then(m => ({ default: m.CocinaAdministracionView })));
const CuentaQuirofanoView = lazy(() => import('../flows/quirofano/CuentaQuirofanoView').then(m => ({ default: m.CuentaQuirofanoView })));
const EsterilizacionView = lazy(() => import('../flows/quirofano/EsterilizacionView').then(m => ({ default: m.EsterilizacionView })));
const RoperiaView = lazy(() => import('../flows/quirofano/RoperiaView').then(m => ({ default: m.RoperiaView })));
const AnestesiologiaView = lazy(() => import('../flows/quirofano/AnestesiologiaView').then(m => ({ default: m.AnestesiologiaView })));
const VistaPacientes = lazy(() => import('./vistas/pacientes/VistaPacientes'));
const VistaEstudiosCobrados = lazy(() => import('./vistas/VistaEstudiosCobrados'));
const VistaRayosX = lazy(() => import('./vistas/visor-rayos-x/VistaRayosX'));
const VistaBaseDatosOrthanc = lazy(() => import('./vistas/base-datos/VistaBaseDatosOrthanc'));
const VistaConfiguracion = lazy(() => import('./vistas/configuracion/VistaConfiguracion'));
const VistaAuditorias = lazy(() => import('./vistas/auditorias/VistaAuditorias'));
const VistaInformes = lazy(() => import('./vistas/clinica/Complementos').then(m => ({ default: m.VistaInformes })));

const signosVitalesIniciales: SignoVitalConfig[] = [
  ['temperatura', 'Temperatura', 'Grados Celsius', '°C', 'Número decimal'],
  ['glicemia', 'Glicemia capilar', 'Miligramos por decilitro', 'mg/dL', 'Número entero'],
  ['frecuenciaCardiaca', 'Frecuencia cardíaca', 'Pulsaciones por minuto', 'P/min', 'Número entero'],
  ['frecuenciaRespiratoria', 'Frecuencia respiratoria', 'Respiraciones por minuto', 'Res/min', 'Número entero'],
  ['presionSistolica', 'Presión sistólica', 'Milímetros de mercurio', 'mmHg', 'Número entero'],
  ['presionDiastolica', 'Presión diastólica', 'Milímetros de mercurio', 'mmHg', 'Número entero'],
  ['saturacionAmbiente', 'Saturación ambiente', 'Porcentaje', '%', 'Número entero'],
  ['oxigeno', 'Oxígeno', 'Litros', 'L', 'Número decimal'],
  ['saturacionOxigeno', 'Saturación con oxígeno', 'Porcentaje', '%', 'Número entero'],
  ['perimetroCintura', 'Perímetro de cintura', 'Centímetros', 'cm', 'Número decimal'],
  ['perimetroCadera', 'Perímetro de cadera', 'Centímetros', 'cm', 'Número decimal'],
  ['peso', 'Peso', 'Kilogramos', 'kg', 'Número decimal'],
  ['estatura', 'Estatura', 'Centímetros', 'cm', 'Número decimal'],
  ['imc', 'IMC', 'Índice de masa corporal', 'kg/m²', 'Número decimal'],
].map(([id, nombre, unidad, abreviatura, tipo]) => ({ id, nombre, unidad, abreviatura, tipo: tipo as SignoVitalConfig['tipo'] }));

type Modulo = { id: string; nombre: string; icono: IconName; grupo: string };
type SubvistaImagenologia = "pacientes" | "radiografias" | "tomografias" | "ecografias" | "ecocardiogramas" | "informes" | "visor";
type SubvistaModalidad = "pacientes" | "estudios";
type RolEnfermeriaQuirofano = "instrumentista" | "circulante" | "almacen";
type SubvistaAlmacenQuirofano = "quirofano-1" | "quirofano-2";
type SubvistaRecepcion = "caja" | "citas" | "cuentas" | "comprobantes" | "reportes";
type SubvistaPacientes = "pacientes" | "historias" | "estudios";
type SubvistaConfiguracion = "usuario" | "sistema" | "usuarios";
type SubvistaAtencionAgenda = "pacientes" | "cronograma";
type SubvistaTriajeAmbulatorio = "signos-vitales" | "agenda" | "registro-uso" | "configuracion";
type SubvistaMedicoInternacion = "internados" | "altas";
type SubvistaEnfermeraInternacion = "internados" | "altas";
type TemaSistema = "light" | "dark";
type CirugiaProgramada = { id: string; hora: string; sala: string; paciente: string; procedimiento: string; cirujano: string; estado: string; historia: string; ci: string; edad: string; diagnostico: string; anestesiologo: string; ayudante: string; instrumentista: string; circulante: string };

const cirugiasProgramadas: CirugiaProgramada[] = [
  { id: 'cir-hernia', hora: '08:00', sala: 'Quirófano 01', paciente: 'María Fernanda López García', procedimiento: 'Hernioplastía inguinal', cirujano: 'Dr. Luis Esteban Escobar Rocha', estado: 'En preparación', historia: 'HC-004821', ci: '6894521 LP', edad: '42 años', diagnostico: 'Hernia inguinal derecha', anestesiologo: 'Dra. Valeria Rojas Pardo', ayudante: 'Dr. Marco Antonio Vargas', instrumentista: 'Lic. Elena Morales', circulante: 'Lic. Patricia Flores' },
  { id: 'cir-colecistectomia', hora: '10:00', sala: 'Quirófano 02', paciente: 'Carlos Alberto Mendoza Rojas', procedimiento: 'Colecistectomía laparoscópica', cirujano: 'Dra. Ana Sofía Quispe Vargas', estado: 'Programada', historia: 'HC-008214', ci: '7459823 LP', edad: '55 años', diagnostico: 'Colelitiasis sintomática', anestesiologo: 'Dr. Ricardo Paredes', ayudante: 'Dra. Luisa Fernández', instrumentista: 'Lic. Andrea Soria', circulante: 'Lic. Miguel Álvarez' },
  { id: 'cir-artroscopia', hora: '13:30', sala: 'Quirófano 01', paciente: 'Jorge Luis Torrez Flores', procedimiento: 'Artroscopia de rodilla', cirujano: 'Dr. Diego Andrés Salazar Cruz', estado: 'Programada', historia: 'HC-006407', ci: '5321687 LP', edad: '36 años', diagnostico: 'Lesión de menisco medial', anestesiologo: 'Dra. Camila Ríos', ayudante: 'Dr. Pablo Medina', instrumentista: 'Lic. Sofía Aguilar', circulante: 'Lic. Daniela Cruz' },
];

const subvistasImagenologia: { id: SubvistaImagenologia; nombre: string; icono: IconName }[] = [
  { id: "pacientes", nombre: "Pacientes", icono: "patient" },
  { id: "radiografias", nombre: "Radiografías", icono: "image" },
  { id: "tomografias", nombre: "Tomografías", icono: "package" },
  { id: "ecografias", nombre: "Ecografías", icono: "audit" },
  { id: "ecocardiogramas", nombre: "Ecocardiogramas", icono: "audit" },
  { id: "informes", nombre: "Informes médicos", icono: "audit" },
];
const subvistasModalidad: { id: SubvistaModalidad; nombre: string; icono: IconName }[] = [
  { id: "pacientes", nombre: "Pacientes", icono: "patient" },
  { id: "estudios", nombre: "Estudios", icono: "image" },
];
const subvistasPacientes: { id: SubvistaPacientes; nombre: string; icono: IconName }[] = [
  { id: "pacientes", nombre: "Pacientes", icono: "patient" },
  { id: "historias", nombre: "Historias clínicas", icono: "fileText" },
  { id: "estudios", nombre: "Estudios del paciente", icono: "image" },
];

const modulos: Modulo[] = [
  { id: 'recepcion', nombre: 'Recepción', icono: 'patient', grupo: 'ATENCIÓN CLÍNICA' },
  { id: 'pacientes', nombre: 'Pacientes', icono: 'users', grupo: 'ATENCIÓN CLÍNICA' },
  { id: 'atencion-medica', nombre: 'Consultorio médico', icono: 'userCheck', grupo: 'ATENCIÓN AMBULATORIA' },
  { id: 'triaje-ambulatorio', nombre: 'Triaje y signos vitales', icono: 'patient', grupo: 'ATENCIÓN AMBULATORIA' },
  { id: 'triaje-emergencias', nombre: 'Triaje de enfermería', icono: 'patient', grupo: 'EMERGENCIAS' },
  { id: 'atencion-urgencias', nombre: 'Atención médica emergencias', icono: 'userCheck', grupo: 'EMERGENCIAS' },
  { id: 'enfermera-internacion', nombre: 'Enfermera internación', icono: 'patient', grupo: 'INTERNACIÓN' },
  { id: 'medico-internacion', nombre: 'Médico internación', icono: 'userCheck', grupo: 'INTERNACIÓN' },
  { id: 'enfermera-terapia-intensiva', nombre: 'Enfermera terapia intensiva', icono: 'patient', grupo: 'TERAPIA INTENSIVA' },
  { id: 'medico-terapia-intensiva', nombre: 'Médico terapia intensiva', icono: 'userCheck', grupo: 'TERAPIA INTENSIVA' },
  { id: 'enfermera-quirofano', nombre: 'Enfermera quirófano', icono: 'patient', grupo: 'QUIRÓFANO' },
  { id: 'medico-quirofano', nombre: 'Médico quirófano', icono: 'userCheck', grupo: 'QUIRÓFANO' },
  { id: 'anestesiologia-quirofano', nombre: 'Anestesiología', icono: 'userCheck', grupo: 'QUIRÓFANO' },
  { id: 'cuenta-quirofano', nombre: 'Registro de cirugías', icono: 'cash', grupo: 'QUIRÓFANO' },
  { id: 'central-esterilizacion', nombre: 'Inventario de material', icono: 'lab', grupo: 'ESTERILIZACIÓN' },
  { id: 'recepcion-material-sucio', nombre: 'Central de esterilización', icono: 'package', grupo: 'ESTERILIZACIÓN' },
  { id: 'entrega-material-esteril', nombre: 'Administración de esterilización', icono: 'check', grupo: 'ESTERILIZACIÓN' },
  { id: 'roperia', nombre: 'Ropería', icono: 'asset', grupo: 'ESTERILIZACIÓN' },
  { id: 'laboratorio-ambulatorios', nombre: 'Ambulatorios', icono: 'lab', grupo: 'LABORATORIO' },
  { id: 'laboratorio-internados', nombre: 'Internados', icono: 'lab', grupo: 'LABORATORIO' },
  { id: 'laboratorio-almacen', nombre: 'Laboratorio almacén', icono: 'package', grupo: 'LABORATORIO' },
  { id: 'laboratorio-configuracion', nombre: 'Tipos de laboratorio', icono: 'settings', grupo: 'LABORATORIO' },
  { id: "imagenologia", nombre: "Imagenología", icono: "image", grupo: "IMAGENOLOGÍA" },
  { id: "atencion-agenda", nombre: "Atención / Agenda", icono: "calendar", grupo: "IMAGENOLOGÍA" },
  { id: "farmacia", nombre: "Farmacia", icono: "lab", grupo: "FARMACIA" },
  { id: "farmacia-internacion", nombre: "Internación", icono: "patient", grupo: "FARMACIA" },
  { id: "farmacia-movimientos", nombre: "Administración Farmacia", icono: "building", grupo: "FARMACIA" },
  { id: "cocina", nombre: "Cocina", icono: "utensils", grupo: "COCINA" },
  { id: "cocina-internacion", nombre: "Cocina Internación", icono: "utensils", grupo: "COCINA" },
  { id: "cocina-administracion", nombre: "Control de Cocina", icono: "warehouse", grupo: "COCINA" },
  {
    id: "configuracion",
    nombre: "Configuración",
    icono: "settings",
    grupo: "ADMINISTRACIÓN",
  },
  {
    id: "auditorias",
    nombre: "Auditorías",
    icono: "audit",
    grupo: "ADMINISTRACIÓN",
  },
];

function TablaSubvistaPaciente({ vista }: { vista: 'historias' | 'estudios' }) {
  const esEstudios = vista === 'estudios';
  return <section className="usuarios-vista pacientes-vista tabla-subvista-paciente" aria-label={esEstudios ? 'Estudios del paciente' : 'Historias clínicas'}>
    <div className="usuarios-paginacion"><small>0 resultados</small><div><button disabled aria-label="Página anterior"><Icon name="chevronLeft" size={16} /></button><span>Página <strong>1</strong> de 1</span><button disabled aria-label="Página siguiente"><Icon name="chevronRight" size={16} /></button></div></div>
    <div className="usuarios-tabla pacientes-tabla tabla-subvista-vacia">
      <div className="usuarios-fila usuarios-columnas"><span>Paciente</span><span>Documento</span><span>Edad / sexo</span><span>Celular</span><span>{esEstudios ? 'Estudios' : 'Historia clínica'}</span><span>Acciones</span></div>
      <div className="usuarios-mensaje"><span><Icon name={esEstudios ? 'image' : 'fileText'} size={25} /></span><strong>No hay pacientes para mostrar</strong><small>{esEstudios ? 'Los estudios del paciente aparecerán aquí.' : 'Las historias clínicas aparecerán aquí.'}</small></div>
    </div>
    <div className="usuarios-paginacion"><small>0 resultados</small><div><button disabled aria-label="Página anterior"><Icon name="chevronLeft" size={16} /></button><span>Página <strong>1</strong> de 1</span><button disabled aria-label="Página siguiente"><Icon name="chevronRight" size={16} /></button></div></div>
  </section>;
}

export default function Aplicacion() {
  const [sesion, setSesion] = useState<Sesion | null>(leerSesion);
  useEffect(() => {
    if (!sesion?.token) return;
    const controller = new AbortController();
    apiFetch('/api/session', { signal: controller.signal }).then(async r => {
      if (!r.ok) return;
      const datos = await r.json() as { usuario: Sesion['usuario'] };
      setSesion(actual => actual ? { ...actual, usuario: datos.usuario } : null);
    }).catch(() => undefined);
    return () => controller.abort();
  }, [sesion?.token]);
  const [modulo, setModulo] = useState("");
  const [emergenciaEnAtencion, setEmergenciaEnAtencion] = useState('');
  const [subvistaImagenologia, setSubvistaImagenologia] = useState<SubvistaImagenologia>("pacientes");
  const [visorModalidad, setVisorModalidad] = useState<"Tomografía" | null>(null);
  const [subvistaModalidad, setSubvistaModalidad] = useState<SubvistaModalidad>("pacientes");
  const [rolEnfermeriaQuirofano, setRolEnfermeriaQuirofano] = useState<RolEnfermeriaQuirofano>("instrumentista");
  const [subvistaAlmacenQuirofano, setSubvistaAlmacenQuirofano] = useState<SubvistaAlmacenQuirofano>("quirofano-1");
  const [cirugiaInstrumentista, setCirugiaInstrumentista] = useState<string | null>(null);
  const [fechaDesdeCirugias, setFechaDesdeCirugias] = useState('');
  const [fechaHastaCirugias, setFechaHastaCirugias] = useState('');
  const [subvistaRecepcion, setSubvistaRecepcion] = useState<SubvistaRecepcion>("caja");
  const [subvistaPacientes, setSubvistaPacientes] = useState<SubvistaPacientes>("pacientes");
  const [subvistaConfiguracion, setSubvistaConfiguracion] = useState<SubvistaConfiguracion>("usuario");
  const [subvistaAtencionAgenda, setSubvistaAtencionAgenda] = useState<SubvistaAtencionAgenda>("pacientes");
  const [subvistaTriajeAmbulatorio, setSubvistaTriajeAmbulatorio] = useState<SubvistaTriajeAmbulatorio>("signos-vitales");
  const [subvistaMedicoInternacion, setSubvistaMedicoInternacion] = useState<SubvistaMedicoInternacion>("internados");
  const [subvistaEnfermeraInternacion, setSubvistaEnfermeraInternacion] = useState<SubvistaEnfermeraInternacion>("internados");
  const [subvistaTerapia, setSubvistaTerapia] = useState<'registro-enfermeria' | 'monitorizacion' | 'registros'>('registro-enfermeria');
  const [versionAsignaciones, setVersionAsignaciones] = useState(0);
  useEffect(() => {
    const actualizar = () => setVersionAsignaciones(version => version + 1);
    window.addEventListener('hme:quirofano:asignaciones-actualizadas', actualizar);
    window.addEventListener('storage', actualizar);
    return () => { window.removeEventListener('hme:quirofano:asignaciones-actualizadas', actualizar); window.removeEventListener('storage', actualizar); };
  }, []);
  const esAdministrador = /administrador|admin/i.test(sesion?.usuario.rol ?? '');
  const nombreSesion = normalizarNombre([sesion?.usuario.nombre, sesion?.usuario.apellidos].filter(Boolean).join(' '));
  const cirugiasVisiblesEnfermeria = cirugiasProgramadas.filter(cirugia => {
    if (esAdministrador) return true;
    if (rolEnfermeriaQuirofano === 'almacen') return true;
    const asignacion = buscarAsignacionQuirofano(cirugia);
    const responsable = rolEnfermeriaQuirofano === 'instrumentista' ? (asignacion?.instrumentista || cirugia.instrumentista) : (asignacion?.circulante || cirugia.circulante);
    return Boolean(nombreSesion && normalizarNombre(responsable) === nombreSesion);
  });
  void versionAsignaciones;
  const cirugiaSeleccionadaReal = cirugiasVisiblesEnfermeria.find((cirugia) => cirugia.id === cirugiaInstrumentista) ?? null;
  const cirugiaSeleccionadaBase = cirugiaSeleccionadaReal ?? cirugiasVisiblesEnfermeria[0];
  const asignacionSeleccionada = cirugiaSeleccionadaBase ? buscarAsignacionQuirofano(cirugiaSeleccionadaBase) : undefined;
  const cirugiaSeleccionada = cirugiaSeleccionadaBase ? { ...cirugiaSeleccionadaBase, instrumentista: asignacionSeleccionada?.instrumentista || cirugiaSeleccionadaBase.instrumentista, circulante: asignacionSeleccionada?.circulante || cirugiaSeleccionadaBase.circulante } : cirugiaSeleccionadaBase;
  const [signosVitalesConfigurados, setSignosVitalesConfigurados] = useState(signosVitalesIniciales);
  const [colaAtencionVersion, setColaAtencionVersion] = useState(0);
  const [colaAtencionAbierta, setColaAtencionAbierta] = useState(false);
  const [pacienteColaAtencion, setPacienteColaAtencion] = useState<CitaConfirmada | null>(null);
  const [conteosImagenologia, setConteosImagenologia] = useState({ pacientes: 0, informes: 0, estudios: 0, radiografias: 0, tomografias: 0, ecografias: 0, ecocardiogramas: 0 });
  const conteoModalidadActual = ({ radiografias: conteosImagenologia.radiografias, tomografias: conteosImagenologia.tomografias, ecografias: conteosImagenologia.ecografias, ecocardiogramas: conteosImagenologia.ecocardiogramas } as Partial<Record<SubvistaImagenologia, number>>)[subvistaImagenologia] || 0;
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [verAvisos, setVerAvisos] = useState(false);
  const [tema, setTema] = useState<TemaSistema>(() => localStorage.getItem("pulso_theme") === "dark" ? "dark" : "light");
  const [avisos, setAvisos] = useState<{titulo: string; mensaje: string}[]>([]);
  const esMedico = sesion?.usuario.perfilAtencion === 'medico'
    || /m[eé]dico/i.test(sesion?.usuario.rol ?? '')
    || /administrador|admin/i.test(sesion?.usuario.rol ?? '')
    || sesion?.usuario.permisos.some((permiso) => /medico|consulta/.test(permiso));
  const modulosVisibles = modulos.filter((item) => {
    const perfil = sesion?.usuario.perfilAtencion;
    if (perfil === 'enfermera') return ['triaje-ambulatorio', 'triaje-emergencias', 'enfermera-internacion', 'farmacia-internacion', 'enfermera-quirofano'].includes(item.id);
    if (perfil === 'medico') return ['pacientes', 'atencion-medica', 'atencion-urgencias', 'medico-internacion'].includes(item.id);
    if (perfil === 'quirofano') return ['enfermera-quirofano', 'medico-quirofano', 'central-esterilizacion', 'recepcion-material-sucio', 'entrega-material-esteril', 'roperia'].includes(item.id);
    return true;
  });
  useEffect(() => {
    document.documentElement.dataset.theme = tema;
    localStorage.setItem("pulso_theme", tema);
    document.documentElement.classList.add("tema-cambiando");
    const finTransicion = window.setTimeout(() => document.documentElement.classList.remove("tema-cambiando"), 280);
    return () => window.clearTimeout(finTransicion);
  }, [tema]);
  useEffect(() => {
    const recibir = (event: Event) => setAvisos(actuales => [(event as CustomEvent).detail, ...actuales].slice(0, 20));
    window.addEventListener('radiuus:notificacion', recibir);
    return () => window.removeEventListener('radiuus:notificacion', recibir);
  }, []);
  useEffect(() => {
    if (!menuAbierto) return;
    const antes = document.activeElement as HTMLElement | null;
    const sidebar = document.querySelector<HTMLElement>('.sistema-sidebar');
    const botones = () => Array.from(sidebar?.querySelectorAll<HTMLButtonElement>('button') || []).filter(b => b.getClientRects().length > 0);
    botones()[0]?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const teclado = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuAbierto(false);
      if (e.key === 'Tab') { const lista = botones(), primero = lista[0], ultimo = lista[lista.length - 1]; if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo?.focus(); } else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero?.focus(); } }
    };
    window.addEventListener('keydown', teclado);
    return () => { document.body.style.overflow = overflow; window.removeEventListener('keydown', teclado); antes?.focus(); };
  }, [menuAbierto]);
  const [sidebarReplegado, setSidebarReplegado] = useState(
    () => localStorage.getItem("pulso_sidebar_replegado") === "1",
  );
  const [modoRevision, setModoRevision] = useState(() => localStorage.getItem('clinico_modo_revision') === '1');
  useEffect(() => {
    const cambiar = (evento: Event) => { const activo = Boolean((evento as CustomEvent<boolean>).detail); localStorage.setItem('clinico_modo_revision', activo ? '1' : '0'); setModoRevision(activo); };
    window.addEventListener('clinico:modo-revision', cambiar);
    return () => window.removeEventListener('clinico:modo-revision', cambiar);
  }, []);
  useEffect(() => {
    const replegar = () => setSidebarReplegado((actual) => {
      if (actual) return actual;
      localStorage.setItem("pulso_sidebar_replegado", "1");
      return true;
    });
    window.addEventListener("clinico:replegar-sidebar", replegar);
    return () => window.removeEventListener("clinico:replegar-sidebar", replegar);
  }, []);
  useEffect(() => {
    const expirar = () => setSesion(null);
    window.addEventListener("sesion-expirada", expirar);
    return () => window.removeEventListener("sesion-expirada", expirar);
  }, []);
  useEffect(() => {
    if (!sesion) setModulo("");
  }, [sesion]);
  useEffect(() => {
    if (!sesion || modulo !== "imagenologia") return;
    const actualizarLocales = () => {
      const estudios = obtenerEstudios();
      const pacientesPorModalidad = (categoria: string) => new Set(estudios.filter(estudio => estudio.categoria === categoria).map(estudio => estudio.pacienteId)).size;
      setConteosImagenologia({
        pacientes: obtenerPacientes().length,
        informes: Object.keys(obtenerInformes()).length,
        estudios: obtenerSolicitudesImagenologia().length,
        radiografias: pacientesPorModalidad('Radiografía'),
        tomografias: pacientesPorModalidad('Tomografía'),
        ecografias: pacientesPorModalidad('Ecografía'),
        ecocardiogramas: pacientesPorModalidad('Ecocardiograma'),
      });
    };
    actualizarLocales();
    window.addEventListener("radiuus:datos-demo", actualizarLocales);
    return () => {
      window.removeEventListener("radiuus:datos-demo", actualizarLocales);
    };
  }, [sesion?.token, modulo]);
  useEffect(() => {
    if (!sesion) return;
    const restante = sesion.expiresAt - Date.now();
    if (restante <= 0) {
      localStorage.removeItem("pulso_session");
      sessionStorage.removeItem("pulso_session");
      setSesion(null);
      return;
    }
    const timer = window.setTimeout(() => {
      localStorage.removeItem("pulso_session");
      sessionStorage.removeItem("pulso_session");
      setSesion(null);
    }, restante);
    return () => window.clearTimeout(timer);
  }, [sesion]);
  useEffect(() => {
    const navegar = (evento: Event) => {
      const id = (evento as CustomEvent<string>).detail;
      if (id === "visor-tomografias") {
        setModulo("imagenologia");
        setSubvistaImagenologia("visor");
        setVisorModalidad("Tomografía");
        setBusqueda('');
        setMenuAbierto(false);
      } else if (id === "visor") {
        setModulo("imagenologia");
        setSubvistaImagenologia("visor");
        setVisorModalidad(null);
        setBusqueda('');
        setMenuAbierto(false);
      } else if (subvistasImagenologia.some(vista => vista.id === id)) {
        setModulo("imagenologia");
        setSubvistaImagenologia(id as SubvistaImagenologia);
        setVisorModalidad(null);
        setBusqueda('');
        setMenuAbierto(false);
      } else if (id === "estudios") {
        setModulo("imagenologia");
        setSubvistaImagenologia("radiografias");
        setSubvistaModalidad("estudios");
        setBusqueda('');
        setMenuAbierto(false);
      } else if (id === "base-datos") {
        setModulo("imagenologia");
        setSubvistaImagenologia("radiografias");
        setSubvistaModalidad("estudios");
        setBusqueda('');
        setMenuAbierto(false);
      } else if (["caja", "citas", "cuentas", "comprobantes", "reportes"].includes(id)) {
        setModulo("recepcion");
        setSubvistaRecepcion(id as SubvistaRecepcion);
        setBusqueda('');
        setMenuAbierto(false);
      } else if (id === "usuarios" || id === "roles") {
        setModulo("configuracion");
        setSubvistaConfiguracion("usuarios");
        setBusqueda('');
        setMenuAbierto(false);
      } else if (modulos.some(m => m.id === id)) {
        setModulo(id);
        setBusqueda('');
        setMenuAbierto(false);
      }
    };
    window.addEventListener("radiuus:navegar", navegar);
    return () => window.removeEventListener("radiuus:navegar", navegar);
  }, []);
  if (!sesion) return <><CentroNotificaciones /><VistaInicioSesion onLogin={setSesion} /></>;
  const moduloActual = modulos.find((item) => item.id === modulo);
  const subvistaActual = subvistasImagenologia.find((item) => item.id === subvistaImagenologia) ?? subvistasImagenologia[0];
  const actual = moduloActual && modulo === "imagenologia"
    ? { ...moduloActual, nombre: subvistaActual.nombre, icono: subvistaActual.icono }
    : moduloActual;
  const opcionesBusqueda = [...modulos, ...subvistasImagenologia];
  const textoBusqueda = busqueda.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const cerrarSesion = () => {
    fetch("/api/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${sesion.token}` },
    }).catch(() => undefined);
    localStorage.removeItem("pulso_session");
    sessionStorage.removeItem("pulso_session");
    setSesion(null);
    setMenuAbierto(false);
    setAvisos([]);
    setVerAvisos(false);
    setBusqueda('');
    setModulo('');
  };
  const alternarSidebar = () =>
    setSidebarReplegado((valor) => {
      const siguiente = !valor;
      localStorage.setItem("pulso_sidebar_replegado", siguiente ? "1" : "0");
      return siguiente;
    });
  const replegarSidebarAlInteractuar = () => window.dispatchEvent(new Event('clinico:replegar-sidebar'));
  return (
    <main
      className={`sistema-app ${sidebarReplegado ? "sidebar-replegado" : ""} ${modoRevision ? "modo-revision" : ""}`}
      data-theme={tema}
    >
      <CentroNotificaciones />
      {modoRevision && <aside className="modo-revision-bloqueo" role="alert"><Icon name="settings" size={22}/><div><strong>Sistema en modo revisión</strong><small>Las acciones están bloqueadas.</small></div><button type="button" onClick={() => window.dispatchEvent(new CustomEvent('clinico:modo-revision', { detail: false }))}>Reactivar sistema</button></aside>}
      <aside
        className={`sistema-sidebar ${menuAbierto ? "sidebar-abierto" : ""}`}
      >
        <div className="sistema-marca">
          <span className="marca-icono">
            <img src="/logo-hospital-original.png" alt="Logo Hospital Maria Esperanza" />
          </span>
          <span className="marca-texto">
            <strong>Hospital Maria Esperanza</strong>
            <small>Sistema clinico</small>
          </span>
          <button
            className="replegar-menu"
            onClick={alternarSidebar}
            aria-label={
              sidebarReplegado
                ? "Desplegar menú lateral"
                : "Replegar menú lateral"
            }
            title={sidebarReplegado ? "Desplegar menú" : "Replegar menú"}
          >
            <Icon name={sidebarReplegado ? "chevronRight" : "chevronLeft"} size={17} />
          </button>
          <button
            className="cerrar-menu"
            onClick={() => setMenuAbierto(false)}
            aria-label="Cerrar menú"
          >
            <Icon name="close" />
          </button>
        </div>
        <nav className="sistema-nav" aria-label="Módulos del sistema">
          {[...new Set(modulosVisibles.map((item) => item.grupo))].map((grupo) => (
            <section key={grupo}>
              <p>{grupo}</p>
              {modulosVisibles
                .filter((item) => item.grupo === grupo)
                .map((item) => (
                  <React.Fragment key={item.id}>
                  <button
                    title={sidebarReplegado ? item.nombre : undefined}
                    aria-label={item.nombre}
                    aria-current={modulo === item.id ? "page" : undefined}
                    key={item.id}
                    className={`nav-modulo nav-${item.id}${modulo === item.id ? " activo" : ""}`}
                    onClick={() => {
                      setModulo(item.id);
                      if (item.id === "imagenologia") setSubvistaImagenologia("pacientes");
                      if (item.id === "atencion-agenda") setSubvistaAtencionAgenda("pacientes");
                      if (item.id === "recepcion") setSubvistaRecepcion("caja");
                      if (item.id === "pacientes") setSubvistaPacientes("pacientes");
                      if (item.id === "configuracion") setSubvistaConfiguracion("usuario");
                      if (item.id === "triaje-ambulatorio") setSubvistaTriajeAmbulatorio("signos-vitales");
                      setMenuAbierto(false);
                    }}
                  >
                    <span className="nav-icono">
                      <Icon name={item.icono} size={20} />
                    </span>
                    <span className="nav-texto">{item.nombre}</span>
                    <Icon
                      className="nav-indicador"
                      name="chevronRight"
                      size={14}
                    />
                  </button>
                  </React.Fragment>
                ))}
            </section>
          ))}
        </nav>
        <button
          className="boton-salir"
          title={sidebarReplegado ? "Cerrar sesión" : undefined}
          onClick={cerrarSesion}
        >
          <span className="nav-icono">
            <Icon name="logout" size={19} />
          </span>
          <span className="nav-texto">Cerrar sesión</span>
        </button>
      </aside>
      {menuAbierto && (
        <button
          className="menu-fondo"
          onClick={() => setMenuAbierto(false)}
          aria-label="Cerrar menú"
        />
      )}
      <section className="sistema-cuerpo" inert={menuAbierto}>
        <header className="sistema-topbar">
          <button
            className="desplegar-sidebar-escritorio"
            onClick={alternarSidebar}
            aria-label={sidebarReplegado ? "Desplegar menú lateral" : "Replegar menú lateral"}
            title={sidebarReplegado ? "Desplegar menú lateral" : "Replegar menú lateral"}
            aria-expanded={!sidebarReplegado}
          >
            <Icon name="menu" size={20} />
          </button>
          <button
            className="abrir-menu"
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú"
          >
            <Icon name="menu" />
          </button>
          {actual && <><span className="topbar-icono">
            <Icon name={actual.icono} size={20} />
          </span>
          <div className="topbar-titulo">
            <h1>{actual.nombre}</h1>
          </div></>}
          <label className="busqueda-global">
            <Icon name="search" size={18} />
            <input aria-label="Buscar módulo" placeholder="Buscar un módulo" value={busqueda} onChange={e => setBusqueda(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') setBusqueda(''); }}/>
            {busqueda.trim() && <div className="pulso-resultados">{opcionesBusqueda.filter(m => m.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(textoBusqueda)).map(m => <button type="button" key={m.id} onClick={() => { if (subvistasImagenologia.some(vista => vista.id === m.id)) { setModulo("imagenologia"); setSubvistaImagenologia(m.id as SubvistaImagenologia); } else setModulo(m.id); setBusqueda(''); }}>{m.nombre}</button>)}{!opcionesBusqueda.some(m => m.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(textoBusqueda)) && <p>No se encontraron módulos.</p>}</div>}
          </label>
          <button className="topbar-boton" aria-label="Notificaciones" aria-expanded={verAvisos} onClick={() => setVerAvisos(!verAvisos)}>
            <Icon name="bell" size={20} />
          </button>
          {verAvisos && <section className="pulso-avisos" aria-label="Notificaciones recientes"><h2>Notificaciones</h2><button onClick={() => setVerAvisos(false)}>Cerrar</button>{avisos.length ? avisos.map((a, i) => <article key={i}><strong>{a.titulo}</strong><p>{a.mensaje}</p></article>) : <p>No hay notificaciones en esta sesión.</p>}</section>}
          {esMedico && <button className="cola-atencion-rapida" type="button" onClick={() => setColaAtencionAbierta(true)}><Icon name="userCheck" size={17} /> Cola de atención</button>}
          <button className="perfil" type="button" onClick={() => { setModulo("configuracion"); setSubvistaConfiguracion("usuario"); }} aria-label="Abrir Mi usuario">
            <span className="perfil-avatar">
              <Icon name="users" size={21} />
            </span>
            <span>
              <strong>{sesion.usuario.nombre}</strong>
              <small>
                <i />
                {sesion.usuario.rol}
              </small>
            </span>
          </button>
          <button
            className="salir-rapido"
            onClick={cerrarSesion}
            aria-label="Cerrar sesión"
          >
            <Icon name="logout" size={20} />
          </button>
        </header>
        {colaAtencionAbierta && <div className="cola-atencion-modal" role="dialog" aria-modal="true" aria-label="Cola de atención">
          <button className="cola-atencion-fondo" type="button" aria-label="Cerrar cola de atención" onClick={() => setColaAtencionAbierta(false)} />
          <aside className="cola-atencion-panel">
            <header><div><p>CONSULTORIO MÉDICO</p><h2>Cola de atención</h2><small>Pacientes confirmados pendientes de atención.</small></div><button type="button" aria-label="Cerrar" onClick={() => setColaAtencionAbierta(false)}>×</button></header>
            <div className="cola-atencion-lista">{[
              { id: 'cola-ana', hora: '09:15', paciente: 'Ana Rodríguez Vargas', ci: '6102837', especialidad: 'Consulta ambulatoria' },
              { id: 'cola-jorge', hora: '10:00', paciente: 'Jorge Quiroga Salinas', ci: '5948216', especialidad: 'Seguimiento clínico' },
              { id: 'cola-sofia', hora: '11:30', paciente: 'Sofía Castillo Flores', ci: '7013659', especialidad: 'Consulta general' },
            ].map((cita, indice) => <article key={cita.id}>
              <span className="cola-atencion-numero">{indice + 1}</span><div className="cola-atencion-datos"><b>Por atender</b><strong>{cita.paciente}</strong><small>{cita.especialidad}</small></div><time>{cita.hora}</time><button type="button" onClick={() => { setPacienteColaAtencion({ ...cita, doctor: sesion?.usuario.nombre || 'Consultorio médico', fecha: new Date().toLocaleDateString('en-CA') }); setColaAtencionAbierta(false); setModulo('atencion-medica'); setColaAtencionVersion((actual) => actual + 1); }}>Atender paciente</button>
            </article>)}</div>
          </aside>
        </div>}
        <div className="area-trabajo" onPointerDownCapture={replegarSidebarAlInteractuar} onFocusCapture={replegarSidebarAlInteractuar}>
          <Suspense fallback={<div className="modulo-vacio" role="status"><span><Icon name="patient" size={28} /></span><p>CARGANDO</p><h2>Preparando flujo…</h2><small>Activando únicamente los recursos de esta área.</small></div>}>
          {modulo === "imagenologia" && (
            <nav className="imagenologia-subvistas" aria-label="Subvistas de Imagenología">
              {subvistasImagenologia.map(vista => (
                <button key={vista.id} className={subvistaImagenologia === vista.id ? "activo" : ""} onClick={() => { setSubvistaImagenologia(vista.id); if (["radiografias", "tomografias", "ecografias", "ecocardiogramas"].includes(vista.id)) setSubvistaModalidad("pacientes"); }}>
                  <span><Icon name={vista.icono} size={16} /></span>
                  {vista.nombre}
                  <b>{vista.id === "pacientes" ? conteosImagenologia.pacientes : vista.id === "informes" ? conteosImagenologia.informes : vista.id === "radiografias" ? conteosImagenologia.radiografias : vista.id === "tomografias" ? conteosImagenologia.tomografias : vista.id === "ecografias" ? conteosImagenologia.ecografias : vista.id === "ecocardiogramas" ? conteosImagenologia.ecocardiogramas : conteosImagenologia.estudios}</b>
                </button>
              ))}
            </nav>
          )}
          {modulo === "imagenologia" && ["radiografias", "tomografias", "ecografias", "ecocardiogramas"].includes(subvistaImagenologia) && (
            <nav className="imagenologia-subvistas imagenologia-subsubvistas" aria-label={`Subvistas de ${subvistaActual.nombre}`}>
              {subvistasModalidad.map(vista => (
                <button key={vista.id} className={subvistaModalidad === vista.id ? "activo" : ""} onClick={() => setSubvistaModalidad(vista.id)}>
                  <span><Icon name={vista.icono} size={16} /></span>{vista.nombre}
                  <b>{conteoModalidadActual}</b>
                </button>
              ))}
            </nav>
          )}
          {modulo === "pacientes" && (
            <nav className="pacientes-subvistas" aria-label="Subvistas de Pacientes">
              {subvistasPacientes.map(vista => (
                <button
                  key={vista.id}
                  className={subvistaPacientes === vista.id ? "activo" : ""}
                  onClick={() => setSubvistaPacientes(vista.id)}
                >
                  <Icon className="pacientes-subvista-icono" name={vista.icono} size={17} />
                  <i className="pacientes-subvista-texto"><strong>{vista.nombre}</strong><small>{vista.id === 'pacientes' ? 'Registro y búsqueda' : vista.id === 'historias' ? 'Expediente clínico' : 'Resultados médicos'}</small></i>
                </button>
              ))}
            </nav>
          )}
          {modulo === 'atencion-agenda' && <section className="triaje-ambulatorio-vista"><HorizontalSubvistaNav className="recepcion-subvistas" ariaLabel="Atención y agenda"><button type="button" className={subvistaAtencionAgenda === 'pacientes' ? 'activo' : ''} onClick={() => setSubvistaAtencionAgenda('pacientes')}><span><Icon name="patient" size={17}/></span><strong>Pacientes agendados</strong><small>Estudios y atenciones pendientes.</small></button><button type="button" className={subvistaAtencionAgenda === 'cronograma' ? 'activo' : ''} onClick={() => setSubvistaAtencionAgenda('cronograma')}><span><Icon name="calendar" size={17}/></span><strong>Cronograma semanal</strong><small>Agenda por día y horario.</small></button></HorizontalSubvistaNav></section>}
          {modulo === 'recepcion' ? <RecepcionView key={subvistaRecepcion} initialSubview={subvistaRecepcion} onAbrirModulo={setModulo}/> : modulo === 'atencion-agenda' ? (subvistaAtencionAgenda === 'pacientes' ? <AgendaImagenologiaView /> : <CronogramaEstudiosView />) : modulo === 'farmacia' ? <FarmaciaView /> : modulo === 'farmacia-movimientos' ? <AdministracionFarmaciaView /> : modulo === 'cocina' ? <CocinaVentasView /> : modulo === 'cocina-internacion' ? <CocinaInternacionView /> : modulo === 'cocina-administracion' ? <CocinaAdministracionView /> : modulo === 'pacientes' ? (subvistaPacientes === 'pacientes' ? <VistaPacientes modoClinico /> : subvistaPacientes === 'historias' ? <HistoriasClinicasView /> : <TablaSubvistaPaciente vista="estudios" />) : modulo === 'laboratorio-almacen' ? <LaboratorioAlmacenView /> : ['laboratorio-ambulatorios', 'laboratorio-internados', 'laboratorio-configuracion'].includes(modulo) ? (
            modulo === 'laboratorio-configuracion' ? <ConfiguracionLaboratorioView /> : <LaboratorioView key={modulo} origen={modulo === 'laboratorio-internados' ? 'internacion' : 'ambulatorio'} />
          ) : modulo === 'atencion-medica' ? (
            <ConsultorioView key={colaAtencionVersion} medico={sesion.usuario.nombre} initialSubview="consulta" initialPatient={pacienteColaAtencion} />
          ) : modulo === 'triaje-ambulatorio' ? (
            <section className="triaje-ambulatorio-vista">
              <HorizontalSubvistaNav className="recepcion-subvistas" ariaLabel="Subvistas de Triaje ambulatorio">
                <button type="button" aria-current={subvistaTriajeAmbulatorio === 'signos-vitales' ? 'page' : undefined} className={subvistaTriajeAmbulatorio === 'signos-vitales' ? 'activo' : ''} onClick={() => setSubvistaTriajeAmbulatorio('signos-vitales')}><span><Icon name="patient" size={17} /></span><strong>Signos vitales</strong></button>
                <button type="button" aria-current={subvistaTriajeAmbulatorio === 'agenda' ? 'page' : undefined} className={subvistaTriajeAmbulatorio === 'agenda' ? 'activo' : ''} onClick={() => setSubvistaTriajeAmbulatorio('agenda')}><span><Icon name="calendar" size={17} /></span><strong>Agenda</strong></button>
                <button type="button" aria-current={subvistaTriajeAmbulatorio === 'registro-uso' ? 'page' : undefined} className={subvistaTriajeAmbulatorio === 'registro-uso' ? 'activo' : ''} onClick={() => setSubvistaTriajeAmbulatorio('registro-uso')}><span><Icon name="audit" size={17} /></span><strong>Registro de uso</strong></button>
                <button type="button" aria-current={subvistaTriajeAmbulatorio === 'configuracion' ? 'page' : undefined} className={subvistaTriajeAmbulatorio === 'configuracion' ? 'activo' : ''} onClick={() => setSubvistaTriajeAmbulatorio('configuracion')}><span><Icon name="settings" size={17} /></span><strong>Configuración</strong></button>
              </HorizontalSubvistaNav>
              {subvistaTriajeAmbulatorio === 'signos-vitales' && <SignosVitalesView camposConfigurados={signosVitalesConfigurados} />}
              {subvistaTriajeAmbulatorio === 'agenda' && <CitasRecepcionView />}
              {subvistaTriajeAmbulatorio === 'registro-uso' && <RegistroUsoTriajeView />}
              {subvistaTriajeAmbulatorio === 'configuracion' && <ConfiguracionSignosVitalesView signos={signosVitalesConfigurados} onChange={setSignosVitalesConfigurados} />}
            </section>
          ) : modulo === 'triaje-emergencias' ? (
            <TriajeEmergenciasView onAtender={emergenciaId => { setEmergenciaEnAtencion(emergenciaId); setModulo('atencion-urgencias'); }} />
          ) : modulo === 'atencion-urgencias' ? (
            <AtencionMedicaEmergenciasView cuentaInicialId={emergenciaEnAtencion} />
          ) : modulo === 'enfermera-terapia-intensiva' ? (
            <section className="triaje-ambulatorio-vista">
              <HorizontalSubvistaNav className="recepcion-subvistas" ariaLabel="Subvistas de enfermería de terapia intensiva">
                <button type="button" aria-current={subvistaTerapia === 'registro-enfermeria' ? 'page' : undefined} className={subvistaTerapia === 'registro-enfermeria' ? 'activo' : ''} onClick={() => setSubvistaTerapia('registro-enfermeria')}><span><Icon name="audit" size={17}/></span><strong>Registro de enfermería</strong><small>Registro y seguimiento de cuidados de enfermería.</small></button>
                <button type="button" aria-current={subvistaTerapia === 'monitorizacion' ? 'page' : undefined} className={subvistaTerapia === 'monitorizacion' ? 'activo' : ''} onClick={() => setSubvistaTerapia('monitorizacion')}><span><Icon name="patient" size={17}/></span><strong>Monitorización</strong><small>Seguimiento de pacientes en terapia intensiva.</small></button>
                <button type="button" aria-current={subvistaTerapia === 'registros' ? 'page' : undefined} className={subvistaTerapia === 'registros' ? 'activo' : ''} onClick={() => setSubvistaTerapia('registros')}><span><Icon name="audit" size={17}/></span><strong>Registros</strong><small>Registros de enfermería de terapia intensiva.</small></button>
              </HorizontalSubvistaNav>
              {subvistaTerapia === 'registro-enfermeria' ? <RegistroEnfermeriaTerapiaView /> : subvistaTerapia === 'monitorizacion' ? <TerapiaIntensivaView /> : <section className="em-panel" aria-labelledby="terapia-subvista-titulo"><header className="em-panel-titulo"><h2 id="terapia-subvista-titulo">Registros</h2></header><p className="em-vacio">Aún no hay registros de enfermería.</p></section>}
            </section>
          ) : modulo === 'enfermera-internacion' ? (
            <section className="triaje-ambulatorio-vista">
              <HorizontalSubvistaNav className="recepcion-subvistas" ariaLabel="Subvistas de enfermería de internación">
                <button type="button" aria-current={subvistaEnfermeraInternacion === 'internados' ? 'page' : undefined} className={subvistaEnfermeraInternacion === 'internados' ? 'activo' : ''} onClick={() => setSubvistaEnfermeraInternacion('internados')}><span><Icon name="patient" size={17}/></span><strong>Pacientes internados</strong><small>Pacientes activos por sala y cama.</small></button>
                <button type="button" aria-current={subvistaEnfermeraInternacion === 'altas' ? 'page' : undefined} className={subvistaEnfermeraInternacion === 'altas' ? 'activo' : ''} onClick={() => setSubvistaEnfermeraInternacion('altas')}><span><Icon name="check" size={17}/></span><strong>Pacientes dados de alta</strong><small>Historial de internaciones finalizadas.</small></button>
              </HorizontalSubvistaNav>
              <EnfermeraInternacionView subvista={subvistaEnfermeraInternacion} />
            </section>
          ) : modulo === 'farmacia-internacion' ? (
            <FarmaciaInternacionView enfermera={sesion.usuario.nombre} />
          ) : modulo === 'medico-internacion' ? (
            <section className="triaje-ambulatorio-vista">
              <HorizontalSubvistaNav className="recepcion-subvistas" ariaLabel="Subvistas de médico de internación">
                <button type="button" aria-current={subvistaMedicoInternacion === 'internados' ? 'page' : undefined} className={subvistaMedicoInternacion === 'internados' ? 'activo' : ''} onClick={() => setSubvistaMedicoInternacion('internados')}><span><Icon name="patient" size={17}/></span><strong>Pacientes internados</strong><small>Pacientes activos por sala y cama.</small></button>
                <button type="button" aria-current={subvistaMedicoInternacion === 'altas' ? 'page' : undefined} className={subvistaMedicoInternacion === 'altas' ? 'activo' : ''} onClick={() => setSubvistaMedicoInternacion('altas')}><span><Icon name="check" size={17}/></span><strong>Pacientes dados de alta</strong><small>Historial de internaciones finalizadas.</small></button>
              </HorizontalSubvistaNav>
              <MedicoInternacionView subvista={subvistaMedicoInternacion}/>
            </section>
          ) : modulo === 'enfermera-quirofano' ? (
            <section className="enfermeria-quirofano-vista">
    <nav className="enfermeria-q-subvistas recepcion-subvistas" aria-label="Funciones de enfermería de quirófano">
      <button type="button" className={rolEnfermeriaQuirofano === 'instrumentista' ? 'activo' : ''} onClick={() => { setRolEnfermeriaQuirofano('instrumentista'); setCirugiaInstrumentista(null); }}><span><Icon name="patient" size={17}/></span><strong>Enfermera instrumentista</strong></button>
      <button type="button" className={rolEnfermeriaQuirofano === 'circulante' ? 'activo' : ''} onClick={() => { setRolEnfermeriaQuirofano('circulante'); setCirugiaInstrumentista(null); }}><span><Icon name="userCheck" size={17}/></span><strong>Enfermera circulante</strong></button>
      <button type="button" className={rolEnfermeriaQuirofano === 'almacen' ? 'activo' : ''} onClick={() => setRolEnfermeriaQuirofano('almacen')}><span><Icon name="package" size={17}/></span><strong>Almacén quirófano</strong></button>
              </nav>
              <section className="enfermeria-q-panel">
                {(['instrumentista', 'circulante'] as RolEnfermeriaQuirofano[]).includes(rolEnfermeriaQuirofano) ? (cirugiaSeleccionadaReal ? (rolEnfermeriaQuirofano === 'instrumentista' ? <InstrumentistaPreparacionView cirugia={cirugiaSeleccionada} onVolver={() => setCirugiaInstrumentista(null)} /> : <CirculanteAsistenciaView cirugia={cirugiaSeleccionada} onVolver={() => setCirugiaInstrumentista(null)} />) : Date.now() < 0 && cirugiaSeleccionada ? <div className="instrumentista-tablero">
                  <div className="instrumentista-contexto"><button type="button" onClick={() => setCirugiaInstrumentista(null)}><Icon name="chevronLeft" size={16} /> Cirugías programadas</button><div><span>{cirugiaSeleccionada.sala} · {cirugiaSeleccionada.hora}</span><h3>{cirugiaSeleccionada.procedimiento}</h3><small>{cirugiaSeleccionada.paciente} · {cirugiaSeleccionada.cirujano}</small></div></div>
                  <div className="instrumentista-indicadores" aria-label="Resumen de actividad de la cirugía seleccionada"><div><span><Icon name="package" size={18} /></span><strong>18</strong><small>Instrumentos dispensados</small></div><div><span><Icon name="check" size={18} /></span><strong>3</strong><small>Conteos verificados</small></div><div><span><Icon name="patient" size={18} /></span><strong>1</strong><small>Cirugía seleccionada</small></div><div><span><Icon name="audit" size={18} /></span><strong>0</strong><small>Observaciones pendientes</small></div></div>
                  <div className="instrumentista-listado"><div className="instrumentista-tabla" role="table" aria-label="Material dispensado para la cirugía seleccionada"><div className="instrumentista-fila instrumentista-columnas" role="row"><span>Instrumental / kit</span><span>Procedimiento</span><span>Hora</span><span>Estado</span></div><div className="instrumentista-fila" role="row"><span><strong>Kit de cirugía general</strong><small>KIT-CG-021 · 24 piezas</small></span><span>{cirugiaSeleccionada.procedimiento}</span><span>08:15</span><span><b className="estado-dispensado">Dispensado</b></span></div><div className="instrumentista-fila" role="row"><span><strong>Pinza Backhaus</strong><small>INST-004 · Serie BAC-004</small></span><span>{cirugiaSeleccionada.procedimiento}</span><span>08:18</span><span><b className="estado-en-uso">En uso</b></span></div><div className="instrumentista-fila" role="row"><span><strong>Set de laparotomía</strong><small>KIT-LAP-008 · 36 piezas</small></span><span>{cirugiaSeleccionada.procedimiento}</span><span>10:05</span><span><b className="estado-dispensado">Dispensado</b></span></div><div className="instrumentista-fila" role="row"><span><strong>Gasas estériles 10 × 10</strong><small>INS-GAS-110 · 4 paquetes</small></span><span>{cirugiaSeleccionada.procedimiento}</span><span>10:12</span><span><b className="estado-verificado">Conteo verificado</b></span></div></div></div>
                </div> : <div className="instrumentista-agenda"><div className="instrumentista-agenda-filtros"><label>Desde<input type="date" value={fechaDesdeCirugias} onChange={event => setFechaDesdeCirugias(event.target.value)} /></label><label>Hasta<input type="date" value={fechaHastaCirugias} min={fechaDesdeCirugias || undefined} onChange={event => setFechaHastaCirugias(event.target.value)} /></label><button type="button" onClick={() => setModulo('cuenta-quirofano')}><Icon name="calendar" size={16} /> Agendar cirugía</button></div><div className="instrumentista-cirugias">{cirugiasVisiblesEnfermeria.length ? <><div className="instrumentista-cirugias-cabecera" aria-hidden="true"><span /><span>TIPO DE CIRUGÍA</span><span>PACIENTE</span><span>QUIRÓFANO / CIRUJANO</span><span /></div>{cirugiasVisiblesEnfermeria.map((cirugia) => <button type="button" className="instrumentista-cirugia" key={cirugia.id} onClick={() => setCirugiaInstrumentista(cirugia.id)}><time>{cirugia.hora}</time><div className="instrumentista-procedimiento"><strong>{cirugia.procedimiento}</strong></div><div className="instrumentista-paciente"><strong>{cirugia.paciente}</strong></div><div className="instrumentista-sala"><strong>{cirugia.sala}</strong><span>{cirugia.cirujano}</span></div><b>Revisar<Icon name="chevronRight" size={16} /></b></button>)}</> : <div className="instrumentista-agenda-vacia"><Icon name="calendar" size={28}/><strong>No tienes cirugías asignadas</strong><small>Cuando seas asignada como instrumentista o circulante, la cirugía aparecerá aquí.</small></div>}</div></div>) :
                  rolEnfermeriaQuirofano === 'circulante' ? <><p>ASISTENCIA CIRCULANTE</p><h3>Enfermera circulante</h3><small>Verificación de sala y paciente, coordinación de insumos, apoyo al equipo y registro del procedimiento.</small></> :
                  <AlmacenQuirofanoView />}
              </section>
            </section>
          ) : modulo === 'medico-quirofano' ? (
            <MedicoQuirofanoView />
          ) : modulo === 'anestesiologia-quirofano' ? (
            <AnestesiologiaView />
          ) : modulo === 'central-esterilizacion' ? (
            <EsterilizacionView titulo="Inventario de material" subvistasVisibles={['inventario', 'kits']} />
          ) : modulo === 'recepcion-material-sucio' ? (
            <EsterilizacionView titulo="Central de esterilización" subvistaInicial="area-roja" subvistasVisibles={['area-roja', 'area-azul', 'area-verde']} />
          ) : modulo === 'entrega-material-esteril' ? (
            <EsterilizacionView titulo="Administración de esterilización" subvistaInicial="entrega" subvistasVisibles={['entrega', 'seguimiento', 'solicitudes', 'cronograma']} />
          ) : modulo === 'roperia' ? (
            <RoperiaView />
          ) : modulo === 'cuenta-quirofano' ? (
            <CuentaQuirofanoView />
          ) : modulo === "imagenologia" && subvistaImagenologia === "radiografias" && subvistaModalidad === "estudios" ? (
            <VistaBaseDatosOrthanc />
          ) : modulo === "imagenologia" && subvistaImagenologia === "tomografias" && subvistaModalidad === "estudios" ? (
            <VistaEstudiosCobrados tipoEstudio="Tomografía" />
          ) : modulo === "imagenologia" && subvistaImagenologia === "ecografias" && subvistaModalidad === "estudios" ? (
            <VistaEstudiosCobrados tipoEstudio="Ecografía" />
          ) : modulo === "imagenologia" && subvistaImagenologia === "ecocardiogramas" && subvistaModalidad === "estudios" ? (
            <VistaEstudiosCobrados tipoEstudio="Ecocardiograma" />
          ) : modulo === "imagenologia" && subvistaImagenologia === "informes" ? (
            <VistaInformes />
          ) : modulo === "imagenologia" && subvistaImagenologia === "ecografias" ? (
            <VistaPacientes modalidad="Ecografía" />
          ) : modulo === "imagenologia" && subvistaImagenologia === "ecocardiogramas" ? (
            <VistaPacientes modalidad="Ecocardiograma" />
          ) : modulo === "imagenologia" && ["pacientes", "radiografias", "tomografias"].includes(subvistaImagenologia) ? (
            <VistaPacientes modalidad={subvistaImagenologia === "tomografias" ? "Tomografía" : subvistaImagenologia === "ecocardiogramas" ? "Ecocardiograma" : subvistaImagenologia === "radiografias" ? "Radiografía" : undefined} soloConEstudio={subvistaImagenologia === "radiografias"} />
          ) : modulo === "imagenologia" && subvistaImagenologia === "visor" ? (
            <VistaRayosX modalidad={visorModalidad || undefined} />
          ) : modulo === "configuracion" ? (
            <VistaConfiguracion initialSection={subvistaConfiguracion} tema={tema} onCambiarTema={setTema} usuario={sesion.usuario} />
          ) : modulo === "auditorias" ? (
            <VistaAuditorias sesion={sesion} />
          ) : actual ? (
            <div className="modulo-vacio">
              <span>
                <Icon name={actual.icono} size={28} />
              </span>
              <p>SISTEMA CLÍNICO</p>
              <h2>{actual.nombre}</h2>
              <small>
                Este módulo está listo para incorporar su contenido.
              </small>
            </div>
          ) : null}
          </Suspense>
        </div>
      </section>
    </main>
  );
}
