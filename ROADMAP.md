# Customer Requirements

## Frontend Corrections
- Remove Google Plus and LinkedIn options from the login page; retain only Email and Password.
- Transition the website from static to dynamic, making all options fully functional.
- Replace the static map image with a fully functional interactive map.
- Add a mechanism/option for users to provide feedback.
- Add a "Wallet / Add Money" feature for Garage Owners to track revenue/reports.

## Main Functionality (User & Garage Owner)
The platform consists of two main user roles: **User (Vehicle Owner)** and **Garage Owner**. Separate login and signup flows exist for both.

### 1. User (Vehicle Owner) Flow
- **Location-based Search:** On login, request user location. If allowed, show nearest garages. Users can also manually search garages by area.
- **Garage Display:** Show registered, verified garages with accurate details (name, owner, address (Ahmedabad, Gujarat), location, available timing, price range, rating, and feedback).
- **Vehicle & Bookings:** Users can add multiple vehicles, book services at garages, and view their past booking/service history dashboard.
- **Profile Management:** Users can add/update their profile details.
- **Interactive Map:** Ensure the map works perfectly. Add an option for full-screen mode and an option to "Open in Google Maps".
- **Emergency Petrol Call:** An emergency button that, when clicked, allows admins to find nearby help and contact the user immediately.

### 2. Garage Owner Flow
- **Registration & Setup:** Garage Owners must sign up, providing garage info, address, and pinpointing location on the map. (Must be an Ahmedabad, Gujarat location with different credentials and varied addresses per garage).
- **Dashboard & Revenue:** After login, owners can view ratings, reviews, feedback, and revenue tracking. They can update revenue manually.
- **Service Offerings:** Owners can update available service timings, list of services, and parts availability.
- **Service History:** Owners can view past service history (prices charged, service type, date, time, etc.).
- **Manual Updates:** Owners can manually update any of their garage details.
- **Contact Info:** Each garage should display a contact number (WhatsApp and calling capabilities) and an email.

---

# Project Roadmap

This roadmap defines the development phases for the backend and final system integration.

---

# Phase 1 — Backend Setup

Goal: Create base backend infrastructure.

Tasks:

* Setup backend framework
* Create project structure
* Configure environment variables
* Setup database connection
* Setup basic server

Deliverables:

* Backend repository ready
* Server running
* Database connected

---

# Phase 2 — Authentication System

Goal: Implement user management.

Tasks:

* User registration API
* Login API
* JWT authentication
* Password hashing
* Role based access

Deliverables:

* Auth APIs working
* Secure login flow

---

# Phase 3 — Core APIs

Goal: Connect frontend with backend.

Tasks:

* Create main data models
* Build CRUD APIs
* Input validation
* API documentation

Deliverables:

* Functional API endpoints
* Frontend connected to backend

---

# Phase 4 — Business Logic

Goal: Implement system logic.

Tasks:

* Reports generation
* Notification system
* Data processing
* Logging

Deliverables:

* Backend services working

---

# Phase 5 — Testing

Tasks:

* API testing
* Integration testing
* Bug fixes

---

# Phase 6 — Deployment

Tasks:

* Production environment setup
* Database deployment
* Backend hosting
* Domain configuration
