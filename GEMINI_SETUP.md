# How to Activate Google Gemini API

If you are seeing `404 Not Found` for models like `gemini-1.5-flash`, it usually means the **Generative Language API** is not enabled for your project, or the project lacks a billing account (if using a paid tier).

## Method 1: Google AI Studio (Easiest)
1.  Go to [Google AI Studio](https://aistudio.google.com/).
2.  Click usually on the **"Get API key"** button on the top left.
3.  Check which **Google Cloud Project** your key is associated with.
4.  Try to create a **NEW** API Key in a **NEW** Project.
    *   Sometimes old projects have legacy settings.
    *   A fresh project usually has everything enabled by default.
5.  Update your `.env` with the new key.

## Method 2: Google Cloud Console (Advanced)
If you want to fix your existing project:

1.  Go to [Google Cloud Console](https://console.cloud.google.com/).
2.  Select the project associated with your API Key from the top dropdown.
3.  In the search bar, type **"Generative Language API"**.
4.  Click on the result (usually "Generative Language API" by Google).
5.  Click **ENABLE**.
    *   *If it says "Manage", it is already enabled.*
6.  **Billing**: Search for **"Billing"** and ensure a valid billing account is linked to this project (required for some tiers/regions).

## Method 3: Region Check
If you are in **Europe (EU)** or **UK**:
*   Google sometimes requires a linked Billing Account even for the "Free of Charge" tier to verify identity due to regulations.
*   Ensure your project is linked to a billing account.

## Summary Checklist
- [ ] API Key is correct.
- [ ] Generative Language API is **ENABLED** in Cloud Console.
- [ ] Billing Account is **LINKED** (if in EU).
