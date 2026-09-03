# Civilink Community Platform

A full-stack role-based community platform connecting **Volunteers (Users)**, **NGOs**, and **Corporate Organizations**, supervised by an **Administrator**.

---

## 📂 Project Structure for VS Code

```
scratch/
├── .vscode/
│   └── launch.json            # 1-Click VS Code Run & Debug configuration
├── database/
│   ├── schema.sql             # Complete MySQL Database Schema
│   └── seed.sql               # Default sample records
├── frontend/
│   ├── css/
│   │   └── style.css          # Bootstrap 5 customized styles & badges
│   ├── js/
│   │   ├── api.js             # REST API Client handling JWT tokens & errors
│   │   └── app.js             # Shared Navigation, Toast alerts & Client-side Route Guards
│   ├── index.html             # Home page (Live stats, featured events & urgent requests)
│   ├── login.html             # Unified Login page with 1-click test credentials
│   ├── register.html          # Public Registration for Volunteer (User), NGO, Organization
│   ├── admin-register.html    # Master Admin Registration guarded by Master Secret Passkey
│   ├── activities.html        # Activities directory, filters, post event & join drives
│   ├── requests.html          # Community help requests with urgency filter & submit modal
│   └── admin.html             # Full Admin Dashboard (Stats, User Control, Moderation, Activities)
└── server/
    ├── config/
    │   └── db.js              # MySQL connection pool + high-speed in-memory fallback
    ├── middleware/
    │   └── authMiddleware.js  # JWT verification & strict role-based access control (RBAC)
    ├── routes/
    │   ├── authRoutes.js      # Register, Admin Register, Login, Profile
    │   ├── activityRoutes.js  # CRUD & Participation endpoints
    │   ├── requestRoutes.js   # Submit, List, Delete help requests
    │   └── adminRoutes.js     # Protected admin metrics, user management & moderation
    ├── package.json           # Dependencies and start scripts
    └── server.js              # Express server entry point & static frontend server
```

---

## 🚀 How to Open and Run in VS Code

### 1. Open the Project Folder in VS Code
- Open **Visual Studio Code**.
- Go to `File` ➔ `Open Folder...`.
- Navigate and select:
  ```
  C:\Users\LENOVO\.gemini\antigravity\scratch
  ```

### 2. Open the Integrated Terminal in VS Code
- Press ``Ctrl + ` `` (Backtick) or go to `Terminal` ➔ `New Terminal`.
- Navigate into the server directory:
  ```bash
  cd server
  ```

### 3. Start the Server
- Run the server with:
  ```bash
  npm start
  ```
- Or run with automatic reload during development:
  ```bash
  npm run dev
  ```
- Alternatively, press **F5** in VS Code to start via the built-in debugger.

### 4. View the Website in your Browser
Once the server is running, open:
- 🌐 **Home Page**: [http://localhost:5000](http://localhost:5000)
- 🔑 **Login Page**: [http://localhost:5000/login.html](http://localhost:5000/login.html)
- 🛡️ **Admin Panel**: [http://localhost:5000/admin.html](http://localhost:5000/admin.html)

---

## 🔑 Test Accounts (Pre-Seeded)

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@platform.com` | `Admin@123` | Master Admin Console (`/admin.html`) |
| **NGO** | `contact@greenearth.ngo` | `Ngo@123` | Post & Manage Activities |
| **ORG** | `csr@techforward.org` | `Org@123` | Host CSR Campaigns |
| **USER** | `john.doe@example.com` | `User@123` | Volunteer & Request Aid |

**Master Admin Key** for registering new administrators:
```
ADMIN_MASTER_SECRET_2026
```
