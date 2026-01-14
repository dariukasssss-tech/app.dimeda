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

### Role-Based Access Control (Jan 13, 2026)
- Three-panel login page
- Admin: Full access
- Technician: Dashboard, Calendar, Services (filtered to assigned tasks)
- Customer: Issue registration only

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

## P1 - Upcoming Tasks
- Email notifications for upcoming maintenance (7 days in advance)

## P2 - Future Tasks
- Bulk import products from CSV
- Progressive Web App (PWA) for offline technician access

## Refactoring Needed
- Break down `/app/backend/server.py` into modules (routes/, models/, services/)
- Simplify `/app/frontend/src/App.js` with separate portal parent components

## Test Reports
- `/app/test_reports/iteration_2.json` - Latest comprehensive test (100% pass)
- `/app/tests/test_technician_customer_portals.py` - API tests for portals
