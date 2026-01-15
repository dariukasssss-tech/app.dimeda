import requests
import sys
import json
from datetime import datetime

class DimedasServiceProAPITester:
    def __init__(self, base_url="https://stretcher-pro-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_product_id = None
        self.test_service_id = None
        self.test_issue_id = None
        self.test_maintenance_id = None
        self.auth_token = None
        self.session = requests.Session()

    def login(self, password="dimeda2025"):
        """Login to get authentication token"""
        login_data = {"password": password}
        
        print(f"🔐 Logging in with password: {password}")
        
        try:
            response = self.session.post(
                f"{self.api_url}/auth/login",
                json=login_data,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                result = response.json()
                self.auth_token = result.get('token')
                # Set the token in session headers for future requests
                self.session.headers.update({'X-Auth-Token': self.auth_token})
                print("✅ Login successful")
                return True
            else:
                print(f"❌ Login failed - Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Login error: {str(e)}")
            return False

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        # Add auth token if available
        if self.auth_token:
            headers['X-Auth-Token'] = self.auth_token

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers)

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

    def test_comprehensive_workflow(self):
        """Test the complete Dimeda Service Pro workflow as specified in review request"""
        print("\n🔄 STARTING COMPREHENSIVE WORKFLOW TEST")
        print("=" * 60)
        
        workflow_success = True
        
        # Step 1: Customer Portal - Issue Registration
        print("\n📋 STEP 1: CUSTOMER PORTAL - ISSUE REGISTRATION")
        
        # First login as customer
        customer_session = requests.Session()
        login_data = {"password": "customer2025"}
        
        try:
            response = customer_session.post(
                f"{self.api_url}/auth/customer-login",
                json=login_data,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                result = response.json()
                customer_token = result.get('token')
                customer_session.headers.update({'X-Auth-Token': customer_token})
                print("✅ Customer login successful")
            else:
                print(f"❌ Customer login failed - Status: {response.status_code}")
                workflow_success = False
                return workflow_success
        except Exception as e:
            print(f"❌ Customer login error: {str(e)}")
            workflow_success = False
            return workflow_success
        
        # Get products list
        try:
            response = customer_session.get(f"{self.api_url}/products")
            if response.status_code == 200:
                products = response.json()
                if products:
                    test_product = products[0]
                    print(f"✅ Retrieved products list - Using product: {test_product['serial_number']}")
                else:
                    print("❌ No products available for testing")
                    workflow_success = False
                    return workflow_success
            else:
                print(f"❌ Failed to get products - Status: {response.status_code}")
                workflow_success = False
                return workflow_success
        except Exception as e:
            print(f"❌ Error getting products: {str(e)}")
            workflow_success = False
            return workflow_success
        
        # Create customer issue
        customer_issue_data = {
            "product_id": test_product['id'],
            "title": "Evaluation Test Issue",
            "description": "Testing complete workflow",
            "issue_type": "mechanical",
            "product_location": "Test Hospital Floor 1"
        }
        
        try:
            response = customer_session.post(
                f"{self.api_url}/issues/customer",
                json=customer_issue_data,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                customer_issue = response.json()
                self.workflow_issue_id = customer_issue['id']
                
                # Verify response properties
                if (customer_issue.get('source') == 'customer' and 
                    customer_issue.get('severity') == 'high'):
                    print(f"✅ Customer issue created successfully - ID: {self.workflow_issue_id}")
                    print(f"   Source: {customer_issue.get('source')}, Severity: {customer_issue.get('severity')}")
                else:
                    print(f"❌ Customer issue properties incorrect - Source: {customer_issue.get('source')}, Severity: {customer_issue.get('severity')}")
                    workflow_success = False
            else:
                print(f"❌ Failed to create customer issue - Status: {response.status_code}")
                workflow_success = False
                return workflow_success
        except Exception as e:
            print(f"❌ Error creating customer issue: {str(e)}")
            workflow_success = False
            return workflow_success
        
        # Step 2: Service Pro - Notification Check
        print("\n🔔 STEP 2: SERVICE PRO - NOTIFICATION CHECK")
        
        # Get all issues and filter for unassigned customer issues
        success, all_issues = self.run_test(
            "Get Issues for Notification Check",
            "GET",
            "issues",
            200
        )
        
        if success:
            unassigned_customer_issues = [
                issue for issue in all_issues 
                if (issue.get('source') == 'customer' and 
                    not issue.get('technician_name'))
            ]
            
            # Verify our test issue appears
            test_issue_found = any(issue['id'] == self.workflow_issue_id for issue in unassigned_customer_issues)
            
            if test_issue_found:
                print(f"✅ New customer issue appears in unassigned list ({len(unassigned_customer_issues)} total)")
            else:
                print("❌ Test issue not found in unassigned customer issues")
                workflow_success = False
        else:
            workflow_success = False
        
        # Step 3: Technician Assignment
        print("\n👨‍🔧 STEP 3: TECHNICIAN ASSIGNMENT")
        
        assignment_data = {"technician_name": "Technician 1"}
        
        success, updated_issue = self.run_test(
            "Assign Technician",
            "PUT",
            f"issues/{self.workflow_issue_id}",
            200,
            data=assignment_data
        )
        
        if success:
            if (updated_issue.get('technician_name') == 'Technician 1' and 
                updated_issue.get('technician_assigned_at')):
                print("✅ Technician assigned successfully")
                print(f"   Assigned at: {updated_issue.get('technician_assigned_at')}")
            else:
                print("❌ Technician assignment failed")
                workflow_success = False
        else:
            workflow_success = False
        
        # Verify calendar entry created
        success, maintenance_list = self.run_test(
            "Check Calendar Entry Creation",
            "GET",
            "scheduled-maintenance",
            200
        )
        
        if success:
            customer_calendar_entries = [
                m for m in maintenance_list 
                if (m.get('source') == 'customer_issue' and 
                    m.get('issue_id') == self.workflow_issue_id)
            ]
            
            if customer_calendar_entries:
                calendar_entry = customer_calendar_entries[0]
                self.workflow_calendar_id = calendar_entry['id']
                print("✅ Calendar entry created with SLA deadline")
                print(f"   Scheduled date: {calendar_entry.get('scheduled_date')}")
                print(f"   Priority: {calendar_entry.get('priority')}")
            else:
                print("❌ No calendar entry created for customer issue")
                workflow_success = False
        else:
            workflow_success = False
        
        # Step 4: Mark as In Progress
        print("\n⏳ STEP 4: MARK AS IN PROGRESS")
        
        progress_data = {"status": "in_progress"}
        
        success, updated_issue = self.run_test(
            "Mark Issue In Progress",
            "PUT",
            f"issues/{self.workflow_issue_id}",
            200,
            data=progress_data
        )
        
        if success and updated_issue.get('status') == 'in_progress':
            print("✅ Issue marked as in progress")
        else:
            print("❌ Failed to mark issue as in progress")
            workflow_success = False
        
        # Step 5: Resolve Issue (Warranty)
        print("\n🔧 STEP 5: RESOLVE ISSUE (WARRANTY)")
        
        warranty_resolution_data = {
            "status": "resolved",
            "warranty_service_type": "warranty",
            "resolution": "Issue fixed under warranty"
        }
        
        success, resolved_issue = self.run_test(
            "Resolve Issue (Warranty)",
            "PUT",
            f"issues/{self.workflow_issue_id}",
            200,
            data=warranty_resolution_data
        )
        
        if success:
            if (resolved_issue.get('status') == 'resolved' and 
                resolved_issue.get('warranty_service_type') == 'warranty' and
                resolved_issue.get('resolved_at')):
                print("✅ Issue resolved under warranty")
                print(f"   Resolved at: {resolved_issue.get('resolved_at')}")
            else:
                print("❌ Warranty resolution failed")
                workflow_success = False
        else:
            workflow_success = False
        
        # Step 6: Resolve Issue (Non-Warranty) - Create another test issue
        print("\n💰 STEP 6: RESOLVE ISSUE (NON-WARRANTY)")
        
        # Create another customer issue for non-warranty test
        non_warranty_issue_data = {
            "product_id": test_product['id'],
            "title": "Non-Warranty Test Issue",
            "description": "Testing non-warranty resolution",
            "issue_type": "electrical",
            "product_location": "Test Hospital Floor 2"
        }
        
        try:
            response = customer_session.post(
                f"{self.api_url}/issues/customer",
                json=non_warranty_issue_data,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                non_warranty_issue = response.json()
                self.workflow_non_warranty_issue_id = non_warranty_issue['id']
                print(f"✅ Created second test issue for non-warranty test - ID: {self.workflow_non_warranty_issue_id}")
            else:
                print(f"❌ Failed to create second test issue - Status: {response.status_code}")
                workflow_success = False
                return workflow_success
        except Exception as e:
            print(f"❌ Error creating second test issue: {str(e)}")
            workflow_success = False
            return workflow_success
        
        # Assign technician to second issue
        success, _ = self.run_test(
            "Assign Technician to Second Issue",
            "PUT",
            f"issues/{self.workflow_non_warranty_issue_id}",
            200,
            data={"technician_name": "Technician 2"}
        )
        
        if not success:
            workflow_success = False
            return workflow_success
        
        # Mark second issue in progress
        success, _ = self.run_test(
            "Mark Second Issue In Progress",
            "PUT",
            f"issues/{self.workflow_non_warranty_issue_id}",
            200,
            data={"status": "in_progress"}
        )
        
        if not success:
            workflow_success = False
            return workflow_success
        
        # Resolve with non-warranty
        non_warranty_resolution_data = {
            "status": "resolved",
            "warranty_service_type": "non_warranty",
            "resolution": "Paid repair completed",
            "estimated_fix_time": "3",
            "estimated_cost": "200"
        }
        
        success, resolved_non_warranty = self.run_test(
            "Resolve Issue (Non-Warranty)",
            "PUT",
            f"issues/{self.workflow_non_warranty_issue_id}",
            200,
            data=non_warranty_resolution_data
        )
        
        if success:
            if (resolved_non_warranty.get('status') == 'resolved' and 
                resolved_non_warranty.get('warranty_service_type') == 'non_warranty' and
                resolved_non_warranty.get('estimated_fix_time') == '3' and
                resolved_non_warranty.get('estimated_cost') == '200'):
                print("✅ Issue resolved as non-warranty with cost details")
                print(f"   Fix time: {resolved_non_warranty.get('estimated_fix_time')} hours")
                print(f"   Cost: €{resolved_non_warranty.get('estimated_cost')}")
            else:
                print("❌ Non-warranty resolution failed")
                workflow_success = False
        else:
            workflow_success = False
        
        # Step 7: Service Record Creation
        print("\n📝 STEP 7: SERVICE RECORD CREATION")
        
        service_data = {
            "product_id": test_product['id'],
            "technician_name": "Manual Service Tech",
            "service_type": "repair",
            "description": "Manual service record creation test",
            "issues_found": "Test issues found",
            "warranty_status": "warranty"
        }
        
        success, service_record = self.run_test(
            "Create Manual Service Record",
            "POST",
            "services",
            200,
            data=service_data
        )
        
        if success and service_record.get('id'):
            self.workflow_service_id = service_record['id']
            print(f"✅ Manual service record created - ID: {self.workflow_service_id}")
        else:
            workflow_success = False
        
        # Step 8: Mark as Open (Re-assignment Test)
        print("\n🔄 STEP 8: MARK AS OPEN (RE-ASSIGNMENT TEST)")
        
        reopen_data = {"status": "open"}
        
        success, reopened_issue = self.run_test(
            "Mark Issue as Open",
            "PUT",
            f"issues/{self.workflow_issue_id}",
            200,
            data=reopen_data
        )
        
        if success:
            if (reopened_issue.get('status') == 'open' and 
                not reopened_issue.get('technician_name') and
                not reopened_issue.get('technician_assigned_at')):
                print("✅ Issue marked as open - technician assignment cleared")
            else:
                print("❌ Failed to properly reopen issue")
                print(f"   Status: {reopened_issue.get('status')}")
                print(f"   Technician: {reopened_issue.get('technician_name')}")
                workflow_success = False
        else:
            workflow_success = False
        
        # Verify calendar entry was deleted
        success, updated_maintenance = self.run_test(
            "Check Calendar Entry Deletion",
            "GET",
            "scheduled-maintenance",
            200
        )
        
        if success:
            remaining_entries = [
                m for m in updated_maintenance 
                if (m.get('source') == 'customer_issue' and 
                    m.get('issue_id') == self.workflow_issue_id)
            ]
            
            if not remaining_entries:
                print("✅ Calendar entry deleted when issue marked as open")
            else:
                print("❌ Calendar entry not deleted when issue marked as open")
                workflow_success = False
        else:
            workflow_success = False
        
        print("\n" + "=" * 60)
        if workflow_success:
            print("🎉 COMPREHENSIVE WORKFLOW TEST COMPLETED SUCCESSFULLY")
        else:
            print("❌ COMPREHENSIVE WORKFLOW TEST FAILED")
        print("=" * 60)
        
        return workflow_success
    
    def cleanup_workflow_data(self):
        """Clean up workflow test data"""
        print("\n🧹 CLEANING UP WORKFLOW TEST DATA")
        
        cleanup_items = [
            ('workflow_service_id', 'services'),
            ('workflow_non_warranty_issue_id', 'issues'),
            ('workflow_issue_id', 'issues'),
            ('workflow_calendar_id', 'scheduled-maintenance')
        ]
        
        for attr_name, endpoint in cleanup_items:
            if hasattr(self, attr_name) and getattr(self, attr_name):
                item_id = getattr(self, attr_name)
                success, _ = self.run_test(
                    f"Delete {attr_name.replace('_', ' ').title()}",
                    "DELETE",
                    f"{endpoint}/{item_id}",
                    200
                )
                if success:
                    print(f"✅ Deleted {attr_name}")
                else:
                    print(f"❌ Failed to delete {attr_name}")

def main():
    print("🚀 Starting Dimeda Service Pro API Tests")
    print("=" * 50)
    
    tester = DimedasServiceProAPITester()
    
    # Login first
    if not tester.login():
        print("❌ Failed to login - cannot proceed with tests")
        return 1
    
    # Run comprehensive workflow test
    workflow_success = tester.test_comprehensive_workflow()
    
    # Clean up workflow data
    tester.cleanup_workflow_data()
    
    # Test sequence for other tests
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
    
    # Include workflow test result
    if workflow_success:
        print("🎉 Comprehensive workflow test: PASSED")
    else:
        print("❌ Comprehensive workflow test: FAILED")
    
    if tester.tests_passed == tester.tests_run and workflow_success:
        print("🎉 All tests passed!")
        return 0
    else:
        failed_count = tester.tests_run - tester.tests_passed
        if not workflow_success:
            failed_count += 1
        print(f"❌ {failed_count} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())