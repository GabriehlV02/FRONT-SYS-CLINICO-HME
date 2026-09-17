import React, { useEffect, useState } from "react";
import { apiFetch } from "./api";
import Icon, { type IconName } from "./componentes/Icono";
import CentroNotificaciones from "./componentes/Notificaciones";
import { obtenerInformes, obtenerPacientes } from "./datos/almacenDemo";
import { leerSesion, type Sesion } from "./types/sesion";
import VistaInicioSesion from "./vistas/autenticacion/VistaInicioSesion";
import VistaPacientes from "./vistas/pacientes/VistaPacientes";
import VistaRayosX from "./vistas/visor-rayos-x/VistaRayosX";
import VistaBaseDatosOrthanc from "./vistas/base-datos/VistaBaseDatosOrthanc";
import VistaConfiguracion from "./vistas/configuracion/VistaConfiguracion";
import VistaAuditorias from "./vistas/auditorias/VistaAuditorias";
import "./vistas/visor/BibliotecaImagenes.css";
import "./vistas/visor/PaletaClara.css";
import "./vistas/visor/PaletaPlomo.css";
import "./vistas/visor/PaletaGris.css";
import "./vistas/visor/SidebarMejoras.css";
import "./vistas/visor/SubvistasGlobal.css";
import "./vistas/visor/TitulosUnicos.css";
import "./vistas/visor/ResponsividadGlobal.css";

import { RecepcionView } from '../flows/recepcion/RecepcionView';
import { VistaInformes } from './vistas/clinica/Complementos';

type Modulo = { id: string; nombre: string; icono: IconName; grupo: string };
type SubvistaImagenologia = "pacientes" | "informes" | "base-datos" | "visor";
type SubvistaRecepcion = "caja" | "citas" | "cuentas" | "comprobantes" | "reportes";
type SubvistaConfiguracion = "usuario" | "sistema" | "usuarios";
type TemaSistema = "light" | "dark";

const subvistasImagenologia: { id: SubvistaImagenologia; nombre: string; icono: IconName }[] = [
  { id: "pacientes", nombre: "Pacientes", icono: "patient" },
  { id: "informes", nombre: "Informes médicos", icono: "audit" },
  { id: "base-datos", nombre: "Base de datos", icono: "package" },
  { id: "visor", nombre: "Visor", icono: "eye" },
];

