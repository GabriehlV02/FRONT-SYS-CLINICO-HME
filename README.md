# Sistema Clínico HME · Frontend

Aplicación web del Sistema Clínico HME. Este repositorio contiene la interfaz de usuario; la autenticación institucional, los datos clínicos y las operaciones persistentes se sirven desde la API Laravel.

[![React](https://img.shields.io/badge/React-UI-149ECA?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-tipado-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-desarrollo-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![CI](https://github.com/GabriehlV02/FRONT-SYS-CLINICO-HME/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/GabriehlV02/FRONT-SYS-CLINICO-HME/actions/workflows/ci.yml)

## Módulos

La interfaz reúne flujos de recepción, pacientes e historias clínicas, consultorio, triaje, emergencias, internación, laboratorio, farmacia, quirófano, ambulancia y diagnóstico por imágenes. La navegación y las acciones disponibles dependen del perfil y los permisos de la sesión.

## Arquitectura

- **Frontend:** React, TypeScript y Vite.
- **API clínica:** [BACK-SYS-CLINICO-HME](https://github.com/GabriehlV02/BACK-SYS-CLINICO-HME).
- **Integración contable:** [FRONT-SYS-CONTA-HME](https://github.com/GabriehlV02/FRONT-SYS-CONTA-HME) y su API.
- Las solicitudes a `/api` y `/api-contable` se reenvían durante el desarrollo mediante el proxy de Vite.

## Requisitos

- Node.js 20 o posterior y npm.
- API clínica disponible para iniciar sesión y trabajar con datos persistentes.
- API contable disponible para las funciones integradas que la requieran.

## Inicio local

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Vite inicia en `http://localhost:5000`. Si utilizas otros puertos, actualiza las variables del archivo `.env` antes de iniciar el servidor.

```env
VITE_API_TARGET=http://127.0.0.1:5005
VITE_API_CONTABLE_TARGET=http://127.0.0.1:5055
```

Usa los valores y nombres definidos en `.env.example`; no incluyas secretos en el repositorio.

## Comandos

```powershell
npm run dev       # servidor de desarrollo
npm run build     # comprobación TypeScript y compilación de producción
npm run typecheck # comprobación de tipos
npm run lint      # comprobación TypeScript configurada en el proyecto
```

## Estructura

```text
src/
├── flows/   # módulos y flujos clínicos
├── radius/  # aplicación clínica, API y vistas compartidas
├── ui/      # componentes y configuración de interfaz
└── styles/  # estilos globales
```

## Desarrollo

Mantén los cambios de interfaz en este repositorio y coordina los contratos HTTP con el repositorio backend. Para reportar un problema, incluye el módulo, los pasos para reproducirlo y, si aplica, una captura sin información clínica identificable.
