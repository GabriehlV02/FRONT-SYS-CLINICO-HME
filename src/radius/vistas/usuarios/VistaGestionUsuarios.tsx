import { useEffect, useState } from 'react';
import Icon from '../../componentes/Icono';
import { apiFetch } from '../../api';
import VistaUsuarios from './VistaUsuarios';
import VistaRolesPermisos from './VistaRolesPermisos';
import './VistaGestionUsuarios.css';

type Subvista='usuarios'|'roles';
export default function VistaGestionUsuarios(){
 const [subvista,setSubvista]=useState<Subvista>('usuarios');
 const [conteos,setConteos]=useState({usuarios:0,roles:0});
 useEffect(()=>{Promise.all([apiFetch('/api/usuarios').then(r=>r.ok?r.json():[]),apiFetch('/api/roles').then(r=>r.ok?r.json():[])]).then(([usuarios,roles])=>setConteos({usuarios:usuarios.length,roles:roles.length})).catch(()=>undefined)},[subvista]);
 return <div className="gestion-usuarios">
  <nav className="subvistas-nav" aria-label="Secciones de usuarios">
   <button className={subvista==='usuarios'?'activo':''} onClick={()=>setSubvista('usuarios')}><Icon name="users" size={19}/><span>Usuarios</span><b>{conteos.usuarios}</b></button>
   <button className={subvista==='roles'?'activo':''} onClick={()=>setSubvista('roles')}><Icon name="asset" size={19}/><span>Roles y permisos</span><b>{conteos.roles}</b></button>
  </nav>
  <section className="subvista-contenido">{subvista==='usuarios'?<VistaUsuarios/>:<VistaRolesPermisos/>}</section>
 </div>;
}
