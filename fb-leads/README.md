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

## Facebook Ads Analytics Module

### Overview

The Analytics Dashboard allows you to view Facebook Ads performance using your Ad Account ID and Access Token. You can see impressions, clicks, CTR, CPC, spend, and more, with breakdowns by gender, age, device, or platform. Export your analytics to CSV for further analysis.

### Features
- View campaign/adset/ad performance metrics
- Filter by ad account, date range, and breakdown (gender, age, device, platform)
- Visualize spend and CTR with interactive charts
- Export analytics data to CSV
- Supports multiple ad accounts and tokens
- Caches results for fast loading

### Usage

1. **Navigate to Analytics Dashboard**
   - Go to the Analytics page in the app sidebar.

2. **Select Ad Account and Filters**
   - Choose your Ad Account from the dropdown (auto-loaded from Facebook).
   - Select a date range (e.g., today, last 7 days).
   - Optionally, select a breakdown (e.g., gender, age).
   - Optionally, enter a custom Facebook Access Token (if not using the saved one).

3. **Load Analytics**
   - Click "Load Analytics" to fetch and display your ad performance data.
   - Use the view toggles to switch between table, spend chart, and CTR chart.

4. **Export to CSV**
   - Click "Export to CSV" to download the current analytics data for offline analysis.

### Troubleshooting
- **Invalid or Expired Token**: If you see a token error, update your Facebook access token in your profile or provide a new one in the Analytics page.
- **Permission Issues**: Ensure your Facebook user has access to the selected Ad Account and the required permissions for the Marketing API.
- **No Data**: Try changing the date range or breakdown. Some combinations may return no results if there was no ad activity.
- **API Errors**: Detailed error messages from Facebook are shown in the UI. If you see a 403 or permission error, check your token and ad account permissions.

### API Endpoints (Analytics)
- `GET /api/analytics/insights` - Get Facebook Ads insights (query: ad_account_id, date_preset, breakdown, access_token)
- `GET /api/analytics/ad-accounts` - List available ad accounts for the user
- `GET /api/analytics/export` - Export analytics data to CSV

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