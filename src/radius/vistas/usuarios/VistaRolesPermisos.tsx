import { useEffect, useMemo, useState } from 'react';
import Icon from '../../componentes/Icono';
import { apiFetch } from '../../api';
import './VistaRolesPermisos.css';

type Permiso = { codigo: string; nombre: string; descripcion: string };
type IconoFlujo = 'users' | 'calendar' | 'cash' | 'patient' | 'lab' | 'building' | 'settings';
type Flujo = { id: string; nombre: string; descripcion: string; icono: IconoFlujo; permisos: Permiso[] };
type Rol = { id: string; nombre: string; descripcion?: string | null; permisos: string[]; activo?: boolean };

const flujos: Flujo[] = [
  { id: 'recepcion', nombre: 'Recepción', descripcion: 'Ingreso, agenda y caja de recepción.', icono: 'users', permisos: [
    { codigo: 'RECEPCION_VER', nombre: 'Ver Recepción', descripcion: 'Ingresar al flujo principal.' }, { codigo: 'RECEPCION_CAJA_VER', nombre: 'Ver subvista Caja', descripcion: 'Consultar y operar la caja.' }, { codigo: 'RECEPCION_AGENDA_VER', nombre: 'Ver Agenda', descripcion: 'Consultar la agenda y sus turnos.' }, { codigo: 'RECEPCION_CITAS_GESTIONAR', nombre: 'Gestionar citas', descripcion: 'Crear, reprogramar y cancelar citas.' },
  ]},
  { id: 'pacientes', nombre: 'Pacientes', descripcion: 'Registro e información del paciente.', icono: 'patient', permisos: [
    { codigo: 'PACIENTES_VER', nombre: 'Ver pacientes', descripcion: 'Consultar listado y ficha.' }, { codigo: 'PACIENTES_REGISTRAR', nombre: 'Registrar pacientes', descripcion: 'Crear registros de pacientes.' }, { codigo: 'PACIENTES_EDITAR', nombre: 'Editar pacientes', descripcion: 'Actualizar datos y responsables.' }, { codigo: 'HISTORIAS_CLINICAS_VER', nombre: 'Ver historias clínicas', descripcion: 'Consultar antecedentes y atenciones.' },
  ]},
  { id: 'consultorio', nombre: 'Consultorio', descripcion: 'Consulta, diagnóstico y tratamiento.', icono: 'calendar', permisos: [
    { codigo: 'CONSULTORIO_VER', nombre: 'Ver Consultorio', descripcion: 'Acceder a consultas asignadas.' }, { codigo: 'CONSULTAS_ATENDER', nombre: 'Atender consultas', descripcion: 'Registrar evaluación y diagnóstico.' }, { codigo: 'RECETAS_EMITIR', nombre: 'Emitir recetas', descripcion: 'Crear indicaciones médicas.' },
  ]},
  { id: 'internacion', nombre: 'Internación', descripcion: 'Camas y atención hospitalaria.', icono: 'building', permisos: [
    { codigo: 'INTERNACION_VER', nombre: 'Ver Internación', descripcion: 'Consultar pacientes y camas.' }, { codigo: 'INTERNACION_GESTIONAR', nombre: 'Gestionar internación', descripcion: 'Ingresar, trasladar y dar alta.' }, { codigo: 'SIGNOS_VITALES_REGISTRAR', nombre: 'Registrar signos vitales', descripcion: 'Guardar controles del paciente.' },
  ]},
  { id: 'estudios', nombre: 'Estudios y laboratorio', descripcion: 'Solicitudes, resultados e informes.', icono: 'lab', permisos: [
    { codigo: 'IMAGENOLOGIA_VER', nombre: 'Ver Imagenología', descripcion: 'Consultar órdenes y estudios.' }, { codigo: 'IMAGENOLOGIA_INFORMAR', nombre: 'Informar Imagenología', descripcion: 'Registrar y publicar informes.' }, { codigo: 'LABORATORIO_VER', nombre: 'Ver Laboratorio', descripcion: 'Consultar solicitudes y resultados.' }, { codigo: 'LABORATORIO_INFORMAR', nombre: 'Informar Laboratorio', descripcion: 'Registrar resultados.' },
  ]},
  { id: 'administracion', nombre: 'Administración', descripcion: 'Configuración, usuarios y auditoría.', icono: 'settings', permisos: [
    { codigo: 'USUARIOS_VER', nombre: 'Ver usuarios', descripcion: 'Consultar cuentas registradas.' }, { codigo: 'USUARIOS_CREAR', nombre: 'Registrar usuarios', descripcion: 'Crear cuentas y asignar roles.' }, { codigo: 'ROLES_GESTIONAR', nombre: 'Gestionar roles y permisos', descripcion: 'Crear roles y modificar accesos.' }, { codigo: 'AUDITORIA_VER', nombre: 'Ver auditoría', descripcion: 'Consultar eventos del sistema.' },
  ]},
];

const rolVacio = (): Rol => ({ id: '', nombre: '', descripcion: '', permisos: [], activo: true });

