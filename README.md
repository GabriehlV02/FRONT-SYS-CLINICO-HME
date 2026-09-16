# FRONT-SYS-CLINICO-HME

Frontend del sistema clinico HME.

## Requisitos

- Node.js 20+
- pnpm 9+

## Instalacion

```powershell
pnpm install
Copy-Item .env.example .env
pnpm dev
```

La app abre por defecto en `http://localhost:5000`.

## Backend

En desarrollo, Vite redirige `/api` hacia `VITE_API_TARGET`.

Backend esperado:

```env
VITE_API_TARGET=http://127.0.0.1:5005
```

## Scripts

```powershell
pnpm dev
pnpm build
pnpm typecheck
pnpm lint
```
