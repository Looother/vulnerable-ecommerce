const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

// Admin Login form over plain HTTP (Vulnerable to credential sniffing)
router.get('/login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Administrador - Login</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background-color: #f4f4f9; display: flex; justify-content: center; align-items: center; height: 80vh; }
            .login-container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); width: 350px; }
            h2 { margin-bottom: 20px; color: #333; text-align: center; }
            .form-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; color: #666; }
            input[type="text"], input[type="password"] { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
            input[type="submit"] { width: 100%; padding: 10px; background-color: #007bff; border: none; color: white; font-size: 16px; border-radius: 4px; cursor: pointer; }
            input[type="submit"]:hover { background-color: #0056b3; }
            .error { color: red; text-align: center; margin-bottom: 15px; }
            .info { text-align: center; font-size: 12px; color: #999; margin-top: 15px; }
        </style>
    </head>
    <body>
        <div class="login-container">
            <h2>Panel Administrativo</h2>
            <form action="/admin/login" method="POST">
                <div class="form-group">
                    <label for="username">Usuario</label>
                    <input type="text" id="username" name="username" required>
                </div>
                <div class="form-group">
                    <label for="password">Contraseña</label>
                    <input type="password" id="password" name="password" required>
                </div>
                <input type="submit" value="Iniciar Sesión">
            </form>
            <div class="info">
                Advertencia: Esta comunicación viaja en texto plano sobre HTTP.
            </div>
        </div>
    </body>
    </html>
  `);
});

// Handling login (POST request over plain HTTP)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Let's use a secure pool connection or query to verify (the SQL Injection is targeted in the product search,
  // but we can check if credentials match the admin user directly)
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'db-server',
      user: process.env.DB_USER || 'dbuser',
      password: process.env.DB_PASSWORD || 'cinvestav123',
      database: process.env.DB_NAME || 'ecommerce'
    });

    const [rows] = await pool.query(
      'SELECT * FROM users WHERE username = ? AND password = ?',
      [username, password]
    );

    await pool.end();

    if (rows.length > 0) {
      res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Panel Administrativo - Acceso Concedido</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; background-color: #f4f4f9; }
                .card { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); max-width: 600px; margin: auto; }
                h1 { color: green; }
                .secret-data { background: #eef; padding: 15px; border-left: 5px solid #007bff; font-family: monospace; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>Acceso Concedido</h1>
                <p>Bienvenido, <strong>${username}</strong>. Has accedido al panel administrativo.</p>
                <div class="secret-data">
                    <h3>Datos de Configuración del Servidor:</h3>
                    <ul>
                        <li>Database Server: ${process.env.DB_HOST}</li>
                        <li>Database Name: ${process.env.DB_NAME}</li>
                        <li>Database User: ${process.env.DB_USER}</li>
                        <li>Database Password: (Reutilizada para SSH en el servidor de correo: mailadmin)</li>
                    </ul>
                </div>
                <p><a href="/admin/add-product">Agregar Nuevo Producto</a> | <a href="/search">Volver al Buscador</a></p>
            </div>
        </body>
        </html>
      `);
    } else {
      res.status(401).send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Error de Autenticación</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; background-color: #f4f4f9; text-align: center; }
                .error-card { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); max-width: 400px; margin: auto; }
                h2 { color: red; }
            </style>
        </head>
        <body>
            <div class="error-card">
                <h2>Credenciales Incorrectas</h2>
                <p>El usuario o contraseña especificados no son válidos.</p>
                <p><a href="/admin/login">Intentar de nuevo</a></p>
            </div>
        </body>
        </html>
      `);
    }
  } catch (err) {
    res.status(500).send(`Error en el servidor de administración: ${err.message}`);
  }
});

// Configure multer to save files in src/uploads without extension or MIME validations
const multer = require('multer');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    // Ensure the uploads directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Deliberate Vulnerability: Use the client-provided file name exactly (no renaming or extension checks)
    cb(null, file.originalname);
  }
});
const upload = multer({ storage: storage });

// Admin add-product UI: Allows uploading files as product images
router.get('/add-product', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Agregar Producto</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background-color: #f4f4f9; }
            .form-container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); max-width: 600px; margin: auto; }
            h2 { color: #333; }
            .form-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; color: #666; }
            input[type="text"], input[type="number"], textarea { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
            input[type="submit"] { padding: 10px 20px; background-color: #28a745; border: none; color: white; font-size: 16px; border-radius: 4px; cursor: pointer; }
            input[type="submit"]:hover { background-color: #218838; }
        </style>
    </head>
    <body>
        <div class="form-container">
            <h2>Agregar Nuevo Producto al Catálogo</h2>
            <form action="/admin/add-product" method="POST" enctype="multipart/form-data">
                <div class="form-group">
                    <label for="name">Nombre del Producto</label>
                    <input type="text" id="name" name="name" required>
                </div>
                <div class="form-group">
                    <label for="description">Descripción</label>
                    <textarea id="description" name="description" rows="3" required></textarea>
                </div>
                <div class="form-group">
                    <label for="price">Precio</label>
                    <input type="number" id="price" name="price" step="0.01" required>
                </div>
                <div class="form-group">
                    <label for="image">Imagen del Producto (Formatos sugeridos: .jpg, .png)</label>
                    <input type="file" id="image" name="image" required>
                </div>
                <input type="submit" value="Guardar Producto">
            </form>
            <p><a href="/search">Volver al Buscador</a></p>
        </div>
    </body>
    </html>
  `);
});

