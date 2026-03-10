const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT         = 3000;
const ARCHIVO_JSON = path.join(__dirname, 'clientes.json');

// ── Helpers ───────────────────────────────────────────────────────────────

// Leer el archivo JSON (non-blocking)
function leerClientes(callback) {
  fs.readFile(ARCHIVO_JSON, 'utf8', (err, data) => {
    if (err) return callback(err, null);
    try { callback(null, JSON.parse(data)); }
    catch (e) { callback(new Error('JSON inválido'), null); }
  });
}

// Guardar el archivo JSON (non-blocking)
function guardarClientes(clientes, callback) {
  fs.writeFile(ARCHIVO_JSON, JSON.stringify(clientes, null, 2), 'utf8', callback);
}

// Leer el body del request
function leerBody(req, callback) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    try { callback(null, JSON.parse(body)); }
    catch (e) { callback(new Error('JSON inválido'), null); }
  });
}

// Respuesta JSON
function responderJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(data));
}

// Servir archivos estáticos desde /public
function servirEstatico(res, archivo) {
  const ext = path.extname(archivo);
  const tipos = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };
  fs.readFile(archivo, (err, data) => {
    if (err) { res.writeHead(404); return res.end('No encontrado'); }
    res.writeHead(200, { 'Content-Type': tipos[ext] || 'text/plain' });
    res.end(data);
  });
}

// Generar ID único para nuevos clientes
function generarId(clientes) {
  return clientes.length > 0 ? Math.max(...clientes.map(c => c.id)) + 1 : 1;
}

