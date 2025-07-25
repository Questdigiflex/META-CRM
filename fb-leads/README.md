# Facebook Leads Integration App

A full-stack application for fetching, storing, and managing Facebook Lead Ads submissions.

## Features

- **User Authentication**: JWT-based login system
- **Form Management**: Add/remove Facebook form IDs
- **Lead Management**: View and manage leads from Facebook Lead Ads
- **Automatic Syncing**: Scheduled fetching of leads every 10 minutes
- **Manual Syncing**: On-demand lead fetching
- **Export**: Download leads as CSV

## Tech Stack

- **Frontend**: React.js, Axios, React Hook Form, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT
- **Scheduler**: node-cron

## Project Structure

```
fb-leads/
├── client/                 # React frontend
│   ├── public/             # Static files
│   └── src/                # Source files
│       ├── components/     # Reusable components
│       ├── pages/          # Page components
│       ├── services/       # API services
│       ├── context/        # React context
│       └── utils/          # Utility functions
│
└── server/                 # Node.js backend
    ├── config/             # Configuration files
    ├── controllers/        # Request handlers
    ├── middleware/         # Express middleware
    ├── models/             # Mongoose models
    ├── routes/             # API routes
    └── services/           # Business logic
```

## Setup Instructions

### Prerequisites

- Node.js (v14+)
- MongoDB
- Facebook Developer Account

### Environment Variables

Create a `.env` file in the server directory with the following variables:

```
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/fb-leads

# JWT Secret
JWT_SECRET=your_jwt_secret_key_here

# Facebook API (Not required for local development)
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
```

### Installation

1. **Clone the repository**

2. **Install server dependencies**
   ```
   cd fb-leads/server
   npm install
   ```

3. **Install client dependencies**
   ```
   cd ../client
   npm install
   ```

4. **Start the development servers**
   
   Server:
   ```
   cd ../server
   npm run dev
   ```
   
   Client:
   ```
   cd ../client
   npm start
   ```

5. **Access the application**
   
   Open [http://localhost:3000](http://localhost:3000) in your browser

## Facebook Setup

1. Create a Facebook App in the [Facebook Developer Console](https://developers.facebook.com/)
2. Set up Facebook Lead Ads
3. Generate a long-lived access token
4. Add your form IDs to the application

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/access-token` - Update Facebook access token

### Forms
- `POST /api/forms/add` - Add a new form
- `GET /api/forms/list` - Get all forms for a user
- `DELETE /api/forms/delete/:id` - Delete a form
- `PUT /api/forms/update/:id` - Update a form

### Leads
- `GET /api/leads` - Get all leads with pagination
- `GET /api/leads/:id` - Get a specific lead
- `PUT /api/leads/:id` - Update lead status
- `GET /api/leads/fetch` - Manually fetch leads from Facebook
- `GET /api/leads/export` - Export leads to CSV

## License

MIT 