// Handling product insertion and unrestricted file upload
router.post('/add-product', upload.single('image'), async (req, res) => {
  const { name, description, price } = req.body;
  const fileName = req.file ? req.file.originalname : '';

  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'db-server',
      user: process.env.DB_USER || 'dbuser',
      password: process.env.DB_PASSWORD || 'cinvestav123',
      database: process.env.DB_NAME || 'ecommerce'
    });

    // Save product into database
    await pool.query(
      'INSERT INTO products (name, description, price) VALUES (?, ?, ?)',
      [name, `${description} (Imagen: ${fileName})`, price]
    );
    await pool.end();

    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <title>Producto Guardado</title>
          <style>
              body { font-family: Arial, sans-serif; margin: 40px; background-color: #f4f4f9; text-align: center; }
              .card { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); max-width: 500px; margin: auto; }
              h2 { color: green; }
          </style>
      </head>
      <body>
          <div class="card">
              <h2>¡Producto guardado exitosamente!</h2>
              <p>Nombre: <strong>${name}</strong></p>
              <p>Archivo subido a: <code>/uploads/${fileName}</code></p>
              <hr>
              <p><strong>Nota de simulación educativa:</strong> Si subiste un script en lugar de una imagen, puedes verificar su ejecución/lectura abriendo la vista previa: <a href="/admin/preview?file=${fileName}">Ver Archivo Subido</a></p>
              <p><a href="/admin/add-product">Agregar otro producto</a> | <a href="/search">Volver al Buscador</a></p>
          </div>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send(`Error guardando producto: ${err.message}`);
  }
});

// Educational Preview Endpoint: Simulates dynamic execution (LFI/RCE behavior)
// Node.js doesn't execute uploaded JS scripts natively by URL mapping, so we explicitly read/execute the script
router.get('/preview', (req, res) => {
  const fileName = req.query.file;
  const filePath = path.join(__dirname, '..', 'uploads', fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Archivo no encontrado');
  }

  // If the uploaded file is a JavaScript file, we execute it (eval) to simulate RCE via file inclusion.
  // Otherwise, we read it as text.
  if (fileName.endsWith('.js')) {
    try {
      const code = fs.readFileSync(filePath, 'utf8');
      // Set up a mock environment to capture execution output
      let consoleOutput = '';
      const mockConsole = {
        log: (...args) => { consoleOutput += args.join(' ') + '\n'; },
        error: (...args) => { consoleOutput += '[ERROR]: ' + args.join(' ') + '\n'; }
      };

      // Wrap code execution inside helper
      const runner = new Function('console', 'require', 'process', '__dirname', code);
      runner(mockConsole, require, process, __dirname);

      res.send(`
        <h3>Resultado de la ejecución del script JS en el servidor:</h3>
        <pre style="background: #333; color: #00ff00; padding: 15px; font-family: monospace;">${consoleOutput || 'Script ejecutado sin salida en consola (console.log)'}</pre>
        <p><a href="/admin/add-product">Volver a agregar producto</a></p>
      `);
    } catch (e) {
      res.status(500).send(`Error durante la ejecución del script: <pre>${e.message}\n${e.stack}</pre>`);
    }
  } else {
    // Default file inclusion view (reads file content)
    res.sendFile(filePath);
  }
});

module.exports = router;

