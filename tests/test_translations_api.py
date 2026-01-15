"""
Test translations API endpoints for i18n feature
- GET /api/translations/{lang} - Get translations for a language
- GET /api/translations/languages - Get available languages
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTranslationsAPI:
    """Test translations API endpoints"""
    
    def test_get_available_languages(self):
        """Test GET /api/translations/languages returns available languages"""
        response = requests.get(f"{BASE_URL}/api/translations/languages")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) >= 2, "Should have at least 2 languages (en, lt)"
        
        # Check structure of language objects
        for lang in data:
            assert "code" in lang, "Language should have 'code' field"
            assert "name" in lang, "Language should have 'name' field"
        
        # Check that English and Lithuanian are available
        codes = [lang["code"] for lang in data]
        assert "en" in codes, "English (en) should be available"
        assert "lt" in codes, "Lithuanian (lt) should be available"
        
        print(f"✓ Available languages: {data}")
    
    def test_get_english_translations(self):
        """Test GET /api/translations/en returns English translations"""
        response = requests.get(f"{BASE_URL}/api/translations/en")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, dict), "Response should be a dictionary"
        
        # Check main translation sections exist
        expected_sections = ["common", "auth", "navigation", "dashboard", "products", "issues", "services"]
        for section in expected_sections:
            assert section in data, f"Missing section: {section}"
        
        # Check specific English translations
        assert data["common"]["appName"] == "Dimeda Service Pro", "App name should be 'Dimeda Service Pro'"
        assert data["auth"]["login"] == "Login", "Login should be 'Login' in English"
        assert data["auth"]["logout"] == "Logout", "Logout should be 'Logout' in English"
        assert data["navigation"]["dashboard"] == "Dashboard", "Dashboard should be 'Dashboard' in English"
        
        print(f"✓ English translations loaded with {len(data)} sections")
    
    def test_get_lithuanian_translations(self):
        """Test GET /api/translations/lt returns Lithuanian translations"""
        response = requests.get(f"{BASE_URL}/api/translations/lt")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, dict), "Response should be a dictionary"
        
        # Check main translation sections exist
        expected_sections = ["common", "auth", "navigation", "dashboard", "products", "issues", "services"]
        for section in expected_sections:
            assert section in data, f"Missing section: {section}"
        
        # Check specific Lithuanian translations
        assert data["common"]["loading"] == "Kraunama...", "Loading should be 'Kraunama...' in Lithuanian"
        assert data["auth"]["login"] == "Prisijungti", "Login should be 'Prisijungti' in Lithuanian"
        assert data["auth"]["logout"] == "Atsijungti", "Logout should be 'Atsijungti' in Lithuanian"
        assert data["navigation"]["dashboard"] == "Pradžia", "Dashboard should be 'Pradžia' in Lithuanian"
        
        print(f"✓ Lithuanian translations loaded with {len(data)} sections")
    
    def test_translations_fallback_to_english(self):
        """Test that non-existent language falls back to English"""
        response = requests.get(f"{BASE_URL}/api/translations/xyz")
        
        assert response.status_code == 200, f"Expected 200 (fallback), got {response.status_code}"
        
        data = response.json()
        # Should return English translations as fallback
        assert data["auth"]["login"] == "Login", "Should fallback to English translations"
        
        print("✓ Non-existent language falls back to English")
    
    def test_validate_lithuanian_translations(self):
        """Test GET /api/translations/lt/validate checks for missing keys"""
        response = requests.get(f"{BASE_URL}/api/translations/lt/validate")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "valid" in data, "Response should have 'valid' field"
        assert "missing_keys" in data, "Response should have 'missing_keys' field"
        
        print(f"✓ Lithuanian validation: valid={data['valid']}, missing_keys={len(data['missing_keys'])}")
    
    def test_translations_no_auth_required(self):
        """Test that translations API doesn't require authentication"""
        # Make requests without any auth headers
        session = requests.Session()
        session.headers.clear()  # Ensure no auth headers
        
        # Test languages endpoint
        response = session.get(f"{BASE_URL}/api/translations/languages")
        assert response.status_code == 200, "Languages endpoint should not require auth"
        
        # Test translations endpoint
        response = session.get(f"{BASE_URL}/api/translations/en")
        assert response.status_code == 200, "Translations endpoint should not require auth"
        
        print("✓ Translations API accessible without authentication")
    
    def test_translation_structure_completeness(self):
        """Test that both languages have the same structure"""
        en_response = requests.get(f"{BASE_URL}/api/translations/en")
        lt_response = requests.get(f"{BASE_URL}/api/translations/lt")
        
        assert en_response.status_code == 200
        assert lt_response.status_code == 200
        
        en_data = en_response.json()
        lt_data = lt_response.json()
        
        # Check that both have the same top-level keys
        en_keys = set(en_data.keys())
        lt_keys = set(lt_data.keys())
        
        assert en_keys == lt_keys, f"Language files should have same sections. EN: {en_keys}, LT: {lt_keys}"
        
        print(f"✓ Both languages have matching structure with {len(en_keys)} sections")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
