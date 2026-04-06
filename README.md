# Google Maps Hardware Shops Scraper (JavaScript + Playwright)

Yeh project **JavaScript** + **Playwright** use karta hai aur Google Maps se hardware shop details collect karta hai:
- shop name
- address
- phone number
- rating
- website

Output:
1. Nested array JSON
2. CSV file
3. Optional Google Sheet update

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

## Run
```bash
node scraper_google_maps.js --max-shops 50
```

Custom cities:
```bash
node scraper_google_maps.js --cities Vadodara Ahmedabad Surat Rajkot --max-shops 40
```

## Google Sheets me data bhejna
1. Google Cloud me service account banaiye.
2. Credentials JSON download kariye.
3. Sheet ko service account email ke saath share kariye (Editor access).
4. Command run kariye:

```bash
node scraper_google_maps.js \
  --cities Vadodara Ahmedabad Surat Rajkot \
  --max-shops 40 \
  --sheet-id YOUR_SPREADSHEET_ID \
  --service-account-json /path/to/service_account.json \
  --worksheet-name Hardware_Shops
```

## Nested array structure
Script nested array format me data store karta hai:
```json
[
  [
    "Vadodara",
    [
      {
        "shop_name": "...",
        "address": "...",
        "phone_number": "...",
        "rating": "...",
        "website": "..."
      }
    ]
  ],
  ["Ahmedabad", [ ... ]]
]
```

## Notes
- Google Maps UI frequently badalti rehti hai, isliye selectors future me update karne pad sakte hain.
- Bahut zyada aggressive scraping karne se request block ho sakti hai.
- Data usage ke liye Google ke terms follow karein.
