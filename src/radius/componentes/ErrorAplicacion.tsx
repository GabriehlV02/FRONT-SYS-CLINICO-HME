import { Component, type ErrorInfo, type ReactNode } from "react";
import "./ErrorAplicacion.css";
export class ErrorAplicacion extends Component<{ children: ReactNode; local?: boolean }, { fallo: boolean }> {
  state = { fallo: false };
  static getDerivedStateFromError() { return { fallo: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("Error en la vista clínica", error, info.componentStack); }
  render() {
    if (!this.state.fallo) return this.props.children;
    return <div className={`error-clinico ${this.props.local ? "error-clinico-local" : ""}`}>
      <section className="error-clinico-tarjeta" role="alert">
        <img className="error-clinico-logo" src="/logo-hospital-original.png" alt="Hospital María Esperanza" />
        <p className="error-clinico-etiqueta">SISTEMA CLÍNICO</p>
        <span className="error-clinico-estado">No se pudo mostrar esta sección</span>
        <h1>Ocurrió un inconveniente al cargar</h1>
        <p>Intenta abrir esta vista nuevamente para continuar con tu trabajo.{this.props.local ? " También puedes acceder a otra sección desde el menú." : " Si el inconveniente persiste, recarga la página."}</p>
        <div className="error-clinico-acciones">
          <button type="button" className="error-clinico-primario" onClick={() => this.setState({ fallo: false })}>Intentar de nuevo</button>
          <button type="button" onClick={() => window.location.reload()}>Recargar página</button>
        </div>
        <small>Al recargar, podrías perder los cambios que aún no hayas guardado. Si el inconveniente continúa, comunícate con el área de Sistemas.</small>
      </section>
    </div>;
  }
}
