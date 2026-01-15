from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from typing import Dict, Any, List
import json
import os
from pathlib import Path

router = APIRouter(prefix="/translations", tags=["Translations"])

TRANSLATIONS_DIR = Path(__file__).parent.parent / "translations"

# Default English translations (auto-created if file missing)
DEFAULT_TRANSLATIONS = {
    "common": {
        "appName": "Dimeda Service Pro",
        "loading": "Loading...",
        "save": "Save",
        "cancel": "Cancel",
        "delete": "Delete",
        "edit": "Edit",
        "close": "Close",
        "confirm": "Confirm",
        "search": "Search",
        "filter": "Filter",
        "noData": "No data available",
        "error": "An error occurred",
        "success": "Success",
        "warning": "Warning",
        "actions": "Actions"
    },
    "auth": {
        "login": "Login",
        "logout": "Logout",
        "password": "Password"
    },
    "navigation": {
        "dashboard": "Dashboard",
        "products": "Products",
        "issues": "Issues",
        "services": "Services",
        "calendar": "Calendar"
    }
}

def ensure_translations_dir():
    """Ensure translations directory exists"""
    TRANSLATIONS_DIR.mkdir(parents=True, exist_ok=True)

def ensure_default_file():
    """Create default en.json if it doesn't exist"""
    ensure_translations_dir()
    default_file = TRANSLATIONS_DIR / "en.json"
    if not default_file.exists():
        with open(default_file, 'w', encoding='utf-8') as f:
            json.dump(DEFAULT_TRANSLATIONS, f, indent=2, ensure_ascii=False)
    return default_file

def load_translations(lang: str) -> Dict[str, Any]:
    """Load translations for a specific language"""
    ensure_translations_dir()
    
    file_path = TRANSLATIONS_DIR / f"{lang}.json"
    
    # If requested language doesn't exist, fall back to English
    if not file_path.exists():
        if lang != "en":
            file_path = ensure_default_file()
        else:
            ensure_default_file()
            file_path = TRANSLATIONS_DIR / "en.json"
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load translations: {str(e)}")

def validate_translations(translations: Dict, reference: Dict, path: str = "") -> List[str]:
    """Validate translations against reference (English) and return missing keys"""
    missing = []
    for key, value in reference.items():
        full_key = f"{path}.{key}" if path else key
        if key not in translations:
            missing.append(full_key)
        elif isinstance(value, dict) and isinstance(translations.get(key), dict):
            missing.extend(validate_translations(translations[key], value, full_key))
    return missing

@router.get("/languages")
async def get_available_languages():
    """Get list of available languages"""
    ensure_translations_dir()
    languages = []
    
    language_names = {
        "en": "English",
        "lt": "Lietuvių",
        "de": "Deutsch",
        "pl": "Polski",
        "ru": "Русский"
    }
    
    for file in TRANSLATIONS_DIR.glob("*.json"):
        lang_code = file.stem
        languages.append({
            "code": lang_code,
            "name": language_names.get(lang_code, lang_code.upper())
        })
    
    # Ensure at least English is available
    if not languages:
        ensure_default_file()
        languages.append({"code": "en", "name": "English"})
    
    return languages

@router.get("/{lang}")
async def get_translations(lang: str):
    """Get all translations for a specific language"""
    translations = load_translations(lang)
    return translations

@router.get("/{lang}/validate")
async def validate_language(lang: str):
    """Validate translations against English reference"""
    if lang == "en":
        return {"valid": True, "missing_keys": []}
    
    reference = load_translations("en")
    translations = load_translations(lang)
    missing = validate_translations(translations, reference)
    
    return {
        "valid": len(missing) == 0,
        "missing_keys": missing,
        "total_missing": len(missing)
    }

@router.put("/{lang}")
async def update_translations(lang: str, translations: Dict[str, Any]):
    """Update translations for a specific language"""
    ensure_translations_dir()
    file_path = TRANSLATIONS_DIR / f"{lang}.json"
    
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(translations, f, indent=2, ensure_ascii=False)
        return {"message": f"Translations for '{lang}' updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save translations: {str(e)}")

@router.put("/{lang}/key")
async def update_translation_key(lang: str, key_path: str, value: str):
    """Update a specific translation key (supports nested keys like 'dashboard.stats.totalProducts')"""
    translations = load_translations(lang)
    
    # Navigate to the nested key
    keys = key_path.split(".")
    current = translations
    
    for key in keys[:-1]:
        if key not in current:
            current[key] = {}
        current = current[key]
    
    current[keys[-1]] = value
    
    # Save updated translations
    file_path = TRANSLATIONS_DIR / f"{lang}.json"
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(translations, f, indent=2, ensure_ascii=False)
    
    return {"message": f"Key '{key_path}' updated successfully", "value": value}
