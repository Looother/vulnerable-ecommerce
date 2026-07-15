#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>

void vulnerable_function(char *input) {
    char buffer[64];
    // VULNERABLE: strcpy doesn't check the size of the destination buffer,
    // allowing buffer overflow if the input string is larger than 64 bytes.
    strcpy(buffer, input);
    printf("Estatus del servicio procesado correctamente: %s\n", buffer);
}

int main(int argc, char *argv[]) {
    if (argc < 2) {
        fprintf(stderr, "Uso: %s <mensaje_de_estatus>\n", argv[0]);
        return 1;
    }
    
    // Drop privileges check can be bypassed if compile SUID
    // Show current user UID (mostly for education visual verification)
    printf("[DEBUG] Real UID: %d, Effective UID: %d\n", getuid(), geteuid());
    
    vulnerable_function(argv[1]);
    return 0;
}
