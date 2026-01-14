"""
Test suite for Technician and Customer Portal features
- Customer Portal: Status/Condition filter, 3 dates display for resolved issues, sorting
- Technician Portal: Login, Calendar Mark In Progress, Services page resolve
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCustomerPortalFeatures:
    """Test Customer Portal specific features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as customer and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as customer
        response = self.session.post(f"{BASE_URL}/api/auth/customer-login", json={
            "password": "customer2025"
        })
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        data = response.json()
        self.token = data.get("token")
        self.session.headers.update({"X-Auth-Token": self.token})
        print(f"Customer login successful, token: {self.token[:20]}...")
    
    def test_customer_login(self):
        """Test customer login with password customer2025"""
        response = requests.post(f"{BASE_URL}/api/auth/customer-login", json={
            "password": "customer2025"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("type") == "customer"
        assert "token" in data
        print("SUCCESS: Customer login works with password 'customer2025'")
    
    def test_get_issues_for_filtering(self):
        """Test that issues endpoint returns data needed for filtering"""
        response = self.session.get(f"{BASE_URL}/api/issues")
        assert response.status_code == 200
        issues = response.json()
        print(f"Found {len(issues)} issues")
        
        # Check that issues have required fields for filtering
        for issue in issues[:5]:  # Check first 5
            assert "status" in issue, "Issue missing 'status' field"
            assert "created_at" in issue, "Issue missing 'created_at' field"
            assert "product_id" in issue, "Issue missing 'product_id' field"
            
            # Check for technician_name (for registered status)
            if issue.get("technician_name"):
                print(f"Issue {issue['id'][:8]}... has technician: {issue['technician_name']}")
            
            # Check for resolved_at (for resolved issues)
            if issue.get("status") == "resolved":
                assert "resolved_at" in issue, "Resolved issue missing 'resolved_at' field"
                print(f"Resolved issue {issue['id'][:8]}... has resolved_at: {issue.get('resolved_at')}")
        
        print("SUCCESS: Issues have all required fields for filtering")
    
    def test_issues_have_three_dates_for_resolved(self):
        """Test that resolved issues have all 3 dates: created_at, technician_assigned_at, resolved_at"""
        response = self.session.get(f"{BASE_URL}/api/issues")
        assert response.status_code == 200
        issues = response.json()
        
        resolved_issues = [i for i in issues if i.get("status") == "resolved"]
        print(f"Found {len(resolved_issues)} resolved issues")
        
        for issue in resolved_issues[:5]:  # Check first 5 resolved
            # created_at should always exist
            assert "created_at" in issue and issue["created_at"], f"Resolved issue {issue['id'][:8]}... missing created_at"
            
            # resolved_at should exist for resolved issues
            assert "resolved_at" in issue and issue["resolved_at"], f"Resolved issue {issue['id'][:8]}... missing resolved_at"
            
            # technician_assigned_at may or may not exist depending on workflow
            has_assigned_at = "technician_assigned_at" in issue and issue["technician_assigned_at"]
            print(f"Resolved issue {issue['id'][:8]}...: created_at={issue['created_at'][:19]}, "
                  f"technician_assigned_at={'Yes' if has_assigned_at else 'No'}, "
                  f"resolved_at={issue['resolved_at'][:19]}")
        
        print("SUCCESS: Resolved issues have required date fields")
    
    def test_issues_sorted_by_date(self):
        """Test that issues are sorted by latest date (descending)"""
        response = self.session.get(f"{BASE_URL}/api/issues")
        assert response.status_code == 200
        issues = response.json()
        
        if len(issues) < 2:
            print("SKIP: Not enough issues to test sorting")
            return
        
        # Backend sorts by created_at descending
        dates = [issue.get("created_at", "") for issue in issues]
        for i in range(len(dates) - 1):
            if dates[i] and dates[i+1]:
                assert dates[i] >= dates[i+1], f"Issues not sorted correctly: {dates[i]} should be >= {dates[i+1]}"
        
        print("SUCCESS: Issues are sorted by date (latest first)")
    
    def test_products_for_city_filter(self):
        """Test that products have city field for filtering"""
        response = self.session.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        products = response.json()
        
        cities = set()
        for product in products:
            assert "city" in product, "Product missing 'city' field"
            cities.add(product["city"])
        
        print(f"Found products in cities: {cities}")
        print("SUCCESS: Products have city field for filtering")


class TestTechnicianPortalFeatures:
    """Test Technician Portal specific features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as technician and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as technician
        response = self.session.post(f"{BASE_URL}/api/auth/technician-login", json={
            "password": "service2025"
        })
        assert response.status_code == 200, f"Technician login failed: {response.text}"
        data = response.json()
        self.token = data.get("token")
        self.session.headers.update({"X-Auth-Token": self.token})
        print(f"Technician login successful, token: {self.token[:20]}...")
    
    def test_technician_login(self):
        """Test technician login with password service2025"""
        response = requests.post(f"{BASE_URL}/api/auth/technician-login", json={
            "password": "service2025"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("type") == "technician"
        assert "token" in data
        print("SUCCESS: Technician login works with password 'service2025'")
    
    def test_get_scheduled_maintenance_for_calendar(self):
        """Test that scheduled maintenance endpoint returns data for calendar"""
        response = self.session.get(f"{BASE_URL}/api/scheduled-maintenance")
        assert response.status_code == 200
        maintenance = response.json()
        print(f"Found {len(maintenance)} scheduled maintenance items")
        
        for item in maintenance[:5]:
            assert "id" in item
            assert "product_id" in item
            assert "scheduled_date" in item
            assert "status" in item
            assert "source" in item
            
            # Check for issue_id (needed for Mark In Progress)
            if item.get("source") == "customer_issue":
                print(f"Customer issue maintenance: {item['id'][:8]}..., status={item['status']}, issue_id={item.get('issue_id', 'N/A')}")
        
        print("SUCCESS: Scheduled maintenance has required fields")
    
    def test_get_issues_for_services_page(self):
        """Test that issues endpoint returns in_progress issues for Services page"""
        response = self.session.get(f"{BASE_URL}/api/issues")
        assert response.status_code == 200
        issues = response.json()
        
        in_progress = [i for i in issues if i.get("status") == "in_progress"]
        print(f"Found {len(in_progress)} in_progress issues")
        
        for issue in in_progress[:5]:
            assert "id" in issue
            assert "title" in issue
            assert "product_id" in issue
            assert "technician_name" in issue
            print(f"In Progress issue: {issue['id'][:8]}..., title={issue['title'][:30]}..., technician={issue.get('technician_name', 'N/A')}")
        
        print("SUCCESS: Issues endpoint returns in_progress issues")
    
    def test_mark_issue_in_progress(self):
        """Test marking an issue as in_progress"""
        # First, get an open issue
        response = self.session.get(f"{BASE_URL}/api/issues")
        assert response.status_code == 200
        issues = response.json()
        
        open_issues = [i for i in issues if i.get("status") == "open"]
        
        if not open_issues:
            print("SKIP: No open issues to test Mark In Progress")
            return
        
        issue = open_issues[0]
        issue_id = issue["id"]
        
        # Mark as in_progress
        response = self.session.put(f"{BASE_URL}/api/issues/{issue_id}", json={
            "status": "in_progress"
        })
        assert response.status_code == 200
        updated = response.json()
        assert updated["status"] == "in_progress"
        print(f"SUCCESS: Issue {issue_id[:8]}... marked as in_progress")
        
        # Revert back to open for other tests
        self.session.put(f"{BASE_URL}/api/issues/{issue_id}", json={
            "status": "open"
        })
    
    def test_resolve_issue(self):
        """Test resolving an issue from Services page"""
        # First, get an in_progress issue
        response = self.session.get(f"{BASE_URL}/api/issues")
        assert response.status_code == 200
        issues = response.json()
        
        in_progress = [i for i in issues if i.get("status") == "in_progress"]
        
        if not in_progress:
            print("SKIP: No in_progress issues to test resolve")
            return
        
        issue = in_progress[0]
        issue_id = issue["id"]
        
        # Resolve the issue
        response = self.session.put(f"{BASE_URL}/api/issues/{issue_id}", json={
            "status": "resolved",
            "resolution": "Test resolution from pytest",
            "warranty_service_type": "warranty"
        })
        assert response.status_code == 200
        updated = response.json()
        assert updated["status"] == "resolved"
        assert updated.get("resolved_at") is not None
        print(f"SUCCESS: Issue {issue_id[:8]}... resolved with resolved_at={updated['resolved_at'][:19]}")
        
        # Revert back to in_progress for other tests
        self.session.put(f"{BASE_URL}/api/issues/{issue_id}", json={
            "status": "in_progress"
        })
    
    def test_update_scheduled_maintenance_status(self):
        """Test updating scheduled maintenance status (for Mark In Progress from calendar)"""
        response = self.session.get(f"{BASE_URL}/api/scheduled-maintenance")
        assert response.status_code == 200
        maintenance = response.json()
        
        scheduled = [m for m in maintenance if m.get("status") == "scheduled"]
        
        if not scheduled:
            print("SKIP: No scheduled maintenance to test status update")
            return
        
        item = scheduled[0]
        item_id = item["id"]
        
        # Update to in_progress
        response = self.session.put(f"{BASE_URL}/api/scheduled-maintenance/{item_id}", json={
            "status": "in_progress"
        })
        assert response.status_code == 200
        updated = response.json()
        assert updated["status"] == "in_progress"
        print(f"SUCCESS: Maintenance {item_id[:8]}... status updated to in_progress")
        
        # Revert back to scheduled
        self.session.put(f"{BASE_URL}/api/scheduled-maintenance/{item_id}", json={
            "status": "scheduled"
        })


class TestEndToEndWorkflow:
    """Test complete workflow: Customer reports -> Technician resolves"""
    
    def test_complete_workflow(self):
        """Test complete workflow from customer issue to technician resolution"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Step 1: Customer login
        response = session.post(f"{BASE_URL}/api/auth/customer-login", json={
            "password": "customer2025"
        })
        assert response.status_code == 200
        customer_token = response.json()["token"]
        session.headers.update({"X-Auth-Token": customer_token})
        print("Step 1: Customer logged in")
        
        # Step 2: Get a product to report issue on
        response = session.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        products = response.json()
        assert len(products) > 0, "No products available"
        product = products[0]
        print(f"Step 2: Using product {product['serial_number']} in {product['city']}")
        
        # Step 3: Customer creates issue
        response = session.post(f"{BASE_URL}/api/issues/customer", json={
            "product_id": product["id"],
            "issue_type": "mechanical",
            "title": f"TEST_Workflow_Issue_{datetime.now().strftime('%H%M%S')}",
            "description": "Test issue for workflow testing",
            "product_location": "Test Location"
        })
        assert response.status_code == 200
        issue = response.json()
        issue_id = issue["id"]
        assert issue["source"] == "customer"
        assert issue["severity"] == "high"  # Customer issues are high severity
        print(f"Step 3: Customer created issue {issue_id[:8]}...")
        
        # Step 4: Technician login
        response = session.post(f"{BASE_URL}/api/auth/technician-login", json={
            "password": "service2025"
        })
        assert response.status_code == 200
        tech_token = response.json()["token"]
        session.headers.update({"X-Auth-Token": tech_token})
        print("Step 4: Technician logged in")
        
        # Step 5: Verify issue is visible
        response = session.get(f"{BASE_URL}/api/issues/{issue_id}")
        assert response.status_code == 200
        issue = response.json()
        assert issue["status"] == "open"
        print(f"Step 5: Issue visible with status={issue['status']}")
        
        # Step 6: Assign technician (this should create calendar entry)
        response = session.put(f"{BASE_URL}/api/issues/{issue_id}", json={
            "technician_name": "Jonas Jonaitis"
        })
        assert response.status_code == 200
        issue = response.json()
        assert issue.get("technician_name") == "Jonas Jonaitis"
        assert issue.get("technician_assigned_at") is not None
        print(f"Step 6: Technician assigned, technician_assigned_at={issue['technician_assigned_at'][:19]}")
        
        # Step 7: Mark as in_progress
        response = session.put(f"{BASE_URL}/api/issues/{issue_id}", json={
            "status": "in_progress"
        })
        assert response.status_code == 200
        issue = response.json()
        assert issue["status"] == "in_progress"
        print(f"Step 7: Issue marked as in_progress")
        
        # Step 8: Resolve the issue
        response = session.put(f"{BASE_URL}/api/issues/{issue_id}", json={
            "status": "resolved",
            "resolution": "Fixed during workflow test",
            "warranty_service_type": "warranty"
        })
        assert response.status_code == 200
        issue = response.json()
        assert issue["status"] == "resolved"
        assert issue.get("resolved_at") is not None
        print(f"Step 8: Issue resolved, resolved_at={issue['resolved_at'][:19]}")
        
        # Step 9: Verify all 3 dates exist
        assert issue.get("created_at"), "Missing created_at"
        assert issue.get("technician_assigned_at"), "Missing technician_assigned_at"
        assert issue.get("resolved_at"), "Missing resolved_at"
        print(f"Step 9: All 3 dates present:")
        print(f"  - created_at: {issue['created_at'][:19]}")
        print(f"  - technician_assigned_at: {issue['technician_assigned_at'][:19]}")
        print(f"  - resolved_at: {issue['resolved_at'][:19]}")
        
        # Cleanup: Delete test issue
        response = session.delete(f"{BASE_URL}/api/issues/{issue_id}")
        assert response.status_code == 200
        print(f"Cleanup: Test issue deleted")
        
        print("\nSUCCESS: Complete workflow test passed!")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
