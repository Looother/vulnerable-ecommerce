const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');

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
                <p><a href="/search">Volver al Buscador</a></p>
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

module.exports = router;
