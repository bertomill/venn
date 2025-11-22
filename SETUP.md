# Venn Setup Guide

Complete setup instructions for getting your Venn community platform running.

## Prerequisites

- Node.js 20.x or later
- npm or yarn
- A Supabase account (free tier: https://supabase.com)
- For mobile: iOS Simulator (Mac) or Android Emulator, or Expo Go app on your phone

## Step-by-Step Setup

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install mobile app dependencies
cd apps/mobile
npm install

# Install web app dependencies
cd ../web
npm install

# Return to root
cd ../..
```

### 2. Set Up Supabase

#### Create a New Supabase Project

1. Go to https://supabase.com
2. Click "Start your project" or "New project"
3. Choose an organization (or create one)
4. Fill in project details:
   - Project name: `venn` (or any name you prefer)
   - Database password: Choose a strong password
   - Region: Choose closest to you
   - Pricing plan: Free tier is perfect to start

#### Get Your API Credentials

1. Once your project is created, go to **Project Settings** (gear icon in sidebar)
2. Navigate to **API** section
3. You'll need two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Mobile (same values)
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Set Up the Database Schema

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New query**
4. Open the file `supabase/schema.sql` from this project
5. Copy all the contents and paste into the SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)

You should see a success message. This creates:
- All database tables (profiles, events, interests, communities, etc.)
- Row Level Security policies for data protection
- Helpful functions for location-based searches
- Pre-populated interests data

### 5. Verify Database Setup

In Supabase:
1. Click **Table Editor** in the sidebar
2. You should see all the tables listed: profiles, events, interests, etc.
3. Click on **interests** table - it should have 20+ pre-populated interests

### 6. Run the Applications

#### Web App

```bash
# From root directory
npm run web

# Or manually:
cd apps/web
npm run dev
```

Visit http://localhost:3000

You should see the Venn landing page!

#### Mobile App

```bash
# From root directory
npm run mobile

# Or manually:
cd apps/mobile
npm start
```

This will open Expo DevTools in your browser. You can:

- Press `i` to open in iOS Simulator (Mac only)
- Press `a` to open in Android Emulator
- Scan QR code with **Expo Go** app on your phone
  - iOS: Download Expo Go from App Store
  - Android: Download Expo Go from Play Store

## Testing the App

### 1. Create an Account

**Web:**
1. Go to http://localhost:3000
2. Click "Sign up" or "Get Started"
3. Fill in your details (use a real email for email verification)
4. Complete onboarding (location, bio, interests)

**Mobile:**
1. Open the app
2. Tap "Get Started"
3. Fill in signup form
4. Complete onboarding

### 2. Test Key Features

- **Profile**: View and update your profile
- **Interests**: Select at least 3 interests during onboarding
- **Events**: Currently shows empty state (ready for you to add event creation)
- **Communities**: Navigation ready (feature to be built)
- **Discovery**: Tab created (ready for matching logic)

## Troubleshooting

### Common Issues

**"Invalid JWT" or authentication errors:**
- Double-check your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env`
- Make sure you're using the **anon public** key, not the service role key
- Restart your dev server after changing .env files

**Database errors:**
- Make sure you ran the entire `supabase/schema.sql` file
- Check the SQL Editor in Supabase for any error messages
- Verify all tables were created in Table Editor

**Mobile app won't start:**
- Make sure you installed dependencies in `apps/mobile`
- Clear Metro bundler cache: `npx expo start --clear`
- Check that you have Expo Go installed on your phone

**"Unsupported engine" warnings:**
- These are just warnings about your Node version
- They won't affect functionality for development

### Reset Database

If you need to start fresh:

1. Go to Supabase Dashboard → SQL Editor
2. Run this to drop all tables:

```sql
DROP TABLE IF EXISTS connections CASCADE;
DROP TABLE IF EXISTS community_members CASCADE;
DROP TABLE IF EXISTS communities CASCADE;
DROP TABLE IF EXISTS event_attendees CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS user_interests CASCADE;
DROP TABLE IF EXISTS interests CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
```

3. Re-run the full `supabase/schema.sql` file

## Next Steps

Now that your app is running, you can:

1. **Add event creation**: Build the UI to create and manage events
2. **Implement discovery**: Add matching algorithm based on shared interests
3. **Build communities**: Create and manage community features
4. **Add real-time chat**: Use Supabase Realtime for messaging
5. **Image uploads**: Use Supabase Storage for profile pictures and event images
6. **Push notifications**: Set up Expo notifications for event reminders
7. **Deploy**: Deploy web app to Vercel, publish mobile app to stores

## Resources

- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Expo Docs**: https://docs.expo.dev
- **React Navigation**: https://reactnavigation.org

## Need Help?

Check the main README.md for project structure and architecture details.

Happy coding! 🎉
