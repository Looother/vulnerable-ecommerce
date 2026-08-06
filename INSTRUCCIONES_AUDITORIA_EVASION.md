# Guía de Auditoría de Base de Datos y Técnicas de Evasión de Bitácoras

Esta guía documenta la configuración del sistema de auditoría en la tabla `system_audit_logs` de MariaDB y proporciona las instrucciones paso a paso para ejecutar las consultas de investigación forense y las técnicas de evasión/remoción de evidencias.

---

## 📋 Requisitos Previos e Infraestructura

La base de datos `ecommerce` en el contenedor `db-server` contiene la tabla de auditoría `system_audit_logs` con la siguiente estructura:

```sql
CREATE TABLE IF NOT EXISTS system_audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  user VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  action VARCHAR(255) NOT NULL,
  query TEXT
);
```

> **Auditoría Automática en Puerto 3306:**
> Cada conexión entrante a través del puerto 3306 registra automáticamente un evento mediante la directiva global `init_connect` de MariaDB:
> ```sql
> SET GLOBAL init_connect = 'INSERT INTO ecommerce.system_audit_logs (user, ip_address, action, query) VALUES (USER(), SUBSTRING_INDEX(USER(), "@", -1), "DB_CONNECT_3306", "Direct connection established via MariaDB port 3306");';
> ```

---

## 🔍 Fase 1: Búsqueda Exhaustiva de Registros Lógicos en Bitácoras Internas

### 1.1 Estado Actual de la Tabla de Auditoría
Muestra la cantidad total de eventos registrados y las métricas internas del motor InnoDB.

```sql
SELECT COUNT(*) AS total_registros FROM system_audit_logs;
SHOW TABLE STATUS LIKE 'system_audit_logs';
```

---

### 1.2 Muestra Temporal y Distribución por Usuario / IP Cliente
Agrupa y contabiliza las actividades discriminando por fecha, nombre de usuario e IP de origen.

```sql
SELECT 
    DATE(timestamp) AS fecha, 
    user, 
    ip_address AS client_ip, 
    COUNT(*) AS eventos 
FROM system_audit_logs 
GROUP BY fecha, user, client_ip 
ORDER BY fecha DESC;
```

---

### 1.3 Detección de Patrones Críticos Previos al Ataque
Identifica acciones administrativas de alto riesgo (`DROP DATABASE`, `ALTER USER`, `GRANT ALL PRIVILEGES`) o consultas que intentaron extraer credenciales o tokens.

```sql
SELECT * 
FROM system_audit_logs 
WHERE action IN ('DROP DATABASE', 'ALTER USER', 'GRANT ALL PRIVILEGES') 
   OR query REGEXP '(?i)(password|secret|token|key)' 
LIMIT 20;
```

---

### 1.4 Identificación de Huecos en Auto-Increment (Firma de Borrado Previo)
Detecta discontinuidades en los IDs secuenciales utilizando la función de ventana `LAG()`, lo cual evidencia la eliminación selectiva de registros por parte de un atacante.

```sql
SELECT 
    id, 
    LAG(id) OVER(ORDER BY id) AS prev_id, 
    id - LAG(id) OVER(ORDER BY id) AS salto 
FROM system_audit_logs 
WHERE id >= 1;
```

---

## 🕵️‍♂️ Fase 2: Ejecución de Técnicas de Evasión y Remoción de Evidencias Lógicas

A continuación se detallan los comandos SQL utilizados para alterar bitácoras y eliminar evidencias, junto con su impacto técnico:

| Técnica | Comando SQL | Descripción / Resultado Esperado |
|---|---|---|
| **Borrado por IP cliente + ventana temporal** | `DELETE FROM system_audit_logs WHERE ip_address='198.51.100.23' AND timestamp BETWEEN '2024-06-01 00:00:00' AND '2024-06-07 23:59:59';` | Elimina únicamente los registros asociados a la sesión e IP del atacante dentro del rango de fechas del incidente. |
| **Sobreescritura de payload sensible** | `UPDATE system_audit_logs SET query='SELECT * FROM users;' WHERE id=1492;` | Oculta la inyección SQL o filtro malicioso original (`WHERE password LIKE '%admin%'`) reemplazándolo por una consulta legítima. |
| **Borrado por rango secuencial (IDs conocidos)** | `DELETE FROM system_audit_logs WHERE id BETWEEN 1488 AND 1502;` | Limpieza precisa de una secuencia específica de comandos sin afectar a otros usuarios. |
| **Truncamiento condicional (DDL)** | `TRUNCATE TABLE system_audit_logs;` | Vacía la tabla por completo, ignora triggers de borrado fila por fila y reinicia el contador `AUTO_INCREMENT` a 1. |
| **Compresión de índices y liberación de espacio** | `OPTIMIZE TABLE system_audit_logs;` | Reorganiza el almacenamiento físico de InnoDB, defragmenta el espacio en disco y borra residuos liberados por los `DELETE`. |

---

## 💻 Instrucciones de Ejecución mediante Docker Terminal

### Opción A: Ejecutar todas las consultas en un solo comando

```bash
docker exec -it db-server mariadb -u root -pSuperSecureRootPassword123! ecommerce -e "
SELECT '=== 1.1 Estado Actual ===' AS Encabezado;
SELECT COUNT(*) AS total_registros FROM system_audit_logs;
SHOW TABLE STATUS LIKE 'system_audit_logs';

SELECT '=== 1.2 Distribución Temporal ===' AS Encabezado;
SELECT DATE(timestamp) AS fecha, user, ip_address AS client_ip, COUNT(*) AS eventos FROM system_audit_logs GROUP BY fecha, user, client_ip ORDER BY fecha DESC;

SELECT '=== 1.3 Patrones Críticos ===' AS Encabezado;
SELECT * FROM system_audit_logs WHERE action IN ('DROP DATABASE', 'ALTER USER', 'GRANT ALL PRIVILEGES') OR query REGEXP '(?i)(password|secret|token|key)' LIMIT 20;

SELECT '=== 1.4 Detectar Huecos (Saltos en ID) ===' AS Encabezado;
SELECT id, LAG(id) OVER(ORDER BY id) AS prev_id, id - LAG(id) OVER(ORDER BY id) AS salto FROM system_audit_logs WHERE id >= 1;
"
```

### Opción B: Entrar al Shell Interactivo de MariaDB

1. Conectarse a la base de datos MariaDB:
   ```bash
   docker exec -it db-server mariadb -u root -pSuperSecureRootPassword123! ecommerce
   ```

2. Ejecutar cualquiera de las consultas SQL enumeradas arriba directamente en la consola interactiva `MariaDB [ecommerce]>`.
