# Streaming Platform API Documentation

Base URL: `http://localhost:3000/api/v1`

## Table of Contents

1. [Authentication](#authentication)
2. [Users](#users)
3. [Subscription Plans](#subscription-plans)
4. [Subscriptions](#subscriptions)
5. [Content](#content)
6. [Watch History](#watch-history)
7. [Error Codes](#error-codes)
8. [Rate Limiting](#rate-limiting)

---

## Authentication

### Register User

Create a new user account.

**Endpoint:** `POST /auth/register`  
**Access:** Public  
**Rate Limit:** 5 requests per 15 minutes

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password123!",
  "phone": "+1234567890",
  "bio": "Optional user bio"
}
```

**Validation Rules:**

- `name`: 2-100 characters, required
- `email`: Valid email format, required, unique
- `password`: Min 8 characters, must contain uppercase, lowercase, and number, required
- `phone`: Valid phone format, optional
- `bio`: Max 500 characters, optional

**Success Response (201):**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "bio": "",
      "picture": null,
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### Login

Authenticate user and get access token.

**Endpoint:** `POST /auth/login`  
**Access:** Public  
**Rate Limit:** 5 requests per 15 minutes

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "Password123!"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "bio": "",
      "picture": null,
      "role": "user",
      "subscription": {
        "plan": {
          "name": "Premium",
          "accessLevel": "Premium"
        },
        "status": "active",
        "endDate": "2025-12-08T00:00:00.000Z"
      }
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response (401):**

```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

**Error Response (403) - Account Locked:**

```json
{
  "success": false,
  "message": "Account is temporarily locked due to multiple failed login attempts. Please try again later."
}
```

---

### Get Current User

Get authenticated user's profile and subscription.

**Endpoint:** `GET /auth/me`  
**Access:** Private  
**Headers:** `Authorization: Bearer {token}`

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "bio": "Movie enthusiast",
      "picture": "https://cdn.example.com/profile.jpg",
      "role": "user",
      "currentSubscription": {
        "plan": {
          "name": "Premium",
          "accessLevel": "Premium",
          "maxConcurrentStreams": 2
        },
        "status": "active",
        "startDate": "2025-01-08T00:00:00.000Z",
        "endDate": "2025-12-08T00:00:00.000Z",
        "daysRemaining": 334
      }
    }
  }
}
```

---

### Change Password

Change user's password.

**Endpoint:** `PUT /auth/change-password`  
**Access:** Private

**Request Body:**

```json
{
  "currentPassword": "Password123!",
  "newPassword": "NewPassword456!"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

### Refresh Token

Get new access token using refresh token.

**Endpoint:** `POST /auth/refresh`  
**Access:** Public

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### Logout

Logout user (client should delete token).

**Endpoint:** `POST /auth/logout`  
**Access:** Private

**Success Response (200):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Users

### Update Profile

Update user profile information.

**Endpoint:** `PUT /users/profile`  
**Access:** Private

**Request Body:**

```json
{
  "name": "John Updated",
  "bio": "Updated bio",
  "phone": "+1234567890",
  "preferences": {
    "genres": ["action", "sci-fi"],
    "language": "en",
    "notifications": {
      "email": true,
      "expiry": true,
      "newContent": false
    }
  }
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Updated",
      "email": "john@example.com",
      "bio": "Updated bio",
      "phone": "+1234567890",
      "preferences": {
        "genres": ["action", "sci-fi"],
        "language": "en",
        "notifications": {
          "email": true,
          "expiry": true,
          "newContent": false
        }
      }
    }
  }
}
```

---

### Upload Profile Picture

Upload or update profile picture.

**Endpoint:** `POST /users/profile-picture`  
**Access:** Private  
**Content-Type:** `multipart/form-data`

**Form Data:**

- `picture`: Image file (JPEG, PNG, max 5MB)

**Success Response (200):**

```json
{
  "success": true,
  "message": "Profile picture uploaded successfully",
  "data": {
    "pictureUrl": "https://cdn.example.com/profile-507f1f77bcf86cd799439011.jpg"
  }
}
```

---

## Subscription Plans

### Get All Plans

Get list of all active subscription plans (no authentication required).

**Endpoint:** `GET /subscriptions/plans`  
**Access:** Public

**Query Parameters:**

- `accessLevel`: Filter by access level (Free, Basic, Premium, Ultimate)
- `sortBy`: Sort field (price, name, displayOrder)
- `order`: Sort order (asc, desc)

**Success Response (200):**

```json
{
  "success": true,
  "count": 3,
  "data": {
    "plans": [
      {
        "id": "507f1f77bcf86cd799439011",
        "name": "Basic",
        "description": "Perfect for casual viewers",
        "price": 9.99,
        "currency": "USD",
        "validityDays": 30,
        "accessLevel": "Basic",
        "maxDevicesAllowed": 1,
        "maxConcurrentStreams": 1,
        "resolution": "720p",
        "features": ["HD streaming", "Unlimited content", "Cancel anytime"],
        "downloadAllowed": false,
        "adsEnabled": true,
        "isPopular": false
      },
      {
        "id": "507f1f77bcf86cd799439012",
        "name": "Premium",
        "description": "Best value for families",
        "price": 14.99,
        "currency": "USD",
        "validityDays": 30,
        "accessLevel": "Premium",
        "maxDevicesAllowed": 4,
        "maxConcurrentStreams": 2,
        "resolution": "1080p",
        "features": [
          "Full HD streaming",
          "Watch on 4 devices",
          "Download content",
          "No ads",
          "Priority support"
        ],
        "downloadAllowed": true,
        "adsEnabled": false,
        "isPopular": true
      },
      {
        "id": "507f1f77bcf86cd799439013",
        "name": "Ultimate",
        "description": "Premium experience with 4K",
        "price": 19.99,
        "currency": "USD",
        "validityDays": 30,
        "accessLevel": "Ultimate",
        "maxDevicesAllowed": 6,
        "maxConcurrentStreams": 4,
        "resolution": "4K",
        "features": [
          "4K Ultra HD streaming",
          "Watch on 6 devices",
          "Download unlimited",
          "No ads",
          "Early access to new content",
          "Premium support"
        ],
        "downloadAllowed": true,
        "adsEnabled": false,
        "isPopular": false
      }
    ]
  }
}
```

---

### Get Plan Details

Get detailed information about a specific plan.

**Endpoint:** `GET /subscriptions/plans/:planId`  
**Access:** Public

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "plan": {
      "id": "507f1f77bcf86cd799439012",
      "name": "Premium",
      "description": "Best value for families",
      "price": 14.99,
      "currency": "USD",
      "validityDays": 30,
      "accessLevel": "Premium",
      "maxDevicesAllowed": 4,
      "maxConcurrentStreams": 2,
      "resolution": "1080p",
      "features": ["..."],
      "subscribersCount": 1523
    }
  }
}
```

---

## Subscriptions

### Subscribe to Plan

Subscribe to a plan (requires authentication).

**Endpoint:** `POST /subscriptions/subscribe`  
**Access:** Private

**Request Body:**

```json
{
  "planId": "507f1f77bcf86cd799439012",
  "paymentMethod": "card",
  "autoRenew": true
}
```

**Success Response (201):**

```json
{
  "success": true,
  "message": "Subscription created successfully",
  "data": {
    "subscription": {
      "id": "507f1f77bcf86cd799439014",
      "user": "507f1f77bcf86cd799439011",
      "plan": {
        "name": "Premium",
        "accessLevel": "Premium",
        "price": 14.99
      },
      "status": "active",
      "startDate": "2025-01-08T00:00:00.000Z",
      "endDate": "2025-02-07T00:00:00.000Z",
      "autoRenew": true,
      "paymentDetails": {
        "transactionId": "txn_1234567890",
        "amount": 14.99,
        "currency": "USD",
        "paymentMethod": "card",
        "paymentDate": "2025-01-08T10:30:00.000Z"
      }
    }
  }
}
```

---

### Get Subscription Status

Get current subscription status and details.

**Endpoint:** `GET /subscriptions/status`  
**Access:** Private

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "507f1f77bcf86cd799439014",
      "plan": {
        "name": "Premium",
        "accessLevel": "Premium",
        "maxDevicesAllowed": 4,
        "maxConcurrentStreams": 2,
        "resolution": "1080p"
      },
      "status": "active",
      "startDate": "2025-01-08T00:00:00.000Z",
      "endDate": "2025-02-07T00:00:00.000Z",
      "daysRemaining": 30,
      "autoRenew": true,
      "devices": [
        {
          "deviceId": "device_001",
          "deviceName": "John's iPhone",
          "deviceType": "mobile",
          "lastUsed": "2025-01-08T10:00:00.000Z"
        }
      ]
    }
  }
}
```

**Response (200) - No Active Subscription:**

```json
{
  "success": true,
  "data": {
    "subscription": null,
    "message": "No active subscription found"
  }
}
```

---

### Get Subscription History

Get user's subscription history.

**Endpoint:** `GET /subscriptions/history`  
**Access:** Private

**Query Parameters:**

- `limit`: Number of records (default: 10, max: 50)
- `page`: Page number (default: 1)

**Success Response (200):**

```json
{
  "success": true,
  "count": 3,
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 3
  },
  "data": {
    "subscriptions": [
      {
        "id": "507f1f77bcf86cd799439014",
        "plan": {
          "name": "Premium",
          "accessLevel": "Premium"
        },
        "status": "active",
        "startDate": "2025-01-08T00:00:00.000Z",
        "endDate": "2025-02-07T00:00:00.000Z"
      },
      {
        "id": "507f1f77bcf86cd799439015",
        "plan": {
          "name": "Basic",
          "accessLevel": "Basic"
        },
        "status": "expired",
        "startDate": "2024-12-08T00:00:00.000Z",
        "endDate": "2025-01-07T00:00:00.000Z"
      }
    ]
  }
}
```

---

### Cancel Subscription

Cancel auto-renewal of subscription.

**Endpoint:** `PUT /subscriptions/cancel`  
**Access:** Private

**Request Body:**

```json
{
  "reason": "Too expensive"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Subscription cancelled. You can continue using the service until 2025-02-07",
  "data": {
    "subscription": {
      "status": "active",
      "endDate": "2025-02-07T00:00:00.000Z",
      "autoRenew": false,
      "cancellationDetails": {
        "cancelledAt": "2025-01-08T10:00:00.000Z",
        "reason": "Too expensive"
      }
    }
  }
}
```

---

## Content

### Browse Content

Browse content library (authentication optional).

**Endpoint:** `GET /content`  
**Access:** Public (limited), Private (full access)

**Query Parameters:**

- `type`: Content type (movie, series, documentary, short, trailer)
- `genre`: Filter by genre
- `accessLevel`: Filter by access level
- `search`: Search in title, description
- `sortBy`: Sort field (releaseDate, views, rating)
- `order`: Sort order (asc, desc)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Example:** `GET /content?type=movie&genre=action&sortBy=releaseDate&order=desc&page=1&limit=20`

**Success Response (200):**

```json
{
  "success": true,
  "count": 156,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "pages": 8
  },
  "data": {
    "content": [
      {
        "id": "507f1f77bcf86cd799439016",
        "title": "The Great Adventure",
        "description": "An epic journey...",
        "type": "movie",
        "genre": ["action", "adventure"],
        "accessLevel": "Premium",
        "duration": 120,
        "releaseDate": "2025-01-01T00:00:00.000Z",
        "rating": {
          "average": 8.5,
          "count": 1523
        },
        "ageRating": "PG-13",
        "thumbnailUrl": "https://cdn.example.com/thumbnail.jpg",
        "bannerUrl": "https://cdn.example.com/banner.jpg",
        "trailerUrl": "https://cdn.example.com/trailer.mp4",
        "director": "Jane Director",
        "language": "en",
        "resolution": ["720p", "1080p", "4K"],
        "isFeatured": true,
        "views": 15234
      }
    ]
  }
}
```

---

### Get Content Details

Get detailed information about specific content.

**Endpoint:** `GET /content/:contentId`  
**Access:** Public (limited), Private (full)

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "content": {
      "id": "507f1f77bcf86cd799439016",
      "title": "The Great Adventure",
      "description": "An epic journey through time and space...",
      "type": "movie",
      "genre": ["action", "adventure", "sci-fi"],
      "accessLevel": "Premium",
      "duration": 120,
      "releaseDate": "2025-01-01T00:00:00.000Z",
      "rating": {
        "average": 8.5,
        "count": 1523
      },
      "ageRating": "PG-13",
      "videoUrl": "https://cdn.example.com/video.m3u8",
      "trailerUrl": "https://cdn.example.com/trailer.mp4",
      "thumbnailUrl": "https://cdn.example.com/thumbnail.jpg",
      "bannerUrl": "https://cdn.example.com/banner.jpg",
      "cast": [
        {
          "name": "John Actor",
          "role": "lead",
          "character": "Hero"
        }
      ],
      "director": "Jane Director",
      "producer": "Bob Producer",
      "studio": "Great Studios",
      "language": "en",
      "subtitles": [
        {
          "language": "es",
          "url": "https://cdn.example.com/subtitles_es.vtt"
        }
      ],
      "tags": ["blockbuster", "award-winning"],
      "resolution": ["720p", "1080p", "4K"],
      "views": 15234,
      "likes": 8432
    },
    "canAccess": true,
    "recommendations": [...]
  }
}
```

---

### Stream Content

Start streaming content (requires active subscription).

**Endpoint:** `POST /content/:contentId/stream`  
**Access:** Private (with active subscription)

**Request Body:**

```json
{
  "deviceId": "device_001",
  "deviceName": "John's iPhone",
  "deviceType": "mobile",
  "quality": "1080p"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Stream started successfully",
  "data": {
    "streamUrl": "https://cdn.example.com/stream/video.m3u8?token=...",
    "sessionToken": "session_abc123",
    "expiresAt": "2025-01-08T14:00:00.000Z",
    "maxConcurrentStreams": 2,
    "currentStreams": 1
  }
}
```

**Error Response (403) - Subscription Required:**

```json
{
  "success": false,
  "message": "Active subscription required to access this content"
}
```

**Error Response (429) - Concurrent Limit:**

```json
{
  "success": false,
  "message": "Maximum 2 concurrent streams allowed",
  "activeDevices": [
    {
      "deviceName": "Living Room TV",
      "startedAt": "2025-01-08T10:00:00.000Z"
    },
    {
      "deviceName": "Bedroom TV",
      "startedAt": "2025-01-08T11:30:00.000Z"
    }
  ]
}
```

---

### Stream Heartbeat

Send heartbeat to maintain active stream session.

**Endpoint:** `POST /content/stream/heartbeat`  
**Access:** Private

**Request Body:**

```json
{
  "sessionId": "session_abc123",
  "timestamp": 1704709800000,
  "playbackPosition": 1234
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Heartbeat recorded"
}
```

---

### Get Featured Content

Get featured content.

**Endpoint:** `GET /content/featured`  
**Access:** Public

**Success Response (200):**

```json
{
  "success": true,
  "count": 5,
  "data": {
    "content": [...]
  }
}
```

---

### Get Trending Content

Get trending content.

**Endpoint:** `GET /content/trending`  
**Access:** Public

**Success Response (200):**

```json
{
  "success": true,
  "count": 10,
  "data": {
    "content": [...]
  }
}
```

---

## Watch History

### Get Continue Watching

Get list of content to continue watching.

**Endpoint:** `GET /watch-history/continue-watching`  
**Access:** Private

**Query Parameters:**

- `limit`: Number of items (default: 10, max: 20)

**Success Response (200):**

```json
{
  "success": true,
  "count": 3,
  "data": {
    "continueWatching": [
      {
        "id": "507f1f77bcf86cd799439017",
        "content": {
          "id": "507f1f77bcf86cd799439016",
          "title": "The Great Adventure",
          "thumbnailUrl": "https://cdn.example.com/thumbnail.jpg",
          "type": "movie",
          "duration": 120
        },
        "watchedDuration": 3600,
        "progress": 50,
        "lastWatchedAt": "2025-01-08T10:00:00.000Z"
      }
    ]
  }
}
```

---

### Get Recently Watched

Get recently watched content.

**Endpoint:** `GET /watch-history/recent`  
**Access:** Private

**Query Parameters:**

- `limit`: Number of items (default: 20, max: 50)

**Success Response (200):**

```json
{
  "success": true,
  "count": 15,
  "data": {
    "recentlyWatched": [
      {
        "id": "507f1f77bcf86cd799439017",
        "content": {
          "id": "507f1f77bcf86cd799439016",
          "title": "The Great Adventure",
          "thumbnailUrl": "https://cdn.example.com/thumbnail.jpg",
          "type": "movie"
        },
        "watchedDuration": 7200,
        "totalDuration": 7200,
        "progress": 100,
        "status": "completed",
        "lastWatchedAt": "2025-01-08T10:00:00.000Z",
        "completedAt": "2025-01-08T12:00:00.000Z"
      }
    ]
  }
}
```

---

### Update Watch Progress

Update watch progress for content.

**Endpoint:** `PUT /watch-history/:contentId/progress`  
**Access:** Private

**Request Body:**

```json
{
  "watchedDuration": 1800,
  "totalDuration": 7200,
  "sessionId": "session_abc123",
  "deviceId": "device_001",
  "quality": "1080p"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Watch progress updated",
  "data": {
    "watchHistory": {
      "id": "507f1f77bcf86cd799439017",
      "watchedDuration": 1800,
      "totalDuration": 7200,
      "progress": 25,
      "status": "paused"
    }
  }
}
```

---

### Get Watch Statistics

Get user's watch statistics.

**Endpoint:** `GET /watch-history/stats`  
**Access:** Private

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "stats": {
      "totalWatchTime": 144000,
      "totalContentWatched": 45,
      "completedContent": 32,
      "averageCompletionRate": 71,
      "favoriteGenres": [
        { "genre": "action", "count": 15 },
        { "genre": "sci-fi", "count": 12 }
      ]
    }
  }
}
```

---

## Admin Endpoints

### Create Content (Admin)

**Endpoint:** `POST /content`  
**Access:** Admin only

### Update Content (Admin)

**Endpoint:** `PUT /content/:contentId`  
**Access:** Admin only

### Delete Content (Admin)

**Endpoint:** `DELETE /content/:contentId`  
**Access:** Admin only

### Create Subscription Plan (Admin)

**Endpoint:** `POST /subscriptions/plans`  
**Access:** Admin only

### Update Subscription Plan (Admin)

**Endpoint:** `PUT /subscriptions/plans/:planId`  
**Access:** Admin only

---

## Error Codes

| Code | Message               | Description                             |
| ---- | --------------------- | --------------------------------------- |
| 400  | Bad Request           | Invalid request data                    |
| 401  | Unauthorized          | Missing or invalid authentication token |
| 403  | Forbidden             | Insufficient permissions                |
| 404  | Not Found             | Resource not found                      |
| 409  | Conflict              | Resource already exists                 |
| 429  | Too Many Requests     | Rate limit exceeded                     |
| 500  | Internal Server Error | Server error                            |

**Error Response Format:**

```json
{
  "success": false,
  "message": "Error description",
  "errors": []
}
```

---

## Rate Limiting

### Default Limits

- **Anonymous users:** 100 requests per 15 minutes
- **Authenticated users:** 500 requests per 15 minutes
- **Authentication endpoints:** 5 requests per 15 minutes
- **Streaming endpoints:** 10 requests per minute
- **Search endpoints:** 20 requests per minute

### Rate Limit Headers

- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Time when limit resets (Unix timestamp)

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "message": "Too many requests. Please try again later."
}
```

---

## Pagination

For endpoints that return lists, pagination is supported:

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response Format:**

```json
{
  "success": true,
  "count": 50,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  },
  "data": {
    "items": [...]
  }
}
```

---

## Webhooks (Future Feature)

Webhooks for subscription events:

- `subscription.created`
- `subscription.renewed`
- `subscription.cancelled`
- `subscription.expiring`

---

## Support

For API support, contact: api-support@streamingplatform.com

## Changelog

### v1.0.0 (2025-01-08)

- Initial API release
- Authentication endpoints
- User management
- Subscription management
- Content browsing and streaming
- Watch history tracking
