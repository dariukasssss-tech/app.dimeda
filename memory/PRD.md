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

### Warranty Service Workflow (Jan 14, 2026)
1. **Warranty Service Routing:**
   - When issue is resolved as "Warranty Service", a routed "Make Service" issue is created
   - Original issue status changes to "in_service" (not resolved yet)
   - Routed issue type is "make_service" with `[Warranty Service]` prefix

2. **Services Page Restructured:**
   - 4 tabs: In Progress, In Service, Resolved, Records
   - "In Service" tab shows:
     - Awaiting Warranty Service (parent issues) - **NO DUPLICATES**
     - Action buttons: "Complete Service" and "View Track"
   - "Resolved" tab shows issues grouped by Warranty/Non-Warranty

3. **Issue Tracking Popup (View Track):**
   - Full track of warranty flow: Original Issue → Warranty Service Issue
   - Shows product info, issue details, resolution notes, timestamps
   - **Technician Assignment Feature:** Admin can assign/re-assign technician directly from popup
   - Accessible from both In Service and Resolved tabs

4. **Technician Calendar Integration:**
   - When technician is assigned to warranty service issue, calendar entry is created
   - Entry source: "warranty_service", priority: "24h"
   - Task appears on assigned technician's calendar and Services page

5. **Complete Workflow:**
   - Issue reported → In Progress → Resolve as Warranty → Creates Make Service issue
   - Original issue: "in_service" status, waiting
   - Admin assigns technician via View Track popup → Calendar entry created
   - Technician completes service → Both issues marked "resolved"

### Admin Portal Enhancements (Jan 14, 2026)
1. **Dashboard Recent Services Improvements:**
   - Now shows 10 records (was 5)
   - Displays: Service type, Warranty status, S/N, City, Technician, Description preview, Date

2. **Interactive Maintenance Calendar Stats:**
   - "Upcoming (30 days)", "Overdue", "This Month" cards are now clickable
   - Shows popup table with: Date, Product S/N, City, Type, Technician, Priority, Notes

3. **Issue Code System Implemented:**
   - Every new issue gets a unique code: `YYYY_SERIAL_MM_DD_ORDER`
   - Example: `2026_VLN-00_01_14_1`
   - Code visible across Admin, Technician, and Customer portals

### Customer Portal Enhancements (Jan 14, 2026)
- Added **Status/Condition Filter** (Filter #2): Reported, Registered, In Progress, Resolved
- **3-Date Display** for resolved issues: Reported, Registered, Resolved dates
- Issues sorted by latest date on top
- Issue codes visible on all issues

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
- `/app/test_reports/iteration_4.json` - Latest technician workflow test (100% pass, 11/11 backend tests)
- `/app/test_reports/iteration_3.json` - Warranty workflow test (100% pass, 8/8 backend tests)
- `/app/test_reports/iteration_2.json` - Previous comprehensive test (100% pass)
- `/app/tests/test_technician_workflow_v2.py` - Full technician workflow tests
- `/app/tests/test_warranty_workflow.py` - Warranty workflow API tests
- `/app/tests/test_technician_customer_portals.py` - API tests for portals

## Bug Fixes (Jan 14, 2026)

### Issue Deletion Cascade Fix
**Problem:** When issues were deleted from the Issues page, associated scheduled maintenance entries remained in the database, causing orphaned calendar entries and incorrect "Overdue" counts.

**Fix:** Updated `delete_issue` endpoint to:
1. Delete all related `scheduled_maintenance` entries with matching `issue_id`
2. If parent issue with warranty child - also delete child issue and its maintenance entries
3. If child (warranty route) issue - update parent to remove `child_issue_id` reference
4. Return message: "Issue and related entries deleted successfully"

### Technician Portal Workflow Update (Jan 14, 2026)
**Simplified Warranty Flow (No Child Issues):**
1. **Calendar Only First:** Assigned issues appear on technician's Calendar only (not in Services)
2. **Start Work:** Clicking "Start Work" moves issue to Services "In Progress Issues" section
3. **Two-Section Services Page:**
   - "In Progress Issues" - Active work items
   - "Service Records" - Issues with warranty/non-warranty service type
4. **Simplified Warranty Flow:**
   - Resolving as "Warranty Service" changes status to "in_service" (Awaiting Repair)
   - NO child issue created - repairs tracked on original issue via `repair_attempts` array
   - Same issue code throughout entire workflow
   - 24h timer counts from warranty_repair_started_at timestamp
5. **Detailed Popup Dialog:**
   - Clicking any card opens large popup with ALL issue info (same in Services and Calendar)
   - Shows: Status banner with timer, Issue details, Product info, Resolution notes, Timestamps
   - "Continue" button for Awaiting Repair status
   - "Complete Repair" button for in-progress repairs
   - Dropdown for multiple repair attempts if >2
6. **Complete Repair:** Completing repair marks issue as resolved
