# BancoEstado — Gestión de Cuentas

Sistema web para administrar cuentas RUT y cuentas de Ahorro de clientes.

## Tecnologías
- Node.js — Servidor y API REST (sin dependencias externas)
- JSON — Almacenamiento de datos en `clientes.json`

## Instalación y uso

```bash
node server.js
```

Luego abre http://localhost:3000 en tu navegador.

## Estructura
```
├── server.js          # Servidor principal y API REST
├── clientes.json      # Base de datos de clientes
├── package.json
└── public/
    ├── index.html     # Cliente web
    └── style.css      # Estilos
```

## Endpoints API
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/clientes` | Listar todos los clientes |
| GET    | `/api/clientes/rut` | Listar clientes con cuenta RUT |
| POST   | `/api/clientes` | Crear cliente con cuenta RUT |
| POST   | `/api/clientes/:id/ahorro` | Agregar cuenta ahorro |
| PUT    | `/api/clientes/:id/rut` | Agregar cuenta RUT a cliente existente |
| DELETE | `/api/clientes/:id` | Eliminar cliente completo |
| DELETE | `/api/clientes/:id/rut` | Eliminar cuenta RUT |
| DELETE | `/api/clientes/:id/ahorro/:numero` | Eliminar cuenta ahorro |
