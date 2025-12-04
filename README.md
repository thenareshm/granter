# Granter

Vite + React + TypeScript + Tailwind + Firebase app for managing grant "recipes" and generating structured outputs with OpenAI or Gemini using user-provided API keys.

## Features
- Sidebar layout with Dashboard, Grant Recipes, and API Keys pages.
- Grant recipes stored per user in Firestore (`users/{uid}/recipes/{recipeId}`).
- Create/edit recipes with prompt, input parameters, output fields, project context, and model selector (Gemini Flash/Pro or OpenAI GPT 5.1).
- Structured Output card that maps generated text to output field labels; copy-to-clipboard per field.
- Recipe locking after successful generation (Clone creates an unlocked copy).
- Per-user API keys stored in Firestore (`users/{uid}/settings/apiKeys`).
- Light/dark theme toggle in the header with persisted preference.

## Tech Stack
- Vite, React, TypeScript
- Tailwind CSS (dark mode via `class`)
- Firebase Auth (Google), Firestore
- OpenAI Responses API / Gemini Generative Language API (user brings their own keys)

## Setup
1) Install deps
```bash
npm install
```

2) Environment
Create `.env.local` with your Firebase project values:
```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

API keys are entered in-app (Settings → API Keys) and saved per user in Firestore; not stored in env.

3) Run dev server
```bash
npm run dev
```

## Usage Notes
- Sign in with Google (header) to sync recipes and save API keys.
- Add OpenAI/Gemini API keys in **API Keys** page (stored under your user doc).
- Create a recipe, add output fields, pick a model, then **Generate**. Structured output appears below; recipe locks after first success. Use **Clone** to edit a copy.
- Theme toggle (sun/moon) in header; preference is persisted.

## Firestore Rules (for console)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/recipes/{recipeId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/settings/{settingsDoc} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Scripts
- `npm run dev` – start dev server
- `npm run build` – type-check and build
- `npm run preview` – preview production build
- `npm run lint` – run ESLint

