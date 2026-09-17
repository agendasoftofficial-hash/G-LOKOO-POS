# G-LOKOO POS — Barcode Scanning 2.0

Implemented barcode support for products and checkout.

## Features
- Product add/edit form has a Barcode field.
- USB/Bluetooth barcode scanners work as keyboard input.
- Camera barcode scanning is available from the Product form and New Sale.
- New Sale accepts barcode or SKU followed by Enter and adds the matching product to the cart.
- Product search includes barcode and SKU.
- Products table displays barcode values.
- Existing Supabase `products.barcode` column is reused; no new table is required.
- Barcode values are normalized by removing whitespace before saving.

## Deploy
From the project folder on Windows:

```cmd
npm install
npm run build
vercel --prod
```

Do not commit `.env.local` or expose `SUPABASE_SERVICE_ROLE_KEY`.
