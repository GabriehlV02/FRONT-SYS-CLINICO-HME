export type Permiso =
  | 'proveedores.ver' | 'proveedores.editar'
  | 'catalogos.ver' | 'catalogos.editar'
  | 'cotizaciones.ver' | 'cotizaciones.editar'
  | 'usuarios.ver' | 'usuarios.editar'
  | 'proveedores.listado' | 'proveedores.nuevo' | 'proveedores.modificar' | 'proveedores.catalogos'
  | 'catalogos.productos' | 'catalogos.nuevo'
  | 'cotizaciones.nueva' | 'cotizaciones.comprar' | 'cotizaciones.historial'
  | 'usuarios.acceder' | 'usuarios.listado' | 'usuarios.crear' | 'usuarios.roles'
  | 'pedidos.ver' | 'pedidos.editar'
  | 'configuracion.tipos' | 'configuracion.marcas' | 'configuracion.almacenes'
  | 'almacenes.ver' | 'almacenes.movimientos';

export type Sesion = {
  token: string;
  expiresAt: number;
  dispositivo?: {
    id: string;
    clienteId: string;
    nombreSistema: string;
    plataforma: string;
    navegador: string;
    ip: string;
    mac: string | null;
    nombrePersonalizado: string;
    primerAcceso: string;
    ultimoAcceso: string;
    usuarios: string[];
    estado: 'activo' | 'revocado';
  };
  usuario: { nombre: string; rol: string; permisos: Permiso[]; tipoInicio?:'ventas'|'administracion'|'almacenes'|'admin_sistema'|'atencion_clinica';todosAlmacenes?:boolean;accesosAlmacenes?:{almacenId:string;acciones:('ver'|'editar'|'movimientos'|'traspasos')[]}[] };
};

export const TODOS_LOS_PERMISOS: Permiso[] = [
  'proveedores.ver', 'proveedores.editar', 'catalogos.ver', 'catalogos.editar',
  'cotizaciones.ver', 'cotizaciones.editar', 'usuarios.ver', 'usuarios.editar', 'usuarios.acceder'
];

export const leerSesion = (): Sesion | null => {
  const guardada = sessionStorage.getItem('pulso_session') || localStorage.getItem('pulso_session');
  if (!guardada) return null;
  try {
    const parsed = JSON.parse(guardada) as Partial<Sesion>;
    if (typeof parsed.token !== 'string' || !parsed.token || typeof parsed.expiresAt !== 'number' || parsed.expiresAt <= Date.now() || !parsed.usuario || typeof parsed.usuario.nombre !== 'string' || !Array.isArray(parsed.usuario.permisos)) throw new Error('Sesión inválida');
    return parsed as Sesion;
  } catch {
    localStorage.removeItem('pulso_session');
    sessionStorage.removeItem('pulso_session');
    return null;
  }
};
