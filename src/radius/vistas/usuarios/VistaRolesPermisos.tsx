import { useEffect, useState } from 'react';
import Icon from '../../componentes/Icono';
import { apiFetch } from '../../api';
import './VistaRolesPermisos.css';

type Rol={id:string;nombre:string;descripcion:string;permisos:string[];tipoInicio?:string};
export default function VistaRolesPermisos(){
 const [roles,setRoles]=useState<Rol[]>([]),[cargando,setCargando]=useState(true);
 useEffect(()=>{apiFetch('/api/roles').then(r=>r.ok?r.json():[]).then(setRoles).catch(()=>setRoles([])).finally(()=>setCargando(false))},[]);
 return <div className="roles-vista"><div className="roles-cabecera"><div><p>ROLES DEL SISTEMA</p><h3>Roles y permisos</h3><small>Define qué módulos y acciones puede utilizar cada perfil.</small></div><button><Icon name="plus" size={17}/>Nuevo rol</button></div><div className="roles-lista">{cargando?<div className="rol-vacio">Cargando roles…</div>:roles.length?roles.map(rol=><article className="rol-tarjeta" key={rol.id}><span className="rol-icono"><Icon name="asset" size={21}/></span><div><h4>{rol.nombre}</h4><p>{rol.descripcion||'Sin descripción registrada.'}</p><small>{rol.permisos.length} permisos · Inicio: {(rol.tipoInicio||'general').replace(/_/g,' ')}</small></div><button title="Editar rol"><Icon name="edit" size={17}/></button></article>):<div className="rol-vacio"><span><Icon name="asset" size={25}/></span><strong>No hay roles registrados</strong><small>Crea el primer rol para organizar los accesos.</small></div>}</div></div>;
}
