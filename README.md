# Shipment Mail Extractor

A **frontend-only** web application that connects to Microsoft Outlook via the browser, extracts shipment details from emails sent by a configured sender, and stores structured shipment records locally in IndexedDB.

Everything runs in the browser — no backend server, no database server, no client secret.

## Features

- Microsoft OAuth sign-in with MSAL Browser (PKCE)
- Direct Microsoft Graph API calls from the browser
- Deterministic shipment extraction (Shipment From + Shipment Date)
- IndexedDB persistence via Dexie.js
- Duplicate prevention using Outlook message IDs
- Manual sync with delta query support
- CSV export
- Professional logistics-style dashboard

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui components
- @azure/msal-browser + @azure/msal-react
- Microsoft Graph API
- Dexie.js (IndexedDB)
- React Query
- Lucide React

## Requirements

- **Node.js** 20 or later
- A Microsoft Entra (Azure AD) app registration
- An Outlook mailbox with shipment notification emails

## Project Setup

```bash
# Clone or download the project
cd shipment-mail-extractor

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_MICROSOFT_CLIENT_ID=your-client-id-here
VITE_MICROSOFT_AUTHORITY=consumers
```

| Variable | Description |
|----------|-------------|
| `VITE_MICROSOFT_CLIENT_ID` | Application (client) ID from Microsoft Entra |
| `VITE_MICROSOFT_AUTHORITY` | Sign-in audience — must match your Entra app registration (see below) |

**Authority values** (must match your Entra app's supported account types):

| Value | Entra registration | Endpoint |
|-------|-------------------|----------|
| `common` | Accounts in any org directory **and** personal Microsoft accounts | `/common` |
| `consumers` | Personal Microsoft accounts only | `/consumers` |
| `organizations` | Work/school accounts only | `/organizations` |
| `{tenant-id}` | Single tenant | `/your-tenant-id` |

**Important:** Only the Client ID is required. Never add a client secret to this application.

## Microsoft Entra App Registration

### 1. Create the app

1. Go to [Microsoft Entra admin center](https://entra.microsoft.com/)
2. Navigate to **Identity** → **Applications** → **App registrations**
3. Click **New registration**
4. Name: `Shipment Mail Extractor`
5. Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
6. Click **Register**

### 2. Configure SPA platform

1. Open your app registration
2. Go to **Authentication**
3. Click **Add a platform** → **Single-page application**
4. Add redirect URIs:
   - Development: `http://localhost:5173`
   - Production: `https://your-domain.com`
5. Save

### 3. API permissions

1. Go to **API permissions**
2. Click **Add a permission** → **Microsoft Graph** → **Delegated permissions**
3. Add:
   - `User.Read`
   - `Mail.Read`
   - `offline_access`
4. Click **Grant admin consent** (if required by your tenant)

### 4. Do NOT create a client secret

This is a public SPA. Client secrets must never be used in browser applications.

### 5. Copy the Client ID

From the app **Overview** page, copy the **Application (client) ID** into your `.env` file:

```env
VITE_MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

## Local Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

1. Click **Connect Outlook**
2. Sign in with your Microsoft account
3. Approve **Mail.Read** permission
4. Go to **Settings** and configure the shipment sender email
5. Go to **Outlook** and click **Sync Emails**

## Production Build

```bash
npm run build
```

Output is in the `dist/` folder — deploy as a static site.

```bash
npm run preview
```

## Deployment

### Vercel

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Set environment variable: `VITE_MICROSOFT_CLIENT_ID`
4. Deploy
5. Add your production URL as a redirect URI in Microsoft Entra

A `vercel.json` is included for SPA routing.

### Netlify

1. Build command: `npm run build`
2. Publish directory: `dist`
3. Set `VITE_MICROSOFT_CLIENT_ID` in Netlify environment variables
4. A `public/_redirects` file handles SPA routing

### Cloudflare Pages

1. Build command: `npm run build`
2. Output directory: `dist`
3. Set `VITE_MICROSOFT_CLIENT_ID`
4. Add production redirect URI to Microsoft Entra

### GitHub Pages

For GitHub Pages with a subpath, update `vite.config.ts` with `base: '/your-repo-name/'` and add the corresponding redirect URI.

## How It Works

```
Microsoft Login (MSAL Browser)
        ↓
Microsoft Graph API
        ↓
Outlook Inbox (filtered by sender)
        ↓
Local HTML/text parser
        ↓
Shipment From + Shipment Date
        ↓
IndexedDB (Dexie)
        ↓
Dashboard
```

### What is stored locally

- Outlook message ID
- Sender email
- Email subject
- Received timestamp
- Extracted Shipment From
- Extracted Shipment Date
- Extraction status and confidence
- Configuration and sync state

### What is NOT stored

- Full email body
- Email attachments
- Access tokens (MSAL manages its own cache)
- Refresh tokens in IndexedDB

## IndexedDB Schema

Database: `ShipmentMailExtractorDB`

| Store | Purpose |
|-------|---------|
| `shipments` | Extracted shipment records (unique on `outlookMessageId`) |
| `configuration` | Sender email and extraction label settings |
| `syncState` | Delta link and last sync statistics |

## Troubleshooting OAuth

### `invalid_request` / `userAudience` / `/common/` endpoint

This error means your Entra app audience does not match the sign-in endpoint.

**Option A (quick fix):** If your app is registered for **Personal Microsoft accounts only**, add to `.env`:

```env
VITE_MICROSOFT_AUTHORITY=consumers
```

Restart the dev server after changing `.env`.

**Option B:** In Microsoft Entra, open your app → **Authentication** → change supported account types to **"Accounts in any organizational directory and personal Microsoft accounts"**, then use:

```env
VITE_MICROSOFT_AUTHORITY=common
```

### Redirect URI mismatch

Ensure the exact URL (including port) is registered in Microsoft Entra under **SPA** redirect URIs.

### AADSTS50011

The redirect URI in the login request does not match any configured URI. Add `http://localhost:5173` for local development.

### User denies Mail.Read

The user must approve mail read permission. Disconnect and reconnect Outlook.

### Silent token acquisition fails

The app will prompt for interactive login. This is normal after token expiry.

### No emails found

1. Verify the sender email in Settings matches exactly (case-insensitive)
2. Check that emails exist in the Inbox folder
3. Confirm the subject filter is not too restrictive

## Data Privacy

- All email processing happens locally in your browser
- No data is sent to any third-party server
- No AI APIs are used
- Shipment records remain on your device in IndexedDB
- Clearing browser data will remove local records

## License

MIT
