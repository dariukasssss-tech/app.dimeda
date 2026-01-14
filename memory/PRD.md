# Dimeda.lt Service Management App - PRD

## Original Problem Statement
Full-stack application for "Dimeda.lt", a service partner for "www.medirol.cz". The app is intended for technicians to manage the service and maintenance of "Medirol Vivera Monobloc" stretchers.

## Product Overview
Three-portal system with role-based access:
- **Admin Portal:** Full system access for administrators
- **Technician Portal:** Limited view for assigned tasks only
- **Customer Pro Portal:** Issue registration for customers

## Tech Stack
- **Backend:** FastAPI (Python)
- **Frontend:** React, Tailwind CSS, Shadcn UI
- **Database:** MongoDB
- **Authentication:** Multi-level token-based (JWT with role claim)

## Core Features

### Product Management
- Register, edit, and view products
- Serial number, model, city location tracking

### Issue Tracking
- Technicians and Customers can report issues
- Status flow: Reported → Registered → In Progress → Resolved
- SLA management (12-hour timer for customer issues)

### Service History
- Log service records for each product
- Warranty/Non-warranty tracking

### Maintenance Scheduling
- Calendar with automatic scheduling
- Task tracking by technician

### Dashboard
- Key stats overview
- Open issues summary

### Reporting & Export
- CSV export
- PDF inspection reports (jspdf)

## Authentication Credentials
- **Admin:** `admin2025`
- **Technician:** `service2025`
- **Customer:** `customer2025`

## Recent Updates (January 2026)

### Major Refactoring Complete (Jan 14, 2026)
**Backend Refactored:**
- `server.py`: 960 lines → 71 lines (93% reduction)
- Created modular structure:
  - `/backend/models/` - Pydantic models (product, service, issue, maintenance, auth, technician)
  - `/backend/routes/` - API handlers (auth, products, services, issues, maintenance, export, stats, technician)
  - `/backend/core/` - Config, database, auth middleware

**Frontend Refactored:**
- `App.js`: 651 lines → 190 lines (71% reduction)
- Created layout components:
  - `/layouts/AdminLayout.jsx` - Admin portal layout with navigation
  - `/layouts/CustomerLayout.jsx` - Customer portal layout
  - `/layouts/TechnicianLayout.jsx` - Technician portal layout
  - `/components/Navigation.jsx` - Admin navigation with notifications

### Customer Portal Enhancements (Jan 14, 2026)
- Added **Status/Condition Filter** (Filter #2): Reported, Registered, In Progress, Resolved
- **3-Date Display** for resolved issues: Reported, Registered, Resolved dates
- Issues sorted by latest date on top
- City filter (Filter #1) retained

### Technician Portal Interactivity (Jan 14, 2026)
- "Start Work" button on Calendar for scheduled issues
- Marks issue as "In Progress" when clicked
- Services page shows "In Progress Issues" section
- "Resolve Issue" dialog with warranty/non-warranty options

## Database Schema

### Products
```
{serial_number, model_name, city, location_detail, notes, registration_date, status}
```

### Issues
```
{product_id, issue_type, severity, title, description, status, technician_name, 
technician_assigned_at, resolved_at, warranty_service_type, estimated_fix_time, 
estimated_cost, product_location, source, created_at, resolution}
```

### Services
```
{product_id, technician_name, service_type, description, service_date, issues_found, warranty_status}
```

### Scheduled Maintenance
```
{product_id, scheduled_date, maintenance_type, technician_name, status, notes, source, issue_id}
```

## Code Architecture (Post-Refactoring)

### Backend Structure
```
/app/backend/
├── server.py           # Main app entry (71 lines)
├── core/
│   ├── config.py       # Configuration and constants
│   ├── database.py     # MongoDB connection
│   └── auth.py         # Authentication middleware
├── models/
│   ├── product.py
│   ├── service.py
│   ├── issue.py
│   ├── maintenance.py
│   ├── auth.py
│   └── technician.py
└── routes/
    ├── auth.py
    ├── products.py
    ├── services.py
    ├── issues.py
    ├── maintenance.py
    ├── export.py
    ├── stats.py
    └── technician.py
```

### Frontend Structure
```
/app/frontend/src/
├── App.js              # Main app entry (190 lines)
├── layouts/
│   ├── AdminLayout.jsx
│   ├── CustomerLayout.jsx
│   └── TechnicianLayout.jsx
├── components/
│   ├── Navigation.jsx  # Admin navigation with notifications
│   └── ui/             # Shadcn UI components
└── pages/              # All page components
```

## P1 - Upcoming Tasks
- Email notifications for upcoming maintenance (7 days in advance)

## P2 - Future Tasks
- Bulk import products from CSV
- Progressive Web App (PWA) for offline technician access

## Test Reports
- `/app/test_reports/iteration_2.json` - Latest comprehensive test (100% pass)
- `/app/tests/test_technician_customer_portals.py` - API tests for portals
