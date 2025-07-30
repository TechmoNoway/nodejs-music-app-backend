# Music Streaming App Server

A comprehensive Node.js Express server built with TypeScript for a React Native music streaming application.

## Features

- **User Authentication**: JWT-based authentication with registration and login
- **Music Management**: Upload, organize, and stream music files
- **Artist & Album Management**: Create and manage artist profiles and albums
- **Playlist System**: Create, share, and collaborate on playlists
- **Favorites**: Personal music library management
- **File Uploads**: Support for audio files and cover images
- **Search & Filtering**: Advanced search across songs, artists, and albums
- **API Security**: Rate limiting, CORS, and security headers

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **Security**: Helmet, CORS, bcryptjs
- **Development**: Nodemon, TypeScript compiler

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/refresh` - Refresh JWT token

### Songs
- `GET /api/songs` - Get all songs (with pagination and filters)
- `GET /api/songs/:id` - Get song by ID
- `GET /api/songs/popular/top` - Get popular songs
- `GET /api/songs/latest/new` - Get latest songs
- `GET /api/songs/genre/:genre` - Get songs by genre

### Artists
- `GET /api/artists` - Get all artists
- `GET /api/artists/:id` - Get artist by ID with songs
- `POST /api/artists` - Create new artist (authenticated)
- `PUT /api/artists/:id` - Update artist (authenticated)
- `DELETE /api/artists/:id` - Delete artist (authenticated)

### Albums
- `GET /api/albums` - Get all albums
- `GET /api/albums/:id` - Get album by ID with songs
- `POST /api/albums` - Create new album (authenticated)
- `PUT /api/albums/:id` - Update album (authenticated)
- `POST /api/albums/:id/songs` - Add song to album (authenticated)
- `DELETE /api/albums/:id` - Delete album (authenticated)

### Playlists
- `GET /api/playlists` - Get user's playlists (authenticated)
- `GET /api/playlists/public` - Get public playlists
- `GET /api/playlists/:id` - Get playlist by ID (authenticated)
- `POST /api/playlists` - Create new playlist (authenticated)
- `PUT /api/playlists/:id` - Update playlist (authenticated)
- `POST /api/playlists/:id/songs` - Add song to playlist (authenticated)
- `DELETE /api/playlists/:id/songs/:songId` - Remove song from playlist (authenticated)
- `DELETE /api/playlists/:id` - Delete playlist (authenticated)

### Users
- `GET /api/users/profile` - Get user profile (authenticated)
- `PUT /api/users/profile` - Update user profile (authenticated)
- `POST /api/users/favorites/:songId` - Add song to favorites (authenticated)
- `DELETE /api/users/favorites/:songId` - Remove song from favorites (authenticated)
- `GET /api/users/favorites` - Get user's favorites (authenticated)
- `PUT /api/users/password` - Change password (authenticated)

### File Upload
- `POST /api/upload/song` - Upload song with metadata (authenticated)
- `POST /api/upload/image` - Upload image file (authenticated)
- `DELETE /api/upload/file` - Delete uploaded file (authenticated)
- `GET /api/upload/stats` - Get upload statistics (authenticated)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration:
   - MongoDB connection string
   - JWT secret key
   - Server port
   - Client URL for CORS

4. Start MongoDB service

5. Run the development server:
   ```bash
   npm run dev
   ```

6. For production, build and start:
   ```bash
   npm run build
   npm start
   ```

## Environment Variables

```env
MONGODB_URI=mongodb://localhost:27017/music-app
JWT_SECRET=your-super-secret-jwt-key
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:8081
MAX_FILE_SIZE=52428800
UPLOAD_PATH=./uploads
```

## Project Structure

```
src/
├── models/          # Mongoose models
│   ├── User.ts
│   ├── Song.ts
│   ├── Artist.ts
│   ├── Album.ts
│   └── Playlist.ts
├── routes/          # Express routes
│   ├── auth.ts
│   ├── songs.ts
│   ├── artists.ts
│   ├── albums.ts
│   ├── playlists.ts
│   ├── users.ts
│   └── upload.ts
├── middleware/      # Custom middleware
│   ├── auth.ts
│   └── errorHandler.ts
└── app.ts          # Main application file
```

## Database Schema

### User
- username, email, password (hashed)
- favorites (array of song IDs)
- playlists (array of playlist IDs)
- avatar URL

### Song
- title, artist (ref), album (ref), duration
- genre, file URL, thumbnail URL
- play count, upload info
- lyrics (optional)

### Artist
- name, bio, image URL
- genres, social links
- verification status

### Album
- title, artist (ref), description
- cover image, release date, genre
- songs (array of song IDs)
- total duration

### Playlist
- name, description, cover image
- owner (ref), songs (array of song IDs)
- collaborators, public/private status
- total duration

## Security Features

- JWT token authentication
- Password hashing with bcrypt
- Rate limiting (100 requests per 15 minutes)
- CORS protection
- Security headers with Helmet
- Input validation and sanitization
- File upload restrictions

## Development

- TypeScript for type safety
- Nodemon for auto-restart during development
- ESLint for code quality
- Comprehensive error handling
- Request logging with Morgan

## License

ISC
