import type { SystemConfig } from './ui/types';
import { RecepcionView } from './flows/recepcion/RecepcionView';

export const config: SystemConfig = {
  id: 'clinico',
  name: 'HOSPITAL',
  subtitle: 'Atencion y gestion clinica',
  loginTitle: 'ACCESO AL SISTEMA CLINICO',
  role: 'Personal clinico',
  tagline: 'La atencion de tus pacientes, en un solo lugar.',
  category: 'ATENCION Y GESTION CLINICA',
  dashboardTitle: 'Resumen clinico',
  welcomeTitle: 'Todo listo para cuidar de tus pacientes.',
  welcomeDescription: 'Organiza la recepcion, las citas y la atencion de tu clinica.',
  actionId: 'recepcion',
  actionLabel: 'Ir a recepcion',
  quickIds: ['recepcion', 'pacientes', 'estudios'],
  metrics: [
    { title: 'Citas de hoy', icon: 'fileText', value: '18', note: '3 pendientes de confirmar' },
    { title: 'En sala de espera', icon: 'users', value: '4', note: 'Tiempo promedio: 12 min' },
    { title: 'Pacientes atendidos', icon: 'userCheck', value: '9', note: '50 % de la jornada' },
  ],
  modules: [
    { id: 'recepcion', name: 'Recepcion', icon: 'building', group: 'ATENCION CLINICA', description: 'Organiza caja, citas, cuentas y reportes de recepcion.' },
    { id: 'pacientes', name: 'Pacientes', icon: 'patient', group: 'ATENCION CLINICA', description: 'Consulta y organiza la informacion de los pacientes.' },
    { id: 'historia', name: 'Historia clinica', icon: 'audit', group: 'ATENCION CLINICA', description: 'Revisa los antecedentes y la atencion de cada paciente.' },
    { id: 'estudios', name: 'Estudios', icon: 'image', group: 'ATENCION CLINICA', description: 'Consulta los estudios y resultados medicos.' },
    { id: 'tratamientos', name: 'Tratamientos', icon: 'asset', group: 'ATENCION CLINICA', description: 'Organiza el seguimiento y los tratamientos.' },
    { id: 'configuracion', name: 'Configuracion', icon: 'settings', group: 'ADMINISTRACION', description: 'Personaliza el sistema clinico y administra usuarios.' },
  ],
  renderModule: id => id === 'recepcion' ? <RecepcionView/> : null,
};
