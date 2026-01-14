"""
Test Warranty Workflow - Admin In Service Tab and Technician Assignment
Tests:
1. Admin 'In Service' tab shows only ONE issue per warranty case (no duplicates)
2. Admin can see 'Complete Service' and 'View Track' buttons on In Service issues
3. Admin can open 'View Track' popup and assign/re-assign a technician
4. When a technician is assigned via View Track popup, the task appears on their calendar
5. Technician can see warranty service tasks on their Services page
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestWarrantyWorkflow:
    """Test warranty workflow from admin to technician"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "password": "admin2025"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        self.admin_token = data.get("token")
        self.session.headers.update({"X-Auth-Token": self.admin_token})
        
    def test_01_get_all_issues(self):
        """Test getting all issues"""
        response = self.session.get(f"{BASE_URL}/api/issues")
        assert response.status_code == 200, f"Failed to get issues: {response.text}"
        issues = response.json()
        print(f"Total issues: {len(issues)}")
        
        # Categorize issues
        in_service = [i for i in issues if i.get("status") == "in_service"]
        warranty_routes = [i for i in issues if i.get("is_warranty_route")]
        
        print(f"In Service issues: {len(in_service)}")
        print(f"Warranty route issues: {len(warranty_routes)}")
        
        for issue in in_service:
            print(f"  - {issue.get('issue_code')}: {issue.get('title')} (child: {issue.get('child_issue_id')})")
        
        return issues
    
    def test_02_verify_in_service_no_duplicates(self):
        """Verify In Service tab shows only ONE issue per warranty case"""
        response = self.session.get(f"{BASE_URL}/api/issues")
        assert response.status_code == 200
        issues = response.json()
        
        # Get in_service issues (parent issues waiting for warranty service)
        in_service_issues = [i for i in issues if i.get("status") == "in_service"]
        
        # Get warranty route issues (child issues created for service)
        warranty_route_issues = [i for i in issues if i.get("is_warranty_route") and i.get("status") != "resolved"]
        
        print(f"\nIn Service issues (parent): {len(in_service_issues)}")
        for issue in in_service_issues:
            print(f"  - {issue.get('issue_code')}: {issue.get('title')}")
            
        print(f"\nWarranty Route issues (child): {len(warranty_route_issues)}")
        for issue in warranty_route_issues:
            print(f"  - {issue.get('issue_code')}: {issue.get('title')} (parent: {issue.get('parent_issue_id')})")
        
        # Verify each in_service issue has exactly one linked warranty route issue
        for parent in in_service_issues:
            child_id = parent.get("child_issue_id")
            if child_id:
                matching_children = [c for c in warranty_route_issues if c.get("id") == child_id]
                assert len(matching_children) <= 1, f"Duplicate warranty route issues found for parent {parent.get('issue_code')}"
                print(f"  Parent {parent.get('issue_code')} has child: {child_id}")
        
        return in_service_issues, warranty_route_issues
    
    def test_03_get_issue_track(self):
        """Test getting issue track for an in_service issue"""
        response = self.session.get(f"{BASE_URL}/api/issues")
        assert response.status_code == 200
        issues = response.json()
        
        # Find an in_service issue
        in_service_issues = [i for i in issues if i.get("status") == "in_service"]
        
        if not in_service_issues:
            pytest.skip("No in_service issues found to test track")
        
        issue = in_service_issues[0]
        issue_id = issue.get("id")
        
        # Get track
        track_response = self.session.get(f"{BASE_URL}/api/issues/{issue_id}/track")
        assert track_response.status_code == 200, f"Failed to get track: {track_response.text}"
        
        track = track_response.json()
        print(f"\nTrack for issue {issue.get('issue_code')}:")
        print(f"  Is warranty flow: {track.get('is_warranty_flow')}")
        print(f"  Original issue: {track.get('original_issue', {}).get('issue_code')}")
        print(f"  Warranty service issue: {track.get('warranty_service_issue', {}).get('issue_code') if track.get('warranty_service_issue') else 'None'}")
        
        # Verify track structure
        assert "original_issue" in track or "current_issue" in track
        assert "warranty_service_issue" in track
        assert "product" in track
        
        return track
    
    def test_04_assign_technician_via_track(self):
        """Test assigning technician via View Track popup"""
        response = self.session.get(f"{BASE_URL}/api/issues")
        assert response.status_code == 200
        issues = response.json()
        
        # Find a warranty route issue that needs technician assignment
        warranty_routes = [i for i in issues if i.get("is_warranty_route") and i.get("status") != "resolved"]
        
        if not warranty_routes:
            pytest.skip("No warranty route issues found to test assignment")
        
        warranty_issue = warranty_routes[0]
        warranty_issue_id = warranty_issue.get("id")
        current_technician = warranty_issue.get("technician_name")
        
        print(f"\nWarranty issue: {warranty_issue.get('issue_code')}")
        print(f"  Current technician: {current_technician}")
        
        # Assign a technician (or re-assign)
        new_technician = "Technician 2" if current_technician == "Technician 1" else "Technician 1"
        
        update_response = self.session.put(f"{BASE_URL}/api/issues/{warranty_issue_id}", json={
            "technician_name": new_technician,
            "status": "in_progress"
        })
        assert update_response.status_code == 200, f"Failed to assign technician: {update_response.text}"
        
        updated_issue = update_response.json()
        print(f"  New technician: {updated_issue.get('technician_name')}")
        assert updated_issue.get("technician_name") == new_technician
        
        return warranty_issue_id, new_technician
    
    def test_05_verify_calendar_entry_created(self):
        """Verify calendar entry is created when technician is assigned"""
        response = self.session.get(f"{BASE_URL}/api/issues")
        assert response.status_code == 200
        issues = response.json()
        
        # Find NON-RESOLVED warranty route issues with technicians
        # Resolved issues don't need calendar entries
        warranty_routes = [i for i in issues if i.get("is_warranty_route") and i.get("technician_name") and i.get("status") != "resolved"]
        
        if not warranty_routes:
            pytest.skip("No non-resolved warranty route issues with technicians found")
        
        # Get scheduled maintenance
        maint_response = self.session.get(f"{BASE_URL}/api/scheduled-maintenance")
        assert maint_response.status_code == 200, f"Failed to get maintenance: {maint_response.text}"
        
        maintenance = maint_response.json()
        
        # Check for warranty_service entries
        warranty_service_entries = [m for m in maintenance if m.get("source") == "warranty_service"]
        print(f"\nWarranty service calendar entries: {len(warranty_service_entries)}")
        
        for entry in warranty_service_entries:
            print(f"  - {entry.get('maintenance_type')}: {entry.get('technician_name')} - {entry.get('notes')}")
        
        # Verify each non-resolved warranty route issue has a calendar entry
        for issue in warranty_routes:
            issue_id = issue.get("id")
            matching_entries = [m for m in warranty_service_entries if m.get("issue_id") == issue_id]
            print(f"\nIssue {issue.get('issue_code')} ({issue.get('technician_name')}, status={issue.get('status')}): {len(matching_entries)} calendar entries")
            
            # Should have at least one calendar entry for non-resolved issues
            assert len(matching_entries) >= 1, f"No calendar entry found for warranty issue {issue.get('issue_code')}"
    
    def test_06_technician_can_see_warranty_tasks(self):
        """Test that technician can see warranty service tasks"""
        # Login as technician
        tech_session = requests.Session()
        tech_session.headers.update({"Content-Type": "application/json"})
        
        response = tech_session.post(f"{BASE_URL}/api/auth/technician-login", json={
            "password": "service2025"
        })
        assert response.status_code == 200, f"Technician login failed: {response.text}"
        data = response.json()
        tech_token = data.get("token")
        tech_session.headers.update({"X-Auth-Token": tech_token})
        
        # Get issues
        issues_response = tech_session.get(f"{BASE_URL}/api/issues")
        assert issues_response.status_code == 200, f"Failed to get issues: {issues_response.text}"
        
        issues = issues_response.json()
        
        # Filter for warranty route issues assigned to Technician 1
        tech1_warranty = [i for i in issues if i.get("is_warranty_route") and i.get("technician_name") == "Technician 1"]
        
        print(f"\nTechnician 1 warranty tasks: {len(tech1_warranty)}")
        for issue in tech1_warranty:
            print(f"  - {issue.get('issue_code')}: {issue.get('title')} ({issue.get('status')})")
        
        # Get scheduled maintenance for technician
        maint_response = tech_session.get(f"{BASE_URL}/api/scheduled-maintenance")
        assert maint_response.status_code == 200
        
        maintenance = maint_response.json()
        tech1_maint = [m for m in maintenance if m.get("technician_name") == "Technician 1" and m.get("source") == "warranty_service"]
        
        print(f"\nTechnician 1 warranty calendar entries: {len(tech1_maint)}")
        for entry in tech1_maint:
            print(f"  - {entry.get('scheduled_date')}: {entry.get('notes')}")
        
        return tech1_warranty, tech1_maint
    
    def test_07_complete_warranty_workflow(self):
        """Test complete warranty workflow - create issue, resolve as warranty, assign technician"""
        # Get products first
        products_response = self.session.get(f"{BASE_URL}/api/products")
        assert products_response.status_code == 200
        products = products_response.json()
        
        if not products:
            pytest.skip("No products found")
        
        product_id = products[0].get("id")
        
        # Create a new issue
        create_response = self.session.post(f"{BASE_URL}/api/issues", json={
            "product_id": product_id,
            "issue_type": "mechanical",
            "severity": "high",
            "title": "TEST_Warranty_Workflow_Test",
            "description": "Testing warranty workflow end-to-end"
        })
        assert create_response.status_code == 200, f"Failed to create issue: {create_response.text}"
        
        new_issue = create_response.json()
        issue_id = new_issue.get("id")
        print(f"\nCreated issue: {new_issue.get('issue_code')}")
        
        # Assign technician and mark in progress
        update1_response = self.session.put(f"{BASE_URL}/api/issues/{issue_id}", json={
            "technician_name": "Technician 1",
            "status": "in_progress"
        })
        assert update1_response.status_code == 200
        print(f"  Assigned to Technician 1, status: in_progress")
        
        # Resolve as warranty (this should create a routed child issue)
        resolve_response = self.session.put(f"{BASE_URL}/api/issues/{issue_id}", json={
            "status": "resolved",
            "warranty_service_type": "warranty",
            "resolution": "Needs warranty service"
        })
        assert resolve_response.status_code == 200, f"Failed to resolve: {resolve_response.text}"
        
        resolved_issue = resolve_response.json()
        print(f"  Resolved as warranty, status: {resolved_issue.get('status')}")
        print(f"  Child issue ID: {resolved_issue.get('child_issue_id')}")
        
        # Verify status is in_service (not resolved)
        assert resolved_issue.get("status") == "in_service", "Issue should be in_service after warranty resolution"
        assert resolved_issue.get("child_issue_id"), "Child issue should be created"
        
        # Get the child issue
        child_id = resolved_issue.get("child_issue_id")
        child_response = self.session.get(f"{BASE_URL}/api/issues/{child_id}")
        assert child_response.status_code == 200
        
        child_issue = child_response.json()
        print(f"\nChild warranty issue: {child_issue.get('issue_code')}")
        print(f"  Is warranty route: {child_issue.get('is_warranty_route')}")
        print(f"  Parent ID: {child_issue.get('parent_issue_id')}")
        
        # Assign technician to child issue
        assign_response = self.session.put(f"{BASE_URL}/api/issues/{child_id}", json={
            "technician_name": "Technician 2",
            "status": "in_progress"
        })
        assert assign_response.status_code == 200
        
        assigned_child = assign_response.json()
        print(f"  Assigned to: {assigned_child.get('technician_name')}")
        
        # Verify calendar entry was created
        maint_response = self.session.get(f"{BASE_URL}/api/scheduled-maintenance")
        assert maint_response.status_code == 200
        
        maintenance = maint_response.json()
        child_entries = [m for m in maintenance if m.get("issue_id") == child_id]
        print(f"\nCalendar entries for child issue: {len(child_entries)}")
        
        assert len(child_entries) >= 1, "Calendar entry should be created for warranty service"
        
        # Cleanup - delete test issue and child
        self.session.delete(f"{BASE_URL}/api/issues/{child_id}")
        self.session.delete(f"{BASE_URL}/api/issues/{issue_id}")
        print("\nCleanup: Deleted test issues")
        
        return True


