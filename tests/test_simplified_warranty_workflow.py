"""
Test Simplified Warranty Workflow - No Child Issues
Tests the new workflow where:
1. Single card per issue (no child issues created)
2. Detailed popup with all info and Continue button
3. No new issue codes for warranty repairs
4. Calendar shows same detailed popup as Services
5. Multiple repair attempts shown in dropdown if >2

Test data: Issue 2026_VLN-001_01_14_3 is 'in_service' (Awaiting Repair) 
with warranty_service_type='warranty' and has 1 repair_attempt in pending status.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSimplifiedWarrantyWorkflow:
    """Test simplified warranty workflow without child issues"""
    
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
    
    def test_01_verify_in_service_issue_exists(self):
        """Verify the test issue exists with correct status"""
        response = self.session.get(f"{BASE_URL}/api/issues")
        assert response.status_code == 200, f"Failed to get issues: {response.text}"
        issues = response.json()
        
        # Find the in_service issue
        in_service_issues = [i for i in issues if i.get("status") == "in_service"]
        print(f"\nIn Service issues: {len(in_service_issues)}")
        
        for issue in in_service_issues:
            print(f"  - {issue.get('issue_code')}: warranty_type={issue.get('warranty_service_type')}")
            print(f"    repair_attempts: {len(issue.get('repair_attempts', []))}")
            print(f"    child_issue_id: {issue.get('child_issue_id')}")
        
        # Verify at least one in_service issue exists
        assert len(in_service_issues) >= 1, "No in_service issues found"
        
        # Verify the issue has warranty_service_type and repair_attempts
        warranty_issue = next((i for i in in_service_issues if i.get("warranty_service_type") == "warranty"), None)
        assert warranty_issue is not None, "No warranty in_service issue found"
        
        # Verify NO child issue is created (new workflow)
        assert warranty_issue.get("child_issue_id") is None, "Child issue should NOT be created in new workflow"
        
        # Verify repair_attempts array exists
        assert len(warranty_issue.get("repair_attempts", [])) >= 1, "Repair attempts should exist"
        
        return warranty_issue
    
    def test_02_verify_no_child_issues_created(self):
        """Verify no child issues are created for warranty repairs"""
        response = self.session.get(f"{BASE_URL}/api/issues")
        assert response.status_code == 200
        issues = response.json()
        
        # Check for warranty route issues (old workflow)
        warranty_route_issues = [i for i in issues if i.get("is_warranty_route")]
        print(f"\nWarranty route issues (old workflow): {len(warranty_route_issues)}")
        
        # Check for in_service issues with warranty type (new workflow)
        new_workflow_issues = [i for i in issues if i.get("status") == "in_service" and i.get("warranty_service_type") == "warranty"]
        print(f"New workflow warranty issues: {len(new_workflow_issues)}")
        
        for issue in new_workflow_issues:
            print(f"  - {issue.get('issue_code')}: child_issue_id={issue.get('child_issue_id')}")
            # Verify no child issue
            assert issue.get("child_issue_id") is None, f"Issue {issue.get('issue_code')} should not have child issue"
        
        return new_workflow_issues
    
    def test_03_verify_repair_attempts_structure(self):
        """Verify repair_attempts array structure"""
        response = self.session.get(f"{BASE_URL}/api/issues")
        assert response.status_code == 200
        issues = response.json()
        
        # Find issue with repair attempts
        issues_with_repairs = [i for i in issues if len(i.get("repair_attempts", [])) > 0]
        print(f"\nIssues with repair attempts: {len(issues_with_repairs)}")
        
        for issue in issues_with_repairs:
            print(f"\n  Issue: {issue.get('issue_code')}")
            for idx, repair in enumerate(issue.get("repair_attempts", [])):
                print(f"    Repair #{idx+1}:")
                print(f"      id: {repair.get('id')}")
                print(f"      status: {repair.get('status')}")
                print(f"      started_at: {repair.get('started_at')}")
                print(f"      completed_at: {repair.get('completed_at')}")
                print(f"      notes: {repair.get('notes')}")
                
                # Verify repair attempt structure
                assert "id" in repair, "Repair attempt should have id"
                assert "status" in repair, "Repair attempt should have status"
                assert "started_at" in repair, "Repair attempt should have started_at"
        
        return issues_with_repairs
    
    def test_04_start_repair_action(self):
        """Test starting a repair (Continue button)"""
        response = self.session.get(f"{BASE_URL}/api/issues")
        assert response.status_code == 200
        issues = response.json()
        
        # Find an in_service issue with pending repair
        in_service_issue = next((i for i in issues if i.get("status") == "in_service" and i.get("warranty_service_type") == "warranty"), None)
        
        if not in_service_issue:
            pytest.skip("No in_service warranty issue found")
        
        issue_id = in_service_issue.get("id")
        repair_id = in_service_issue.get("current_repair_id")
        
        print(f"\nStarting repair for issue: {in_service_issue.get('issue_code')}")
        print(f"  Current repair_id: {repair_id}")
        
        # Start repair
        update_response = self.session.put(f"{BASE_URL}/api/issues/{issue_id}", json={
            "start_repair": True,
            "repair_id": repair_id
        })
        assert update_response.status_code == 200, f"Failed to start repair: {update_response.text}"
        
        updated_issue = update_response.json()
        print(f"  New status: {updated_issue.get('status')}")
        
        # Verify status changed to in_progress
        assert updated_issue.get("status") == "in_progress", "Status should be in_progress after starting repair"
        
        # Verify repair attempt status changed
        repair_attempts = updated_issue.get("repair_attempts", [])
        current_repair = next((r for r in repair_attempts if r.get("id") == repair_id), None)
        if current_repair:
            print(f"  Repair status: {current_repair.get('status')}")
            assert current_repair.get("status") == "in_progress", "Repair attempt should be in_progress"
        
        return updated_issue
    
    def test_05_complete_repair_action(self):
        """Test completing a repair"""
        response = self.session.get(f"{BASE_URL}/api/issues")
        assert response.status_code == 200
        issues = response.json()
        
        # Find an in_progress warranty issue
        in_progress_issue = next((i for i in issues if i.get("status") == "in_progress" and i.get("warranty_service_type") == "warranty"), None)
        
        if not in_progress_issue:
            pytest.skip("No in_progress warranty issue found")
        
        issue_id = in_progress_issue.get("id")
        repair_id = in_progress_issue.get("current_repair_id")
        
        print(f"\nCompleting repair for issue: {in_progress_issue.get('issue_code')}")
        
        # Complete repair
        update_response = self.session.put(f"{BASE_URL}/api/issues/{issue_id}", json={
            "complete_repair": True,
            "repair_id": repair_id,
            "repair_notes": "Repair completed successfully"
        })
        assert update_response.status_code == 200, f"Failed to complete repair: {update_response.text}"
        
        updated_issue = update_response.json()
        print(f"  New status: {updated_issue.get('status')}")
        print(f"  Resolved at: {updated_issue.get('resolved_at')}")
        
        # Verify status changed to resolved
        assert updated_issue.get("status") == "resolved", "Status should be resolved after completing repair"
        assert updated_issue.get("resolved_at") is not None, "resolved_at should be set"
        
        # Verify repair attempt completed
        repair_attempts = updated_issue.get("repair_attempts", [])
        completed_repair = next((r for r in repair_attempts if r.get("id") == repair_id), None)
        if completed_repair:
            print(f"  Repair status: {completed_repair.get('status')}")
            print(f"  Repair completed_at: {completed_repair.get('completed_at')}")
            assert completed_repair.get("status") == "completed", "Repair attempt should be completed"
            assert completed_repair.get("completed_at") is not None, "completed_at should be set"
        
        return updated_issue
    
    def test_06_same_issue_code_throughout(self):
        """Verify same issue code is used throughout warranty repair (no new code generated)"""
        response = self.session.get(f"{BASE_URL}/api/issues")
        assert response.status_code == 200
        issues = response.json()
        
        # Find warranty issues
        warranty_issues = [i for i in issues if i.get("warranty_service_type") == "warranty"]
        print(f"\nWarranty issues: {len(warranty_issues)}")
        
        for issue in warranty_issues:
            issue_code = issue.get("issue_code")
            print(f"  - {issue_code}: status={issue.get('status')}")
            
            # Verify no child issue with different code
            child_id = issue.get("child_issue_id")
            if child_id:
                child = next((i for i in issues if i.get("id") == child_id), None)
                if child:
                    print(f"    WARNING: Child issue found with code: {child.get('issue_code')}")
                    # This should not happen in new workflow
                    assert False, "Child issue should not exist in new workflow"
        
        return warranty_issues


class TestServicesPageSections:
    """Test Services page has correct sections"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get technician token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as technician
        response = self.session.post(f"{BASE_URL}/api/auth/technician-login", json={
            "password": "service2025"
        })
        assert response.status_code == 200, f"Technician login failed: {response.text}"
        data = response.json()
        self.tech_token = data.get("token")
        self.session.headers.update({"X-Auth-Token": self.tech_token})
    
    def test_01_get_technician_issues(self):
        """Get issues for technician"""
        response = self.session.get(f"{BASE_URL}/api/issues")
        assert response.status_code == 200, f"Failed to get issues: {response.text}"
        issues = response.json()
        
        # Filter by Technician 1
        tech1_issues = [i for i in issues if i.get("technician_name") == "Technician 1"]
        print(f"\nTechnician 1 issues: {len(tech1_issues)}")
        
        # Categorize as per Services page logic
        in_progress = [i for i in tech1_issues if i.get("status") == "in_progress" and not i.get("warranty_service_type")]
        service_records = [i for i in tech1_issues if i.get("status") == "in_service" or (i.get("status") == "in_progress" and i.get("warranty_service_type") == "warranty")]
        
        print(f"  In Progress Issues: {len(in_progress)}")
        print(f"  Service Records: {len(service_records)}")
        
        for issue in in_progress:
            print(f"    - {issue.get('issue_code')}: {issue.get('title')}")
        
        for issue in service_records:
            print(f"    - {issue.get('issue_code')}: status={issue.get('status')}, warranty={issue.get('warranty_service_type')}")
        
        return in_progress, service_records
    
    def test_02_verify_awaiting_repair_card(self):
        """Verify Awaiting Repair issue shows single card with 24h timer"""
        response = self.session.get(f"{BASE_URL}/api/issues")
        assert response.status_code == 200
        issues = response.json()
        
        # Find in_service issues (Awaiting Repair)
        awaiting_repair = [i for i in issues if i.get("status") == "in_service" and i.get("warranty_service_type") == "warranty"]
        print(f"\nAwaiting Repair issues: {len(awaiting_repair)}")
        
        for issue in awaiting_repair:
            print(f"  - {issue.get('issue_code')}")
            print(f"    warranty_repair_started_at: {issue.get('warranty_repair_started_at')}")
            print(f"    repair_attempts: {len(issue.get('repair_attempts', []))}")
            
            # Verify 24h timer data exists
            assert issue.get("warranty_repair_started_at") is not None, "warranty_repair_started_at should be set"
        
        return awaiting_repair


