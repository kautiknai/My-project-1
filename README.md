# Google Maps Hardware Shops Scraper (JavaScript + Playwright)

Yeh project **JavaScript** + **Playwright** use karta hai aur Google Maps se hardware shop details collect karta hai:
- shop name
- address
- phone number
- rating
- website

Output (dono mandatory):
1. CSV file
2. Google Sheet update
3. Nested array JSON backup

## Cities (default)
- Vadodara
- Ahmedabad
- Surat
- Rajkot

## Setup
```bash
npm install
npx playwright install chromium
```

## Run (all shops for all 4 cities)
> Note: `--sheet-id` aur `--service-account-json` required hai, tabhi run complete hoga.
> Note: Agar aap custom `--cities` do, tab bhi script Rajkot ko automatically include karega.

```bash
node scraper_google_maps.js \
  --sheet-id YOUR_SPREADSHEET_ID \
  --service-account-json /path/to/service_account.json
```

Agar limit chahiye tab:
```bash
node scraper_google_maps.js \
  --max-shops 40 \
  --sheet-id YOUR_SPREADSHEET_ID \
  --service-account-json /path/to/service_account.json
```

## Google Sheets me data bhejna
1. Google Cloud me service account banaiye.
2. Credentials JSON download kariye.
3. Sheet ko service account email ke saath share kariye (Editor access).
4. Command run kariye:

```bash
node scraper_google_maps.js \
  --max-shops 0 \
  --sheet-id YOUR_SPREADSHEET_ID \
  --service-account-json /path/to/service_account.json \
  --worksheet-name Hardware_Shops
```

## Nested array structure
Script nested array format me data store karta hai:
```json
[
  ["Vadodara", [{ "shop_name": "...", "address": "...", "phone_number": "...", "rating": "...", "website": "..." }]],
  ["Ahmedabad", [ ... ]],
  ["Surat", [ ... ]],
  ["Rajkot", [ ... ]]
]
```

## Notes
- `--max-shops 0` ka matlab hai: available list me jitni shops load ho sake utni sab scrape karo.
- Script har run me CSV aur Google Sheet dono me same rows bhejta hai.
- Google Maps UI frequently badalti rehti hai, isliye selectors future me update karne pad sakte hain.
- Data usage ke liye Google ke terms follow karein.