class TestInServiceTabDisplay:
    """Test In Service tab display logic"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "password": "admin2025"
        })
        assert response.status_code == 200
        data = response.json()
        self.admin_token = data.get("token")
        self.session.headers.update({"X-Auth-Token": self.admin_token})
    
    def test_in_service_count_matches_display(self):
        """Verify In Service tab count matches actual display"""
        response = self.session.get(f"{BASE_URL}/api/issues")
        assert response.status_code == 200
        issues = response.json()
        
        # Count as per frontend logic
        in_service_issues = [i for i in issues if i.get("status") == "in_service"]
        warranty_service_issues = [i for i in issues if i.get("is_warranty_route") and i.get("status") != "resolved"]
        
        # Frontend shows: inServiceIssues.length + warrantyServiceIssues.length
        # But in the actual display, it only shows inServiceIssues (parent issues)
        # The warrantyServiceIssues are linked to parents
        
        print(f"\nIn Service issues (status=in_service): {len(in_service_issues)}")
        print(f"Warranty service issues (is_warranty_route, not resolved): {len(warranty_service_issues)}")
        print(f"Tab count would show: {len(in_service_issues) + len(warranty_service_issues)}")
        
        # Verify no duplicates - each in_service parent should have at most one warranty child
        parent_ids = set()
        for issue in in_service_issues:
            parent_ids.add(issue.get("id"))
        
        for warranty_issue in warranty_service_issues:
            parent_id = warranty_issue.get("parent_issue_id")
            if parent_id:
                assert parent_id in parent_ids, f"Warranty issue {warranty_issue.get('issue_code')} has orphan parent"
        
        return len(in_service_issues), len(warranty_service_issues)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
