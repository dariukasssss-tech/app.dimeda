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

### Product Details Restructure & Model Type Enhancement (Jan 15, 2026)

**Product Table Updates:**
- Added "Model Type" column with colored badges (Blue "Powered", Teal "Roll-in")
- Table now shows: Serial Number, Model (Name), Model Type, City, Location, Registered, Next Maintenance, Status, Actions

**Product Details Sheet (EYE button) Updates:**
- Now shows "Model Name" and "Model Type" separately
- Model Type displayed with colored badge (blue for Powered, teal for Roll-in)
- Shows: Model Name, Model Type, City, Location, Registered date

**Product Details Tabs Restructured:**
1. **Issues Tab** → Only shows **active issues** (open, in_progress)
   - When resolved, issues move to Services tab
   - Rich display: badges, issue code, technician, contact details, SLA timer

2. **Services Tab** → Now shows **resolved issues** with detailed resolution
   - Previously showed service records
   - Now shows: all badges, issue code, technician, contact details
   - Resolution prominently displayed in green box
   - Timestamps for Reported and Resolved dates

3. **Maintenance Tab** → Only shows **yearly/routine maintenance**
   - Removed customer issues and issue-related maintenance items
   - Clean display with "Routine", "scheduled", and "Yearly" badges

### Contact Details Popup Feature (Jan 15, 2026)
- Added ContactDetailsPopup component for quick customer contact info display
- Available on issue cards in Admin and Technician portals

### Roll-in vs Powered Stretcher Business Logic (Jan 15, 2026)
**Model Types:**
- "Powered Stretchers" - Have SLA timers, auto-scheduled maintenance
- "Roll-in Stretchers" - No SLA, manual scheduling by technician

**Business Rules:**
- SLA timers only apply to Powered Stretchers
- SLA timers hidden for resolved issues
- Roll-in issues create maintenance tasks with `pending_schedule` status
- Technicians manually schedule Roll-in maintenance tasks
- Distinct UI: Roll-in has teal badge/border, Powered has blue badge

### Customer Management Feature (Jan 15, 2026)
**Backend:**
- Created `/backend/models/customer.py` - Customer data model
- Created `/backend/routes/customers.py` - CRUD API endpoints
- Endpoints: GET/POST `/api/customers`, GET/PUT/DELETE `/api/customers/{id}`, GET `/api/customers/by-city/{city}`

**Frontend:**
- Created `/pages/Customers.jsx` - Full customer management page with:
  - City statistics cards (clickable filters)
  - Search and city filter
  - Customer table with edit/delete actions
  - Add Customer dialog
- Updated Navigation component with 3-dot menu (⋮):
  - "Customers" - navigates to /customers page
  - "Add Customer" - opens Add Customer dialog directly
- Added route `/customers` to AdminLayout

**Customer Fields:**
- Name (company/institution name) - required
- City (main connection point in system) - required
- Address
- Contact Person
- Phone
- Email

**i18n Support:** Full English and Lithuanian translations for all customer-related text

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

### P1 Component Refactoring (Jan 15, 2026)
**Line Count Reductions:**
- `Services.jsx`: 1570 → 1228 lines (342 lines, -22%)
- `TechnicianCalendar.jsx`: 1290 → 1060 lines (230 lines, -18%)
- `MaintenanceCalendar.jsx`: 1294 → 1203 lines (91 lines, -7%)
- **Total: 4154 → 3491 lines (663 lines removed, -16%)**

**Reusable Components Created:**
- `/components/issues/IssueCard.jsx` (273 lines) - Issue cards with badges, SLA, Roll-in support
- `/components/issues/ResolvedIssueCard.jsx` (120 lines) - Resolved issues with warranty/non-warranty
- `/components/issues/InServiceIssueCard.jsx` (145 lines) - In-service warranty issues
- `/components/services/ServiceRecordCard.jsx` (99 lines) - Service record display
- `/components/maintenance/MaintenanceTaskCard.jsx` (271 lines) - Maintenance task cards for calendars

**Benefits:**
- Improved code maintainability and readability
- Consistent UI across Admin, Technician, and Customer portals
- Easier to add new features or modify existing card designs
- Reduced code duplication

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
{serial_number, model_name, model_type, city, location_detail, notes, registration_date, status}
```
- model_type: "powered" | "roll_in"

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
{product_id, scheduled_date, maintenance_type, technician_name, status, notes, source, issue_id, priority}
```
- scheduled_date: Optional (null for pending_schedule)
- status: "scheduled" | "in_progress" | "completed" | "pending_schedule"
- source: "auto_yearly" | "customer_issue" | "issue"

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
├── routes/
│   ├── auth.py
│   ├── products.py
│   ├── services.py
│   ├── issues.py
│   ├── maintenance.py
│   ├── export.py
│   ├── stats.py
│   ├── technician.py
│   └── translations.py  # i18n API endpoint
└── translations/        # i18n JSON files
    ├── en.json          # English
    └── lt.json          # Lithuanian