class TestCreateWarrantyIssueWorkflow:
    """Test creating a new warranty issue with the simplified workflow"""
    
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
    
    def test_full_warranty_workflow(self):
        """Test complete warranty workflow: create -> assign -> resolve as warranty -> start repair -> complete"""
        # Get a product
        products_response = self.session.get(f"{BASE_URL}/api/products")
        assert products_response.status_code == 200
        products = products_response.json()
        
        if not products:
            pytest.skip("No products found")
        
        product_id = products[0].get("id")
        
        # Step 1: Create issue
        create_response = self.session.post(f"{BASE_URL}/api/issues", json={
            "product_id": product_id,
            "issue_type": "mechanical",
            "severity": "high",
            "title": "TEST_Simplified_Warranty_Test",
            "description": "Testing simplified warranty workflow"
        })
        assert create_response.status_code == 200, f"Failed to create issue: {create_response.text}"
        
        issue = create_response.json()
        issue_id = issue.get("id")
        original_code = issue.get("issue_code")
        print(f"\n1. Created issue: {original_code}")
        
        # Step 2: Assign technician
        assign_response = self.session.put(f"{BASE_URL}/api/issues/{issue_id}", json={
            "technician_name": "Technician 1",
            "status": "in_progress"
        })
        assert assign_response.status_code == 200
        print(f"2. Assigned to Technician 1")
        
        # Step 3: Resolve as warranty
        resolve_response = self.session.put(f"{BASE_URL}/api/issues/{issue_id}", json={
            "status": "resolved",
            "warranty_service_type": "warranty",
            "resolution": "Needs warranty repair"
        })
        assert resolve_response.status_code == 200, f"Failed to resolve: {resolve_response.text}"
        
        resolved_issue = resolve_response.json()
        print(f"3. Resolved as warranty:")
        print(f"   Status: {resolved_issue.get('status')}")
        print(f"   Issue code: {resolved_issue.get('issue_code')}")
        print(f"   Child issue: {resolved_issue.get('child_issue_id')}")
        print(f"   Repair attempts: {len(resolved_issue.get('repair_attempts', []))}")
        
        # Verify new workflow behavior
        assert resolved_issue.get("status") == "in_service", "Status should be in_service (Awaiting Repair)"
        assert resolved_issue.get("child_issue_id") is None, "No child issue should be created"
        assert resolved_issue.get("issue_code") == original_code, "Issue code should remain the same"
        assert len(resolved_issue.get("repair_attempts", [])) >= 1, "Repair attempt should be created"
        assert resolved_issue.get("warranty_repair_started_at") is not None, "warranty_repair_started_at should be set"
        
        # Step 4: Start repair (Continue button)
        repair_id = resolved_issue.get("current_repair_id")
        start_response = self.session.put(f"{BASE_URL}/api/issues/{issue_id}", json={
            "start_repair": True,
            "repair_id": repair_id
        })
        assert start_response.status_code == 200
        
        started_issue = start_response.json()
        print(f"4. Started repair:")
        print(f"   Status: {started_issue.get('status')}")
        
        assert started_issue.get("status") == "in_progress", "Status should be in_progress"
        
        # Step 5: Complete repair
        complete_response = self.session.put(f"{BASE_URL}/api/issues/{issue_id}", json={
            "complete_repair": True,
            "repair_id": repair_id,
            "repair_notes": "Repair completed successfully"
        })
        assert complete_response.status_code == 200
        
        completed_issue = complete_response.json()
        print(f"5. Completed repair:")
        print(f"   Status: {completed_issue.get('status')}")
        print(f"   Issue code: {completed_issue.get('issue_code')}")
        
        assert completed_issue.get("status") == "resolved", "Status should be resolved"
        assert completed_issue.get("issue_code") == original_code, "Issue code should still be the same"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/issues/{issue_id}")
        print(f"\nCleanup: Deleted test issue")
        
        return True


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
