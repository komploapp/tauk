@AGENTS.md

# Tauk — React Native App

Expo SDK ~57, React Native 0.86, TypeScript strict.

## Stack

- **Navigation**: Expo Router (file-based, `app/` directory)
- **Backend**: Supabase (`lib/supabase.ts`) — configure via `.env` (see `.env.example`)
- **State**: Zustand (`store/index.ts`)
- **Fonts**: Grandstander + Poppins (loaded in `app/_layout.tsx`)
- **SVG**: react-native-svg + react-native-svg-transformer (configured in `metro.config.js`)
- **Animations**: react-native-reanimated 4

## Path alias

`@/` maps to the project root.

## Assets

SVG character and illustration assets live in `../Asset/` (sibling of this folder).
Copy or reference them from `assets/` once icons and splash are finalized.