// ── Servidor ──────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {

  const urlObj = new URL(req.url, `http://localhost:${PORT}`);
  const ruta   = urlObj.pathname;

  // Archivos estáticos
  if (ruta === '/' || ruta === '/index.html') {
    return servirEstatico(res, path.join(__dirname, 'public', 'index.html'));
  }
  if (ruta === '/style.css') {
    return servirEstatico(res, path.join(__dirname, 'public', 'style.css'));
  }

  // Solo atendemos rutas /api/...
  if (!ruta.startsWith('/api')) {
    return responderJSON(res, 404, { error: 'Ruta no encontrada' });
  }

  // ── GET /api/clientes → listar todos ──────────────────────────────────
  if (ruta === '/api/clientes' && req.method === 'GET') {
    leerClientes((err, clientes) => {
      if (err) return responderJSON(res, 500, { error: 'Error al leer datos' });
      responderJSON(res, 200, clientes);
    });

  // ── GET /api/clientes/rut → listar solo clientes con cuenta RUT ────────
  } else if (ruta === '/api/clientes/rut' && req.method === 'GET') {
    leerClientes((err, clientes) => {
      if (err) return responderJSON(res, 500, { error: 'Error al leer datos' });
      const conRut = clientes.filter(c => c.cuentaRut !== null);
      responderJSON(res, 200, conRut);
    });

  // ── POST /api/clientes → agregar cliente nuevo con cuenta RUT ──────────
  } else if (ruta === '/api/clientes' && req.method === 'POST') {
    leerBody(req, (err, datos) => {
      if (err) return responderJSON(res, 400, { error: 'JSON inválido' });

      leerClientes((err, clientes) => {
        if (err) return responderJSON(res, 500, { error: 'Error al leer datos' });

        // Validar campos mínimos
        if (!datos.nombre || !datos.cuentaRut) {
          return responderJSON(res, 400, { error: 'Se requiere nombre y cuentaRut' });
        }

        const nuevoCliente = {
          id: generarId(clientes),
          nombre: datos.nombre,
          cuentaRut: datos.cuentaRut,
          cuentasAhorro: datos.cuentasAhorro || []
        };

        clientes.push(nuevoCliente);
        guardarClientes(clientes, (err) => {
          if (err) return responderJSON(res, 500, { error: 'Error al guardar' });
          responderJSON(res, 201, { mensaje: 'Cliente creado', cliente: nuevoCliente });
        });
      });
    });

  // ── POST /api/clientes/:id/ahorro → agregar cuenta ahorro a cliente ─────
  } else if (ruta.match(/^\/api\/clientes\/\d+\/ahorro$/) && req.method === 'POST') {
    const id = parseInt(ruta.split('/')[3]);
    leerBody(req, (err, datos) => {
      if (err) return responderJSON(res, 400, { error: 'JSON inválido' });

      leerClientes((err, clientes) => {
        if (err) return responderJSON(res, 500, { error: 'Error al leer datos' });

        const cliente = clientes.find(c => c.id === id);
        if (!cliente) return responderJSON(res, 404, { error: 'Cliente no encontrado' });

        cliente.cuentasAhorro.push(datos);
        guardarClientes(clientes, (err) => {
          if (err) return responderJSON(res, 500, { error: 'Error al guardar' });
          responderJSON(res, 201, { mensaje: 'Cuenta de ahorro agregada', cliente });
        });
      });
    });

  // ── PUT /api/clientes/:id/rut → agregar cuenta RUT a cliente existente ──
  } else if (ruta.match(/^\/api\/clientes\/\d+\/rut$/) && req.method === 'PUT') {
    const id = parseInt(ruta.split('/')[3]);
    leerBody(req, (err, datos) => {
      if (err) return responderJSON(res, 400, { error: 'JSON inválido' });

      leerClientes((err, clientes) => {
        if (err) return responderJSON(res, 500, { error: 'Error al leer datos' });

        const cliente = clientes.find(c => c.id === id);
        if (!cliente) return responderJSON(res, 404, { error: 'Cliente no encontrado' });
        if (cliente.cuentaRut) return responderJSON(res, 400, { error: 'El cliente ya tiene cuenta RUT' });

        cliente.cuentaRut = datos;
        guardarClientes(clientes, (err) => {
          if (err) return responderJSON(res, 500, { error: 'Error al guardar' });
          responderJSON(res, 200, { mensaje: 'Cuenta RUT agregada', cliente });
        });
      });
    });

  // ── DELETE /api/clientes/:id → eliminar cliente completo ──────────────
  } else if (ruta.match(/^\/api\/clientes\/\d+$/) && req.method === 'DELETE') {
    const id = parseInt(ruta.split('/')[3]);
    leerClientes((err, clientes) => {
      if (err) return responderJSON(res, 500, { error: 'Error al leer datos' });

      const filtrados = clientes.filter(c => c.id !== id);
      if (filtrados.length === clientes.length) {
        return responderJSON(res, 404, { error: 'Cliente no encontrado' });
      }

      guardarClientes(filtrados, (err) => {
        if (err) return responderJSON(res, 500, { error: 'Error al guardar' });
        responderJSON(res, 200, { mensaje: 'Cliente eliminado' });
      });
    });

  // ── DELETE /api/clientes/:id/rut → eliminar cuenta RUT ────────────────
  } else if (ruta.match(/^\/api\/clientes\/\d+\/rut$/) && req.method === 'DELETE') {
    const id = parseInt(ruta.split('/')[3]);
    leerClientes((err, clientes) => {
      if (err) return responderJSON(res, 500, { error: 'Error al leer datos' });

      const cliente = clientes.find(c => c.id === id);
      if (!cliente) return responderJSON(res, 404, { error: 'Cliente no encontrado' });

      cliente.cuentaRut = null;
      guardarClientes(clientes, (err) => {
        if (err) return responderJSON(res, 500, { error: 'Error al guardar' });
        responderJSON(res, 200, { mensaje: 'Cuenta RUT eliminada' });
      });
    });

  // ── DELETE /api/clientes/:id/ahorro/:num → eliminar cuenta ahorro ──────
  } else if (ruta.match(/^\/api\/clientes\/\d+\/ahorro\/.+$/) && req.method === 'DELETE') {
    const partes  = ruta.split('/');
    const id      = parseInt(partes[3]);
    const numCuenta = decodeURIComponent(partes[5]);

    leerClientes((err, clientes) => {
      if (err) return responderJSON(res, 500, { error: 'Error al leer datos' });

      const cliente = clientes.find(c => c.id === id);
      if (!cliente) return responderJSON(res, 404, { error: 'Cliente no encontrado' });

      const antes = cliente.cuentasAhorro.length;
      cliente.cuentasAhorro = cliente.cuentasAhorro.filter(a => a.numero !== numCuenta);

      if (cliente.cuentasAhorro.length === antes) {
        return responderJSON(res, 404, { error: 'Cuenta de ahorro no encontrada' });
      }

      guardarClientes(clientes, (err) => {
        if (err) return responderJSON(res, 500, { error: 'Error al guardar' });
        responderJSON(res, 200, { mensaje: 'Cuenta de ahorro eliminada' });
      });
    });

  // ── Método no permitido ────────────────────────────────────────────────
  } else if (ruta.startsWith('/api')) {
    responderJSON(res, 405, { error: `Método ${req.method} no permitido` });

  } else {
    responderJSON(res, 404, { error: 'Ruta no encontrada' });
  }
});

server.listen(PORT, () => {
  console.log(`Servidor BancoEstado corriendo en http://localhost:${PORT}`);
});
