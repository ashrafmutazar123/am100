# Welcome to AM100 Fertilizer Monitoring Dashboard!

A real-time hydroponic monitoring dashboard built with React, TypeScript, and Supabase integration.

## Features

- **Real-time EC Monitoring**: Live electrical conductivity tracking with customizable thresholds
- **Water Level Monitoring**: Tank level monitoring with mmH2O to percentage conversion
- **Live Data Updates**: Automatic refresh with Supabase real-time subscriptions
- **Persistent Settings**: EC thresholds and tank height saved to database
- **Professional UI**: Modern interface built with shadcn/ui and Tailwind CSS
- **Data Export**: CSV export functionality for historical data analysis

## Technologies Used

- React 18 with TypeScript
- Vite for build tooling
- Supabase for real-time database
- shadcn/ui for UI components
- Tailwind CSS for styling
- Recharts for data visualization

## Live Demo

Visit the deployed dashboard: [https://notmohdsaif.github.io/am100](https://notmohdsaif.github.io/am100)

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure Supabase credentials in `src/lib/supabase.ts`
4. Run development server: `npm run dev`
5. Build for production: `npm run build`
6. Deploy to GitHub Pages: `npm run deploy`
