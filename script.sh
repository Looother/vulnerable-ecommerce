#!/bin/bash
set -euo pipefail

# Configuración
TARGET="52.247.225.51"
SCAN_DIR="/tmp/nmap_cve_$(date +%Y%m%d_%H%M%S)"
RAW_OUTPUT="$SCAN_DIR/raw_output.txt"
CVE_REPORT="$SCAN_DIR/cve_report.txt"
CSV_FILE="$SCAN_DIR/cve_report.csv"
MAX_CVES=5

# Verificar dependencias
for cmd in nmap grep curl jq; do
    if ! command -v "$cmd" &> /dev/null; then
        echo "❌ Error: '$cmd' no está instalado. Instálalo antes de ejecutar." >&2
        exit 1
    fi
done

mkdir -p "$SCAN_DIR"

echo "🔍 Iniciando escaneo nmap en $TARGET..."
sudo nmap  -Pn -sV --script=vuln -p 80,443,8080,8443,3306 -oN "$RAW_OUTPUT" "$TARGET" 2>&1 | tee "$SCAN_DIR/scan.log" || {
    echo "❌ El escaneo falló. Verifica permisos (sudo) o conectividad." >&2
    exit 1
}

echo "📥 Extrayendo CVEs detectados..."
grep -iE 'CVE-[0-9]{4}-[0-9]{4,}' "$RAW_OUTPUT" > "$CVE_REPORT" || true

if [ ! -s "$CVE_REPORT" ]; then
    echo "✅ No se encontraron CVEs en el escaneo."
    exit 0
fi

TOTAL_FOUND=$(wc -l < "$CVE_REPORT")
head -n "$MAX_CVES" "$CVE_REPORT" > "$SCAN_DIR/limited_cves.txt"

# Inicializar CSV con encabezado
echo "CVE_ID,SEVERITY,CVSS_SCORE,LINK" > "$CSV_FILE"

echo -e "\n📋 === REPORTE DE CVEs PARA $TARGET (Mostrando máx. $MAX_CVES de $TOTAL_FOUND encontrados) ===\n"

while IFS= read -r line; do
    cve_id=$(echo "$line" | grep -oE 'CVE-[0-9]{4}-[0-9]{4,}')
    [ -z "$cve_id" ] && continue

    echo "🔹 $cve_id"
    
    severity="N/A"
    cvss_score="N/A"
    link="https://nvd.nist.gov/vuln/detail/$cve_id"

    # Intentar obtener datos de NVD con reintentos (soluciona rate limit 429)
    for attempt in $(seq 1 3); do
        json=$(curl -sf --max-time 8 "https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=$cve_id" || true)
        
        if [ -n "$json" ] && echo "$json" | jq -e '.vulnerabilities[0]' > /dev/null 2>&1; then
            # Prioridad: CVSS v3.1 → v3.0 → v2.0
            severity=$(echo "$json" | jq -r '.vulnerabilities[0].cve.metrics.cvssMetricV31[0].cvssData.baseSeverity // empty' 2>/dev/null)
            cvss_score=$(echo "$json" | jq -r '.vulnerabilities[0].cve.metrics.cvssMetricV31[0].cvssData.baseScore // empty' 2>/dev/null)
            
            if [ -z "$severity" ]; then
                severity=$(echo "$json" | jq -r '.vulnerabilities[0].cve.metrics.cvssMetricV30[0].cvssData.baseSeverity // empty' 2>/dev/null)
                cvss_score=$(echo "$json" | jq -r '.vulnerabilities[0].cve.metrics.cvssMetricV30[0].cvssData.baseScore // empty' 2>/dev/null)
            fi
            
            if [ -z "$severity" ]; then
                severity=$(echo "$json" | jq -r '.vulnerabilities[0].cve.metrics.cvssMetricV20[0].cvssData.baseSeverity // empty' 2>/dev/null)
                cvss_score=$(echo "$json" | jq -r '.vulnerabilities[0].cve.metrics.cvssMetricV20[0].cvssData.baseScore // empty' 2>/dev/null)
            fi

            [ -z "$severity" ] && severity="N/A"
            [ -z "$cvss_score" ] && cvss_score="N/A"
            
            echo "
