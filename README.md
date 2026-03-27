<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/786d5f9e-6e20-4efa-b5c0-97a59af627e3

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Create `.env.local` from `.env.example`
3. Fill in these Firebase web app values from your Firebase project settings:
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`
4. Run the app:
   `npm run dev`

## Firebase

This app uses:

- Firebase Authentication for login, signup, and password reset
- Cloud Firestore for users, students, batches, and attendance data

Expected Firestore collections:

- `users`
- `students`
- `batches`
- `attendance`
- `securityLogs`

## Admin Setup

- First-time main admin registration is available at `/admin/register`
- Admin login is available at `/admin/login`
- Admin access is device-locked using a locally stored `deviceId`

Suggested Firestore rule snippet for admin documents:

```txt
match /users/{userId} {
  allow read, write: if request.auth != null
    && request.auth.uid == userId;
}
```
