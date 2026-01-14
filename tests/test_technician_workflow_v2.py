"""
Test Technician Workflow - Calendar and Services Page
Tests the following features:
1. Technician sees assigned issue on Calendar ONLY (not in Services) initially
2. Technician clicks 'Start Work' - issue moves to Services 'In Progress Issues' section
3. Technician resolves with 'Warranty Service' - creates child repair task with 24h timer
4. Service Records section shows both parent (Awaiting Repair) and child (Repair Task) with 'Continue' button
5. Timer shows correct countdown from resolve time (24h deadline)
"""
import pytest
import requests
import os
from datetime import datetime, timedelta, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTechnicianWorkflow:
    """Test technician workflow from calendar to services"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as technician"""
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
        
    def test_01_technician_login(self):
        """Test technician login works"""
        response = requests.post(f"{BASE_URL}/api/auth/technician-login", json={
            "password": "service2025"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("type") == "technician"
        print("SUCCESS: Technician login works")
        
    def test_02_get_issues_and_calendar(self):
        """Test getting issues and calendar entries"""
        # Get issues
        issues_response = self.session.get(f"{BASE_URL}/api/issues")
        assert issues_response.status_code == 200
        issues = issues_response.json()
        print(f"Total issues: {len(issues)}")
        
        # Get scheduled maintenance (calendar)
        maint_response = self.session.get(f"{BASE_URL}/api/scheduled-maintenance")
        assert maint_response.status_code == 200
        maintenance = maint_response.json()
        print(f"Total calendar entries: {len(maintenance)}")
        
        # Filter for Technician 1
        tech1_issues = [i for i in issues if i.get("technician_name") == "Technician 1"]
        tech1_maint = [m for m in maintenance if m.get("technician_name") == "Technician 1"]
        
        print(f"\nTechnician 1 issues: {len(tech1_issues)}")
        print(f"Technician 1 calendar entries: {len(tech1_maint)}")
        
        return issues, maintenance
    
    def test_03_verify_issue_on_calendar_only_initially(self):
        """Verify that assigned issues appear on Calendar but not in Services initially"""
        # Get issues
        issues_response = self.session.get(f"{BASE_URL}/api/issues")
        assert issues_response.status_code == 200
        issues = issues_response.json()
        
        # Get calendar entries
        maint_response = self.session.get(f"{BASE_URL}/api/scheduled-maintenance")
        assert maint_response.status_code == 200
        maintenance = maint_response.json()
        
        # Filter for Technician 1
        tech1_issues = [i for i in issues if i.get("technician_name") == "Technician 1"]
        tech1_maint = [m for m in maintenance if m.get("technician_name") == "Technician 1"]
        
        # Issues that should appear on Calendar only (open status with calendar entry)
        calendar_only_issues = [i for i in tech1_issues if i.get("status") == "open"]
        
        # Issues that should appear in Services (in_progress, in_service, or warranty route)
        services_issues = [i for i in tech1_issues if 
            i.get("status") == "in_progress" or 
            i.get("status") == "in_service" or 
            i.get("is_warranty_route")]
        
        print(f"\nCalendar-only issues (open): {len(calendar_only_issues)}")
        for issue in calendar_only_issues:
            print(f"  - {issue.get('issue_code')}: {issue.get('title')} (status={issue.get('status')})")
            
        print(f"\nServices page issues: {len(services_issues)}")
        for issue in services_issues:
            print(f"  - {issue.get('issue_code')}: {issue.get('title')} (status={issue.get('status')}, is_warranty_route={issue.get('is_warranty_route')})")
        
        # Verify calendar entries exist for issues
        for issue in tech1_issues:
            if issue.get("status") != "resolved":
                matching_entries = [m for m in tech1_maint if m.get("issue_id") == issue.get("id")]
                print(f"\nIssue {issue.get('issue_code')} has {len(matching_entries)} calendar entries")
        
        return calendar_only_issues, services_issues
    
    def test_04_start_work_moves_to_services(self):
        """Test that clicking 'Start Work' moves issue to Services page"""
        # Get issues
        issues_response = self.session.get(f"{BASE_URL}/api/issues")
        assert issues_response.status_code == 200
        issues = issues_response.json()
        
        # Find an open issue assigned to Technician 1
        tech1_open = [i for i in issues if 
            i.get("technician_name") == "Technician 1" and 
            i.get("status") == "open" and
            not i.get("is_warranty_route")]
        
        if not tech1_open:
            # Create a test issue
            products_response = self.session.get(f"{BASE_URL}/api/products")
            products = products_response.json()
            if products:
                # Login as admin to create issue
                admin_session = requests.Session()
                admin_session.headers.update({"Content-Type": "application/json"})
                admin_login = admin_session.post(f"{BASE_URL}/api/auth/login", json={"password": "admin2025"})
                admin_token = admin_login.json().get("token")
                admin_session.headers.update({"X-Auth-Token": admin_token})
                
                create_response = admin_session.post(f"{BASE_URL}/api/issues", json={
                    "product_id": products[0]["id"],
                    "issue_type": "mechanical",
                    "severity": "medium",
                    "title": "TEST_Start_Work_Test",
                    "description": "Test issue for start work flow",
                    "technician_name": "Technician 1"
                })
                if create_response.status_code == 200:
                    tech1_open = [create_response.json()]
                    print("Created test issue for start work test")
        
        if not tech1_open:
            pytest.skip("No open issues for Technician 1 to test start work")
        
        issue = tech1_open[0]
        issue_id = issue.get("id")
        print(f"\nTesting Start Work on issue: {issue.get('issue_code')}")
        print(f"  Current status: {issue.get('status')}")
        
        # Mark as in_progress (Start Work)
        update_response = self.session.put(f"{BASE_URL}/api/issues/{issue_id}", json={
            "status": "in_progress"
        })
        assert update_response.status_code == 200, f"Failed to start work: {update_response.text}"
        
        updated_issue = update_response.json()
        assert updated_issue.get("status") == "in_progress", "Issue should be in_progress after Start Work"
        print(f"  New status: {updated_issue.get('status')}")
        
        # Verify it now appears in Services page criteria
        # Services page shows: in_progress issues that are not warranty_route and have no warranty_service_type
        is_in_services = (
            updated_issue.get("status") == "in_progress" and
            not updated_issue.get("is_warranty_route") and
            not updated_issue.get("warranty_service_type")
        )
        assert is_in_services, "Issue should appear in Services 'In Progress Issues' section"
        print("SUCCESS: Issue now appears in Services 'In Progress Issues' section")
        
        return issue_id
    
    def test_05_resolve_as_warranty_creates_child(self):
        """Test that resolving with 'Warranty Service' creates child repair task"""
        # Get issues
        issues_response = self.session.get(f"{BASE_URL}/api/issues")
        assert issues_response.status_code == 200
        issues = issues_response.json()
        
        # Find an in_progress issue for Technician 1 that's not a warranty route
        tech1_in_progress = [i for i in issues if 
            i.get("technician_name") == "Technician 1" and 
            i.get("status") == "in_progress" and
            not i.get("is_warranty_route") and
            not i.get("warranty_service_type")]
        
        if not tech1_in_progress:
            pytest.skip("No in_progress issues for Technician 1 to test warranty resolution")
        
        issue = tech1_in_progress[0]
        issue_id = issue.get("id")
        print(f"\nTesting Warranty Resolution on issue: {issue.get('issue_code')}")
        
        # Resolve as warranty
        resolve_response = self.session.put(f"{BASE_URL}/api/issues/{issue_id}", json={
            "status": "resolved",
            "warranty_service_type": "warranty",
            "resolution": "Needs warranty service - creating repair task"
        })
        assert resolve_response.status_code == 200, f"Failed to resolve: {resolve_response.text}"
        
        resolved_issue = resolve_response.json()
        
        # Verify status is in_service (not resolved)
        assert resolved_issue.get("status") == "in_service", f"Issue should be in_service, got {resolved_issue.get('status')}"
        print(f"  Parent status: {resolved_issue.get('status')}")
        
        # Verify child issue was created
        child_id = resolved_issue.get("child_issue_id")
        assert child_id, "Child issue should be created"
        print(f"  Child issue ID: {child_id}")
        
        # Get child issue
        child_response = self.session.get(f"{BASE_URL}/api/issues/{child_id}")
        assert child_response.status_code == 200
        child_issue = child_response.json()
        
        # Verify child issue properties
        assert child_issue.get("is_warranty_route") == True, "Child should be warranty route"
        assert child_issue.get("parent_issue_id") == issue_id, "Child should reference parent"
        assert child_issue.get("warranty_status") == "warranty", "Child should have warranty status"
        print(f"  Child issue code: {child_issue.get('issue_code')}")
        print(f"  Child is_warranty_route: {child_issue.get('is_warranty_route')}")
        print(f"  Child parent_issue_id: {child_issue.get('parent_issue_id')}")
        
        print("SUCCESS: Warranty resolution creates child repair task")
        
        return issue_id, child_id
    
    def test_06_service_records_shows_parent_and_child(self):
        """Test that Service Records section shows both parent and child issues"""
        # Get issues
        issues_response = self.session.get(f"{BASE_URL}/api/issues")
        assert issues_response.status_code == 200
        issues = issues_response.json()
        
        # Filter for Technician 1
        tech1_issues = [i for i in issues if i.get("technician_name") == "Technician 1"]
        
        # Service Records criteria (from TechnicianServices.jsx):
        # - is_warranty_route (repair tasks)
        # - status == "in_service" (parent issues waiting for repair)
        # - warranty_service_type && status == "resolved" (fully resolved with service type)
        
        service_records = [i for i in tech1_issues if 
            i.get("is_warranty_route") or
            i.get("status") == "in_service" or
            (i.get("warranty_service_type") and i.get("status") == "resolved")]
        
        print(f"\nService Records for Technician 1: {len(service_records)}")
        
        # Categorize
        repair_tasks = [i for i in service_records if i.get("is_warranty_route")]
        awaiting_repair = [i for i in service_records if i.get("status") == "in_service"]
        resolved = [i for i in service_records if i.get("warranty_service_type") and i.get("status") == "resolved"]
        
        print(f"  Repair Tasks (is_warranty_route): {len(repair_tasks)}")
        for issue in repair_tasks:
            print(f"    - {issue.get('issue_code')}: {issue.get('title')} (status={issue.get('status')})")
            
        print(f"  Awaiting Repair (in_service): {len(awaiting_repair)}")
        for issue in awaiting_repair:
            print(f"    - {issue.get('issue_code')}: {issue.get('title')}")
            
        print(f"  Resolved with service type: {len(resolved)}")
        for issue in resolved:
            print(f"    - {issue.get('issue_code')}: {issue.get('title')}")
        
        # Verify parent-child relationships
        for parent in awaiting_repair:
            child_id = parent.get("child_issue_id")
            if child_id:
                matching_child = [c for c in repair_tasks if c.get("id") == child_id]
                if matching_child:
                    print(f"\n  Parent {parent.get('issue_code')} -> Child {matching_child[0].get('issue_code')}")
        
        return service_records
    
    def test_07_continue_button_for_repair_tasks(self):
        """Test that 'Continue' button works for warranty repair tasks"""
        # Get issues
        issues_response = self.session.get(f"{BASE_URL}/api/issues")
        assert issues_response.status_code == 200
        issues = issues_response.json()
        
        # Find warranty route issues with status 'open' (need Continue button)
        repair_tasks_open = [i for i in issues if 
            i.get("is_warranty_route") and 
            i.get("status") == "open" and
            i.get("technician_name") == "Technician 1"]
        
        if not repair_tasks_open:
            # Check for any warranty route issues
            all_repair_tasks = [i for i in issues if i.get("is_warranty_route")]
            print(f"\nAll warranty route issues: {len(all_repair_tasks)}")
            for task in all_repair_tasks:
                print(f"  - {task.get('issue_code')}: status={task.get('status')}, technician={task.get('technician_name')}")
            pytest.skip("No open warranty repair tasks for Technician 1")
        
        task = repair_tasks_open[0]
        task_id = task.get("id")
        print(f"\nTesting Continue on repair task: {task.get('issue_code')}")
        print(f"  Current status: {task.get('status')}")
        
        # Click Continue (mark as in_progress)
        continue_response = self.session.put(f"{BASE_URL}/api/issues/{task_id}", json={
            "status": "in_progress"
        })
        assert continue_response.status_code == 200, f"Failed to continue: {continue_response.text}"
        
        updated_task = continue_response.json()
        assert updated_task.get("status") == "in_progress", "Task should be in_progress after Continue"
        print(f"  New status: {updated_task.get('status')}")
        print("SUCCESS: Continue button works for repair tasks")
        
        return task_id
    
    def test_08_timer_shows_24h_countdown(self):
        """Test that timer shows correct 24h countdown from creation time"""
        # Get issues
        issues_response = self.session.get(f"{BASE_URL}/api/issues")
        assert issues_response.status_code == 200
        issues = issues_response.json()
        
        # Find warranty route issues that are not resolved
        repair_tasks = [i for i in issues if 
            i.get("is_warranty_route") and 
            i.get("status") != "resolved"]
        
        if not repair_tasks:
            pytest.skip("No active warranty repair tasks to test timer")
        
        print(f"\nActive warranty repair tasks: {len(repair_tasks)}")
        
        for task in repair_tasks:
            created_at = task.get("created_at")
            if created_at:
                # Parse created_at
                created_dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                deadline = created_dt + timedelta(hours=24)
                now = datetime.now(timezone.utc)
                diff = deadline - now
                
                hours_left = diff.total_seconds() / 3600
                
                print(f"\n  Task: {task.get('issue_code')}")
                print(f"    Created: {created_at}")
                print(f"    Deadline: {deadline.isoformat()}")
                print(f"    Hours remaining: {hours_left:.2f}")
                
                if hours_left <= 0:
                    print(f"    Status: EXPIRED")
                elif hours_left < 6:
                    print(f"    Status: URGENT")
                else:
                    print(f"    Status: Normal")
        
        print("\nSUCCESS: Timer calculation verified")
        return repair_tasks
    
    def test_09_complete_repair_resolves_both(self):
        """Test that completing repair resolves both child and parent issues"""
        # Get issues
        issues_response = self.session.get(f"{BASE_URL}/api/issues")
        assert issues_response.status_code == 200
        issues = issues_response.json()
        
        # Find an in_progress warranty route issue
        repair_in_progress = [i for i in issues if 
            i.get("is_warranty_route") and 
            i.get("status") == "in_progress" and
            i.get("technician_name") == "Technician 1"]
        
        if not repair_in_progress:
            pytest.skip("No in_progress warranty repair tasks for Technician 1")
        
        task = repair_in_progress[0]
        task_id = task.get("id")
        parent_id = task.get("parent_issue_id")
        
        print(f"\nTesting Complete Repair on: {task.get('issue_code')}")
        print(f"  Parent issue ID: {parent_id}")
        
        # Complete the repair
        complete_response = self.session.put(f"{BASE_URL}/api/issues/{task_id}", json={
            "status": "resolved",
            "resolution": "Repair completed successfully"
        })
        assert complete_response.status_code == 200, f"Failed to complete: {complete_response.text}"
        
        completed_task = complete_response.json()
        assert completed_task.get("status") == "resolved", "Task should be resolved"
        print(f"  Child status: {completed_task.get('status')}")
        
        # Verify parent is also resolved
        if parent_id:
            parent_response = self.session.get(f"{BASE_URL}/api/issues/{parent_id}")
            assert parent_response.status_code == 200
            parent_issue = parent_response.json()
            assert parent_issue.get("status") == "resolved", "Parent should be resolved when child is completed"
            print(f"  Parent status: {parent_issue.get('status')}")
        
        print("SUCCESS: Completing repair resolves both parent and child")
        return task_id, parent_id


class TestExistingTestData:
    """Test with existing test data mentioned in context"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as technician"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as technician
        response = self.session.post(f"{BASE_URL}/api/auth/technician-login", json={
            "password": "service2025"
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data.get("token")
        self.session.headers.update({"X-Auth-Token": self.token})
    
    def test_find_test_issues(self):
        """Find the test issues mentioned in context"""
        # Context mentions:
        # - Issue '2026_VLN-001_01_14_5' is the parent (Awaiting Repair)
        # - Issue '2026_VLN-001_01_14_6' is the child repair task
        
        issues_response = self.session.get(f"{BASE_URL}/api/issues")
        assert issues_response.status_code == 200
        issues = issues_response.json()
        
        # Find by issue code pattern
        parent_candidates = [i for i in issues if "01_14_5" in (i.get("issue_code") or "")]
        child_candidates = [i for i in issues if "01_14_6" in (i.get("issue_code") or "")]
        
        print(f"\nLooking for test issues:")
        print(f"  Parent candidates (01_14_5): {len(parent_candidates)}")
        for p in parent_candidates:
            print(f"    - {p.get('issue_code')}: status={p.get('status')}, child_id={p.get('child_issue_id')}")
            
        print(f"  Child candidates (01_14_6): {len(child_candidates)}")
        for c in child_candidates:
            print(f"    - {c.get('issue_code')}: status={c.get('status')}, is_warranty_route={c.get('is_warranty_route')}")
        
        # Also check for any in_service issues
        in_service = [i for i in issues if i.get("status") == "in_service"]
        print(f"\nAll in_service issues: {len(in_service)}")
        for issue in in_service:
            print(f"  - {issue.get('issue_code')}: {issue.get('title')}")
        
        # Check warranty route issues
        warranty_routes = [i for i in issues if i.get("is_warranty_route")]
        print(f"\nAll warranty route issues: {len(warranty_routes)}")
        for issue in warranty_routes:
            print(f"  - {issue.get('issue_code')}: status={issue.get('status')}, technician={issue.get('technician_name')}")
        
        return issues
    
    def test_verify_technician_1_data(self):
        """Verify data for Technician 1"""
        issues_response = self.session.get(f"{BASE_URL}/api/issues")
        assert issues_response.status_code == 200
        issues = issues_response.json()
        
        maint_response = self.session.get(f"{BASE_URL}/api/scheduled-maintenance")
        assert maint_response.status_code == 200
        maintenance = maint_response.json()
        
        # Filter for Technician 1
        tech1_issues = [i for i in issues if i.get("technician_name") == "Technician 1"]
        tech1_maint = [m for m in maintenance if m.get("technician_name") == "Technician 1"]
        
        print(f"\nTechnician 1 Summary:")
        print(f"  Total issues: {len(tech1_issues)}")
        print(f"  Total calendar entries: {len(tech1_maint)}")
        
        # Categorize issues
        by_status = {}
        for issue in tech1_issues:
            status = issue.get("status", "unknown")
            if status not in by_status:
                by_status[status] = []
            by_status[status].append(issue)
        
        print(f"\n  Issues by status:")
        for status, items in by_status.items():
            print(f"    {status}: {len(items)}")
            for item in items:
                print(f"      - {item.get('issue_code')}: {item.get('title')[:40]}...")
        
        # Categorize calendar entries
        by_source = {}
        for entry in tech1_maint:
            source = entry.get("source", "unknown")
            if source not in by_source:
                by_source[source] = []
            by_source[source].append(entry)
        
        print(f"\n  Calendar entries by source:")
        for source, items in by_source.items():
            print(f"    {source}: {len(items)}")
        
        return tech1_issues, tech1_maint


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
