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
        <title>AmazonLab - Iniciar Sesión</title>
        <style>
            body {
                font-family: "Amazon Ember", Arial, sans-serif;
                margin: 0;
                padding: 0;
                background-color: #eaeded;
                color: #0f1111;
            }
            header {
                background-color: #131921;
                padding: 10px 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                height: 40px;
            }
            .logo {
                color: white;
                font-size: 1.5rem;
                font-weight: 700;
                text-decoration: none;
            }
            .logo span {
                color: #febd69;
            }
            .nav-right a {
                color: white;
                text-decoration: none;
                font-size: 0.9rem;
            }
            .nav-sub {
                background-color: #232f3e;
                padding: 8px 20px;
                font-size: 0.9rem;
            }
            .nav-sub a {
                color: #eeeeee;
                text-decoration: none;
            }
            .login-wrapper {
                display: flex;
                flex-direction: column;
                align-items: center;
                margin-top: 40px;
                padding: 0 20px;
            }
            .login-container {
                background-color: #ffffff;
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 30px;
                width: 100%;
                max-width: 350px;
                box-sizing: border-box;
            }
            h2 {
                margin: 0 0 20px 0;
                font-size: 1.7rem;
                font-weight: 400;
            }
            .form-group {
                margin-bottom: 15px;
            }
            label {
                display: block;
                margin-bottom: 5px;
                font-size: 0.85rem;
                font-weight: 700;
            }
            input[type="text"], input[type="password"] {
                width: 100%;
                padding: 8px 10px;
                font-size: 0.95rem;
                border: 1px solid #a6a6a6;
                border-radius: 3px;
                box-sizing: border-box;
                outline: none;
                transition: border-color 0.1s, box-shadow 0.1s;
            }
            input[type="text"]:focus, input[type="password"]:focus {
                border-color: #e77600;
                box-shadow: 0 0 3px 2px rgba(228,121,17,.5);
            }
            input[type="submit"] {
                width: 100%;
                padding: 10px 0;
                font-size: 0.9rem;
                background-color: #ffd814;
                border: 1px solid #fcd200;
                border-radius: 100px;
                cursor: pointer;
                font-family: inherit;
                box-shadow: 0 2px 5px rgba(213,217,217,.5);
                transition: background-color 0.1s;
            }
            input[type="submit"]:hover {
                background-color: #f7ca00;
            }
            .info {
                text-align: center;
                font-size: 0.8rem;
                color: #b12704;
                margin-top: 20px;
                border: 1px solid #f5dab1;
                background-color: #fffdf9;
                padding: 10px;
                border-radius: 4px;
            }
            .back-link {
                margin-top: 20px;
                font-size: 0.9rem;
                color: #007185;
                text-decoration: none;
            }
            .back-link:hover {
                color: #c45500;
                text-decoration: underline;
            }
        </style>
    </head>
    <body>
        <header>
            <a href="/" class="logo">amazon<span>lab</span></a>
            <div class="nav-right">
                <a href="/">Volver a la tienda</a>
            </div>
        </header>
        <div class="nav-sub">
            <a href="/">&larr; Catálogo Principal</a>
        </div>
        
        <div class="login-wrapper">
            <div class="login-container">
                <h2>Iniciar sesión</h2>
                <form action="/admin/login" method="POST">
                    <div class="form-group">
                        <label for="username">Usuario administrador</label>
                        <input type="text" id="username" name="username" required>
                    </div>
                    <div class="form-group">
                        <label for="password">Contraseña</label>
                        <input type="password" id="password" name="password" required>
                    </div>
                    <input type="submit" value="Continuar">
                </form>
            </div>
            <a href="/" class="back-link">Volver al buscador de productos</a>
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
                body {
                    font-family: "Amazon Ember", Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                    background-color: #eaeded;
                    color: #0f1111;
                }
                header {
                    background-color: #131921;
                    padding: 10px 20px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    height: 40px;
                }
                .logo {
                    color: white;
                    font-size: 1.5rem;
                    font-weight: 700;
                    text-decoration: none;
                }
                .logo span {
                    color: #febd69;
                }
                .nav-right a {
                    color: white;
                    text-decoration: none;
                    font-size: 0.9rem;
                }
                .nav-sub {
                    background-color: #232f3e;
                    padding: 8px 20px;
                    font-size: 0.9rem;
                }
                .nav-sub a {
                    color: #eeeeee;
                    text-decoration: none;
                }
                .main-container {
                    max-width: 800px;
                    margin: 40px auto;
                    padding: 0 20px;
                }
                .card {
                    background-color: white;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    padding: 30px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }
                h1 {
                    color: #007600;
                    margin: 0 0 15px 0;
                    font-size: 1.8rem;
                    font-weight: 400;
                }
                .secret-data {
                    background: #fdf6ec;
                    padding: 20px;
                    border-left: 4px solid #febd69;
                    border-radius: 4px;
                    font-family: monospace;
                    margin: 20px 0;
                    border-top: 1px solid #f5dab1;
                    border-right: 1px solid #f5dab1;
                    border-bottom: 1px solid #f5dab1;
                }
                .secret-data h3 {
                    margin: 0 0 10px 0;
                    color: #b88230;
                }
                .secret-data ul {
                    margin: 0;
                    padding-left: 20px;
                    color: #0f1111;
                }
                .secret-data li {
                    margin-bottom: 5px;
                }
                .action-links {
                    display: flex;
                    gap: 15px;
                    margin-top: 25px;
                }
                .action-links a {
                    text-decoration: none;
                    font-size: 0.9rem;
                    font-weight: 500;
                    text-align: center;
                }
                .action-links a.btn-primary {
                    background-color: #ffd814;
                    border: 1px solid #fcd200;
                    border-radius: 100px;
                    padding: 10px 20px;
                    color: #0f1111;
                    box-shadow: 0 2px 5px rgba(213,217,217,.5);
                    transition: background-color 0.1s;
                }
                .action-links a.btn-primary:hover {
                    background-color: #f7ca00;
                }
                .action-links a.btn-secondary {
                    border: 1px solid #d5d9d9;
                    background-color: #f0f2f2;
                    border-radius: 100px;
                    padding: 10px 20px;
                    color: #0f1111;
                    transition: background-color 0.1s;
                }
                .action-links a.btn-secondary:hover {
                    background-color: #e3e6e6;
                }
            </style>
        </head>
        <body>
            <header>
                <a href="/" class="logo">amazon<span>lab</span></a>
                <div class="nav-right">
                    <a href="/">Volver a la tienda</a>
                </div>
            </header>
            <div class="nav-sub">
                <a href="/">&larr; Catálogo Principal</a>
            </div>
            
            <div class="main-container">
                <div class="card">
                    <h1>Acceso Concedido</h1>
                    <p>Bienvenido, <strong>${username}</strong>. Has accedido al panel administrativo.</p>
                    <div class="secret-data">
                        <h3>[PROPIEDADES DE INFRAESTRUCTURA DE AMAZONLAB]</h3>
                        <ul>
                            <li>Database Server: <code>${process.env.DB_HOST}</code></li>
                            <li>Database Name: <code>${process.env.DB_NAME}</code></li>
                            <li>Database User: <code>${process.env.DB_USER}</code></li>
                            <li>Database Password: (Reutilizada para SSH con el usuario: <code>${process.env.MAIL_USER || 'mailadmin'}</code>)</li>
                        </ul>
                    </div>
                    <div class="action-links">
                        <a href="/admin/add-product" class="btn-primary">Agregar Producto</a>
                        <a href="/" class="btn-secondary">Volver al buscador</a>
                    </div>
                </div>
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
            <title>Error de Autenticación - AmazonLab</title>
            <style>
                body {
                    font-family: "Amazon Ember", Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                    background-color: #eaeded;
                    color: #0f1111;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                }
                .error-card {
                    background-color: #ffffff;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    padding: 30px;
                    max-width: 400px;
                    width: 90%;
                    text-align: center;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }
                h2 {
                    color: #b12704;
                    margin: 0 0 15px 0;
                    font-size: 1.5rem;
                    font-weight: 400;
                }
                p {
                    color: #565959;
                    margin-bottom: 25px;
                    font-size: 0.95rem;
                }
                a {
                    display: inline-block;
                    padding: 10px 20px;
                    background-color: #ffd814;
                    border: 1px solid #fcd200;
                    color: #0f1111;
                    text-decoration: none;
                    border-radius: 100px;
                    font-weight: 500;
                    font-size: 0.9rem;
                    transition: background-color 0.1s;
                }
                a:hover {
                    background-color: #f7ca00;
                }
            </style>
        </head>
        <body>
            <div class="error-card">
                <h2>Credenciales Incorrectas</h2>
                <p>El usuario o contraseña especificados no son válidos para ingresar al panel de AmazonLab.</p>
                <a href="/admin/login">Intentar de nuevo</a>
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
        <title>Agregar Producto - AmazonLab Admin</title>
        <style>
            body {
                font-family: "Amazon Ember", Arial, sans-serif;
                margin: 0;
                padding: 0;
                background-color: #eaeded;
                color: #0f1111;
            }
            header {
                background-color: #131921;
                padding: 10px 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                height: 40px;
            }
            .logo {
                color: white;
                font-size: 1.5rem;
                font-weight: 700;
                text-decoration: none;
            }
            .logo span {
                color: #febd69;
            }
            .nav-right a {
                color: white;
                text-decoration: none;
                font-size: 0.9rem;
            }
            .nav-sub {
                background-color: #232f3e;
                padding: 8px 20px;
                font-size: 0.9rem;
            }
            .nav-sub a {
                color: #eeeeee;
                text-decoration: none;
            }
            .main-container {
                max-width: 600px;
                margin: 40px auto;
                padding: 0 20px;
            }
            .form-container {
                background-color: #ffffff;
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 30px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                box-sizing: border-box;
            }
            h2 {
                margin: 0 0 20px 0;
                font-size: 1.6rem;
                font-weight: 400;
            }
            .form-group {
                margin-bottom: 20px;
            }
            label {
                display: block;
                margin-bottom: 8px;
                font-size: 0.85rem;
                font-weight: 700;
            }
            input[type="text"], input[type="number"], textarea {
                width: 100%;
                padding: 8px 10px;
                font-size: 0.95rem;
                border: 1px solid #a6a6a6;
                border-radius: 3px;
                box-sizing: border-box;
                outline: none;
                font-family: inherit;
                transition: border-color 0.1s, box-shadow 0.1s;
            }
            input[type="text"]:focus, input[type="number"]:focus, textarea:focus {
                border-color: #e77600;
                box-shadow: 0 0 3px 2px rgba(228,121,17,.5);
            }
            input[type="file"] {
                font-family: inherit;
                font-size: 0.9rem;
            }
            input[type="submit"] {
                width: 100%;
                padding: 10px 0;
                font-size: 0.9rem;
                font-weight: 500;
                background-color: #ffd814;
                border: 1px solid #fcd200;
                border-radius: 100px;
                cursor: pointer;
                font-family: inherit;
                box-shadow: 0 2px 5px rgba(213,217,217,.5);
                transition: background-color 0.1s;
                margin-top: 10px;
            }
            input[type="submit"]:hover {
                background-color: #f7ca00;
            }
            .back-link {
                display: block;
                text-align: center;
                margin-top: 20px;
                font-size: 0.9rem;
                color: #007185;
                text-decoration: none;
            }
            .back-link:hover {
                color: #c45500;
                text-decoration: underline;
            }
        </style>
    </head>
    <body>
        <header>
            <a href="/" class="logo">amazon<span>lab</span></a>
            <div class="nav-right">
                <a href="/">Volver a la tienda</a>
            </div>
        </header>
        <div class="nav-sub">
            <a href="/admin/login">&larr; Panel de Control</a>
        </div>
        
        <div class="main-container">
            <div class="form-container">
                <h2>Agregar nuevo producto</h2>
                <form action="/admin/add-product" method="POST" enctype="multipart/form-data">
                    <div class="form-group">
                        <label for="name">Nombre del producto</label>
                        <input type="text" id="name" name="name" required>
                    </div>
                    <div class="form-group">
                        <label for="description">Descripción detallada</label>
                        <textarea id="description" name="description" rows="4" required></textarea>
                    </div>
                    <div class="form-group">
                        <label for="price">Precio (USD)</label>
                        <input type="number" id="price" name="price" step="0.01" required>
                    </div>
                    <div class="form-group">
                        <label for="image">Imagen o archivo del producto (.jpg, .png, .js)</label>
                        <input type="file" id="image" name="image" required>
                    </div>
                    <input type="submit" value="Añadir a la base de datos">
                </form>
                <a href="/" class="back-link">Cancelar y volver al catálogo</a>
            </div>
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
      'INSERT INTO products (name, description, price, image) VALUES (?, ?, ?, ?)',
      [name, description, price, fileName]
    );
    await pool.end();

    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <title>Producto Guardado - AmazonLab</title>
          <style>
              body {
                  font-family: "Amazon Ember", Arial, sans-serif;
                  margin: 0;
                  padding: 0;
                  background-color: #eaeded;
                  color: #0f1111;
                  display: flex;
                  flex-direction: column;
                  min-height: 100vh;
              }
              header {
                  background-color: #131921;
                  padding: 10px 20px;
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  height: 40px;
              }
              .logo {
                  color: white;
                  font-size: 1.5rem;
                  font-weight: 700;
                  text-decoration: none;
              }
              .logo span {
                  color: #febd69;
              }
              .nav-right a {
                  color: white;
                  text-decoration: none;
                  font-size: 0.9rem;
              }
              .nav-sub {
                  background-color: #232f3e;
                  padding: 8px 20px;
                  font-size: 0.9rem;
              }
              .nav-sub a {
                  color: #eeeeee;
                  text-decoration: none;
              }
              .main-container {
                  max-width: 600px;
                  margin: 40px auto;
                  padding: 0 20px;
                  width: 100%;
                  box-sizing: border-box;
              }
              .card {
                  background-color: #ffffff;
                  border: 1px solid #ddd;
                  border-radius: 4px;
                  padding: 30px;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
              }
              h2 {
                  color: #007600;
                  margin: 0 0 15px 0;
                  font-size: 1.6rem;
                  font-weight: 400;
              }
              p {
                  color: #565959;
                  margin-bottom: 10px;
                  font-size: 0.95rem;
              }
              code {
                  background-color: #f3f3f3;
                  padding: 4px 8px;
                  border-radius: 4px;
                  color: #0f1111;
                  font-family: monospace;
              }
              .alert-info {
                  margin: 20px 0;
                  padding: 15px;
                  border-left: 4px solid #febd69;
                  background-color: #fffdf9;
                  border-radius: 4px;
                  font-size: 0.9rem;
                  border-top: 1px solid #f5dab1;
                  border-right: 1px solid #f5dab1;
                  border-bottom: 1px solid #f5dab1;
              }
              .alert-info a {
                  color: #007185;
                  text-decoration: none;
                  font-weight: 600;
              }
              .alert-info a:hover {
                  text-decoration: underline;
                  color: #c45500;
              }
              .action-links {
                  display: flex;
                  gap: 15px;
                  margin-top: 25px;
              }
              .action-links a {
                  text-decoration: none;
                  font-size: 0.9rem;
                  font-weight: 500;
                  text-align: center;
              }
              .action-links a.btn-primary {
                  background-color: #ffd814;
                  border: 1px solid #fcd200;
                  border-radius: 100px;
                  padding: 10px 20px;
                  color: #0f1111;
                  box-shadow: 0 2px 5px rgba(213,217,217,.5);
              }
              .action-links a.btn-primary:hover {
                  background-color: #f7ca00;
              }
              .action-links a.btn-secondary {
                  border: 1px solid #d5d9d9;
                  background-color: #f0f2f2;
                  border-radius: 100px;
                  padding: 10px 20px;
                  color: #0f1111;
              }
              .action-links a.btn-secondary:hover {
                  background-color: #e3e6e6;
              }
          </style>
      </head>
      <body>
          <header>
              <a href="/" class="logo">amazon<span>lab</span></a>
              <div class="nav-right">
                  <a href="/">Volver a la tienda</a>
              </div>
          </header>
          <div class="nav-sub">
              <a href="/admin/login">&larr; Panel de Control</a>
          </div>
          
          <div class="main-container">
              <div class="card">
                  <h2>¡Producto guardado en AmazonLab!</h2>
                  <p>Nombre: <strong>${name}</strong></p>
                  <p>Archivo subido: <code>/uploads/${fileName}</code></p>
                  <div class="alert-info">
                      <strong>Entorno de Laboratorio:</strong> Si subiste un script interactivo para realizar el movimiento lateral, puedes previsualizar su ejecución aquí:
                      <br><br>
                      <a href="/admin/preview?file=${fileName}" target="_blank">Simular Ejecución de Script &rarr;</a>
                  </div>
                  <div class="action-links">
                      <a href="/admin/add-product" class="btn-primary">Subir otro producto</a>
                      <a href="/" class="btn-secondary">Volver al catálogo</a>
                  </div>
              </div>
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
        <!DOCTYPE html>
        <html>
        <head>
            <title>Terminal de Ejecución - Vista Previa</title>
            <style>
                body {
                    font-family: "Amazon Ember", Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                    background-color: #eaeded;
                    color: #0f1111;
                }
                header {
                    background-color: #131921;
                    padding: 10px 20px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    height: 40px;
                }
                .logo {
                    color: white;
                    font-size: 1.5rem;
                    font-weight: 700;
                    text-decoration: none;
                }
                .logo span {
                    color: #febd69;
                }
                .nav-right a {
                    color: white;
                    text-decoration: none;
                    font-size: 0.9rem;
                }
                .nav-sub {
                    background-color: #232f3e;
                    padding: 8px 20px;
                    font-size: 0.9rem;
                }
                .nav-sub a {
                    color: #eeeeee;
                    text-decoration: none;
                }
                .main-container {
                    max-width: 900px;
                    margin: 40px auto;
                    padding: 0 20px;
                }
                .preview-container {
                    background-color: white;
                    border: 1px solid #ddd;
                    padding: 30px;
                    border-radius: 4px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }
                h3 {
                    margin-top: 0;
                    color: #b12704;
                    font-size: 1.3rem;
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 10px;
                    font-weight: 400;
                }
                .console-output {
                    background-color: #020617;
                    border: 1px solid #1e293b;
                    color: #10b981;
                    padding: 20px;
                    font-family: 'Courier New', Courier, monospace;
                    border-radius: 8px;
                    overflow-x: auto;
                    white-space: pre-wrap;
                    line-height: 1.5;
                    font-size: 0.95rem;
                    box-shadow: inset 0 0 10px rgba(0,0,0,0.8);
                }
                a.back-btn {
                    display: inline-block;
                    margin-top: 20px;
                    color: #007185;
                    text-decoration: none;
                    font-weight: 500;
                }
                a.back-btn:hover {
                    color: #c45500;
                    text-decoration: underline;
                }
            </style>
        </head>
        <body>
            <header>
                <a href="/" class="logo">amazon<span>lab</span></a>
                <div class="nav-right">
                    <a href="/">Volver a la tienda</a>
                </div>
            </header>
            <div class="nav-sub">
                <a href="/admin/login">&larr; Panel de Control</a>
            </div>
            
            <div class="main-container">
                <div class="preview-container">
                    <h3>[RCE SIMULATION OUTPUT] - Ejecución del script subido:</h3>
                    <div class="console-output">${consoleOutput || 'Script ejecutado sin salida en consola (console.log)'}</div>
                    <a href="/admin/add-product" class="back-btn">&larr; Volver al panel de carga</a>
                </div>
            </div>
        </body>
        </html>
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

