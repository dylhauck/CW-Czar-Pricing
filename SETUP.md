# Setup Guide (GitHub Desktop + CLI)

## A) GitHub Desktop (recommended)
1. Clone the repo: **File → Clone repository… → URL** and paste  
   `https://github.com/dylhauck/CW-Czar-Pricing.git`
2. Click **Show in Explorer** to open your local repo folder.
3. Copy these folders/files into that folder (from this zip):  
   `docs/`, `themed_build/`, `.github/`, `LICENSE`, `README.md`, `SETUP.md`
4. Back in Desktop → you’ll see **Changes** → Commit message: `Add project files` → **Commit to main** → **Push origin**.
5. On GitHub: **Settings → Pages** → Source: `main` / Folder: `/docs` → **Save**.

## B) Command line
```bash
cd /path/to/your/local/clone/CW-Czar-Pricing
# Copy project files here first (docs/, themed_build/, .github/, LICENSE, README.md, SETUP.md)
git add .
git commit -m "Add project files"
git push
```
Then enable Pages as above.
