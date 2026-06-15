# LINE Mini App / LIFF Framework: Comprehensive Research Document

## For Building a Kanban Board Frontend with Self-Hosted Backend Integration

---

## Table of Contents

1. [LIFF Basics & Constraints](#1-liff-basics--constraints)
2. [Authentication Flow](#2-authentication-flow)
3. [External API Communication](#3-external-api-communication)
4. [LINE Mini App Specifics](#4-line-mini-app-specifics)
5. [UX/UI Best Practices](#5-uxui-best-practices)
6. [Code Reference & Patterns](#6-code-reference--patterns)
7. [Official Documentation References](#7-official-documentation-references)

---

## 1. LIFF Basics & Constraints

### 1.1 What is LIFF?

LINE Front-end Framework (LIFF) is a platform for web apps provided by LY Corporation. Web apps running on this platform are called **LIFF apps**. LIFF apps run inside the LINE app's built-in browser (called the **LIFF browser**) or in external browsers.

Key capabilities:
- Access LINE user data (user ID, profile, email) without separate login
- Send messages on behalf of the user
- Access device features (QR code scanner, Bluetooth)
- Run as web apps inside LINE (HTML + JavaScript)

> **Official Documentation**: https://developers.line.biz/en/docs/liff/overview/

---

### 1.2 LIFF App Types: Compact, Tall, Full

LIFF apps support three view sizes that determine how much screen real estate the app occupies within the LINE app:

| View Type | Height | Best For |
|-----------|--------|----------|
| **Compact** | ~50% of screen | Small interactions, single forms, confirmation dialogs |
| **Tall** | ~70-80% of screen | Medium content, surveys, menus, simple workflows |
| **Full** | 100% of screen | Complex apps, dashboards, full-featured web apps |

**Recommendation for a Kanban board: Use `Full` size.**

A Kanban board requires maximum screen real estate for:
- Horizontal scrolling across multiple columns
- Drag-and-drop interactions with cards
- Displaying card details, labels, and metadata
- Touch-friendly interactions that need space

The `Full` view type is also **required** for LIFF browser minimization features (iOS only currently, Android planned for 2025).

> **Reference**: https://designsystem.line.me/LDSG/components/systems/liff-view-en/

---

### 1.3 LIFF SDK Version Recommendations

#### Current Status (as of 2024-2025)

- **Latest stable version**: LIFF v2.26.0 (as of early 2025)
- **Recommended approach**: Use the CDN edge path for automatic updates

#### CDN Integration Options

```html
<!-- Option 1: CDN Edge Path (always latest v2.x) -->
<script charset="utf-8" src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>

<!-- Option 2: CDN Fixed Path (pin to specific version) -->
<script charset="utf-8" src="https://static.line-scdn.net/liff/edge/versions/2.26.0/sdk.js"></script>
```

#### npm Installation

```bash
npm install --save @line/liff
# or
yarn add @line/liff
```

**Recommendation**: For a production Kanban board app, use the **npm package** with a specific version pinned in `package.json`, and update periodically after testing new releases.

#### Key SDK Features for Kanban Board Development

| Feature | Version | Description |
|---------|---------|-------------|
| Pluggable SDK | v2.22.0+ | Reduce bundle size by ~34% by importing only needed APIs |
| `liff.getAppLanguage()` | v2.24.0+ | Gets LINE app language (replaces deprecated `getLanguage()`) |
| LIFF CLI | 2024 release | Command-line tool for creating/managing LIFF apps |
| URL RFC 3986 compliance | v2.25.0+ | Proper URL encoding for query parameters |

#### Pluggable SDK (Recommended for Production)

For bundle size optimization, use the pluggable SDK pattern:

```javascript
import liff from "@line/liff/core";
import GetAccessToken from "@line/liff/get-access-token";
import GetIDToken from "@line/liff/get-id-token";
import GetProfile from "@line/liff/get-profile";
import GetContext from "@line/liff/get-context";
import CloseWindow from "@line/liff/close-window";
import SendMessages from "@line/liff/send-messages";
import IsLoggedIn from "@line/liff/is-logged-in";
import Login from "@line/liff/login";

// Register only the APIs your Kanban app needs
liff.use(new GetAccessToken());
liff.use(new GetIDToken());
liff.use(new GetProfile());
liff.use(new GetContext());
liff.use(new CloseWindow());
liff.use(new SendMessages());
liff.use(new IsLoggedIn());
liff.use(new Login());

liff.init({ liffId: "YOUR_LIFF_ID" });
```

---

### 1.4 Browser Environment Inside LINE (LIFF Browser)

#### WebView Technology

| Platform | WebView Engine | Notes |
|----------|---------------|-------|
| iOS | WKWebView | Same engine as Safari, good web standard support |
| Android | Android WebView | Chromium-based, modern web API support |

#### Key Capabilities

The LIFF browser supports:
- Full HTML5/CSS3/JavaScript
- `localStorage` and `sessionStorage`
- `fetch()` API for HTTP requests
- Service Workers (with limitations)
- WebSocket connections
- CSS transforms and animations
- Touch events (essential for drag-and-drop)

#### Limitations & Constraints

- **Cache behavior**: WebViews cache content based on HTTP headers (`Cache-Control`). There is **no way** to explicitly clear the LIFF browser cache programmatically.
- **No access to**: `window.open()` in external browser (use `liff.openWindow()` instead)
- **URL fragment security**: In LIFF v2.11.0+, credential parameters (`access_token`, `id_token`, etc.) are stripped from URL fragments after `liff.init()` resolves
- **CORS**: Standard CORS rules apply; your backend must send proper CORS headers
- **Some APIs unavailable in external browsers**: e.g., `liff.scanCodeV2()` only works inside the LIFF browser
- **LIFF apps not officially supported in OpenChat**: Some functions (like profile retrieval) may not work

#### Environment Detection

```javascript
// Check if running inside LIFF browser (LINE app)
const isInClient = liff.isInClient();  // true = inside LINE app

// Check operating system
const os = liff.getOS();  // Returns "ios", "android", "web"

// Check LINE app version
const lineVersion = liff.getLineVersion();  // e.g., "16.0.0"
```

---

### 1.5 Screen Size Constraints & Responsive Design

#### Viewport Considerations

The LIFF browser has a **native header** area containing:
- Back/close button (left side)
- Action button / multi-tab view button (right side, FAB area)

This header consumes space at the top of the screen. Design your Kanban board's header to harmonize with this native chrome.

#### Recommended Viewport Meta Tag

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
```

> **Note**: The `user-scalable=no` prevents zoom issues during drag-and-drop interactions, which is important for a Kanban board.

#### Responsive Breakpoints

| Device Width | Columns Visible | Interaction Mode |
|-------------|----------------|-----------------|
| < 375px (small phone) | 1-2 columns | Vertical scroll with column switcher |
| 375-414px (standard phone) | 2 columns | Horizontal swipe between columns |
| 414-768px (large phone/phablet) | 2-3 columns | Horizontal scroll |
| > 768px (tablet/iPad) | 3-4 columns | Full drag-and-drop |

#### Safe Area Insets

```css
/* Account for iOS notch and home indicator */
.kanban-container {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

---

### 1.6 LIFF App Registration Process & Channel Requirements

#### Prerequisites

1. **LINE Business ID** account
2. A **Provider** created in the LINE Developers Console
3. A **LINE Login channel** (or LINE MINI App channel)

#### Steps to Register a LIFF App

1. Log in to the [LINE Developers Console](https://developers.line.biz/console/)
2. Select your Provider and LINE Login channel
3. Click the **LIFF** tab
4. Click **Add** and fill in:
   - **LIFF app name**: Internal name (users don't see this)
   - **Size**: Select `Full` for Kanban board
   - **Endpoint URL**: Your HTTPS URL (e.g., `https://your-domain.com/kanban`)
   - **Scopes**: `openid` (required), `profile`, `email` (optional)
5. Save to get your **LIFF ID** (format: `1234567890-XXXXXXXX`)

#### Channel Limits

- Maximum **30 LIFF apps** per channel
- Endpoint URL **must use HTTPS**
- URL fragments (`#fragment`) **not allowed** in endpoint URL

#### LIFF URL Format

```
https://liff.line.me/{liffId}
```

This is the URL users access to open your LIFF app inside LINE.

---

## 2. Authentication Flow

### 2.1 LINE Login Integration Within LIFF

LIFF apps opened inside the LIFF browser (LINE app) get **automatic authentication** via `liff.init()` - no explicit login is required because the user is already authenticated within the LINE app context.

For **external browsers**, you must explicitly call `liff.login()`.

#### Authentication Flow Diagram

```
User opens LIFF URL in LINE
       |
       v
LIFF browser loads endpoint URL
       |
       v
Your app calls liff.init({ liffId })
       |
       v
LIFF SDK obtains access_token + id_token
automatically from LINE Platform
       |
       v
App can now call liff.getIDToken() or
liff.getAccessToken() to get credentials
       |
       v
Send token to backend for verification
       |
       v
Backend issues own JWT for session management
```

#### Initialization Pattern

```javascript
async function initializeLiff() {
  try {
    await liff.init({ liffId: "YOUR_LIFF_ID" });
    
    // LIFF browser: user is automatically logged in
    // External browser: may need to call liff.login()
    if (!liff.isInClient() && !liff.isLoggedIn()) {
      liff.login({ redirectUri: window.location.href });
      return;
    }
    
    // App is initialized and user is authenticated
    initializeKanbanApp();
    
  } catch (error) {
    console.error("LIFF initialization failed:", error);
  }
}
```

---

### 2.2 ID Token Acquisition & Verification

#### ID Token Structure

LINE ID tokens are **JWT (JSON Web Tokens)** containing user profile information. They consist of three parts:

```
{header}.{payload}.{signature}
```

**Header example (ES256 algorithm):**
```json
{
  "typ": "JWT",
  "alg": "ES256",
  "kid": "a2a459aec5b65fa..."
}
```

**Payload example:**
```json
{
  "iss": "https://access.line.me",
  "sub": "U1234567890abcdef1234567890abcdef",
  "aud": "YOUR_CHANNEL_ID",
  "exp": 1698765432,
  "iat": 1698761832,
  "nonce": "random-string",
  "amr": ["pwd"],
  "name": "Taro Line",
  "picture": "https://example.com/profile.jpg",
  "email": "taro@example.com"
}
```

#### Key Claims

| Claim | Description |
|-------|-------------|
| `iss` | Issuer - always `https://access.line.me` |
| `sub` | Subject - LINE user ID (unique per channel) |
| `aud` | Audience - your channel ID |
| `exp` | Expiration timestamp |
| `iat` | Issued-at timestamp |
| `name` | User display name |
| `picture` | Profile image URL |
| `email` | User email (requires `email` scope) |

#### Getting ID Tokens in LIFF

```javascript
// Option 1: Get raw JWT ID token (send to server for verification)
const idToken = liff.getIDToken();  // Returns JWT string

// Option 2: Get decoded payload (client-side use only, NOT for server auth)
const decoded = liff.getDecodedIDToken();  // Returns payload object
// Contains: sub (userId), name, picture, email, exp, iat, etc.
```

> **Important**: `liff.getDecodedIDToken()` should only be used for displaying user info in the UI. **Always verify the raw ID token on your server** before trusting the data for authentication.

#### Scope Requirements

| Scope | Required For | Console Setting |
|-------|-------------|-----------------|
| `openid` | `liff.getIDToken()`, `liff.getDecodedIDToken()` | Required |
| `email` | Email address in ID token | Optional |
| `profile` | `liff.getProfile()`, `liff.getFriendship()` | Optional |
| `chat_message.write` | `liff.sendMessages()` | Optional |

---

### 2.3 Passing LINE User Identity to Self-Hosted Backend Securely

#### Recommended JWT Handoff Pattern

```
[LIFF App]                    [Your Backend]                  [LINE Platform]
    |                              |                                   |
    |  1. liff.init()              |                                   |
    |  2. const idToken =          |                                   |
    |     liff.getIDToken()        |                                   |
    |                              |                                   |
    |  3. POST /api/auth/verify    |                                   |
    |     { idToken: "jwt..." }    |                                   |
    |----------------------------->|                                   |
    |                              |  4. Verify ID token signature     |
    |                              |     using LINE's JWK endpoint     |
    |                              |     (https://api.line.me/         |
    |                              |      oauth2/v2.1/certs)           |
    |                              |                                   |
    |                              |  5. Decode payload, extract       |
    |                              |     userId (sub), name, email     |
    |                              |                                   |
    |  6. Return your own JWT      |                                   |
    |     { token: "your-jwt",     |                                   |
    |       user: { id, name } }   |                                   |
    |<-----------------------------|                                   |
    |                              |                                   |
    |  7. Store your JWT in         |                                   |
    |     localStorage, use on     |                                   |
    |     subsequent requests      |                                   |
    |                              |                                   |
    |  8. GET /api/boards          |                                   |
    |     Authorization: Bearer    |                                   |
    |     <your-jwt>               |                                   |
    |----------------------------->|                                   |
    |                              |  9. Verify your JWT, return       |
    |  10. Display Kanban data     |     Kanban board data             |
    |<-----------------------------|                                   |
```

#### Why This Pattern?

- **LINE ID tokens expire** (short-lived) - not suitable for session management
- **Your JWT** can have a longer expiration, refresh token mechanism, and custom claims
- **Server-side verification** of LINE ID token is the only secure approach
- **Decouples** your app from LINE's token lifecycle

---

### 2.4 Server-Side ID Token Verification

#### Verification Endpoint (LINE Platform)

LINE provides two ways to verify an ID token:

**Option 1: Use the Verify ID Token API** (simpler, makes an HTTP request)
```http
POST https://api.line.me/oauth2/v2.1/verify
Content-Type: application/x-www-form-urlencoded

id_token={ID_TOKEN}&client_id={CHANNEL_ID}
```

**Option 2: Verify locally using JWK** (recommended for production - no external API call)

The JWK endpoint:
```
https://api.line.me/oauth2/v2.1/certs
```

This returns JSON Web Keys for verifying the ES256 signature.

#### Node.js Backend Verification Example

```javascript
// backend/auth.js - Server-side ID token verification
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const LINE_JWKS_URI = 'https://api.line.me/oauth2/v2.1/certs';
const CHANNEL_ID = process.env.LINE_CHANNEL_ID;

const client = jwksClient({
  jwksUri: LINE_JWKS_URI,
  cache: true,           // Cache signing keys
  cacheMaxEntries: 5,    // Max cached keys
  cacheMaxAge: 86400000, // 24 hours
});

async function getSigningKey(kid) {
  const key = await client.getSigningKey(kid);
  return key.getPublicKey();
}

async function verifyLineIdToken(idToken) {
  // Decode without verification to get header (for kid)
  const decodedHeader = jwt.decode(idToken, { complete: true });
  if (!decodedHeader) {
    throw new Error('Invalid token format');
  }
  
  const { kid } = decodedHeader.header;
  const publicKey = await getSigningKey(kid);
  
  // Verify token
  const payload = jwt.verify(idToken, publicKey, {
    algorithms: ['ES256'],
    issuer: 'https://access.line.me',
    audience: CHANNEL_ID,
    clockTolerance: 60, // 60 second tolerance for clock skew
  });
  
  return payload; // Contains sub (userId), name, picture, email, etc.
}

// Express route
app.post('/api/auth/verify', async (req, res) => {
  try {
    const { idToken } = req.body;
    const linePayload = await verifyLineIdToken(idToken);
    
    // Create or find user in your database
    const user = await findOrCreateUser({
      lineUserId: linePayload.sub,
      name: linePayload.name,
      email: linePayload.email,
      avatar: linePayload.picture,
    });
    
    // Issue your own JWT for session management
    const appToken = jwt.sign(
      { 
        userId: user.id, 
        lineUserId: linePayload.sub,
        name: linePayload.name,
      },
      process.env.APP_JWT_SECRET,
      { expiresIn: '7d' } // Your own expiration
    );
    
    res.json({ 
      token: appToken,
      user: {
        id: user.id,
        name: linePayload.name,
        email: linePayload.email,
        avatar: linePayload.picture,
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token', message: error.message });
  }
});
```

#### Python Backend Verification Example

```python
import jwt
import requests
from jwt import PyJWKClient

LINE_CHANNEL_ID = os.environ.get('LINE_CHANNEL_ID')
LINE_JWKS_URI = "https://api.line.me/oauth2/v2.1/certs"

jwks_client = PyJWKClient(LINE_JWKS_URI, cache_keys=True)

def verify_line_id_token(id_token: str):
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(id_token)
        payload = jwt.decode(
            id_token,
            signing_key.key,
            algorithms=["ES256"],
            issuer="https://access.line.me",
            audience=LINE_CHANNEL_ID,
        )
        return payload  # Contains sub (userId), name, email, picture, etc.
    except jwt.ExpiredSignatureError:
        raise ValueError("ID token has expired")
    except jwt.InvalidTokenError as e:
        raise ValueError(f"Invalid token: {e}")
```

---

### 2.5 Access Token vs ID Token: When to Use Each

| Token Type | Method | Best Used For |
|-----------|--------|--------------|
| **ID Token** | `liff.getIDToken()` | Authentication - proving user identity to your backend |
| **Access Token** | `liff.getAccessToken()` | Calling LINE Platform APIs (e.g., profile API, messaging API) |

For a Kanban board with a self-hosted backend, **ID tokens are the primary authentication mechanism**.

Access tokens are useful if you need to:
- Call the LINE Messaging API directly from your backend
- Get detailed friendship status
- Send messages via `liff.sendMessages()` (this uses LIFF SDK directly, not the access token)

```javascript
// Get access token (for calling LINE APIs)
const accessToken = liff.getAccessToken();

// Use it to call LINE Platform APIs from your backend
fetch('https://api.line.me/v2/profile', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

> **Note**: Access tokens expire in **30 minutes** and are revoked when the user closes the LIFF app.

---

## 3. External API Communication

### 3.1 How LIFF Apps Call External APIs (CORS)

LIFF apps use standard `fetch()` / `XMLHttpRequest` to call external APIs. Since LIFF runs in a WebView, standard web CORS rules apply.

#### Required Backend CORS Configuration

Your self-hosted backend must send appropriate CORS headers:

```http
Access-Control-Allow-Origin: https://your-liff-endpoint.com
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
```

For development, you can allow all origins (NOT for production):
```http
Access-Control-Allow-Origin: *
```

#### Preflight Requests

Browsers send an `OPTIONS` preflight request for:
- Non-simple HTTP methods (PUT, DELETE, PATCH)
- Custom headers (like `Authorization: Bearer ...`)
- Content types other than `application/x-www-form-urlencoded`, `multipart/form-data`, or `text/plain`

**Make sure your backend handles `OPTIONS` requests** with a `200 OK` response and appropriate CORS headers.

#### Express.js CORS Example

```javascript
const cors = require('cors');

const corsOptions = {
  origin: [
    'https://your-production-domain.com',
    'https://localhost:3000', // For local development
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
```

---

### 3.2 Using Tokens in API Requests

#### Authentication Header Pattern

```javascript
// Initialize and get token
async function initKanbanApp() {
  await liff.init({ liffId: "YOUR_LIFF_ID" });
  
  // Get LINE ID token
  const idToken = liff.getIDToken();
  
  // Exchange for your backend's JWT (one-time)
  const authResponse = await fetch('https://your-api.com/api/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  
  const { token: appToken } = await authResponse.json();
  
  // Store for subsequent requests
  localStorage.setItem('kanban_auth_token', appToken);
  
  // Now call Kanban APIs
  await loadBoards();
}

// Reusable API client
async function apiClient(endpoint, options = {}) {
  const token = localStorage.getItem('kanban_auth_token');
  
  const response = await fetch(`https://your-api.com${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
  
  if (response.status === 401) {
    // Token expired - re-authenticate with LINE
    localStorage.removeItem('kanban_auth_token');
    const newIdToken = liff.getIDToken();
    // Re-exchange token and retry...
  }
  
  return response.json();
}

// Usage
const boards = await apiClient('/api/boards');
const cards = await apiClient('/api/boards/123/cards');
await apiClient('/api/cards/456', {
  method: 'PATCH',
  body: JSON.stringify({ status: 'done', columnId: 'col-3' }),
});
```

---

### 3.3 Handling Network Errors & Offline Scenarios

LIFF WebViews can experience intermittent connectivity, especially on mobile networks. Implement these patterns:

```javascript
// API client with retry logic
async function apiClientWithRetry(endpoint, options = {}, retries = 3) {
  const token = localStorage.getItem('kanban_auth_token');
  
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
      
      const response = await fetch(`https://your-api.com${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
      
    } catch (error) {
      if (i === retries - 1) throw error;
      
      // Exponential backoff: 1s, 2s, 4s
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
}

// Online/offline detection
window.addEventListener('online', () => {
  showToast('Back online - syncing changes...');
  syncPendingChanges();
});

window.addEventListener('offline', () => {
  showToast('You are offline - changes will be saved locally');
});

// Offline-first: Queue changes and sync when back online
class OfflineQueue {
  constructor() {
    this.queue = JSON.parse(localStorage.getItem('pending_changes') || '[]');
  }
  
  enqueue(operation) {
    this.queue.push({ ...operation, timestamp: Date.now() });
    this.save();
  }
  
  async sync() {
    while (this.queue.length > 0) {
      const operation = this.queue[0];
      try {
        await apiClient(operation.endpoint, operation.options);
        this.queue.shift(); // Remove on success
        this.save();
      } catch (error) {
        console.error('Sync failed for operation:', operation, error);
        break; // Stop syncing, retry later
      }
    }
  }
  
  save() {
    localStorage.setItem('pending_changes', JSON.stringify(this.queue));
  }
}
```

---

### 3.4 LIFF-Native UX Methods

#### liff.closeWindow()

Closes the LIFF app and returns the user to the LINE chat:

```javascript
// Close the Kanban board and return to LINE chat
function handleClose() {
  if (liff.isInClient()) {
    liff.closeWindow();
  } else {
    // Fallback for external browsers
    window.close();
  }
}
```

#### liff.sendMessages()

Send messages to the current chat room (useful for sharing Kanban board links or updates):

```javascript
async function shareBoardUpdate(boardName, taskCount) {
  if (!liff.isInClient()) {
    console.warn('Can only send messages from within LINE app');
    return;
  }
  
  try {
    await liff.sendMessages([
      {
        type: 'text',
        text: `Updated Kanban board: "${boardName}"\nTasks: ${taskCount}`,
      },
      {
        type: 'flex',
        altText: 'Kanban board summary',
        contents: {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: boardName,
                weight: 'bold',
                size: 'lg',
              },
              {
                type: 'text',
                text: `${taskCount} tasks in progress`,
                size: 'sm',
                color: '#888888',
              },
            ],
          },
        },
      },
    ]);
    
    liff.closeWindow(); // Close after sending
  } catch (error) {
    console.error('Failed to send message:', error);
  }
}
```

> **Note**: `chat_message.write` scope is required. Up to 5 messages can be sent at once.

#### liff.openWindow()

Open links in external browser (useful for linking to detailed task views):

```javascript
// Open task detail in external browser
function openTaskDetail(taskId) {
  liff.openWindow({
    url: `https://your-domain.com/tasks/${taskId}`,
    external: true, // Opens in device browser (outside LINE)
  });
}

// Open another page within LIFF
liff.openWindow({
  url: `https://your-domain.com/kanban/settings`,
  external: false, // Opens within LIFF browser
});
```

#### liff.shareTargetPicker()

Share the Kanban board with LINE friends or groups:

```javascript
async function shareBoardWithFriends(shareUrl) {
  try {
    await liff.shareTargetPicker([
      {
        type: 'text',
        text: 'Check out our project Kanban board:',
      },
      {
        type: 'uri',
        uri: shareUrl,
      },
    ]);
  } catch (error) {
    console.error('Share failed:', error);
  }
}
```

---

## 4. LINE Mini App Specifics

### 4.1 Difference Between LIFF App and LINE Mini App

| Feature | LIFF App | LINE Mini App |
|---------|---------|---------------|
| **Tech Stack** | LIFF SDK | LIFF SDK (same technology) |
| **Operation Environment** | LINE App (mobile), External browsers | LINE App (mobile only) |
| **LINE Review** | Not required | Required for "verified" status |
| **Service Messages** | Not available | Available |
| **Search Discovery** | Not available | Appears in LINE search |
| **Pin to Home** | Not available | Users can pin to LINE home tab |
| **Landing Page** | Not available | Built-in landing page |
| **Unverified Publishing** | N/A | Available (since Nov 2024) |

**Key Insight**: A LINE Mini App is essentially a **LIFF app that has been wrapped with additional LINE platform features** - discovery in search, service messages, home tab pinning, and a review/publishing process. The underlying technology is identical (LIFF SDK).

> **LINE Official Guidance**: "In the future, LIFF and the LINE MINI App will be integrated into a single brand. As a result of this integration, LIFF will be integrated into the LINE MINI App. For this reason, we recommend that you create a new LIFF app as a LINE MINI App."

---

### 4.2 LINE Mini App Review & Publishing Process

#### Two Publishing States

1. **Unverified MINI App** (new - available since Nov 2024)
   - Can be published **without review**
   - Some features are restricted
   - Good for development, testing, and internal use

2. **Verified MINI App**
   - Requires passing review by LY Corporation
   - Full feature access
   - Appears in LINE search results
   - Required for public/commercial apps

#### Review Criteria

The review checks:
1. Could it cause a disadvantage to users?
2. Does it conflict with regulations?
3. Is there a risk of Terms of Use violation?
4. Does it meet LINE's certification review criteria?
5. Will it adversely affect LINE's business or damage its credit?

#### Pre-Review Checklist

- [ ] Adheres to LINE MINI App Policy
- [ ] Icon meets specifications (safe area for landscape)
- [ ] Custom action button implemented
- [ ] Performance guidelines met
- [ ] Channel information is accurate and up-to-date
- [ ] Provider name matches "service provider"

#### Review Submission Steps

1. Complete all pre-review checks
2. Submit application in LINE Developers Console
3. Wait for review (review period varies)
4. If approved, app becomes "verified"

> **Note**: For Taiwan or Thailand, only channels under a **certified provider** can apply for verification review.

---

### 4.3 URL Configuration & Endpoint Server Requirements

#### Endpoint URL Requirements

| Requirement | Details |
|-------------|---------|
| **Protocol** | HTTPS only (no HTTP) |
| **URL Fragments** | Not allowed (`#fragment` is prohibited) |
| **Path** | Must be exact or allow sub-paths for `liff.init()` to work |
| **Domain** | Can use any domain you control |

#### LIFF URL Format for LINE Mini App

```
https://miniapp.line.me/{liffId}
```

(As of Dec 13, 2023, this replaced the older `https://liff.line.me/{liffId}` format for Mini Apps. Both URLs still work for backward compatibility.)

#### Development Setup with ngrok

For local development, use a tunnel to expose localhost:

```bash
# Install ngrok
npm install -g ngrok

# Start your dev server
npm run dev  # e.g., localhost:3000

# In another terminal, create tunnel
ngrok http http://localhost:3000

# Copy the HTTPS forwarding URL (e.g., https://1a2b-3c4d.ngrok.io)
# Paste it as the Endpoint URL in LINE Developers Console
```

---

### 4.4 Required Domains & HTTPS Requirements

#### HTTPS Certificate Requirements

- Must be a **valid certificate** from a trusted CA
- Self-signed certificates **not supported on iOS**
- TLS 1.2+ recommended (TLS 1.1+ for older Android compatibility)
- Complete trust chain required
- Certificate must not be expired
- Domain on certificate must match the endpoint domain

#### Web App Settings Tab (LINE Mini App Channel)

From the **Web app settings** tab of your LINE MINI App channel:
- You can set the **Endpoint URL**
- You **cannot** add additional LIFF apps (only the default Mini App LIFF)
- You **cannot** change scope or add friend option settings per LIFF app
- You **cannot** configure Module mode

These limitations are by design - the Mini App channel manages a single primary LIFF app.

---

## 5. UX/UI Best Practices

### 5.1 Mobile-Optimized Kanban Patterns

#### Horizontal Scroll with Visible Columns

For mobile screens, the most effective Kanban pattern is **horizontal scrolling** with partially visible adjacent columns as a hint:

```css
.kanban-board {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch; /* Smooth iOS scroll */
  scrollbar-width: none; /* Hide scrollbar Firefox */
}

.kanban-board::-webkit-scrollbar {
  display: none; /* Hide scrollbar Chrome/Safari */
}

.kanban-column {
  flex: 0 0 85vw; /* Each column takes 85% of viewport */
  scroll-snap-align: start;
  margin-right: 12px;
}
```

#### Collapsible/Expandable Columns (Alternative)

For boards with many columns, offer a collapsible mode:

```
[Board Title]           [All | 3 columns]
+---------------------+
| [To Do v] [In P~] [~] |
| +-------+ +-----+ +---+
| | Task 1| |Task3| |...|
| | Task 2| |Task4| |   |
| +-------+ +-----+ +---+
+---------------------+
```

#### Column Switcher (Single-Column View)

For very small screens, show one column at a time with a tab switcher:

```
[ To Do | In Progress | Done ]
+---------------------------+
| To Do                (3) |
| +-----------------------+ |
| | Design mockups        | |
| | Research competitors  | |
| | Write API spec        | |
| +-----------------------+ |
|  [+ Add Task]            |
+---------------------------+
```

#### Card Design for Mobile

- **Card height**: Keep cards compact (80-120px)
- **Touch targets**: Minimum 44x44px for buttons (Apple HIG) or 48x48px (Material Design)
- **Card spacing**: 8-12px between cards
- **Swipe actions**: Swipe left/right on cards for quick actions (move, delete, edit)
- **Visual indicators**: Color-coded labels, priority badges, assignee avatars

---

### 5.2 Touch-Friendly Drag-and-Drop Libraries

#### Recommended Libraries for LIFF WebView

| Library | Framework | Touch Support | Bundle Size | Notes |
|---------|-----------|--------------|-------------|-------|
| **@dnd-kit/core** | React | Excellent | ~10kb | Modern, accessible, very customizable |
| **react-beautiful-dnd** | React | Good (use rbd-compat) | ~30kb | Industry standard, smooth animations |
| **Pragmatic drag and drop** | Any | Native | Small | Atlassian's new library, framework-agnostic |
| **SortableJS** | Vanilla/Any | Excellent | ~18kb | Battle-tested, works with any framework |
| **interact.js** | Vanilla/Any | Good | ~35kb | Full gesture support, very flexible |

**Top Recommendation: @dnd-kit/core** for React apps

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

```jsx
// Basic @dnd-kit setup for Kanban
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

function KanbanBoard({ columns, cards }) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance to start (prevents accidental drags)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban-board">
        {columns.map(column => (
          <KanbanColumn key={column.id} column={column} />
        ))}
      </div>
      <DragOverlay>
        {activeCard ? <KanbanCard card={activeCard} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
```

**Key considerations for LIFF WebView drag-and-drop:**
- Set `activationConstraint.distance` to 8-10px to prevent accidental drags during scroll
- Use `touch-action: pan-x` or `pan-y` CSS to control scroll direction
- Ensure draggable handles don't interfere with horizontal board scrolling
- Test on actual devices - emulators don't fully capture touch behavior

---

### 5.3 Loading States & Skeleton Screens

Skeleton screens are essential for mobile LIFF apps because:
- WebView loading can feel slower than native apps
- Mobile networks have variable latency
- Users expect immediate visual feedback

```jsx
// Skeleton screen for Kanban board
function KanbanBoardSkeleton() {
  return (
    <div className="kanban-board-skeleton">
      {[1, 2, 3].map(i => (
        <div key={i} className="column-skeleton">
          <div className="skeleton skeleton-header" />
          {[1, 2, 3, 4].map(j => (
            <div key={j} className="skeleton skeleton-card" />
          ))}
        </div>
      ))}
    </div>
  );
}

// CSS for skeleton animation
.skeleton {
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e0e0e0 50%,
    #f0f0f0 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton-header { height: 36px; margin-bottom: 12px; }
.skeleton-card { height: 80px; margin-bottom: 8px; }
```

#### Loading State Strategy

| Phase | Duration | UI |
|-------|----------|-----|
| LIFF init | 0.5-2s | Minimal LINE-branded spinner |
| Auth exchange | 0.5-1s | Skeleton screen |
| Board data fetch | 0.5-3s | Full board skeleton |
| Card images | Background | Progressive image loading |

---

### 5.4 Color Scheme: Matching LINE App Aesthetics

#### LINE Brand Colors

| Role | Color | Hex Code | Usage |
|------|-------|----------|-------|
| **Primary Green** | LINE Green | `#06C755` | Primary actions, CTAs, progress indicators |
| **Alt Green** | Logo Green | `#00B900` | Brand elements, accents |
| **Text Primary** | Cod Gray | `#1E1E1E` | Headlines, card titles |
| **Text Secondary** | Dark Gray | `#666666` | Descriptions, timestamps |
| **Background** | White | `#FFFFFF` | App background |
| **Surface** | Light Gray | `#F5F5F5` | Column backgrounds, card hover |
| **Border** | Border Gray | `#E5E5E5` | Dividers, card borders |
| **Accent Blue** | Info Blue | `#00BFFF` | Links, info badges |
| **Warning** | Amber | `#FFA500` | Medium priority |
| **Danger** | Red | `#FF334B` | Delete actions, high priority |
| **Success** | Green | `#06C755` | Completed tasks, success states |

#### Recommended Kanban Color Palette

```css
:root {
  /* LINE-aligned base */
  --color-primary: #06C755;
  --color-primary-dark: #05A347;
  --color-background: #FFFFFF;
  --color-surface: #F7F8FA;
  --color-surface-column: #F5F6F8;
  --color-text-primary: #1E1E1E;
  --color-text-secondary: #666666;
  --color-text-tertiary: #999999;
  --color-border: #E5E5EA;
  --color-border-light: #EFEFEF;
  
  /* Kanban-specific */
  --color-todo: #8E8E93;
  --color-in-progress: #007AFF;
  --color-review: #FF9500;
  --color-done: #06C755;
  --color-blocked: #FF334B;
  
  /* Priority */
  --color-priority-high: #FF334B;
  --color-priority-medium: #FF9500;
  --color-priority-low: #8E8E93;
  
  /* Card */
  --card-bg: #FFFFFF;
  --card-border: #E5E5EA;
  --card-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  --card-radius: 12px;
  
  /* Column */
  --column-radius: 16px;
  --column-padding: 12px;
  --column-header-height: 44px;
}
```

#### Visual Design Guidelines

- **Card corners**: 12px radius (friendly, modern feel)
- **Column corners**: 16px radius
- **Card shadow**: Subtle, 0 1px 3px (avoids heavy shadows that look dated)
- **Font**: System font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`)
- **Line height**: 1.4 for card content
- **Density**: Cards should be visually distinct with adequate whitespace

---

## 6. Code Reference & Patterns

### 6.1 Complete LIFF Initialization Pattern

```javascript
// liff-client.js
class LiffClient {
  constructor(liffId, apiBaseUrl) {
    this.liffId = liffId;
    this.apiBaseUrl = apiBaseUrl;
    this.appToken = null;
  }
  
  async init() {
    await liff.init({ 
      liffId: this.liffId,
      withLoginOnExternalBrowser: true, // Auto-login in external browsers
    });
    
    // For external browsers, check login status
    if (!liff.isInClient() && !liff.isLoggedIn()) {
      liff.login({ redirectUri: window.location.href });
      return false; // Init will continue after redirect
    }
    
    return true;
  }
  
  async authenticateWithBackend() {
    const idToken = liff.getIDToken();
    if (!idToken) {
      throw new Error('Failed to get ID token');
    }
    
    const response = await fetch(`${this.apiBaseUrl}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    
    if (!response.ok) {
      throw new Error('Authentication failed');
    }
    
    const { token, user } = await response.json();
    this.appToken = token;
    localStorage.setItem('kanban_auth_token', token);
    return user;
  }
  
  async api(endpoint, options = {}) {
    const token = this.appToken || localStorage.getItem('kanban_auth_token');
    
    const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });
    
    if (response.status === 401) {
      // Try to re-authenticate
      localStorage.removeItem('kanban_auth_token');
      const user = await this.authenticateWithBackend();
      // Retry the request
      return this.api(endpoint, options);
    }
    
    return response.json();
  }
  
  close() {
    if (liff.isInClient()) {
      liff.closeWindow();
    } else {
      window.close();
    }
  }
  
  getUserInfo() {
    const decoded = liff.getDecodedIDToken();
    return {
      lineUserId: decoded?.sub,
      name: decoded?.name,
      email: decoded?.email,
      avatar: decoded?.picture,
    };
  }
}

// Usage
const client = new LiffClient('YOUR_LIFF_ID', 'https://your-api.com');

async function main() {
  const initialized = await client.init();
  if (!initialized) return; // Wait for login redirect
  
  const user = await client.authenticateWithBackend();
  console.log('Logged in as:', user.name);
  
  // Load Kanban data
  const boards = await client.api('/api/boards');
  renderKanbanBoards(boards);
}

main();
```

### 6.2 React Integration Pattern

```jsx
// contexts/LiffContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import liff from '@line/liff';

const LiffContext = createContext(null);

export function LiffProvider({ liffId, children }) {
  const [isReady, setIsReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function init() {
      try {
        await liff.init({ liffId, withLoginOnExternalBrowser: true });
        
        if (!liff.isInClient() && !liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href });
          return;
        }
        
        setIsLoggedIn(true);
        
        // Get user info from decoded ID token
        const decoded = liff.getDecodedIDToken();
        if (decoded) {
          setUser({
            lineUserId: decoded.sub,
            name: decoded.name,
            email: decoded.email,
            avatar: decoded.picture,
          });
        }
        
        setIsReady(true);
      } catch (err) {
        setError(err);
      }
    }
    
    init();
  }, [liffId]);
  
  if (error) {
    return <div>Error: {error.message}</div>;
  }
  
  if (!isReady) {
    return <KanbanSkeleton />; // Your skeleton component
  }
  
  return (
    <LiffContext.Provider value={{ liff, isLoggedIn, user, isInClient: liff.isInClient() }}>
      {children}
    </LiffContext.Provider>
  );
}

export function useLiff() {
  const context = useContext(LiffContext);
  if (!context) throw new Error('useLiff must be used within LiffProvider');
  return context;
}

// App.jsx
function App() {
  return (
    <LiffProvider liffId={import.meta.env.VITE_LIFF_ID}>
      <KanbanApp />
    </LiffProvider>
  );
}

// KanbanApp.jsx
function KanbanApp() {
  const { user, isInClient } = useLiff();
  const [boards, setBoards] = useState([]);
  
  useEffect(() => {
    async function loadBoards() {
      const data = await apiClient('/api/boards');
      setBoards(data);
    }
    loadBoards();
  }, []);
  
  return (
    <div className="kanban-app">
      <header className="kanban-header">
        <h1>My Boards</h1>
        {user && (
          <div className="user-info">
            <img src={user.avatar} alt={user.name} className="avatar" />
          </div>
        )}
      </header>
      <BoardList boards={boards} />
    </div>
  );
}
```

### 6.3 Environment Configuration

```javascript
// config.js
const config = {
  // LIFF ID from LINE Developers Console
  liffId: import.meta.env.VITE_LIFF_ID,
  
  // Backend API base URL
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  
  // Environment detection
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  
  // Feature flags
  features: {
    offlineMode: true,
    pushNotifications: false,
    realTimeSync: false,
  },
};

export default config;
```

```env
# .env.development
VITE_LIFF_ID=1234567890-XXXXXXXX
VITE_API_BASE_URL=https://localhost:8080

# .env.production
VITE_LIFF_ID=1234567890-YYYYYYYY
VITE_API_BASE_URL=https://api.your-domain.com
```

---

## 7. Official Documentation References

### Primary Documentation

| Resource | URL |
|----------|-----|
| **LIFF Overview** | https://developers.line.biz/en/docs/liff/overview/ |
| **Developing LIFF Apps** | https://developers.line.biz/en/docs/liff/developing-liff-apps/ |
| **LIFF API Reference** | https://developers.line.biz/en/reference/liff/ |
| **Registering LIFF Apps** | https://developers.line.biz/en/docs/liff/registering-liff-apps/ |
| **Opening LIFF Apps** | https://developers.line.biz/en/docs/liff/opening-liff-app/ |
| **Minimizing LIFF Browser** | https://developers.line.biz/en/docs/liff/minimizing-liff-browser/ |
| **LIFF Release Notes** | https://developers.line.biz/en/docs/liff/release-notes/ |

### LINE Mini App Documentation

| Resource | URL |
|----------|-----|
| **LINE MINI App Overview** | https://developers.line.biz/en/docs/line-mini-app/ |
| **Developing Web-to-Mini-App** | https://developers.line.biz/en/docs/line-mini-app/develop/web-to-mini-app/ |
| **Submission Guide** | https://developers.line.biz/en/docs/line-mini-app/submit/submission-guide/ |
| **LINE MINI App Policy** | https://terms2.line.me/LINE_MINI_App?lang=en/ |
| **Console Guide** | https://developers.line.biz/en/docs/line-mini-app/discover/console-guide/ |

### Authentication & ID Tokens

| Resource | URL |
|----------|-----|
| **Verify ID Token** | https://developers.line.biz/en/docs/line-login/verify-id-token/ |
| **LINE Login Overview** | https://developers.line.biz/en/docs/line-login/ |
| **Get Profile from ID Token** | https://developers.line.biz/en/reference/line-login/#verify-id-token |

### Tools & Resources

| Resource | URL |
|----------|-----|
| **LIFF Playground (try features)** | https://liff-playground.netlify.app/ |
| **LIFF CLI (GitHub)** | https://github.com/line/liff-cli |
| **LIFF Inspector (DevTools)** | https://github.com/line/liff-inspector |
| **Create LIFF App** | https://developers.line.biz/en/docs/liff/cli-tool-create-liff-app/ |
| **LINE Design System** | https://designsystem.line.me/ |
| **LINE Developers Console** | https://developers.line.biz/console/ |

### ID Token Verification References

| Resource | URL |
|----------|-----|
| **LINE JWK Endpoint** | `https://api.line.me/oauth2/v2.1/certs` |
| **LINE OpenID Configuration** | `https://access.line.me/.well-known/openid-configuration` |
| **Verify ID Token API** | `POST https://api.line.me/oauth2/v2.1/verify` |

---

## Quick-Start Checklist for Kanban Board Development

### Phase 1: Setup
- [ ] Create LINE Business ID account
- [ ] Create a Provider in LINE Developers Console
- [ ] Create a LINE MINI App channel
- [ ] Register LIFF app with `Full` view size
- [ ] Set endpoint URL to your HTTPS web app
- [ ] Configure scopes: `openid`, `profile`, `email`
- [ ] Note your LIFF ID

### Phase 2: Frontend Development
- [ ] Initialize LIFF SDK with your LIFF ID
- [ ] Implement login/auth flow
- [ ] Exchange LINE ID token for backend JWT
- [ ] Build Kanban board UI with horizontal scroll
- [ ] Integrate drag-and-drop library (@dnd-kit recommended)
- [ ] Implement loading skeletons
- [ ] Add offline queue for changes
- [ ] Test in LIFF browser (iOS and Android)

### Phase 3: Backend Development
- [ ] Implement ID token verification using LINE JWK endpoint
- [ ] Create user authentication endpoint
- [ ] Issue your own JWT for session management
- [ ] Build Kanban CRUD APIs (boards, columns, cards)
- [ ] Configure CORS for your LIFF endpoint domain
- [ ] Implement proper error handling

### Phase 4: Publishing
- [ ] Test thoroughly in LIFF browser
- [ ] Publish as unverified MINI App (for immediate use)
- [ ] (Optional) Submit for verified MINI App review
- [ ] Share `https://miniapp.line.me/{liffId}` with users

---

*Document compiled from official LINE documentation, developer community resources, and technical analysis as of 2025. All official documentation links are current. For the latest updates, always refer to the official LINE Developers site.*
