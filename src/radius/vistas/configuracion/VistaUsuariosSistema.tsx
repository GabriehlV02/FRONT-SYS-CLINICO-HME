import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { apiFetch } from '../../api';
import Icon from '../../componentes/Icono';
import './VistaUsuariosSistema.css';

type Usuario = { id: string; nombres: string; apellido_paterno?: string | null; apellido_materno?: string | null; apellidos?: string | null; ci?: string | null; correo?: string | null; usuario: string; rol?: string | null; estado: 'ACTIVO' | 'INACTIVO' };
type Rol = { id: string; nombre: string };
const inicial = { tipo_usuario: 'EMPRESA', nombres: '', apellido_paterno: '', apellido_materno: '', ci: '', correo: '', usuario: '', password: '', confirmarPassword: '', rol: '', caja: '' };
const cajas = ['Caja 01', 'Caja 02', 'Caja de emergencia', 'Caja de recepción'];

export default function VistaUsuariosSistema() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [formulario, setFormulario] = useState(inicial);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('TODOS');
  const [modal, setModal] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cargar = async () => { setCargando(true); try { const respuesta = await apiFetch('/api/v1/usuarios'); const datos = await respuesta.json(); if (!respuesta.ok) throw new Error(); setUsuarios(datos.data ?? []); } catch { setUsuarios([]); } finally { setCargando(false); } };
  useEffect(() => { void cargar(); void apiFetch('/api/v1/roles').then(r => r.ok ? r.json() : { data: [] }).then(d => setRoles(d.data ?? [])).catch(() => { setRoles([]); setError('No se pudieron cargar los roles compartidos.'); }); }, []);
  const visibles = useMemo(() => usuarios.filter(item => { const texto = `${item.nombres} ${item.apellido_paterno ?? item.apellidos ?? ''} ${item.apellido_materno ?? ''} ${item.ci ?? ''} ${item.correo ?? ''} ${item.usuario}`.toLowerCase(); return texto.includes(busqueda.toLowerCase()) && (filtroRol === 'TODOS' || item.rol === filtroRol); }), [usuarios, busqueda, filtroRol]);
  const actualizar = (campo: keyof typeof inicial, valor: string) => { setFormulario(actual => ({ ...actual, [campo]: valor })); setError(''); };
  const abrir = () => { setFormulario(inicial); setError(''); setModal(true); };
  const registrar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault(); setError('');
    if (formulario.password !== formulario.confirmarPassword) return setError('Las contraseñas no coinciden.');
    setGuardando(true);
    try { const { confirmarPassword, ...datos } = formulario; const respuesta = await apiFetch('/api/v1/usuarios', { method: 'POST', body: JSON.stringify(datos) }); const resultado = await respuesta.json().catch(() => ({})); if (!respuesta.ok) throw new Error(resultado.errors ? Object.values(resultado.errors).flat().join(' ') : resultado.message || 'No se pudo registrar el usuario.'); await cargar(); setModal(false); setFormulario(inicial); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo registrar el usuario.'); } finally { setGuardando(false); }
  };
  const nombreCompleto = (item: Usuario) => [item.nombres, item.apellido_paterno ?? item.apellidos, item.apellido_materno].filter(Boolean).join(' ');

  return <section className="usuarios-admin" aria-label="Usuarios del sistema">
    <div className="usuarios-admin-barra">
      <label className="usuarios-admin-busqueda"><Icon name="search" size={17}/><input type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre, CI, correo o usuario" aria-label="Buscar usuarios"/></label>
      <label className="usuarios-admin-filtro"><span>Rol</span><select value={filtroRol} onChange={e => setFiltroRol(e.target.value)}><option value="TODOS">Todos los roles</option>{roles.map(rol => <option key={rol.id} value={rol.nombre}>{rol.nombre}</option>)}</select></label>
      <span className="usuarios-admin-total">{visibles.length} usuarios</span>
      <button className="usuarios-admin-nuevo" type="button" onClick={abrir}><Icon name="plus" size={17}/> Nuevo usuario</button>
    </div>
    <div className="usuarios-admin-tabla" role="table" aria-label="Listado de usuarios">
      <div className="usuarios-admin-fila encabezado" role="row"><span>Usuario</span><span>CI</span><span>Correo electrónico</span><span>Rol</span><span>Estado</span></div>
      {cargando ? <div className="usuarios-admin-vacio">Cargando usuarios…</div> : visibles.length ? visibles.map(item => <article className="usuarios-admin-fila" role="row" key={item.id}><div className="usuarios-admin-identidad"><span><Icon name="users" size={17}/></span><div><strong>{nombreCompleto(item)}</strong><small>@{item.usuario}</small></div></div><span data-label="CI">{item.ci || '—'}</span><span data-label="Correo">{item.correo || '—'}</span><span data-label="Rol" className="usuarios-admin-rol">{item.rol || 'Sin rol'}</span><span data-label="Estado" className={`usuarios-admin-estado ${item.estado === 'ACTIVO' ? 'activo' : ''}`}>{item.estado}</span></article>) : <div className="usuarios-admin-vacio"><Icon name="users" size={26}/><strong>No hay usuarios para mostrar</strong><small>{usuarios.length ? 'Cambia los filtros de búsqueda.' : 'Crea el primer usuario del sistema.'}</small></div>}
    </div>
    {modal && <div className="usuario-registro-fondo" onMouseDown={() => setModal(false)}><form className="usuario-registro-modal" onSubmit={registrar} onMouseDown={e => e.stopPropagation()}><header><div><p>NUEVA CUENTA</p><h2>Crear nuevo usuario</h2><small>Registra sus datos personales, credenciales y rol.</small></div><button type="button" onClick={() => setModal(false)} aria-label="Cerrar"><Icon name="close" size={18}/></button></header><div className="usuario-registro-campos">
      <label>Nombres<input required value={formulario.nombres} onChange={e => actualizar('nombres', e.target.value)} maxLength={100}/></label>
      <label>Apellido paterno<input required value={formulario.apellido_paterno} onChange={e => actualizar('apellido_paterno', e.target.value)} maxLength={100}/></label>
      <label>Apellido materno<input value={formulario.apellido_materno} onChange={e => actualizar('apellido_materno', e.target.value)} maxLength={100}/></label>
      <label>CI<input required value={formulario.ci} onChange={e => actualizar('ci', e.target.value)} maxLength={25}/></label>
      <label>Correo electrónico<input required type="email" value={formulario.correo} onChange={e => actualizar('correo', e.target.value)} maxLength={150}/></label>
      <label>Rol<select required value={formulario.rol} onChange={e => actualizar('rol', e.target.value)}><option value="">Selecciona un rol</option>{roles.map(rol => <option key={rol.id} value={rol.id}>{rol.nombre}</option>)}</select></label>
      <label>Caja<select required value={formulario.caja} onChange={e => actualizar('caja', e.target.value)}><option value="">Selecciona una caja</option>{cajas.map(caja => <option key={caja} value={caja}>{caja}</option>)}</select></label>
      <label>Usuario<input required value={formulario.usuario} onChange={e => actualizar('usuario', e.target.value)} maxLength={60} autoComplete="username"/></label>
      <label>Contraseña<input required type="password" minLength={8} value={formulario.password} onChange={e => actualizar('password', e.target.value)} autoComplete="new-password"/><small>Mínimo 8 caracteres.</small></label>
      <label>Confirmar contraseña<input required type="password" minLength={8} value={formulario.confirmarPassword} onChange={e => actualizar('confirmarPassword', e.target.value)} autoComplete="new-password"/></label>
    </div>{error && <p className="usuario-registro-error" role="alert">{error}</p>}<footer><button type="button" onClick={() => setModal(false)}>Cancelar</button><button className="primario" type="submit" disabled={guardando}><Icon name="check" size={16}/>{guardando ? 'Registrando…' : 'Crear usuario'}</button></footer></form></div>}
  </section>;
}
