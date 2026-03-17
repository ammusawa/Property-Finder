# Property Finder Nigeria - MVP

A contemporary, responsive real estate application with a uniquely Nigerian vibe. Users can search, view, and request residential and commercial properties for sale and rent/lease in Nigeria's most populated urban areas.

## Features

- ✅ User authentication (Email/Password + Google OAuth)
- ✅ Property search with advanced Nigerian filters (state, city, price in ₦, bedrooms, property type)
- ✅ Property listing and detail pages
- ✅ Image gallery support
- ✅ Leaflet/OpenStreetMap integration
- ✅ Favorites/saved properties functionality
- ✅ Admin panel for property management
- ✅ Mobile-responsive design optimized for 3G/4G networks
- ✅ MySQL database with direct queries (no ORM)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: MySQL with mysql2
- **Authentication**: NextAuth.js v5
- **Maps**: Leaflet + OpenStreetMap
- **Image Hosting**: Cloudinary (optional for MVP)

## Prerequisites

- Node.js 18+ installed
- MySQL 8.0+ installed and running
- npm or yarn package manager

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd property-finder
npm install
```

### 2. Database Setup

1. Create a MySQL database:

```sql
CREATE DATABASE property_finder;
```

2. Run the database setup script:

```bash
mysql -u root -p property_finder < lib/db-setup.sql
```

Or import it manually using your MySQL client (phpMyAdmin, MySQL Workbench, etc.)

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=property_finder

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
# Generate a secret: openssl rand -base64 32

# Google OAuth (Optional but recommended)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Cloudinary Configuration (Optional for MVP - can use direct image URLs)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

**To get Google OAuth credentials:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

### 4. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Default Admin Account

After running the database setup, a default admin account is created:

- **Email**: admin@propertyfinder.ng
- **Password**: admin123 (⚠️ **CHANGE THIS IN PRODUCTION!**)

You can change the admin password by updating the hash in `lib/db-setup.sql` before running it, or manually update it in the database after setup.

## Project Structure

```
property-finder/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── properties/   # Property CRUD endpoints
│   │   └── favorites/    # Favorites endpoints
│   ├── auth/             # Authentication pages
│   ├── properties/       # Property pages
│   ├── admin/            # Admin panel
│   └── favorites/        # Favorites page
├── components/           # React components
├── lib/                  # Utility functions and database
│   ├── db.ts            # MySQL connection pool
│   ├── db-setup.sql     # Database schema
│   ├── auth.ts          # NextAuth configuration
│   └── utils.ts         # Helper functions
├── types/               # TypeScript type definitions
└── public/              # Static assets
```

## API Endpoints

### Properties
- `GET /api/properties` - List properties with filters
- `GET /api/properties/[id]` - Get single property
- `POST /api/properties` - Create property (admin)
- `PUT /api/properties/[id]` - Update property (admin)
- `DELETE /api/properties/[id]` - Delete property (admin)

### Favorites
- `GET /api/favorites` - Get user favorites
- `POST /api/favorites` - Add to favorites
- `DELETE /api/favorites?propertyId=xxx` - Remove from favorites
- `GET /api/favorites/check?propertyId=xxx` - Check if favorited

### Authentication
- `POST /api/auth/register` - Register new user
- NextAuth handles all other auth routes automatically

## Adding Properties

1. Sign in as admin
2. Go to `/admin`
3. Click "Add New Property"
4. Fill in the form (images can be added as URLs)
5. Save

## Nigerian Features

- Nigerian states and cities
- Naira (₦) currency formatting
- Local property terminology support
- Nigerian location data structure
- Optimized for Nigerian network conditions

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production

Make sure to set all environment variables in your hosting platform:
- Database connection (use connection pooling service if needed)
- NextAuth secret
- OAuth credentials
- Cloudinary credentials (if using)

## Future Enhancements (Not in MVP)

- Agent/owner self-listing
- Payment processing
- Instant chat
- Call masking
- Property verification badges
- Native mobile apps
- Multiple language support

## License

MIT

## Support

For issues or questions, please create an issue in the repository.
