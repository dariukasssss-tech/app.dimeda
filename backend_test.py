import requests
import sys
import json
from datetime import datetime

class DimedasServiceProAPITester:
    def __init__(self, base_url="https://vivera-tracker.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_product_id = None
        self.test_service_id = None
        self.test_issue_id = None
        self.test_maintenance_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.text else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_api_root(self):
        """Test API root endpoint"""
        success, response = self.run_test(
            "API Root",
            "GET",
            "",
            200
        )
        return success

    def test_create_product(self):
        """Test creating a product"""
        product_data = {
            "serial_number": "TEST-001",
            "model_name": "Vivera Monobloc",
            "location": "Test Location",
            "notes": "Test product for API testing"
        }
        
        success, response = self.run_test(
            "Create Product",
            "POST",
            "products",
            200,
            data=product_data
        )
        
        if success and 'id' in response:
            self.test_product_id = response['id']
            print(f"   Created product with ID: {self.test_product_id}")
        
        return success

    def test_get_products(self):
        """Test getting all products"""
        success, response = self.run_test(
            "Get All Products",
            "GET",
            "products",
            200
        )
        
        if success:
            print(f"   Found {len(response)} products")
        
        return success

    def test_get_product_by_id(self):
        """Test getting a specific product by ID"""
        if not self.test_product_id:
            print("❌ Skipping - No test product ID available")
            return False
            
        success, response = self.run_test(
            "Get Product by ID",
            "GET",
            f"products/{self.test_product_id}",
            200
        )
        
        return success

    def test_get_product_by_serial(self):
        """Test getting a product by serial number"""
        success, response = self.run_test(
            "Get Product by Serial",
            "GET",
            "products/serial/TEST-001",
            200
        )
        
        return success

    def test_update_product(self):
        """Test updating a product"""
        if not self.test_product_id:
            print("❌ Skipping - No test product ID available")
            return False
            
        update_data = {
            "serial_number": "TEST-001",
            "model_name": "Vivera Monobloc Updated",
            "location": "Updated Location",
            "notes": "Updated test product"
        }
        
        success, response = self.run_test(
            "Update Product",
            "PUT",
            f"products/{self.test_product_id}",
            200,
            data=update_data
        )
        
        return success

    def test_create_service_record(self):
        """Test creating a service record"""
        if not self.test_product_id:
            print("❌ Skipping - No test product ID available")
            return False
            
        service_data = {
            "product_id": self.test_product_id,
            "technician_name": "John Doe",
            "service_type": "maintenance",
            "description": "Regular maintenance check",
            "issues_found": "No issues found",
            "service_date": datetime.now().isoformat()
        }
        
        success, response = self.run_test(
            "Create Service Record",
            "POST",
            "services",
            200,
            data=service_data
        )
        
        if success and 'id' in response:
            self.test_service_id = response['id']
            print(f"   Created service record with ID: {self.test_service_id}")
        
        return success

    def test_get_services(self):
        """Test getting all service records"""
        success, response = self.run_test(
            "Get All Services",
            "GET",
            "services",
            200
        )
        
        if success:
            print(f"   Found {len(response)} service records")
        
        return success

    def test_get_service_by_id(self):
        """Test getting a specific service record"""
        if not self.test_service_id:
            print("❌ Skipping - No test service ID available")
            return False
            
        success, response = self.run_test(
            "Get Service by ID",
            "GET",
            f"services/{self.test_service_id}",
            200
        )
        
        return success

    def test_create_issue(self):
        """Test creating an issue"""
        if not self.test_product_id:
            print("❌ Skipping - No test product ID available")
            return False
            
        issue_data = {
            "product_id": self.test_product_id,
            "issue_type": "mechanical",
            "severity": "medium",
            "title": "Test Issue",
            "description": "This is a test issue for API testing",
            "photos": []
        }
        
        success, response = self.run_test(
            "Create Issue",
            "POST",
            "issues",
            200,
            data=issue_data
        )
        
        if success and 'id' in response:
            self.test_issue_id = response['id']
            print(f"   Created issue with ID: {self.test_issue_id}")
        
        return success

    def test_get_issues(self):
        """Test getting all issues"""
        success, response = self.run_test(
            "Get All Issues",
            "GET",
            "issues",
            200
        )
        
        if success:
            print(f"   Found {len(response)} issues")
        
        return success

    def test_get_issue_by_id(self):
        """Test getting a specific issue"""
        if not self.test_issue_id:
            print("❌ Skipping - No test issue ID available")
            return False
            
        success, response = self.run_test(
            "Get Issue by ID",
            "GET",
            f"issues/{self.test_issue_id}",
            200
        )
        
        return success

    def test_update_issue_status(self):
        """Test updating issue status"""
        if not self.test_issue_id:
            print("❌ Skipping - No test issue ID available")
            return False
            
        update_data = {
            "status": "in_progress"
        }
        
        success, response = self.run_test(
            "Update Issue Status",
            "PUT",
            f"issues/{self.test_issue_id}",
            200,
            data=update_data
        )
        
        return success

    def test_resolve_issue(self):
        """Test resolving an issue"""
        if not self.test_issue_id:
            print("❌ Skipping - No test issue ID available")
            return False
            
        update_data = {
            "status": "resolved",
            "resolution": "Issue has been resolved successfully"
        }
        
        success, response = self.run_test(
            "Resolve Issue",
            "PUT",
            f"issues/{self.test_issue_id}",
            200,
            data=update_data
        )
        
        return success

    def test_get_stats(self):
        """Test getting statistics"""
        success, response = self.run_test(
            "Get Statistics",
            "GET",
            "stats",
            200
        )
        
        if success:
            print(f"   Stats: {response}")
        
        return success

    def test_export_products_csv(self):
        """Test exporting products as CSV"""
        success, response = self.run_test(
            "Export Products CSV",
            "GET",
            "export/csv",
            200,
            params={"data_type": "products"}
        )
        
        return success

    def test_export_services_csv(self):
        """Test exporting services as CSV"""
        success, response = self.run_test(
            "Export Services CSV",
            "GET",
            "export/csv",
            200,
            params={"data_type": "services"}
        )
        
        return success

    def test_export_issues_csv(self):
        """Test exporting issues as CSV"""
        success, response = self.run_test(
            "Export Issues CSV",
            "GET",
            "export/csv",
            200,
            params={"data_type": "issues"}
        )
        
        return success

    def test_delete_service(self):
        """Test deleting a service record"""
        if not self.test_service_id:
            print("❌ Skipping - No test service ID available")
            return False
            
        success, response = self.run_test(
            "Delete Service Record",
            "DELETE",
            f"services/{self.test_service_id}",
            200
        )
        
        return success

    def test_delete_issue(self):
        """Test deleting an issue"""
        if not self.test_issue_id:
            print("❌ Skipping - No test issue ID available")
            return False
            
        success, response = self.run_test(
            "Delete Issue",
            "DELETE",
            f"issues/{self.test_issue_id}",
            200
        )
        
        return success

    def test_delete_product(self):
        """Test deleting a product"""
        if not self.test_product_id:
            print("❌ Skipping - No test product ID available")
            return False
            
        success, response = self.run_test(
            "Delete Product",
            "DELETE",
            f"products/{self.test_product_id}",
            200
        )
        
        return success

    # ============ SCHEDULED MAINTENANCE TESTS ============
    
    def test_create_scheduled_maintenance(self):
        """Test creating scheduled maintenance"""
        if not self.test_product_id:
            print("❌ Skipping - No test product ID available")
            return False
            
        from datetime import datetime, timedelta
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        maintenance_data = {
            "product_id": self.test_product_id,
            "scheduled_date": tomorrow,
            "maintenance_type": "routine",
            "technician_name": "John Smith",
            "notes": "Regular maintenance check"
        }
        
        success, response = self.run_test(
            "Create Scheduled Maintenance",
            "POST",
            "scheduled-maintenance",
            200,
            data=maintenance_data
        )
        
        if success and 'id' in response:
            self.test_maintenance_id = response['id']
            print(f"   Created scheduled maintenance with ID: {self.test_maintenance_id}")
        
        return success

    def test_get_scheduled_maintenance(self):
        """Test getting all scheduled maintenance"""
        success, response = self.run_test(
            "Get All Scheduled Maintenance",
            "GET",
            "scheduled-maintenance",
            200
        )
        
        if success:
            print(f"   Found {len(response)} scheduled maintenance items")
        
        return success

    def test_get_scheduled_maintenance_by_month(self):
        """Test getting scheduled maintenance by month"""
        from datetime import datetime
        current_year = datetime.now().year
        current_month = datetime.now().month
        
        success, response = self.run_test(
            "Get Scheduled Maintenance by Month",
            "GET",
            f"scheduled-maintenance?year={current_year}&month={current_month}",
            200
        )
        
        if success:
            print(f"   Found {len(response)} items for {current_year}-{current_month:02d}")
        
        return success

    def test_get_scheduled_maintenance_by_id(self):
        """Test getting scheduled maintenance by ID"""
        if not hasattr(self, 'test_maintenance_id') or not self.test_maintenance_id:
            print("❌ Skipping - No test maintenance ID available")
            return False
            
        success, response = self.run_test(
            "Get Scheduled Maintenance by ID",
            "GET",
            f"scheduled-maintenance/{self.test_maintenance_id}",
            200
        )
        
        return success

    def test_update_scheduled_maintenance(self):
        """Test updating scheduled maintenance"""
        if not hasattr(self, 'test_maintenance_id') or not self.test_maintenance_id:
            print("❌ Skipping - No test maintenance ID available")
            return False
            
        update_data = {
            "technician_name": "Jane Doe",
            "notes": "Updated maintenance notes"
        }
        
        success, response = self.run_test(
            "Update Scheduled Maintenance",
            "PUT",
            f"scheduled-maintenance/{self.test_maintenance_id}",
            200,
            data=update_data
        )
        
        return success

    def test_mark_maintenance_completed(self):
        """Test marking maintenance as completed"""
        if not hasattr(self, 'test_maintenance_id') or not self.test_maintenance_id:
            print("❌ Skipping - No test maintenance ID available")
            return False
            
        update_data = {
            "status": "completed"
        }
        
        success, response = self.run_test(
            "Mark Maintenance Completed",
            "PUT",
            f"scheduled-maintenance/{self.test_maintenance_id}",
            200,
            data=update_data
        )
        
        return success

    def test_get_upcoming_maintenance_count(self):
        """Test getting upcoming maintenance count"""
        success, response = self.run_test(
            "Get Upcoming Maintenance Count",
            "GET",
            "scheduled-maintenance/upcoming/count",
            200
        )
        
        if success:
            print(f"   Upcoming: {response.get('upcoming', 0)}, Overdue: {response.get('overdue', 0)}")
        
        return success

    def test_delete_scheduled_maintenance(self):
        """Test deleting scheduled maintenance"""
        if not hasattr(self, 'test_maintenance_id') or not self.test_maintenance_id:
            print("❌ Skipping - No test maintenance ID available")
            return False
            
        success, response = self.run_test(
            "Delete Scheduled Maintenance",
            "DELETE",
            f"scheduled-maintenance/{self.test_maintenance_id}",
            200
        )
        
        return success

def main():
    print("🚀 Starting Dimeda Service Pro API Tests")
    print("=" * 50)
    
    tester = DimedasServiceProAPITester()
    
    # Test sequence
    tests = [
        # Basic API test
        tester.test_api_root,
        
        # Product tests
        tester.test_create_product,
        tester.test_get_products,
        tester.test_get_product_by_id,
        tester.test_get_product_by_serial,
        tester.test_update_product,
        
        # Service tests
        tester.test_create_service_record,
        tester.test_get_services,
        tester.test_get_service_by_id,
        
        # Issue tests
        tester.test_create_issue,
        tester.test_get_issues,
        tester.test_get_issue_by_id,
        tester.test_update_issue_status,
        tester.test_resolve_issue,
        
        # Scheduled Maintenance tests
        tester.test_create_scheduled_maintenance,
        tester.test_get_scheduled_maintenance,
        tester.test_get_scheduled_maintenance_by_month,
        tester.test_get_scheduled_maintenance_by_id,
        tester.test_update_scheduled_maintenance,
        tester.test_mark_maintenance_completed,
        tester.test_get_upcoming_maintenance_count,
        
        # Statistics test
        tester.test_get_stats,
        
        # Export tests
        tester.test_export_products_csv,
        tester.test_export_services_csv,
        tester.test_export_issues_csv,
        
        # Cleanup tests
        tester.test_delete_service,
        tester.test_delete_issue,
        tester.test_delete_scheduled_maintenance,
        tester.test_delete_product,
    ]
    
    # Run all tests
    for test in tests:
        test()
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"❌ {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())