# Venn - Community Connection Platform

Connect with people who share your interests, values, and passions. Find wellness events, build communities, and make meaningful connections.

## Project Structure

```
venn/
├── apps/
│   ├── mobile/          # React Native (Expo) mobile app
│   └── web/             # Next.js web application
├── packages/
│   └── shared/          # Shared types and utilities
└── supabase/            # Database schema and migrations
```

## Features

- **Interest-based Matching**: Connect with people who share your hobbies and values
- **Event Discovery**: Find and create wellness events, workshops, and gatherings
- **Community Building**: Create and join communities around shared interests
- **Location-based Search**: Discover nearby events and people
- **Real-time Connections**: Chat and connect with community members

## Tech Stack

### Frontend
- **Mobile**: React Native with Expo
- **Web**: Next.js 15 with TypeScript
- **Styling**: TailwindCSS
- **State Management**: React Context + Hooks

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime

## Getting Started

### Prerequisites

- Node.js 20.x or later
- npm or yarn
- Supabase account (free tier available at https://supabase.com)

### 1. Clone and Install

```bash
# Install root dependencies
npm install

# Install mobile dependencies
cd apps/mobile && npm install

# Install web dependencies
cd apps/web && npm install
```

### 2. Set up Supabase

1. Create a new project at https://supabase.com
2. Go to Project Settings > API to get your credentials
3. Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

4. Run the database schema:
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Copy the contents of `supabase/schema.sql`
   - Paste and run it in the SQL Editor

### 3. Run the Applications

**Web App:**
```bash
npm run web
# or
cd apps/web && npm run dev
```
Visit http://localhost:3000

**Mobile App:**
```bash
npm run mobile
# or
cd apps/mobile && npm start
```
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your phone

## Database Schema

### Core Tables

- **profiles**: User profiles with location data
- **interests**: Available interest categories
- **user_interests**: User's selected interests (many-to-many)
- **events**: Community events and gatherings
- **event_attendees**: Event RSVPs
- **communities**: User-created communities
- **community_members**: Community membership
- **connections**: Friend/connection requests

### Key Features

- **Row Level Security (RLS)**: All tables have RLS policies for data security
- **Location Search**: PostGIS-based functions for finding nearby users and events
- **Real-time Updates**: Automatic timestamp tracking
- **Geographic Queries**: Haversine formula for distance calculations

## Development Roadmap

- [x] Project setup and structure
- [x] Database schema design
- [x] Basic web and mobile apps
- [ ] Authentication flow (signup/login)
- [ ] User profile and onboarding
- [ ] Interest selection
- [ ] Event discovery and creation
- [ ] Community features
- [ ] Real-time messaging
- [ ] Push notifications
- [ ] Image uploads
- [ ] Search and filtering

## Contributing

This is a personal project but suggestions are welcome!

## License

MIT