const modulos: Modulo[] = [
  { id: 'recepcion', nombre: 'Recepción', icono: 'patient', grupo: 'ATENCIÓN CLÍNICA' },
  { id: 'laboratorio', nombre: 'Laboratorio', icono: 'lab', grupo: 'ATENCIÓN CLÍNICA' },
  { id: "imagenologia", nombre: "Imagenología", icono: "image", grupo: "IMAGENOLOGÍA" },
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

export default function Aplicacion() {
  const [sesion, setSesion] = useState<Sesion | null>(leerSesion);
  const [modulo, setModulo] = useState("");
  const [subvistaImagenologia, setSubvistaImagenologia] = useState<SubvistaImagenologia>("pacientes");
  const [subvistaRecepcion, setSubvistaRecepcion] = useState<SubvistaRecepcion>("caja");
  const [subvistaConfiguracion, setSubvistaConfiguracion] = useState<SubvistaConfiguracion>("usuario");
  const [conteosImagenologia, setConteosImagenologia] = useState({ pacientes: 0, informes: 0, estudios: 0 });
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [verAvisos, setVerAvisos] = useState(false);
  const [tema, setTema] = useState<TemaSistema>(() => localStorage.getItem("pulso_theme") === "dark" ? "dark" : "light");
  const [avisos, setAvisos] = useState<{titulo: string; mensaje: string}[]>([]);
  useEffect(() => {
    document.documentElement.dataset.theme = tema;
    localStorage.setItem("pulso_theme", tema);
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
  useEffect(() => {
    const expirar = () => setSesion(null);
    window.addEventListener("sesion-expirada", expirar);
    return () => window.removeEventListener("sesion-expirada", expirar);
  }, []);
  useEffect(() => {
    if (!sesion) setModulo("");
  }, [sesion]);
  useEffect(() => {
    if (!sesion) return;
    let activo = true;
    const actualizarLocales = () => setConteosImagenologia((actual) => ({
      ...actual,
      pacientes: obtenerPacientes().length,
      informes: Object.keys(obtenerInformes()).length,
    }));
    actualizarLocales();
    window.addEventListener("radiuus:datos-demo", actualizarLocales);
    void apiFetch("/api/orthanc/estudios")
      .then(async (r) => (r.ok ? ((await r.json()) as unknown[]) : []))
      .then((estudios) => {
        if (activo) setConteosImagenologia((actual) => ({ ...actual, estudios: estudios.length }));
      })
      .catch(() => undefined);
    return () => {
      activo = false;
      window.removeEventListener("radiuus:datos-demo", actualizarLocales);
    };
  }, [sesion?.token, subvistaImagenologia]);
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
      if (subvistasImagenologia.some(vista => vista.id === id)) {
        setModulo("imagenologia");
        setSubvistaImagenologia(id as SubvistaImagenologia);
        setBusqueda('');
        setMenuAbierto(false);
      } else if (id === "estudios") {
        setModulo("imagenologia");
        setSubvistaImagenologia("base-datos");
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
  if (!sesion) return <VistaInicioSesion onLogin={setSesion} />;
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
  return (
    <main
      className={`sistema-app ${sidebarReplegado ? "sidebar-replegado" : ""}`}
      data-theme={tema}
    >
      <CentroNotificaciones />
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
          {[...new Set(modulos.map((item) => item.grupo))].map((grupo) => (
            <section key={grupo}>
              <p>{grupo}</p>
              {modulos
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
                      if (item.id === "recepcion") setSubvistaRecepcion("caja");
                      if (item.id === "configuracion") setSubvistaConfiguracion("usuario");
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
          <div className="perfil">
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
          </div>
          <button
            className="salir-rapido"
            onClick={cerrarSesion}
            aria-label="Cerrar sesión"
          >
            <Icon name="logout" size={20} />
          </button>
        </header>
        <div className="area-trabajo">
          {modulo === "imagenologia" && (
            <nav className="imagenologia-subvistas" aria-label="Subvistas de Imagenología">
              {subvistasImagenologia.map(vista => (
                <button key={vista.id} className={subvistaImagenologia === vista.id ? "activo" : ""} onClick={() => setSubvistaImagenologia(vista.id)}>
                  <span><Icon name={vista.icono} size={16} /></span>
                  {vista.nombre}
                  <b>{vista.id === "pacientes" ? conteosImagenologia.pacientes : vista.id === "informes" ? conteosImagenologia.informes : conteosImagenologia.estudios}</b>
                </button>
              ))}
            </nav>
          )}
          {modulo === 'recepcion' ? <RecepcionView key={subvistaRecepcion} initialSubview={subvistaRecepcion}/> : modulo === 'laboratorio' ? (
            <div className="modulo-vacio">
              <span>
                <Icon name="lab" size={28} />
              </span>
              <p>LABORATORIO</p>
              <h2>Laboratorio</h2>
              <small>
                Este apartado está listo para incorporar solicitudes, muestras,
                resultados y reportes de laboratorio.
              </small>
            </div>
          ) : modulo === "imagenologia" && subvistaImagenologia === "base-datos" ? (
            <VistaBaseDatosOrthanc />
          ) : modulo === "imagenologia" && subvistaImagenologia === "informes" ? (
            <VistaInformes />
          ) : modulo === "imagenologia" && subvistaImagenologia === "pacientes" ? (
            <VistaPacientes />
          ) : modulo === "imagenologia" && subvistaImagenologia === "visor" ? (
            <VistaRayosX />
          ) : modulo === "configuracion" ? (
            <VistaConfiguracion initialSection={subvistaConfiguracion} />
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
        </div>
      </section>
    </main>
  );
}
