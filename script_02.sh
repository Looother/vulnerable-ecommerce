#!/bin/bash
set -euo pipefail

# Configuración
TARGET="52.247.225.51"
SCAN_DIR="/tmp/nmap_cve_$(date +%Y%m%d_%H%M%S)"
RAW_OUTPUT="$SCAN_DIR/raw_output.txt"
CVE_REPORT="$SCAN_DIR/cve_report.txt"

# Verificar dependencias
for cmd in nmap grep curl; do
    if ! command -v "$cmd" &> /dev/null; then
        echo "❌ Error: '$cmd' no está instalado. Instálalo antes de ejecutar." >&2
        exit 1
    fi
done

# Crear directorio temporal
mkdir -p "$SCAN_DIR"

echo "🔍 Iniciando escaneo nmap en $TARGET..."
# Escaneo enfocado en servicios web + detección de versiones + scripts de vulnerabilidades
sudo nmap -Pn -sV --script=vuln -p 80,443,8080,8443,3306 -oN "$RAW_OUTPUT" "$TARGET" 2>&1 | tee "$SCAN_DIR/scan.log" || {
    echo "❌ El escaneo falló. Verifica permisos (sudo) o conectividad." >&2
    exit 1
}

echo "📥 Extrayendo CVEs detectados..."
grep -iE 'CVE-[0-9]{4}-[0-9]{4,}' "$RAW_OUTPUT" > "$CVE_REPORT" || true

if [ ! -s "$CVE_REPORT" ]; then
    echo "✅ No se encontraron CVEs en el escaneo."
    exit 0
fi

echo -e "\n📋 === REPORTE DE CVEs PARA $TARGET ===\n"
cat "$CVE_REPORT"

# Enriquecer con NVD API (opcional, requiere jq)
if command -v jq &> /dev/null; then
    echo -e "\n🌐 Consultando descripciones oficiales en NVD...\n"
    while IFS= read -r line; do
        cve_id=$(echo "$line" | grep -oE 'CVE-[0-9]{4}-[0-9]{4,}')
        if [ -n "$cve_id" ]; then
            echo "🔹 $cve_id"
            curl -s --max-time 5 "https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=$cve_id" | \
                jq -r '.vulnerabilities[0].descriptions[0].value // "Descripción no disponible"' 2>/dev/null || echo "⚠️ No se pudo obtener detalle (rate limit o error de red)"
        fi
    done < "$CVE_REPORT"
else
    echo "💡 Instala 'jq' para ver descripciones oficiales: sudo apt install jq / brew install jq"
fi

echo -e "\n📁 Resultados completos guardados en: $RAW_OUTPUT"