export default function VistaRolesPermisos() {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [rol, setRol] = useState<Rol>(rolVacio());
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const todos = useMemo(() => flujos.flatMap(f => f.permisos.map(p => p.codigo)), []);
  const cargar = async () => { setCargando(true); try { const r = await apiFetch('/api/v1/roles'); const d = await r.json(); if (!r.ok) throw new Error(); setRoles(d.data ?? []); } catch { setRoles([]); setMensaje('No se pudieron consultar los roles compartidos.'); } finally { setCargando(false); } };
  useEffect(() => { void cargar(); }, []);
  const alternar = (codigo: string) => setRol(a => ({ ...a, permisos: a.permisos.includes(codigo) ? a.permisos.filter(p => p !== codigo) : [...a.permisos, codigo] }));
  const alternarFlujo = (flujo: Flujo) => { const codigos = flujo.permisos.map(p => p.codigo); const completo = codigos.every(c => rol.permisos.includes(c)); setRol(a => ({ ...a, permisos: completo ? a.permisos.filter(c => !codigos.includes(c)) : [...new Set([...a.permisos, ...codigos])] })); };
  const guardar = async () => { setMensaje(''); if (!rol.nombre.trim()) return setMensaje('Escribe el nombre del rol.'); setGuardando(true); try { const r = await apiFetch(rol.id ? `/api/v1/roles/${rol.id}` : '/api/v1/roles', { method: rol.id ? 'PUT' : 'POST', body: JSON.stringify(rol) }); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.message || 'No se pudo guardar el rol.'); await cargar(); setRol(rolVacio()); setMensaje('Rol guardado correctamente.'); } catch (e) { setMensaje(e instanceof Error ? e.message : 'No se pudo guardar el rol.'); } finally { setGuardando(false); } };

  return <section className="roles-editor-vista">
    <main className="roles-editor-principal">
      <section className="roles-datos"><label>Nombre del rol<input value={rol.nombre} onChange={e => setRol({ ...rol, nombre: e.target.value })} placeholder="Ej. Recepcionista" maxLength={100}/></label><label>Descripción<textarea value={rol.descripcion ?? ''} onChange={e => setRol({ ...rol, descripcion: e.target.value })} placeholder="Describe las responsabilidades de este rol" rows={2}/></label></section>
      <div className="roles-permisos-titulo"><div><h3>Permisos por flujo</h3><p>Marca las vistas y acciones disponibles para este rol.</p></div><button type="button" onClick={() => setRol(a => { const otros = a.permisos.filter(p => !todos.includes(p)); return { ...a, permisos: todos.every(p => a.permisos.includes(p)) ? otros : [...otros, ...todos] }; })}><Icon name="check" size={15}/>{todos.every(p => rol.permisos.includes(p)) ? 'Quitar todos' : 'Seleccionar todos'}</button></div>
      <div className="roles-flujos">{flujos.map(flujo => { const cantidad = flujo.permisos.filter(p => rol.permisos.includes(p.codigo)).length; return <article className="roles-flujo" key={flujo.id}><header><span><Icon name={flujo.icono} size={18}/></span><div><h3>{flujo.nombre}</h3><p>{flujo.descripcion}</p></div><label className="roles-check-todo"><input type="checkbox" checked={cantidad === flujo.permisos.length} onChange={() => alternarFlujo(flujo)}/><i/><b>{cantidad}/{flujo.permisos.length}</b></label></header><div className="roles-permisos-lista">{flujo.permisos.map(permiso => <label className="roles-permiso" key={permiso.codigo}><input type="checkbox" checked={rol.permisos.includes(permiso.codigo)} onChange={() => alternar(permiso.codigo)}/><span className="roles-checkbox"><Icon name="check" size={13}/></span><span><strong>{permiso.nombre}</strong><small>{permiso.descripcion}</small></span></label>)}</div></article>; })}</div>
      <footer className="roles-editor-acciones">{mensaje && <p className={mensaje.includes('correctamente') ? 'correcto' : 'error'}>{mensaje}</p>}<button type="button" onClick={() => { setRol(rolVacio()); setMensaje(''); }}>Limpiar</button><button type="button" className="primario" disabled={guardando} onClick={() => void guardar()}><Icon name="check" size={16}/>{guardando ? 'Guardando…' : rol.id ? 'Guardar cambios' : 'Registrar rol'}</button></footer>
    </main>
    <aside className="roles-editor-lateral"><header><div><p>ROLES DEL SISTEMA</p><h3>Roles registrados</h3></div><button type="button" onClick={() => setRol(rolVacio())} aria-label="Crear nuevo rol"><Icon name="plus" size={16}/></button></header><div className="roles-lateral-lista">{cargando ? <p className="roles-lateral-vacio">Cargando roles…</p> : roles.length ? roles.map(item => <button type="button" className={rol.id === item.id ? 'activo' : ''} key={item.id} onClick={() => { setRol({ ...item, permisos: item.permisos ?? [] }); setMensaje(''); }}><span><Icon name="userCheck" size={17}/></span><div><strong>{item.nombre}</strong><small>{item.permisos?.length ?? 0} permisos</small></div><Icon name="chevronRight" size={15}/></button>) : <p className="roles-lateral-vacio">Aún no hay roles registrados.<br/>Crea el primero desde este formulario.</p>}</div></aside>
  </section>;
}
