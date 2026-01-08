import requests
import sys
import json
from datetime import datetime

class DimedasServiceProAPITester:
    def __init__(self, base_url="https://service-bridge-22.preview.emergentagent.com"):
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
            "model_name": "Powered Stretchers",
            "city": "Vilnius",
            "location_detail": "Test Hospital Ward A",
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
            "model_name": "Roll-in stretchers",
            "city": "Kaunas",
            "location_detail": "Updated Hospital Location",
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

    # ============ NEW FEATURE TESTS ============
    
    def test_customer_issue_creation(self):
        """Test creating a customer issue"""
        if not self.test_product_id:
            print("❌ Skipping - No test product ID available")
            return False
            
        customer_issue_data = {
            "product_id": self.test_product_id,
            "issue_type": "electrical",
            "title": "Customer Reported Issue",
            "description": "Customer reported electrical malfunction",
            "product_location": "Hospital Ward A, Room 101",
            "warranty_status": "warranty"
        }
        
        success, response = self.run_test(
            "Create Customer Issue",
            "POST",
            "issues/customer",
            200,
            data=customer_issue_data
        )
        
        if success and 'id' in response:
            self.test_customer_issue_id = response['id']
            print(f"   Created customer issue with ID: {self.test_customer_issue_id}")
            # Verify it's marked as customer source and high severity
            if response.get('source') == 'customer' and response.get('severity') == 'high':
                print("   ✅ Customer issue correctly marked with source='customer' and severity='high'")
            else:
                print(f"   ❌ Customer issue not properly marked: source={response.get('source')}, severity={response.get('severity')}")
                return False
        
        return success

    def test_technician_assignment_creates_calendar_entry(self):
        """Test that assigning technician to customer issue creates calendar entry"""
        if not hasattr(self, 'test_customer_issue_id') or not self.test_customer_issue_id:
            print("❌ Skipping - No test customer issue ID available")
            return False
            
        # First, get the current count of scheduled maintenance
        success, initial_maintenance = self.run_test(
            "Get Initial Maintenance Count",
            "GET",
            "scheduled-maintenance",
            200
        )
        
        if not success:
            return False
            
        initial_count = len(initial_maintenance)
        print(f"   Initial maintenance count: {initial_count}")
        
        # Assign technician to the customer issue
        assignment_data = {
            "technician_name": "Sarah Johnson"
        }
        
        success, response = self.run_test(
            "Assign Technician to Customer Issue",
            "PUT",
            f"issues/{self.test_customer_issue_id}",
            200,
            data=assignment_data
        )
        
        if not success:
            return False
            
        # Verify technician was assigned
        if response.get('technician_name') != 'Sarah Johnson':
            print(f"   ❌ Technician not properly assigned: {response.get('technician_name')}")
            return False
            
        print("   ✅ Technician assigned successfully")
        
        # Check if calendar entry was created
        success, updated_maintenance = self.run_test(
            "Get Updated Maintenance Count",
            "GET",
            "scheduled-maintenance",
            200
        )
        
        if not success:
            return False
            
        updated_count = len(updated_maintenance)
        print(f"   Updated maintenance count: {updated_count}")
        
        if updated_count <= initial_count:
            print("   ❌ No new calendar entry created after technician assignment")
            return False
            
        # Find the new calendar entry for customer issue
        customer_entries = [m for m in updated_maintenance if m.get('source') == 'customer_issue' and m.get('issue_id') == self.test_customer_issue_id]
        
        if not customer_entries:
            print("   ❌ No calendar entry found with source='customer_issue' for this issue")
            return False
            
        calendar_entry = customer_entries[0]
        self.test_customer_calendar_id = calendar_entry['id']
        
        # Verify calendar entry properties
        expected_properties = {
            'source': 'customer_issue',
            'maintenance_type': 'customer_issue',
            'technician_name': 'Sarah Johnson',
            'priority': '12h',
            'issue_id': self.test_customer_issue_id
        }
        
        for prop, expected_value in expected_properties.items():
            if calendar_entry.get(prop) != expected_value:
                print(f"   ❌ Calendar entry property {prop} incorrect: expected {expected_value}, got {calendar_entry.get(prop)}")
                return False
                
        print("   ✅ Calendar entry created with correct properties")
        
        # Verify SLA deadline calculation (should be created_at + 12 hours)
        from datetime import datetime, timedelta
        try:
            # Get the original issue to check created_at
            success, issue_details = self.run_test(
                "Get Customer Issue Details",
                "GET",
                f"issues/{self.test_customer_issue_id}",
                200
            )
            
            if success:
                created_at = datetime.fromisoformat(issue_details['created_at'].replace('Z', '+00:00'))
                expected_sla = created_at + timedelta(hours=12)
                
                scheduled_date = datetime.fromisoformat(calendar_entry['scheduled_date'].replace('Z', '+00:00'))
                
                # Allow some tolerance (within 1 minute)
                time_diff = abs((scheduled_date - expected_sla).total_seconds())
                if time_diff <= 60:
                    print(f"   ✅ SLA deadline correctly calculated: {scheduled_date.isoformat()}")
                else:
                    print(f"   ❌ SLA deadline incorrect: expected ~{expected_sla.isoformat()}, got {scheduled_date.isoformat()}")
                    return False
        except Exception as e:
            print(f"   ⚠️  Could not verify SLA calculation: {e}")
        
        return True

    def test_get_unassigned_customer_issues(self):
        """Test getting unassigned customer issues (for notification system)"""
        # Create another customer issue without technician
        if not self.test_product_id:
            print("❌ Skipping - No test product ID available")
            return False
            
        unassigned_issue_data = {
            "product_id": self.test_product_id,
            "issue_type": "mechanical",
            "title": "Unassigned Customer Issue",
            "description": "This issue should appear in notifications",
            "product_location": "Hospital Ward B, Room 205"
        }
        
        success, response = self.run_test(
            "Create Unassigned Customer Issue",
            "POST",
            "issues/customer",
            200,
            data=unassigned_issue_data
        )
        
        if success and 'id' in response:
            self.test_unassigned_issue_id = response['id']
            
        # Get all issues and filter for unassigned customer issues
        success, all_issues = self.run_test(
            "Get All Issues for Notification Check",
            "GET",
            "issues",
            200
        )
        
        if not success:
            return False
            
        # Filter for customer issues without technician
        unassigned_customer_issues = [
            issue for issue in all_issues 
            if issue.get('source') == 'customer' and not issue.get('technician_name')
        ]
        
        print(f"   Found {len(unassigned_customer_issues)} unassigned customer issues")
        
        if len(unassigned_customer_issues) == 0:
            print("   ❌ No unassigned customer issues found for notification system")
            return False
            
        # Verify our test issue is in the list
        test_issue_found = any(issue['id'] == self.test_unassigned_issue_id for issue in unassigned_customer_issues)
        
        if not test_issue_found:
            print("   ❌ Test unassigned issue not found in results")
            return False
            
        print("   ✅ Unassigned customer issues correctly identified for notification system")
        return True

    def cleanup_test_customer_data(self):
        """Clean up customer issue test data"""
        success_count = 0
        total_tests = 0
        
        # Delete customer calendar entry
        if hasattr(self, 'test_customer_calendar_id') and self.test_customer_calendar_id:
            total_tests += 1
            success, _ = self.run_test(
                "Delete Customer Calendar Entry",
                "DELETE",
                f"scheduled-maintenance/{self.test_customer_calendar_id}",
                200
            )
            if success:
                success_count += 1
        
        # Delete customer issues
        for issue_attr in ['test_customer_issue_id', 'test_unassigned_issue_id']:
            if hasattr(self, issue_attr) and getattr(self, issue_attr):
                total_tests += 1
                success, _ = self.run_test(
                    f"Delete {issue_attr.replace('_', ' ').title()}",
                    "DELETE",
                    f"issues/{getattr(self, issue_attr)}",
                    200
                )
                if success:
                    success_count += 1
        
        return success_count == total_tests if total_tests > 0 else True

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
        
        # NEW FEATURE TESTS - Customer Issues & Calendar Integration
        tester.test_customer_issue_creation,
        tester.test_technician_assignment_creates_calendar_entry,
        tester.test_get_unassigned_customer_issues,
        
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
        tester.cleanup_test_customer_data,
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