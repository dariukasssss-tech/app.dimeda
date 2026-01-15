"""
Test Contact Details Feature - Backend API Tests
Tests the /api/customers/by-city/{city} endpoint and related functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://serviced-1.preview.emergentagent.com')

class TestContactDetailsAPI:
    """Tests for Contact Details popup backend API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as admin and get session"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"password": "admin2025", "role": "admin"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json().get("token")
        yield
        # Cleanup
        self.session.close()
    
    def test_get_customers_by_city_vilnius(self):
        """Test GET /api/customers/by-city/Vilnius returns customer data"""
        response = self.session.get(f"{BASE_URL}/api/customers/by-city/Vilnius")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one customer in Vilnius"
        
        # Verify customer data structure
        customer = data[0]
        assert "id" in customer, "Customer should have id"
        assert "name" in customer, "Customer should have name"
        assert "city" in customer, "Customer should have city"
        assert customer["city"] == "Vilnius", "Customer city should be Vilnius"
        
        # Verify contact details fields exist
        assert "contact_person" in customer, "Customer should have contact_person field"
        assert "phone" in customer, "Customer should have phone field"
        assert "email" in customer, "Customer should have email field"
        assert "address" in customer, "Customer should have address field"
        
        print(f"✓ Found {len(data)} customer(s) in Vilnius")
        print(f"  Customer: {customer['name']}")
        print(f"  Contact: {customer.get('contact_person', 'N/A')}")
        print(f"  Phone: {customer.get('phone', 'N/A')}")
        print(f"  Email: {customer.get('email', 'N/A')}")
    
    def test_get_customers_by_city_empty(self):
        """Test GET /api/customers/by-city/{city} returns empty list for city with no customers"""
        response = self.session.get(f"{BASE_URL}/api/customers/by-city/NonExistentCity")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) == 0, "Should return empty list for non-existent city"
        print("✓ Returns empty list for city with no customers")
    
    def test_get_customers_by_city_panevezys(self):
        """Test GET /api/customers/by-city/Panevėžys - city with products but no customers"""
        response = self.session.get(f"{BASE_URL}/api/customers/by-city/Panevėžys")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        # Panevėžys has products but may not have customers
        print(f"✓ Panevėžys has {len(data)} customer(s)")
    
    def test_get_all_customers(self):
        """Test GET /api/customers returns all customers"""
        response = self.session.get(f"{BASE_URL}/api/customers")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Total customers in system: {len(data)}")
        
        # List all customers with their cities
        for customer in data:
            print(f"  - {customer['name']} in {customer['city']}")
    
    def test_get_products_with_cities(self):
        """Test GET /api/products returns products with city information"""
        response = self.session.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one product"
        
        # Verify product has city field
        product = data[0]
        assert "city" in product, "Product should have city field"
        assert "serial_number" in product, "Product should have serial_number field"
        
        # List products by city
        cities = {}
        for p in data:
            city = p.get("city", "Unknown")
            if city not in cities:
                cities[city] = []
            cities[city].append(p["serial_number"])
        
        print(f"✓ Products by city:")
        for city, serials in cities.items():
            print(f"  {city}: {', '.join(serials)}")
    
    def test_get_issues_with_product_id(self):
        """Test GET /api/issues returns issues with product_id for city lookup"""
        response = self.session.get(f"{BASE_URL}/api/issues")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            issue = data[0]
            assert "product_id" in issue, "Issue should have product_id field"
            assert "id" in issue, "Issue should have id field"
            assert "title" in issue, "Issue should have title field"
            print(f"✓ Found {len(data)} issue(s) with product_id for city lookup")
        else:
            print("✓ No issues found (empty list)")


class TestContactDetailsIntegration:
    """Integration tests for Contact Details feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as admin"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"password": "admin2025", "role": "admin"}
        )
        assert login_response.status_code == 200
        yield
        self.session.close()
    
    def test_issue_to_customer_lookup_flow(self):
        """Test the full flow: Issue -> Product -> City -> Customer"""
        # Step 1: Get issues
        issues_response = self.session.get(f"{BASE_URL}/api/issues")
        assert issues_response.status_code == 200
        issues = issues_response.json()
        
        if len(issues) == 0:
            pytest.skip("No issues available for testing")
        
        # Step 2: Get products
        products_response = self.session.get(f"{BASE_URL}/api/products")
        assert products_response.status_code == 200
        products = products_response.json()
        
        # Step 3: For each issue, find product and get city
        for issue in issues[:3]:  # Test first 3 issues
            product_id = issue.get("product_id")
            if not product_id:
                continue
            
            # Find product
            product = next((p for p in products if p["id"] == product_id), None)
            if not product:
                continue
            
            city = product.get("city")
            if not city:
                continue
            
            # Step 4: Get customers by city
            customers_response = self.session.get(f"{BASE_URL}/api/customers/by-city/{city}")
            assert customers_response.status_code == 200
            customers = customers_response.json()
            
            print(f"✓ Issue '{issue['title']}' -> Product S/N: {product['serial_number']} -> City: {city} -> {len(customers)} customer(s)")
    
    def test_technician_login_and_access(self):
        """Test technician can access customer data"""
        tech_session = requests.Session()
        # Technician uses different endpoint: /api/auth/technician-login
        login_response = tech_session.post(
            f"{BASE_URL}/api/auth/technician-login",
            json={"password": "service2025"}
        )
        assert login_response.status_code == 200, f"Technician login failed: {login_response.text}"
        
        # Test access to customers by city
        response = tech_session.get(f"{BASE_URL}/api/customers/by-city/Vilnius")
        assert response.status_code == 200, f"Technician should be able to access customers: {response.text}"
        
        print("✓ Technician can access customer data by city")
        tech_session.close()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
