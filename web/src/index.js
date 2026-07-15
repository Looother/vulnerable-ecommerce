const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const adminRoutes = require('./admin');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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
      
      // Drop products table to ensure clean storage
      await connection.query('DROP TABLE IF EXISTS products;');
      
      // Create products table with image column
      await connection.query(`
        CREATE TABLE IF NOT EXISTS products (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price DECIMAL(10, 2) NOT NULL,
          image VARCHAR(255) DEFAULT NULL
        );
      `);

      // Seed Amazon variety products
      await connection.query(`
        INSERT INTO products (name, description, price, image) VALUES
        ('Tenis Deportivos Air Jordan 1 Premium', 'Tenis de baloncesto icónicos con amortiguación premium de aire y estilo de cuero de alta calidad.', 189.99, 'images/air_jordan.avif'),
        ('Bolsa de Mano Elegante para Dama', 'Bolsa de hombro de cuero sintético con compartimentos internos de seguridad y correa de hombro ajustable.', 49.99, 'images/bolsa_de_mujer.jpg'),
        ('Juego de Herramientas Truper (15 Piezas)', 'Maletín completo de herramientas básicas con llaves, destornilladores, martillo y cinta métrica.', 34.50, 'images/herramienta_truper.jpg'),
        ('Audífonos Inalámbricos Sony Noise Cancelling', 'Audífonos inalámbricos de diadema con cancelación activa de ruido y hasta 35 horas de batería.', 129.00, 'https://m.media-amazon.com/images/I/511c23mDjoL._AC_SL1500_.jpg'),
        ('Libro: Clean Code (Código Limpio)', 'Manual práctico de estilo para el desarrollo ágil de software, escrito por Robert C. Martin (Uncle Bob).', 29.99, 'https://m.media-amazon.com/images/I/41a4mCm92ZL._SY445_SX342_ML2_.jpg'),
        ('Teclado Mecánico Gaming Logitech G413', 'Teclado mecánico retroiluminado con interruptores táctiles Romer-G de alta precisión y chasis de aluminio.', 69.99, 'https://m.media-amazon.com/images/I/61JYXbJF97L._AC_SX522_.jpg');
      `);
      console.log('Database seeded with Amazon-like products.');

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
app.get('/', async (req, res) => {
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
          <title>AmazonLab - Tu tienda online</title>
          <style>
              body {
                  font-family: "Amazon Ember", Arial, sans-serif;
                  margin: 0;
                  padding: 0;
                  background-color: #eaeded;
                  color: #0f1111;
              }
              /* Top Amazon-style nav header */
              header {
                  background-color: #131921;
                  padding: 10px 20px;
                  display: flex;
                  flex-direction: column;
                  gap: 10px;
              }
              .nav-top {
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  flex-wrap: wrap;
                  gap: 15px;
              }
              .logo {
                  color: white;
                  font-size: 1.5rem;
                  font-weight: 700;
                  text-decoration: none;
                  display: flex;
                  align-items: center;
              }
              .logo span {
                  color: #febd69;
              }
              .search-form {
                  display: flex;
                  flex-grow: 1;
                  max-width: 700px;
                  height: 40px;
                  border-radius: 4px;
                  overflow: hidden;
              }
              .search-input {
                  flex-grow: 1;
                  padding: 0 15px;
                  font-size: 0.95rem;
                  border: none;
                  outline: none;
                  font-family: inherit;
              }
              .search-btn {
                  background-color: #febd69;
                  border: none;
                  width: 50px;
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  transition: background-color 0.1s;
              }
              .search-btn:hover {
                  background-color: #f3a847;
              }
              .nav-right a {
                  color: white;
                  text-decoration: none;
                  font-size: 0.9rem;
                  font-weight: 500;
                  padding: 8px 10px;
                  border: 1px solid transparent;
                  border-radius: 2px;
              }
              .nav-right a:hover {
                  border-color: white;
              }
              .nav-sub {
                  background-color: #232f3e;
                  padding: 8px 20px;
                  display: flex;
                  gap: 15px;
                  font-size: 0.9rem;
              }
              .nav-sub a {
                  color: #eeeeee;
                  text-decoration: none;
                  transition: color 0.1s;
              }
              .nav-sub a:hover {
                  color: white;
              }
              
              /* Content Container */
              .main-container {
                  max-width: 1500px;
                  margin: 20px auto;
                  padding: 0 20px;
              }
              
              .results-title {
                  font-size: 1.2rem;
                  margin-bottom: 20px;
                  color: #565959;
              }
              
              /* Product Grid */
              .grid {
                  display: grid;
                  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
                  gap: 20px;
              }
              
              .product-card-link {
                  text-decoration: none;
                  color: inherit;
                  display: flex;
              }
              
              .product-card {
                  background-color: white;
                  border: 1px solid #e7e7e7;
                  border-radius: 4px;
                  overflow: hidden;
                  display: flex;
                  flex-direction: column;
                  width: 100%;
                  box-sizing: border-box;
                  transition: border-color 0.2s;
              }
              .product-card:hover {
                  border-color: #c45500;
              }
              
              .product-img-wrapper {
                  height: 220px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  padding: 15px;
                  background-color: #ffffff;
              }
              
              .product-img {
                  max-width: 100%;
                  max-height: 100%;
                  object-fit: contain;
              }
              
              .no-img-placeholder {
                  color: #767676;
                  font-size: 0.85rem;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  gap: 10px;
              }
              
              .product-info {
                  padding: 15px;
                  display: flex;
                  flex-direction: column;
                  flex-grow: 1;
                  border-top: 1px solid #f3f3f3;
              }
              
              .product-title {
                  font-size: 0.95rem;
                  font-weight: 600;
                  line-height: 1.4;
                  margin: 0 0 8px 0;
                  color: #007185;
                  display: -webkit-box;
                  -webkit-line-clamp: 2;
                  -webkit-box-orient: vertical;
                  overflow: hidden;
                  text-overflow: ellipsis;
              }
              .product-card:hover .product-title {
                  color: #c45500;
              }
              
              .ratings {
                  color: #ffa41c;
                  font-size: 0.9rem;
                  margin-bottom: 8px;
              }
              .ratings-count {
                  color: #007185;
                  font-size: 0.8rem;
                  margin-left: 5px;
              }
              
              .product-desc {
                  font-size: 0.85rem;
                  color: #565959;
                  margin: 0 0 15px 0;
                  line-height: 1.4;
                  flex-grow: 1;
                  display: -webkit-box;
                  -webkit-line-clamp: 2;
                  -webkit-box-orient: vertical;
                  overflow: hidden;
                  text-overflow: ellipsis;
              }
              
              .product-footer {
                  display: flex;
                  flex-direction: column;
                  gap: 10px;
                  margin-top: auto;
              }
              
              .product-price {
                  font-size: 1.3rem;
                  font-weight: 700;
                  color: #B12704;
              }
              
              .buy-button {
                  width: 100%;
                  padding: 8px 0;
                  background-color: #ffd814;
                  border: 1px solid #fcd200;
                  border-radius: 100px;
                  font-size: 0.85rem;
                  font-weight: 500;
                  cursor: pointer;
                  text-align: center;
                  box-shadow: 0 2px 5px rgba(213,217,217,.5);
                  transition: background-color 0.1s;
                  font-family: inherit;
              }
              .buy-button:hover {
                  background-color: #f7ca00;
              }
              
              .debug-info {
                  margin-top: 50px;
                  padding: 20px;
                  background-color: #fdf6ec;
                  border: 1px solid #f5dab1;
                  border-radius: 4px;
                  font-family: monospace;
                  color: #e6a23c;
                  font-size: 0.85rem;
                  overflow-x: auto;
              }
              .debug-title {
                  font-weight: bold;
                  margin-bottom: 8px;
                  display: block;
                  color: #b88230;
              }
          </style>
      </head>
      <body>
          <header>
              <div class="nav-top">
                  <a href="/" class="logo">amazon<span>lab</span></a>
                  <form action="/" method="GET" class="search-form">
                      <input type="text" name="q" class="search-input" value="${query.replace(/"/g, '&quot;')}" placeholder="Buscar productos en AmazonLab...">
                      <button type="submit" class="search-btn">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                      </button>
                  </form>
                  <div class="nav-right">
                      <a href="/admin/login">Mi Cuenta</a>
                  </div>
              </div>
          </header>
          
          <div class="nav-sub">
              <a href="#">Todo</a>
              <a href="#">Ofertas del Día</a>
              <a href="#">Servicio al Cliente</a>
              <a href="#">Listas de Regalos</a>
              <a href="#">Vender</a>
          </div>
          
          <div class="main-container">
              <div class="results-title">
                  Resultados de búsqueda para: <strong>"${query || 'Todos los productos'}"</strong>
              </div>
              
              <div class="grid">
    `;

    if (results.length === 0) {
      html += `
        <div style="grid-column: 1/-1; text-align: center; color: #565959; padding: 60px 0; background-color: white; border: 1px solid #e7e7e7; border-radius: 4px;">
            No se encontraron productos en AmazonLab.
        </div>
      `;
    } else {
      results.forEach(product => {
        let imageSrc = '';
        if (product.image) {
          if (product.image.startsWith('http://') || product.image.startsWith('https://')) {
            imageSrc = product.image;
          } else if (product.image.startsWith('images/')) {
            imageSrc = '/' + product.image;
          } else {
            imageSrc = '/uploads/' + product.image;
          }
        }
        
        // Simular estrellas de reseñas aleatorias / realistas para Amazon
        const stars = '★★★★☆';
        const reviewsCount = Math.floor((product.price * 3) + 12);
        
        html += `
          <a href="/product/${product.id}" class="product-card-link">
            <div class="product-card">
                <div class="product-img-wrapper">
                    ${product.image ? 
                      `<img class="product-img" src="${imageSrc}" alt="${product.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : ''
                    }
                    <div class="no-img-placeholder" style="${product.image ? 'display:none;' : 'display:flex;'}">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        <span>Sin imagen</span>
                    </div>
                </div>
                <div class="product-info">
                    <h3 class="product-title">${product.name}</h3>
                    <div class="ratings">${stars}<span class="ratings-count">${reviewsCount}</span></div>
                    <p class="product-desc">${product.description || ''}</p>
                    <div class="product-footer">
                        <span class="product-price">$${product.price}</span>
                        <button class="buy-button">Agregar al carrito</button>
                    </div>
                </div>
            </div>
          </a>
        `;
      });
    }

    html += `
              </div>
          </div>
      </body>
      </html>
    `;
    
    res.send(html);
  } catch (err) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>AmazonLab - Error de Sintaxis SQL</title>
          <style>
              body { font-family: monospace; background: #faf8f6; color: #b12704; padding: 40px; }
              .error-box { border: 1px solid #f5dab1; padding: 20px; background: #fffdf9; border-radius: 4px; max-width: 800px; margin: auto; }
              pre { white-space: pre-wrap; word-wrap: break-word; }
          </style>
      </head>
      <body>
          <div class="error-box">
              <h2>[ERROR INTERNO DEL MOTOR SQL DE AMAZONLAB]</h2>
              <p>Ocurrió un error al interpretar la consulta a la base de datos:</p>
              <pre>${err.message}</pre>
              <hr style="border-color: #f5dab1;">
              <h3>Consulta Intentada:</h3>
              <pre>${sql}</pre>
          </div>
      </body>
      </html>
    `);
  }
});

// Dynamic Product Detail Endpoint (Vulnerable to numeric SQLi)
app.get('/product/:id', async (req, res) => {
  const id = req.params.id;
  // Vulnerable Query (string concatenation)
  const sql = `SELECT * FROM products WHERE id = ${id}`;

  try {
    if (!pool) {
      return res.status(500).send('Database not initialized yet.');
    }
    const [results] = await pool.query(sql);

    if (results.length === 0) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Producto No Encontrado - AmazonLab</title>
            <style>
                body { font-family: sans-serif; background: #eaeded; color: #0f1111; text-align: center; padding: 50px; }
                a { color: #007185; text-decoration: none; }
            </style>
        </head>
        <body>
            <h1>Producto No Encontrado</h1>
            <p>El producto solicitado no existe en la base de datos de AmazonLab.</p>
            <a href="/search">&larr; Volver al catálogo</a>
        </body>
        </html>
      `);
    }

    const product = results[0];
    let imageSrc = '';
    if (product.image) {
      if (product.image.startsWith('http://') || product.image.startsWith('https://')) {
        imageSrc = product.image;
      } else if (product.image.startsWith('images/')) {
        imageSrc = '/' + product.image;
      } else {
        imageSrc = '/uploads/' + product.image;
      }
    }

    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <title>${product.name} - AmazonLab</title>
          <style>
              body {
                  font-family: "Amazon Ember", Arial, sans-serif;
                  margin: 0;
                  padding: 0;
                  background-color: #ffffff;
                  color: #0f1111;
              }
              header {
                  background-color: #131921;
                  padding: 10px 20px;
                  display: flex;
                  flex-direction: column;
                  gap: 10px;
              }
              .nav-top {
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  flex-wrap: wrap;
                  gap: 15px;
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
              .search-form {
                  display: flex;
                  flex-grow: 1;
                  max-width: 700px;
                  height: 40px;
                  border-radius: 4px;
                  overflow: hidden;
              }
              .search-input {
                  flex-grow: 1;
                  padding: 0 15px;
                  font-size: 0.95rem;
                  border: none;
                  outline: none;
                  font-family: inherit;
              }
              .search-btn {
                  background-color: #febd69;
                  border: none;
                  width: 50px;
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  justify-content: center;
              }
              .nav-right a {
                  color: white;
                  text-decoration: none;
                  font-size: 0.9rem;
              }
              .nav-sub {
                  background-color: #232f3e;
                  padding: 8px 20px;
                  display: flex;
                  gap: 15px;
                  font-size: 0.9rem;
              }
              .nav-sub a {
                  color: #eeeeee;
                  text-decoration: none;
              }
              
              .breadcrumbs {
                  max-width: 1200px;
                  margin: 20px auto 10px auto;
                  padding: 0 20px;
                  font-size: 0.8rem;
                  color: #565959;
              }
              .breadcrumbs a {
                  color: #565959;
                  text-decoration: none;
              }
              .breadcrumbs a:hover {
                  color: #c45500;
                  text-decoration: underline;
              }

              .product-container {
                  max-width: 1200px;
                  margin: 10px auto 40px auto;
                  padding: 0 20px;
                  display: flex;
                  gap: 40px;
              }
              
              .product-gallery {
                  flex: 1;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  border: 1px solid #e7e7e7;
                  border-radius: 4px;
                  height: 400px;
                  padding: 20px;
              }
              .product-img {
                  max-width: 100%;
                  max-height: 100%;
                  object-fit: contain;
              }
              .no-img-placeholder {
                  color: #767676;
                  font-size: 0.9rem;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  gap: 10px;
              }
              
              .product-details {
                  flex: 1.2;
                  display: flex;
                  flex-direction: column;
              }
              h2 {
                  font-size: 1.8rem;
                  font-weight: 500;
                  margin: 0 0 10px 0;
                  line-height: 1.3;
              }
              .rating-row {
                  color: #ffa41c;
                  font-size: 0.95rem;
                  margin-bottom: 15px;
                  border-bottom: 1px solid #e7e7e7;
                  padding-bottom: 10px;
              }
              .rating-row span {
                  color: #007185;
                  margin-left: 10px;
              }
              .price-row {
                  font-size: 0.9rem;
                  color: #565959;
                  margin-bottom: 15px;
              }
              .price {
                  font-size: 1.8rem;
                  font-weight: 400;
                  color: #B12704;
              }
              .availability {
                  color: #007600;
                  font-size: 1.1rem;
                  font-weight: 500;
                  margin-bottom: 20px;
              }
              .description-title {
                  font-weight: 700;
                  margin-bottom: 5px;
              }
              .description {
                  font-size: 0.95rem;
                  color: #0f1111;
                  line-height: 1.5;
                  margin-bottom: 30px;
                  border-top: 1px solid #e7e7e7;
                  padding-top: 15px;
              }
              
              .purchase-card {
                  border: 1px solid #d5d9d9;
                  border-radius: 8px;
                  padding: 20px;
                  width: 250px;
                  display: flex;
                  flex-direction: column;
                  gap: 15px;
                  height: fit-content;
              }
              .buy-btn {
                  width: 100%;
                  padding: 10px 0;
                  background-color: #ffd814;
                  border: 1px solid #fcd200;
                  border-radius: 100px;
                  font-size: 0.9rem;
                  font-weight: 500;
                  cursor: pointer;
                  box-shadow: 0 2px 5px rgba(213,217,217,.5);
                  font-family: inherit;
              }
              .buy-btn:hover {
                  background-color: #f7ca00;
              }
              .buy-now-btn {
                  width: 100%;
                  padding: 10px 0;
                  background-color: #ffa41c;
                  border: 1px solid #ff8f00;
                  border-radius: 100px;
                  font-size: 0.9rem;
                  font-weight: 500;
                  cursor: pointer;
                  font-family: inherit;
              }
              .buy-now-btn:hover {
                  background-color: #e89317;
              }
              .back-link {
                  color: #007185;
                  text-decoration: none;
                  font-size: 0.9rem;
                  margin-top: 15px;
                  display: inline-block;
              }
              .back-link:hover {
                  color: #c45500;
                  text-decoration: underline;
              }
              
              .debug-info {
                  margin: 40px auto;
                  max-width: 1200px;
                  padding: 20px;
                  background-color: #fdf6ec;
                  border: 1px solid #f5dab1;
                  border-radius: 4px;
                  font-family: monospace;
                  color: #e6a23c;
                  font-size: 0.85rem;
                  overflow-x: auto;
                  box-sizing: border-box;
              }
              .debug-title {
                  font-weight: bold;
                  margin-bottom: 8px;
                  display: block;
                  color: #b88230;
              }
              @media (max-width: 768px) {
                  .product-container {
                      flex-direction: column;
                  }
                  .product-gallery {
                      height: 250px;
                  }
                  .purchase-card {
                      width: 100%;
                      box-sizing: border-box;
                  }
              }
          </style>
      </head>
      <body>
          <header>
              <div class="nav-top">
                  <a href="/" class="logo">amazon<span>lab</span></a>
                  <form action="/" method="GET" class="search-form">
                      <input type="text" name="q" class="search-input" placeholder="Buscar productos en AmazonLab...">
                      <button type="submit" class="search-btn">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                      </button>
                  </form>
                  <div class="nav-right">
                      <a href="/admin/login" style="color: white; text-decoration: none;">Mi Cuenta</a>
                  </div>
              </div>
          </header>
          
          <div class="breadcrumbs">
              <a href="/">AmazonLab</a> &gt; <a href="#">Electrónicos y Más</a> &gt; <span>Detalle</span>
          </div>

          <div class="product-container">
              <div class="product-gallery">
                  ${product.image ? 
                    `<img class="product-img" src="${imageSrc}" alt="${product.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : ''
                  }
                  <div class="no-img-placeholder" style="${product.image ? 'display:none;' : 'display:flex;'}">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                      <span>Sin imagen</span>
                  </div>
              </div>
              
              <div class="product-details">
                  <h2>${product.name}</h2>
                  <div class="rating-row">★★★★☆ <span>4.2 de 5 estrellas</span></div>
                  <div class="price-row">Precio: <span class="price">$${product.price}</span></div>
                  <div class="availability">Disponible.</div>
                  <div class="description">
                      <div class="description-title">Acerca de este artículo</div>
                      ${product.description}
                  </div>
                  <a href="/" class="back-link">&larr; Volver al catálogo</a>
              </div>
              
              <div class="purchase-card">
                  <span class="price">$${product.price}</span>
                  <span style="font-size: 0.9rem; color: #565959;">Envío GRATIS disponible.</span>
                  <div class="availability">Disponible.</div>
                  <button class="buy-btn">Agregar al Carrito</button>
                  <button class="buy-now-btn">Comprar Ahora</button>
              </div>
          </div>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>AmazonLab - Error de Sintaxis SQL</title>
          <style>
              body { font-family: monospace; background: #faf8f6; color: #b12704; padding: 40px; }
              .error-box { border: 1px solid #f5dab1; padding: 20px; background: #fffdf9; border-radius: 4px; max-width: 800px; margin: auto; }
              pre { white-space: pre-wrap; word-wrap: break-word; }
          </style>
      </head>
      <body>
          <div class="error-box">
              <h2>[ERROR INTERNO DEL MOTOR SQL DE AMAZONLAB]</h2>
              <p>Ocurrió un error al interpretar la consulta a la base de datos:</p>
              <pre>${err.message}</pre>
              <hr style="border-color: #f5dab1;">
              <h3>Consulta Intentada:</h3>
              <pre>${sql}</pre>
          </div>
      </body>
      </html>
    `);
  }
});

// Admin Panel Mount point
app.use('/admin', adminRoutes);

// Note: Since Apache handles directory listing for /, we don't handle GET / in Node.js.

// Start initialization and server
initDb().then(() => {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
});
