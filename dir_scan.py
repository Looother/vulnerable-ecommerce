#!/usr/bin/env python3
import requests
import argparse

# Common paths/files to check during web reconnaissance
COMMON_PATHS = [
    ".env", "config", "config.php", "config.yml", "config.json",
    "settings.py", "database.yml", ".git/config", ".svn/entries",
    "wp-config.php", "robots.txt", "sitemap.xml", "api/v1/",
    "admin/", "login", "phpinfo.php", "server-status",
    "backup.sql", "dump.sql", "db.sql", "config.ini",
    ".htaccess", ".htpasswd", "web.config", "package.json"
]

def check_paths(target_url, paths, timeout=5):
    session = requests.Session()
    # Mimic a real browser to avoid basic bot blocking
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    })

    print(f"[*] Starting scan on {target_url}")
    print("-" * 70)

    found_results = []

    for path in paths:
        # Clean URL construction
        url = target_url.rstrip('/') + '/' + path.lstrip('/')
        try:
            response = session.get(url, timeout=timeout, allow_redirects=True)
            
            # 🔍 Only collect files that return HTTP 200 (OK)
            if response.status_code == 200:
                print(f"[+] {response.status_code} | {url} | Length: {len(response.content)}")
                found_results.append({
                    'status': response.status_code,
                    'url': url,
                    'length': len(response.content)
                })
            else:
                # Show other responses for context (optional)
                print(f"[-] {response.status_code} | {url}")

        except requests.exceptions.Timeout:
            print(f"[!] Timeout accessing {url}")
        except requests.exceptions.ConnectionError as e:
            print(f"[!] Connection error for {url}: {e}")
        except Exception as e:
            print(f"[!] Unexpected error for {url}: {e}")

    print("-" * 70)
    
    # 📦 Final Output: List of files that returned HTTP 200
    if found_results:
        print("\n[+] === FILES WITH HTTP 200 RESPONSE ===")
        for item in found_results:
            print(f"  • [{item['status']}] {item['url']} (Size: {item['length']} bytes)")
        print(f"\n[*] Total files with 200 status: {len(found_results)}")
    else:
        print("\n[-] No common files/directories returned HTTP 200.")

def main():
    parser = argparse.ArgumentParser(
        description="Check common web server paths/files (HTTP 200 only)",
        formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument("target", help="Target URL (e.g., http://52.247.225.51/)")
    parser.add_argument("--timeout", type=int, default=5, 
                        help="Request timeout in seconds (default: 5)")
    args = parser.parse_args()

    # Ensure target ends with /
    if not args.target.endswith('/'):
        args.target += '/'

    check_paths(args.target, COMMON_PATHS, args.timeout)

if __name__ == "__main__":
    main()
