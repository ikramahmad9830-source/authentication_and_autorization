# AuthNexus // Smart Identity & Role-Based Access Portal

A sleek, intuitive, and modern web application for testing and interacting with FastAPI JWT Authentication, Role-Based Access Control (RBAC), and protected API endpoints.

---

## ✨ Features & Architecture

### 1. Modern & Intuitive Top Navigation Bar
- **Authentication**: Sign In & Register with one-click demo presets and live password entropy meter.
- **Profile API (`/profile`)**: Live interactive profile dashboard with user avatar, clearance role, session freshness countdown, and permission matrix.
- **User Portal (`/user`)**: Dedicated workspace for users with `user` role (`require_role(['user'])`).
- **Admin Portal (`/admin`)**: Executive control center for users with `admin` role (`require_role(['admin'])`), complete with graceful 403 Forbidden handling for non-admins.
- **Protected API (`/protected`)**: Real-time Bearer token verification and live gateway greeting.
- **Token & API Inspector**: Diagnostic test suite to probe all 4 endpoints in 1 click and deconstruct JWT claims.

### 2. Beautiful Dedicated View Pages (Not Raw Dictionaries)
- Each endpoint renders a custom-crafted, visually rich page with cards, metrics, access checkmarks, and badges.
- Includes a toggleable/collapsible **Live API Response Inspector** displaying exact JSON payloads with syntax highlighting, HTTP status codes, and latency measurements.

### 3. Real-Time JWT Session Security
- **OAuth2 Bearer Flow**: `POST /login` with `OAuth2PasswordRequestForm`.
- **User Registration**: `POST /SignUp` with `User_create` model.
- **HMAC HS256 Token Deconstruction**: Color-coded segments for Header, Payload, and Signature.
- **Active Expiration Timer**: Real-time countdown tracking the 30-minute JWT lifespan.
- **Cryptographic Tamper Sandbox**: Mutates token signature to test and verify FastAPI zero-trust rejection with `401 Unauthorized`.

---

## 🚀 Quick Start Guide

### Step 1: Start the FastAPI Backend
Open a terminal in the project directory and run:
```bash
uvicorn main:app --reload --port 8000
```
> The API will be live at `http://127.0.0.1:8000` with Swagger documentation at `http://127.0.0.1:8000/docs`.

### Step 2: Open the Frontend
You can launch the frontend using any method:

- **Option A (VS Code Live Server)**:
  Right-click `index.html` and choose **"Open with Live Server"**.

- **Option B (Python HTTP Server)**:
  ```bash
  python -m http.server 5500
  ```
  Then open `http://127.0.0.1:5500` in your browser.

- **Option C (Direct Browser)**:
  Double-click `index.html` to open directly in any modern browser.
