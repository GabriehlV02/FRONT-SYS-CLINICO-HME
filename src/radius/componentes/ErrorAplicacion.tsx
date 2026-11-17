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
        <span className="error-clinico-icono" aria-hidden="true">!</span>
        <p className="error-clinico-etiqueta">SISTEMA CLÍNICO</p>
        <h1>Esta vista no pudo cargarse</h1>
        <p>Puedes intentarlo de nuevo.{this.props.local ? " También puedes abrir otra sección desde el menú." : " Si el problema continúa, recarga la página."}</p>
        <div className="error-clinico-acciones">
          <button type="button" className="error-clinico-primario" onClick={() => this.setState({ fallo: false })}>Intentar de nuevo</button>
          <button type="button" onClick={() => window.location.reload()}>Recargar página</button>
        </div>
        <small>Recargar puede descartar los cambios que aún no hayas guardado.</small>
      </section>
    </div>;
  }
}