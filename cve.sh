#!/bin/bash
set -euo pipefail

# Configuración
TARGET="52.247.225.51"
SCAN_DIR="/tmp/nmap_cve_$(date +%Y%m%d_%H%M%S)"
RAW_OUTPUT="$SCAN_DIR/raw_output.txt"
CVE_REPORT="$SCAN_DIR/cve_report.txt"
MAX_CVES=5

# Verificar dependencias
for cmd in nmap grep curl jq; do
    if ! command -v "$cmd" &> /dev/null; then
        echo "Error: '$cmd' no está instalado. Instálalo antes de ejecutar." >&2
        exit 1
    fi
done

mkdir -p "$SCAN_DIR"

echo "Iniciando escaneo nmap en $TARGET..."
sudo nmap -Pn -sV --script=vuln -p 80,443,8080,8443,3306 -oN "$RAW_OUTPUT" "$TARGET" 2>&1 | tee "$SCAN_DIR/scan.log" || {
    echo "El escaneo falló. Verifica permisos (sudo) o conectividad." >&2
    exit 1
}

echo "Extrayendo CVEs detectados..."
grep -iE 'CVE-[0-9]{4}-[0-9]{4,}' "$RAW_OUTPUT" > "$CVE_REPORT" || true

if [ ! -s "$CVE_REPORT" ]; then
    echo "No se encontraron CVEs en el escaneo."
    exit 0
fi

TOTAL_FOUND=$(wc -l < "$CVE_REPORT")
head -n "$MAX_CVES" "$CVE_REPORT" > "$SCAN_DIR/limited_cves.txt"

echo -e "\n=== REPORTE DE CVEs PARA $TARGET (Mostrando máx. $MAX_CVES de $TOTAL_FOUND encontrados) ===\n"

while IFS= read -r line; do
    cve_id=$(echo "$line" | grep -oE 'CVE-[0-9]{4}-[0-9]{4,}')
    [ -z "$cve_id" ] && continue

    echo "🔹 $cve_id"
    
    # Fetch description from NVD with retry logic (fixes rate limit/network errors)
    description="Descripción no disponible"
    for attempt in $(seq 1 3); do
        if curl -sf --max-time 8 "https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=$cve_id" | \
           jq -r '.vulnerabilities[0].descriptions[0].value // "Descripción no disponible"' > /tmp/nvd_$$.txt; then
            description=$(cat /tmp/nvd_$$.txt)
            rm -f /tmp/nvd_$$.txt
            break
        fi
        sleep $((RANDOM % 2 + 1)) # Espera aleatoria 1-2s para evitar rate limit (429)
    done

    echo "    $description"
done < "$SCAN_DIR/limited_cves.txt"

echo -e "\nResultados completos guardados en: $RAW_OUTPUT"
