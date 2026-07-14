const { execSync } = require('child_process');
console.log("=== Información de usuario ===");
console.log(execSync('id').toString());
