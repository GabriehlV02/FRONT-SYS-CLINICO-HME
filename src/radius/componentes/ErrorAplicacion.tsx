import { Component, type ErrorInfo, type ReactNode } from "react";

type Estado = { fallo: boolean };

export class ErrorAplicacion extends Component<{ children: ReactNode }, Estado> {
  state: Estado = { fallo: false };

  static getDerivedStateFromError(): Estado {
    return { fallo: true };
  }

  componentDidCatch(error: Error, informacion: ErrorInfo) {
    console.error("No se pudo mostrar la aplicación clínica.", error, informacion.componentStack);
  }

  render() {
    if (!this.state.fallo) return this.props.children;

    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#edf6fc", color: "#173d5b", fontFamily: "sans-serif" }}>
        <section role="alert" style={{ maxWidth: 480, padding: 28, border: "1px solid #c9dfed", borderRadius: 12, background: "white" }}>
          <h1 style={{ fontSize: 20 }}>No se pudo mostrar el sistema clínico</h1>
          <p>Intenta recargar la página. Si el problema continúa, vuelve a iniciar sesión.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button type="button" onClick={() => window.location.reload()}>Recargar</button>
            <button type="button" onClick={() => {
              sessionStorage.removeItem("pulso_session");
              localStorage.removeItem("pulso_session");
              window.location.reload();
            }}>Volver a iniciar sesión</button>
          </div>
        </section>
      </main>
    );
  }
}
