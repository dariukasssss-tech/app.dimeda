import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# Auth configuration
APP_ACCESS_PASSWORD = os.environ.get('APP_ACCESS_PASSWORD', '')
CUSTOMER_ACCESS_PASSWORD = os.environ.get('CUSTOMER_ACCESS_PASSWORD', 'customer2025')
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin2025")
TECHNICIAN_PASSWORD = os.environ.get("TECHNICIAN_PASSWORD", "service2025")

AUTH_COOKIE_NAME = "dimeda_auth"
AUTH_HEADER_NAME = "X-Auth-Token"
AUTH_TOKEN_EXPIRY_DAYS = 7

# Valid cities for product location
VALID_CITIES = ["Vilnius", "Kaunas", "Klaipėda", "Šiauliai", "Panevėžys"]

# Valid model options
VALID_MODELS = ["Powered Stretchers", "Roll-in stretchers"]

# Frontend URL for CORS
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://medirol-service-hub.preview.emergentagent.com')
