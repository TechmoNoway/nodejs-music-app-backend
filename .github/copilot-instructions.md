<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Music Streaming App Server

This is a Node.js Express server built with TypeScript for a React Native music streaming application.

## Architecture Guidelines

- Use TypeScript for all code
- Follow RESTful API design principles
- Implement proper error handling with try-catch blocks
- Use Mongoose for MongoDB operations
- Implement JWT authentication for protected routes
- Use middleware for common functionality (auth, error handling, logging)

## Code Style

- Use async/await for asynchronous operations
- Implement proper validation for request data
- Return consistent JSON response format with success/error status
- Use proper HTTP status codes
- Add comprehensive error handling
- Include pagination for list endpoints

## Security Practices

- Always validate and sanitize input data
- Use helmet for security headers
- Implement rate limiting
- Hash passwords with bcrypt
- Use JWT for authentication
- Validate file uploads properly

## Database Guidelines

- Use Mongoose schemas with proper validation
- Implement proper indexing for performance
- Use population for related data
- Handle database errors gracefully
- Use transactions when needed

## File Structure

- `/src/models/` - Mongoose models
- `/src/routes/` - Express route handlers
- `/src/middleware/` - Custom middleware
- `/uploads/` - File upload storage
- `/dist/` - Compiled TypeScript output
