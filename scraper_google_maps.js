#!/usr/bin/env node

const fs = require('fs');
const { chromium } = require('playwright');
const { google } = require('googleapis');

function cleanText(value) {
  if (!value) return '';
  return value.replace(/\s+/g, ' ').trim();
}

function parseArgs(argv) {
  const args = {
    cities: ['Vadodara', 'Ahmedabad', 'Surat', 'Rajkot'],
    maxShops: 30,
    outputCsv: 'hardware_shops.csv',
    outputJson: 'hardware_shops_nested.json',
    sheetId: '',
    serviceAccountJson: '',
    worksheetName: 'Hardware_Shops',
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      args.help = true;
      break;
    }

    if (arg === '--cities') {
      const values = [];
      let j = i + 1;
      while (j < argv.length && !argv[j].startsWith('--')) {
        values.push(argv[j]);
        j += 1;
      }
      if (values.length > 0) args.cities = values;
      i = j - 1;
    } else if (arg === '--max-shops' && argv[i + 1]) {
      args.maxShops = Number(argv[i + 1]);
      i += 1;
    } else if (arg === '--output-csv' && argv[i + 1]) {
      args.outputCsv = argv[i + 1];
      i += 1;
    } else if (arg === '--output-json' && argv[i + 1]) {
      args.outputJson = argv[i + 1];
      i += 1;
    } else if (arg === '--sheet-id' && argv[i + 1]) {
      args.sheetId = argv[i + 1];
      i += 1;
    } else if (arg === '--service-account-json' && argv[i + 1]) {
      args.serviceAccountJson = argv[i + 1];
      i += 1;
    } else if (arg === '--worksheet-name' && argv[i + 1]) {
      args.worksheetName = argv[i + 1];
      i += 1;
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage: node scraper_google_maps.js [options]

Options:
  --cities <city1 city2 ...>         City names list
  --max-shops <number>               Maximum shops per city (default: 30)
  --output-csv <path>                Output CSV file (default: hardware_shops.csv)
  --output-json <path>               Output JSON file (default: hardware_shops_nested.json)
  --sheet-id <spreadsheet_id>        Google Sheet ID
  --service-account-json <path>      Service account JSON file path
  --worksheet-name <name>            Worksheet name (default: Hardware_Shops)
  -h, --help                         Show help
`);
}

async function extractShopDetails(page) {
  await page.waitForTimeout(1200);

  const details = {
    shop_name: '',
    address: '',
    phone_number: '',
    rating: '',
    website: '',
  };

  const nameLocator = page.locator('h1.DUwDvf').first();
  if (await nameLocator.count()) {
    details.shop_name = cleanText(await nameLocator.innerText());
  }

  const addressLocator = page.locator('button[data-item-id="address"]').first();
  if (await addressLocator.count()) {
    details.address = cleanText(await addressLocator.innerText());
  }

  const phoneLocator = page.locator('button[data-item-id*="phone"]').first();
  if (await phoneLocator.count()) {
    details.phone_number = cleanText(await phoneLocator.innerText());
  }

  const ratingLocator = page.locator('div.F7nice span[aria-hidden="true"]').first();
  if (await ratingLocator.count()) {
    details.rating = cleanText(await ratingLocator.innerText());
  }

  const websiteLocator = page.locator('a[data-item-id="authority"]').first();
  if (await websiteLocator.count()) {
    details.website = cleanText((await websiteLocator.getAttribute('href')) || '');
  }

  return details;
}

async function collectCityShops(page, city, maxShops) {
  const searchQuery = `hardware shops in ${city}`;
  await page.goto('https://www.google.com/maps', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const searchBox = page.locator('input#searchboxinput');
  await searchBox.fill(searchQuery);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3500);

  const feed = page.locator('div[role="feed"]').first();
  if (!(await feed.count())) {
    return [];
  }

  let previousCount = 0;
  let stableRounds = 0;

  while (true) {
    const cardsCount = await page.locator('a.hfpxzc').count();

    if (cardsCount >= maxShops) break;

    if (cardsCount === previousCount) stableRounds += 1;
    else stableRounds = 0;

    if (stableRounds >= 5) break;

    previousCount = cardsCount;
    await feed.hover();
    await page.mouse.wheel(0, 5000);
    await page.waitForTimeout(1600);
  }

  const cards = page.locator('a.hfpxzc');
  const total = Math.min(await cards.count(), maxShops);
  const shops = [];

  for (let i = 0; i < total; i += 1) {
    const card = cards.nth(i);
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await card.click();
    await page.waitForTimeout(2000);

    const shop = await extractShopDetails(page);
    if (shop.shop_name) shops.push(shop);
  }

  return shops;
}

function escapeCsvValue(value) {
  const stringValue = String(value || '');
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function saveToCsv(nestedData, outputPath) {
  const header = ['city', 'shop_name', 'address', 'phone_number', 'rating', 'website'];
  const lines = [header.join(',')];

  for (const cityBlock of nestedData) {
    const cityName = cityBlock[0];
    const cityShops = cityBlock[1];

    for (const shop of cityShops) {
      lines.push([
        cityName,
        shop.shop_name,
        shop.address,
        shop.phone_number,
        shop.rating,
        shop.website,
      ].map(escapeCsvValue).join(','));
    }
  }

  fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf-8');
}

async function pushToGoogleSheets(nestedData, serviceAccountJson, spreadsheetId, worksheetName) {
  const credentialRaw = fs.readFileSync(serviceAccountJson, 'utf-8');
  const credentials = JSON.parse(credentialRaw);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const workbookMeta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheet = (workbookMeta.data.sheets || []).find(
    (sheet) => sheet.properties && sheet.properties.title === worksheetName,
  );

  if (!existingSheet) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: worksheetName } } }],
      },
    });
  } else {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${worksheetName}!A:Z`,
    });
  }

  const rows = [['city', 'shop_name', 'address', 'phone_number', 'rating', 'website']];

  for (const cityBlock of nestedData) {
    const cityName = cityBlock[0];
    const cityShops = cityBlock[1];

    for (const shop of cityShops) {
      rows.push([
        cityName,
        shop.shop_name || '',
        shop.address || '',
        shop.phone_number || '',
        shop.rating || '',
        shop.website || '',
      ]);
    }
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${worksheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: rows },
  });
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    return;
  }

  const nestedData = [];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });

  for (const city of args.cities) {
    console.log(`Collecting: ${city}`);
    const cityShops = await collectCityShops(page, city, args.maxShops);
    nestedData.push([city, cityShops]);
    await page.waitForTimeout(1000);
  }

  await browser.close();

  fs.writeFileSync(args.outputJson, JSON.stringify(nestedData, null, 2), 'utf-8');
  saveToCsv(nestedData, args.outputCsv);

  if (args.sheetId && args.serviceAccountJson) {
    await pushToGoogleSheets(
      nestedData,
      args.serviceAccountJson,
      args.sheetId,
      args.worksheetName,
    );
    console.log('Google Sheet updated successfully.');
  } else {
    console.log('Skipped Google Sheets push (sheet-id/service-account-json missing).');
  }

  console.log(`Done. JSON: ${args.outputJson}, CSV: ${args.outputCsv}`);
}

main();
