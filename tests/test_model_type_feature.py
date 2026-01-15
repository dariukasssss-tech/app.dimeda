"""
Test Model Type Feature for Dimeda Service Pro
- Products have model_type field: 'powered' (Powered Stretcher) or 'roll_in' (Roll-in Stretcher)
- Products page has Model Type filter dropdown
- Issue forms have City and Model Type filters for product selection
- SLA timer is NOT shown for Roll-in Stretcher issues
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestProductModelType:
    """Test Product model_type field functionality"""
    
    def test_get_products_returns_model_type(self):
        """Verify products API returns model_type field"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        
        products = response.json()
        assert len(products) > 0, "Should have at least one product"
        
        # Check that products have model_type field
        for product in products:
            assert "model_type" in product, f"Product {product.get('serial_number')} missing model_type"
            assert product["model_type"] in ["powered", "roll_in"], f"Invalid model_type: {product['model_type']}"
    
    def test_find_roll_in_stretcher_product(self):
        """Verify at least one Roll-in Stretcher (VLN-005) exists"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        
        products = response.json()
        roll_in_products = [p for p in products if p.get("model_type") == "roll_in"]
        
        assert len(roll_in_products) > 0, "Should have at least one roll_in stretcher product"
        
        # Check if VLN-005 is roll_in
        vln005 = next((p for p in products if p.get("serial_number") == "VLN-005"), None)
        if vln005:
            assert vln005["model_type"] == "roll_in", "VLN-005 should be roll_in type"
            print(f"Found VLN-005 with model_type: {vln005['model_type']}")
    
    def test_find_powered_stretcher_products(self):
        """Verify powered stretcher products exist"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        
        products = response.json()
        powered_products = [p for p in products if p.get("model_type") == "powered"]
        
        assert len(powered_products) > 0, "Should have at least one powered stretcher product"
        print(f"Found {len(powered_products)} powered stretcher products")
    
    def test_create_product_with_model_type_powered(self):
        """Test creating a product with model_type=powered"""
        payload = {
            "serial_number": "TEST-POWERED-001",
            "model_name": "Test Powered Model",
            "model_type": "powered",
            "city": "Vilnius",
            "location_detail": "Test Hospital",
            "notes": "Test product for model_type feature"
        }
        
        response = requests.post(f"{BASE_URL}/api/products", json=payload)
        assert response.status_code == 200
        
        product = response.json()
        assert product["model_type"] == "powered"
        assert product["serial_number"] == "TEST-POWERED-001"
        
        # Cleanup
        product_id = product["id"]
        requests.delete(f"{BASE_URL}/api/products/{product_id}")
    
    def test_create_product_with_model_type_roll_in(self):
        """Test creating a product with model_type=roll_in"""
        payload = {
            "serial_number": "TEST-ROLLIN-001",
            "model_name": "Test Roll-in Model",
            "model_type": "roll_in",
            "city": "Kaunas",
            "location_detail": "Test Clinic",
            "notes": "Test roll-in stretcher"
        }
        
        response = requests.post(f"{BASE_URL}/api/products", json=payload)
        assert response.status_code == 200
        
        product = response.json()
        assert product["model_type"] == "roll_in"
        assert product["serial_number"] == "TEST-ROLLIN-001"
        
        # Cleanup
        product_id = product["id"]
        requests.delete(f"{BASE_URL}/api/products/{product_id}")
    
    def test_create_product_default_model_type(self):
        """Test that default model_type is 'powered' when not specified"""
        payload = {
            "serial_number": "TEST-DEFAULT-001",
            "model_name": "Test Default Model",
            "city": "Vilnius",
            "location_detail": "Test Location"
        }
        
        response = requests.post(f"{BASE_URL}/api/products", json=payload)
        assert response.status_code == 200
        
        product = response.json()
        # Default should be 'powered'
        assert product["model_type"] == "powered", "Default model_type should be 'powered'"
        
        # Cleanup
        product_id = product["id"]
        requests.delete(f"{BASE_URL}/api/products/{product_id}")
    
    def test_update_product_model_type(self):
        """Test updating a product's model_type"""
        # Create a product
        payload = {
            "serial_number": "TEST-UPDATE-001",
            "model_name": "Test Update Model",
            "model_type": "powered",
            "city": "Vilnius"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/products", json=payload)
        assert create_response.status_code == 200
        product = create_response.json()
        product_id = product["id"]
        
        # Update model_type to roll_in
        update_payload = {
            "serial_number": "TEST-UPDATE-001",
            "model_name": "Test Update Model",
            "model_type": "roll_in",
            "city": "Vilnius"
        }
        
        update_response = requests.put(f"{BASE_URL}/api/products/{product_id}", json=update_payload)
        assert update_response.status_code == 200
        
        updated_product = update_response.json()
        assert updated_product["model_type"] == "roll_in"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/products/{product_id}")


class TestIssueWithModelType:
    """Test Issue creation with products of different model types"""
    
    def test_create_issue_for_powered_stretcher(self):
        """Test creating an issue for a powered stretcher product"""
        # First get a powered stretcher product
        products_response = requests.get(f"{BASE_URL}/api/products")
        products = products_response.json()
        powered_product = next((p for p in products if p.get("model_type") == "powered"), None)
        
        if not powered_product:
            pytest.skip("No powered stretcher product found")
        
        # Create an issue
        issue_payload = {
            "product_id": powered_product["id"],
            "issue_type": "mechanical",
            "severity": "medium",
            "title": "TEST Issue for Powered Stretcher",
            "description": "Test issue for powered stretcher - SLA should apply",
            "source": "customer"
        }
        
        response = requests.post(f"{BASE_URL}/api/issues", json=issue_payload)
        assert response.status_code == 200
        
        issue = response.json()
        assert issue["product_id"] == powered_product["id"]
        assert issue["source"] == "customer"
        
        print(f"Created issue {issue['id']} for powered stretcher {powered_product['serial_number']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/issues/{issue['id']}")
    
    def test_create_issue_for_roll_in_stretcher(self):
        """Test creating an issue for a roll-in stretcher product"""
        # First get a roll-in stretcher product
        products_response = requests.get(f"{BASE_URL}/api/products")
        products = products_response.json()
        roll_in_product = next((p for p in products if p.get("model_type") == "roll_in"), None)
        
        if not roll_in_product:
            pytest.skip("No roll-in stretcher product found")
        
        # Create an issue
        issue_payload = {
            "product_id": roll_in_product["id"],
            "issue_type": "mechanical",
            "severity": "medium",
            "title": "TEST Issue for Roll-in Stretcher",
            "description": "Test issue for roll-in stretcher - NO SLA should apply",
            "source": "customer"
        }
        
        response = requests.post(f"{BASE_URL}/api/issues", json=issue_payload)
        assert response.status_code == 200
        
        issue = response.json()
        assert issue["product_id"] == roll_in_product["id"]
        assert issue["source"] == "customer"
        
        print(f"Created issue {issue['id']} for roll-in stretcher {roll_in_product['serial_number']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/issues/{issue['id']}")
    
    def test_get_issues_with_product_model_type(self):
        """Test that issues can be retrieved and linked to products with model_type"""
        # Get all issues
        issues_response = requests.get(f"{BASE_URL}/api/issues")
        assert issues_response.status_code == 200
        issues = issues_response.json()
        
        # Get all products
        products_response = requests.get(f"{BASE_URL}/api/products")
        products = products_response.json()
        products_dict = {p["id"]: p for p in products}
        
        # Verify we can determine model_type for each issue's product
        for issue in issues[:5]:  # Check first 5 issues
            product_id = issue.get("product_id")
            if product_id and product_id in products_dict:
                product = products_dict[product_id]
                model_type = product.get("model_type", "powered")
                print(f"Issue {issue.get('id', 'N/A')[:8]}... -> Product {product.get('serial_number')} -> model_type: {model_type}")


class TestProductFiltering:
    """Test product filtering by city and model_type"""
    
    def test_products_have_city_field(self):
        """Verify all products have city field"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        
        products = response.json()
        for product in products:
            assert "city" in product, f"Product {product.get('serial_number')} missing city"
            assert product["city"] in ["Vilnius", "Kaunas", "Klaipėda", "Šiauliai", "Panevėžys"], f"Invalid city: {product['city']}"
    
    def test_products_by_city_distribution(self):
        """Check distribution of products by city"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        
        products = response.json()
        city_counts = {}
        for product in products:
            city = product.get("city", "Unknown")
            city_counts[city] = city_counts.get(city, 0) + 1
        
        print(f"Products by city: {city_counts}")
        assert len(city_counts) > 0
    
    def test_products_by_model_type_distribution(self):
        """Check distribution of products by model_type"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        
        products = response.json()
        type_counts = {"powered": 0, "roll_in": 0}
        for product in products:
            model_type = product.get("model_type", "powered")
            type_counts[model_type] = type_counts.get(model_type, 0) + 1
        
        print(f"Products by model_type: {type_counts}")
        assert type_counts["powered"] > 0, "Should have at least one powered stretcher"


class TestCustomerIssueEndpoint:
    """Test customer issue creation endpoint"""
    
    def test_create_customer_issue(self):
        """Test creating a customer issue"""
        # Get a product
        products_response = requests.get(f"{BASE_URL}/api/products")
        products = products_response.json()
        
        if not products:
            pytest.skip("No products found")
        
        product = products[0]
        
        # Create customer issue
        issue_payload = {
            "product_id": product["id"],
            "issue_type": "mechanical",
            "title": "TEST Customer Issue",
            "description": "Test customer issue creation"
        }
        
        response = requests.post(f"{BASE_URL}/api/issues/customer", json=issue_payload)
        assert response.status_code == 200
        
        issue = response.json()
        assert issue["source"] == "customer"
        assert issue["severity"] == "high"  # Customer issues default to high severity
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/issues/{issue['id']}")


@pytest.fixture(autouse=True)
def setup_teardown():
    """Setup and teardown for tests"""
    # Setup: Nothing needed
    yield
    # Teardown: Clean up any test products that might have been left behind
    response = requests.get(f"{BASE_URL}/api/products")
    if response.status_code == 200:
        products = response.json()
        for product in products:
            if product.get("serial_number", "").startswith("TEST-"):
                requests.delete(f"{BASE_URL}/api/products/{product['id']}")
    
    # Clean up test issues
    response = requests.get(f"{BASE_URL}/api/issues")
    if response.status_code == 200:
        issues = response.json()
        for issue in issues:
            if issue.get("title", "").startswith("TEST"):
                requests.delete(f"{BASE_URL}/api/issues/{issue['id']}")
