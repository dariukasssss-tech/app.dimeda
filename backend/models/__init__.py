# Models module
from .product import ProductBase, ProductCreate, Product
from .service import ServiceRecordBase, ServiceRecordCreate, ServiceRecord
from .issue import IssueBase, IssueCreate, Issue, CustomerIssueCreate, IssueUpdate
from .maintenance import ScheduledMaintenanceBase, ScheduledMaintenanceCreate, ScheduledMaintenance, ScheduledMaintenanceUpdate
from .auth import LoginRequest
from .technician import TechnicianUnavailable
