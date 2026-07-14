const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const serveIndex = require('serve-index');
const adminRoutes = require('./admin');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 80;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Enable directory listing (like Options +Indexes in Apache)
// This will allow enumerating the contents of the src directory including .env
app.use('/', express.static(__dirname), serveIndex(__dirname, { icons: true, view: 'details' }));

// Database connection pool setup
let pool;
async function initDb() {
  const connectionParams = {
    host: process.env.DB_HOST || 'db-server',
    user: 'root',
    password: 'SuperSecureRootPassword123!',
  };

  let connected = false;
  let attempts = 0;
  
  while (!connected && attempts < 10) {
    try {
      attempts++;
      const connection = await mysql.createConnection(connectionParams);
      console.log('Connected to database server for initialization.');
      
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'ecommerce'}\`;`);
      await connection.query(`USE \`${process.env.DB_NAME || 'ecommerce'}\`;`);
      
      // Create products table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS products (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price DECIMAL(10, 2) NOT NULL
        );
      `);

      // Seed products if empty
      const [rows] = await connection.query('SELECT COUNT(*) as count FROM products');
      if (rows[0].count === 0) {
        await connection.query(`
          INSERT INTO products (name, description, price) VALUES
          ('Seguridad Informática Avanzada', 'Libro completo sobre hacking ético y pentesting.', 45.99),
          ('Tarjeta de Red Alfa AWUS036ACM', 'Adaptador WiFi compatible con modo monitor e inyección.', 35.50),
          ('Rubber Ducky USB', 'Herramienta de simulación de teclado para inyección de payload.', 79.99),
          ('Raspberry Pi 4 Model B', 'Mini ordenador de 4GB RAM ideal para laboratorios.', 55.00);
        `);
        console.log('Database seeded with products.');
      }

      // Create users table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL
        );
      `);

      // Seed admin credentials
      const [userRows] = await connection.query('SELECT COUNT(*) as count FROM users');
      if (userRows[0].count === 0) {
        await connection.query(`
          INSERT INTO users (username, password) VALUES
          ('admin', 'cinvestav123');
        `);
        console.log('Database seeded with admin user.');
      }

      await connection.end();
      
      // Create connection pool for the app with the limited privilege user
      pool = mysql.createPool({
        host: process.env.DB_HOST || 'db-server',
        user: process.env.DB_USER || 'dbuser',
        password: process.env.DB_PASSWORD || 'cinvestav123',
        database: process.env.DB_NAME || 'ecommerce',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
      
      connected = true;
      console.log('Database initialization complete.');
    } catch (err) {
      console.error(`Database connection attempt ${attempts} failed: ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Vulnerable Search Endpoint (SQL Injection via direct string concatenation)
app.get('/search', async (req, res) => {
  const query = req.query.q || '';
  
  // Vulnerable Query Construction
  const sql = `SELECT * FROM products WHERE name LIKE '%${query}%' OR description LIKE '%${query}%'`;
  
  try {
    if (!pool) {
      return res.status(500).send('Database not initialized yet. Please refresh in a moment.');
    }
    const [results] = await pool.query(sql);
    
    let html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <title>E-Commerce - Buscador de Productos</title>
          <style>
              body { font-family: Arial, sans-serif; margin: 40px; background-color: #f4f4f9; }
              h1 { color: #333; }
              .search-box { margin-bottom: 20px; }
              input[type="text"] { padding: 10px; width: 300px; font-size: 16px; }
              input[type="submit"] { padding: 10px 20px; font-size: 16px; cursor: pointer; }
              .product { background: white; padding: 15px; margin-bottom: 10px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
              .product h3 { margin: 0 0 10px 0; }
              .price { color: green; font-weight: bold; }
              .debug-info { margin-top: 30px; padding: 10px; background-color: #ffe6e6; border: 1px solid #ff9999; font-family: monospace; }
          </style>
      </head>
      <body>
          <h1>Buscador de Artículos E-Commerce</h1>
          <div class="search-box">
              <form action="/search" method="GET">
                  <input type="text" name="q" value="${query.replace(/"/g, '&quot;')}" placeholder="Buscar productos...">
                  <input type="submit" value="Buscar">
              </form>
          </div>
          <div class="results">
              <h2>Resultados para: <em>${query}</em></h2>
    `;

    if (results.length === 0) {
      html += '<p>No se encontraron productos.</p>';
    } else {
      results.forEach(product => {
        html += `
          <div class="product">
              <h3>${product.name}</h3>
              <p>${product.description || ''}</p>
              <p class="price">$${product.price}</p>
          </div>
        `;
      });
    }

    // Include the executed query to assist students in understanding the SQL Injection vulnerability
    html += `
          </div>
          <div class="debug-info">
              <strong>[DEBUG] SQL Ejecutado:</strong> ${sql}
          </div>
          <p><a href="/admin/login">Panel de Administración</a></p>
      </body>
      </html>
    `;
    
    res.send(html);
  } catch (err) {
    res.status(500).send(`
      <h1>Error en la base de datos</h1>
      <pre>${err.message}</pre>
      <div style="margin-top: 30px; padding: 10px; background-color: #ffe6e6; border: 1px solid #ff9999; font-family: monospace;">
          <strong>[DEBUG] SQL Ejecutado:</strong> ${sql}
      </div>
    `);
  }
});

// Admin Panel Mount point
app.use('/admin', adminRoutes);

// Root path redirects to search or allows directory listing depending on context
app.get('/', (req, res, next) => {
  // If the user requests index.html or specifically wants the app homepage:
  if (req.query.browse === 'true') {
    return next(); // pass to serveIndex
  }
  res.redirect('/search');
});

// Start initialization and server
initDb().then(() => {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
});