```

### Frontend Structure
```
/app/frontend/src/
├── App.js              # Main app entry (190 lines)
├── contexts/
│   └── TranslationContext.jsx  # i18n React Context
├── layouts/
│   ├── AdminLayout.jsx
│   ├── CustomerLayout.jsx
│   └── TechnicianLayout.jsx
├── components/
│   ├── Navigation.jsx       # Admin navigation with notifications
│   ├── LanguageSwitcher.jsx # Language dropdown component
│   ├── common/              # Reusable common components
│   │   ├── Badges.jsx       # Status, Warranty, Severity badges
│   │   ├── UIElements.jsx   # Loading, Empty, Error states
│   │   ├── ProductUtils.jsx # Product info helpers
│   │   └── index.js
│   └── ui/                  # Shadcn UI components
└── pages/                   # All page components
```

## P1 - Upcoming Tasks
- Complete i18n integration for all remaining hardcoded strings in page components
- Email notifications for upcoming maintenance (7 days in advance)

## P2 - Future Tasks
- Bulk import products from CSV
- Progressive Web App (PWA) for offline technician access

## Test Reports
- `/app/test_reports/iteration_6.json` - i18n feature test (100% pass)
- `/app/test_reports/iteration_5.json` - Simplified warranty workflow test (100% pass)
- `/app/test_reports/iteration_4.json` - Previous technician workflow test
- `/app/test_reports/iteration_3.json` - Warranty workflow test (100% pass)
- `/app/tests/test_simplified_warranty_workflow.py` - Simplified warranty tests
- `/app/tests/test_technician_workflow_v2.py` - Full technician workflow tests

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

### Internationalization (i18n) Feature (Jan 15, 2026)
**Backend:**
- Created `/backend/translations/` directory with JSON files for each language
- `en.json` - English translations (250+ keys)
- `lt.json` - Lithuanian translations (250+ keys)
- Added `/api/translations/{lang}` endpoint to serve translations
- Added `/api/translations/languages` endpoint to list available languages
- Added `/api/translations/{lang}/validate` endpoint to check for missing keys
- Translations API is public (no authentication required)

**Frontend:**
- Created `TranslationContext.jsx` with React Context and `useTranslation` hook
- Created `LanguageSwitcher.jsx` component with dropdown selector
- **Language switcher only on Login page** (removed from portal navigation)
- Language preference persists in localStorage (`dimeda_language` key)
- **All pages fully translated:**
  - Login, Dashboard, Products, Issues
  - Services (tabs, dialogs, empty states)
  - Calendar (stats, legend, filters)
  - Export (cards, PDF report form)

**Login Page UI Updates:**
- Centered Dimeda logo (1.25x larger)
- Added "Dimeda Service Pro System" title (always in English, not translatable)
- Language switcher centered below title
- Three login cards: Admin, Technician, Customer

**Common Components Created:**
- `/components/common/Badges.jsx` - StatusBadge, WarrantyBadge, SeverityBadge, SLAIndicator
- `/components/common/UIElements.jsx` - LoadingState, EmptyState, StatCard, PageHeader
- `/components/common/ProductUtils.jsx` - ProductInfo, ProductDisplay, helper functions

**Test Results:**
- Backend: 7/7 tests passed (`/app/tests/test_translations_api.py`)
- Frontend: All UI features verified via Playwright
- `/app/test_reports/iteration_6.json` - Full i18n feature test (100% pass)

### Contact Details Feature (Jan 15, 2026)
**Completed:**
- Created `ContactDetailsPopup.jsx` component that shows customer contact info for issues
- Popup fetches customers by matching product's city using `/api/customers/by-city/{city}`
- Shows: Issue title, City, Serial Number, and Customer info (Name, Contact Person, Phone, Email, Address)
- Phone and Email are clickable (tel: and mailto: links)

**Integration Points:**
- Admin Issues page (`/pages/Issues.jsx`) - Button on each issue card
- Admin Services page (`/pages/Services.jsx`) - Button on In Progress, In Service, and Resolved tabs
- Technician Calendar page (`/pages/TechnicianCalendar.jsx`) - Button on scheduled tasks
- Technician Services page (`/pages/TechnicianServices.jsx`) - Button on issue cards

**Translation Keys Added:**
- `contacts.contactDetails` - "Contact Details" / "Kontaktinė informacija"
- `contacts.noContactsInCity` - "No contacts found in" / "Kontaktų nerasta mieste"
- `contacts.addCustomerFirst` - "Add a customer for this city first" / "Pirmiausia pridėkite klientą šiam miestui"
- `issues.noInService` - "No issues in service" / "Aptarnaujamų problemų nėra"
- `issues.warrantyServiceDescription` - Warranty service placeholder text
- `issues.viewTrack` - "View Track" / "Peržiūrėti istoriją"

**Test Results:**
- Backend: 8/8 tests passed (`/app/tests/test_contact_details.py`)
- Frontend: All Contact Details features verified via Playwright
- `/app/test_reports/iteration_7.json` - Contact Details feature test (100% pass)

### Component Refactoring Started (Jan 15, 2026)
**New Components Created:**
- `/components/issues/IssueCard.jsx` - Reusable issue card component
- `/components/issues/ResolvedIssueCard.jsx` - Card for resolved issues
- `/components/issues/InServiceIssueCard.jsx` - Card for in-service issues
- `/components/issues/index.js` - Index exports for issue components

**Note:** These components are ready for gradual adoption. Large files (Services.jsx 1559 lines, TechnicianCalendar.jsx 1096 lines, MaintenanceCalendar.jsx 1218 lines) can be incrementally refactored to use these shared components.

