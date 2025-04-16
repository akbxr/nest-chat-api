# Nest Chat

A secure, end-to-end encrypted real-time chat application built with NestJS.

![Nest Chat](https://nestjs.com/img/logo-small.svg)

<!-- ## Features -->

- **End-to-End Encryption** - All messages are encrypted using libsodium's XChaCha20-Poly1305 encryption
- **Real-time Communication** - Uses WebSockets (Socket.io) for instant messaging
- **User Authentication** - Email/password, Google and GitHub OAuth support
- **Password Reset** - Secure password reset flow with email notifications
- **Message History** - Persistent chat history stored securely
- **Message Editing** - Edit previously sent messages
- **Typing Indicators** - Real-time typing notifications
- **Online Status** - See when users are online/offline
- **Rate Limiting** - Protection against brute force attacks
- **Security Headers** - Implemented security best practices

## Tech Stack

- **Backend** - NestJS with TypeScript
- **Database** - PostgreSQL with TypeORM
- **Authentication** - JWT with Passport
- **Real-time** - Socket.io
- **Encryption** - libsodium-wrappers
- **Email** - Nodemailer with Gmail SMTP

## Prerequisites

- Node.js (v16+)
- npm or pnpm
- PostgreSQL database

## Project Setup

1. Clone the repository
2. Install dependencies:

```bash
$ pnpm install
```

3. Create a `.env` file in the root directory with the following variables:

```
DB_URL=your_postgres_connection_string
FRONTEND_URL=http://localhost:3000
PORT=8000

JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_token_secret

# For Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:8000/api/auth/google/callback

# For GitHub OAuth (optional)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:8000/api/auth/github/callback

# For email functionality
EMAIL_USER=your_email_address
EMAIL_PASSWORD=your_email_password
```

## Running the Application

```bash
# development mode
$ pnpm run start:dev
$ pnpm run start:debug

# production mode
$ pnpm run build
$ pnpm run start:prod
```

## Database Migrations

This project uses TypeORM for database management. You can run migrations with the following commands:

```bash
# Generate a migration
$ pnpm run migration:generate -- src/migrations/MigrationName

# Run migrations
$ pnpm run migration:run

# Revert migrations
$ pnpm run migration:revert

# Show migration status
$ pnpm run migration:show
```

## API Endpoints

### Authentication

- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login with email and password
- `POST /auth/refresh` - Refresh access token
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password with token
- `GET /auth/verify` - Verify current user (requires JWT)
- `GET /auth/verify-email` - Verify email with token
- `GET /auth/google` - Google OAuth login
- `GET /auth/google/callback` - Google OAuth callback
- `GET /auth/github` - GitHub OAuth login
- `GET /auth/github/callback` - GitHub OAuth callback
- `POST /auth/public-key` - Update user's public key (requires JWT)

### Users

- `POST /users` - Create a new user
- `GET /users` - Get all users
- `GET /users/me` - Get current user profile
- `GET /users/search` - Search for users by username
- `GET /users/:username` - Get user by username
- `GET /users/:id` - Get user by ID
- `PATCH /users/:id` - Update user (requires user ownership)
- `DELETE /users/:id` - Delete user (requires user ownership)

### Chat

- `GET /chat/conversation/:otherUserId` - Get conversation with a specific user
- `GET /chat/recent` - Get recent chats
- `GET /chat/search` - Search messages (query params: query, otherUserId)
- `GET /chat/recent-users` - Get users with recent chats
- `DELETE /chat/:id` - Delete a message
- `PUT /chat/mark-read/:recipientId` - Mark messages as read

## WebSocket Events

### Client to Server

- `sendMessage` - Send a new message
- `editMessage` - Edit a message
- `getConversation` - Get conversation history
- `typing` - Indicate user is typing

### Server to Client

- `newMessage` - Receive a new message
- `messageEdited` - Message has been edited
- `userTyping` - User is typing
- `userConnected` - User came online
- `userDisconnected` - User went offline

## Testing

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Security Considerations

1. All messages are end-to-end encrypted
2. Passwords are hashed using bcrypt
3. Rate limiting is applied to authentication endpoints
4. JSON Web Tokens are used for authentication
5. Security headers are implemented
6. CORS is configured appropriately
7. Environment variables are used for sensitive information

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
