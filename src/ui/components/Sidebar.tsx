import Icon from './Icon';
import { Brand } from './Brand';
import type { SystemConfig } from '../types';
type Props = {
  config: SystemConfig;
  active: string;
  open: boolean;
  collapsed: boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
  onCollapse: () => void;
  onLogout: () => void;
};
export function Sidebar({
  config,
  active,
  open,
  collapsed,
  onSelect,
  onClose,
  onCollapse,
  onLogout,
}: Props) {
  const modules = config.modules;
  const groups = [
    ...new Set([
      ...(config.sidebarGroups ?? []),
      ...modules.map((item) => item.group),
    ]),
  ];
  const isActive = (id: string) => active === id || active.startsWith(`${id}-`);
  return (
    <>
      <aside
        id="system-sidebar"
        className={`sistema-sidebar ${open ? 'sidebar-abierto' : ''}`}
      >
        <div className="marca-container">
          <Brand name={config.name} sidebar subtitle={config.subtitle} />
          <button
            className="replegar-menu"
            onClick={onCollapse}
            aria-label={
              collapsed ? 'Desplegar menú lateral' : 'Replegar menú lateral'
            }
            aria-expanded={!collapsed}
            title={collapsed ? 'Desplegar menú' : 'Replegar menú'}
          >
            <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={17} />
          </button>
          <button
            className="cerrar-menu"
            onClick={onClose}
            aria-label="Cerrar menú"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="sidebar-scroll">
          <nav className="sistema-nav" aria-label="Módulos del sistema">
            {groups.map((group) => (
              <section key={group}>
                <p>{group}</p>
                {modules
                  .filter((item) => item.group === group)
                  .map((item) => (
                    <button
                      key={item.id}
                      className={`nav-modulo ${isActive(item.id) ? 'activo' : ''}`}
                      onClick={() => onSelect(item.id)}
                      aria-label={item.name}
                      aria-current={isActive(item.id) ? 'page' : undefined}
                      title={collapsed ? item.name : undefined}
                    >
                      <span className="nav-icono">
                        <Icon name={item.icon} />
                      </span>
                      <span className="nav-texto">{item.name}</span>
                      <Icon
                        className="nav-indicador"
                        name="chevronRight"
                        size={14}
                      />
                    </button>
                  ))}
              </section>
            ))}
          </nav>
          <button
            className="boton-salir"
            onClick={onLogout}
            aria-label="Cerrar sesión"
            title={collapsed ? 'Cerrar sesión' : undefined}
          >
            <span className="nav-icono">
              <Icon name="logout" size={19} />
            </span>
            <span className="nav-texto">Cerrar sesión</span>
          </button>
        </div>
      </aside>
      {open && (
        <button
          className="menu-fondo"
          onClick={onClose}
          aria-label="Cerrar menú"
        />
      )}
    </>
  );
}
