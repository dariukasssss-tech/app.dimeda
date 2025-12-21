# Dimeda Service Pro - Requirements & Architecture

## Original Problem Statement
Build a service and maintenance app for Medirol Vivera Monobloc powered stretchers (https://www.medirol.cz/en/powered-stretchers/vivera-monobloc/). Company Dimeda (www.dimeda.lt) is the official service provider for Medirol.

## Implemented Features

### Core Features
1. **Product Registration**
   - Register stretchers with serial numbers
   - Track model name, location, and notes
   - Search and filter products
   - Edit and delete products

2. **Service History Tracking**
   - Log service records with date, technician, and description
   - Service types: Maintenance, Repair, Inspection
   - Calendar date picker for service dates
   - Track issues found during service

3. **Issue Management**
   - Report equipment issues with photos
   - Issue types: Mechanical, Electrical, Cosmetic, Other
   - Severity levels: Low, Medium, High, Critical
   - Status workflow: Open → In Progress → Resolved
   - Resolution tracking with notes

4. **Export Functionality**
   - CSV export for products, services, and issues
   - One-click download

### Technical Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + Motor (async MongoDB)
- **Database**: MongoDB
- **Design**: Professional medical/clinical look (Dimeda Blue #0066CC)

### API Endpoints
- `GET/POST /api/products` - Product CRUD
- `GET/POST /api/services` - Service records CRUD
- `GET/POST /api/issues` - Issues CRUD
- `GET /api/stats` - Dashboard statistics
- `GET /api/export/csv` - CSV export

## Next Action Items
1. Add QR code scanning for faster serial number input
2. Add PDF report generation (individual product service history)
3. Add technician management (pre-defined list of technicians)
4. Add email/notification reminders for upcoming maintenance
5. Add offline mode for field technicians
6. Multi-language support (English, Czech, Lithuanian)
