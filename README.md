# Overseas Study Consultants CRM - Backend API

Backend API for managing clients in the Overseas Study Consultants CRM system.

## 🚀 Quick Start

### Installation

```bash
cd backend
npm install
```

### Running the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## 📡 API Endpoints

### Base URL
```
http://localhost:5000/api
```

### Clients Endpoints

#### 1. Get All Clients
```http
GET /api/clients
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "data": [...]
}
```

#### 2. Get Single Client
```http
GET /api/clients/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "Ahmed Ali",
    "country": "United Kingdom",
    "category": "Study Visa",
    "status": "Pending",
    "phone": "+92 300 1234567",
    "createdAt": "2026-02-17T08:00:00.000Z",
    "updatedAt": "2026-02-17T08:00:00.000Z"
  }
}
```

#### 3. Create New Client
```http
POST /api/clients
Content-Type: application/json

{
  "name": "Ahmed Ali",
  "country": "United Kingdom",
  "category": "Study Visa",
  "status": "Pending",
  "phone": "+92 300 1234567",
  "email": "ahmed@example.com",
  "address": "Lahore, Pakistan",
  "notes": "Interested in UK universities"
}
```

**Required Fields:**
- `name` (string)
- `country` (string)
- `category` (enum: 'Study Visa', 'Work Permit', 'Visit Visa', 'Residency')
- `status` (enum: 'Pending', 'Approved', 'Rejected')
- `phone` (string)

**Optional Fields:**
- `email` (string)
- `address` (string)
- `notes` (string)

**Response:**
```json
{
  "success": true,
  "message": "Client created successfully",
  "data": {...}
}
```

#### 4. Update Client
```http
PUT /api/clients/:id
Content-Type: application/json

{
  "status": "Approved",
  "notes": "Application approved for September intake"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Client updated successfully",
  "data": {...}
}
```

#### 5. Delete Client
```http
DELETE /api/clients/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Client deleted successfully",
  "data": {...}
}
```

#### 6. Get Clients by Status
```http
GET /api/clients/status/:status
```

Example: `/api/clients/status/Pending`

#### 7. Get Clients by Category
```http
GET /api/clients/category/:category
```

Example: `/api/clients/category/Study%20Visa`

### Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2026-02-17T08:00:00.000Z",
  "database": "Connected"
}
```

## 🗄️ Database Schema

### Client Model

```javascript
{
  name: String (required),
  country: String (required),
  category: String (required, enum),
  status: String (required, enum, default: 'Pending'),
  phone: String (required),
  email: String (optional),
  address: String (optional),
  notes: String (optional),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

## 🔧 Environment Variables

Create a `.env` file in the backend directory:

```env
MONGODB_URI=mongodb+srv://zaki:427836eA@cluster0.p279e.mongodb.net/overseas_consultancy?retryWrites=true&w=majority
PORT=5000
```

## 📦 Dependencies

- **express**: Web framework
- **mongoose**: MongoDB ODM
- **cors**: Enable CORS
- **dotenv**: Environment variables

## 🛡️ Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

## 🔒 Security Notes

- The `.env` file is gitignored to protect credentials
- CORS is enabled for frontend integration
- Input validation is performed using Mongoose schemas
- Error messages are sanitized in production mode
