import os
import json
import django
from datetime import datetime, timedelta, timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'relief_route_backend.settings')
django.setup()

from routing.pipeline import (
    step_intake,
    step_prioritize,
    step_route,
    step_dispatch,
    run_four_step_pipeline
)
from seed import seed

def test_individual_steps():
    print("\n--- TEST 1: INDIVIDUAL STEP TESTING ---")

    # Sample Raw Reports
    sample_report_1 = "CRITICAL EMERGENCY: St. Jude Hospital at 2400 Geary Blvd lost power grid. 85 patients in ICU ventilators need 30 mobile generators immediately."
    sample_report_2 = "Flash flood at Bayview Harbor camp (350 Cargo Way). 300 evacuees require 150 water ration packs within 4 hours."

    # 1. Test Intake Step Individually
    print("\n[Step 1: Intake]")
    intake_res_1 = step_intake(sample_report_1)
    print("Report 1 Intake Output:")
    print(" - Name:", intake_res_1['name'])
    print(" - Resource Needed:", intake_res_1['resource_needed'])
    print(" - Amount Needed:", intake_res_1['amount_needed'])
    print(" - Severity:", intake_res_1['severity'])
    assert 'resource_needed' in intake_res_1 and intake_res_1['amount_needed'] > 0

    intake_res_2 = step_intake(sample_report_2)
    print("\nReport 2 Intake Output:")
    print(" - Name:", intake_res_2['name'])
    print(" - Resource Needed:", intake_res_2['resource_needed'])
    print(" - Amount Needed:", intake_res_2['amount_needed'])
    print(" - Severity:", intake_res_2['severity'])
    assert 'resource_needed' in intake_res_2 and intake_res_2['amount_needed'] > 0

    # 2. Test Prioritization Step Individually
    print("\n[Step 2: Prioritization]")
    two_hours_ago = (datetime.now(timezone.utc) - timedelta(hours=2.5)).isoformat()
    prio_res_1 = step_prioritize(intake_res_1, report_timestamp=two_hours_ago)
    print("Report 1 Urgency Analysis:")
    print(" - Urgency Score:", prio_res_1['urgency_score'])
    print(" - Urgency Window (Hours):", prio_res_1['urgency_window_hours'])
    print(" - Reasoning:", prio_res_1['reasoning'])
    assert prio_res_1['urgency_score'] >= 70

    prio_res_2 = step_prioritize(intake_res_2)
    print("\nReport 2 Urgency Analysis:")
    print(" - Urgency Score:", prio_res_2['urgency_score'])
    print(" - Urgency Window (Hours):", prio_res_2['urgency_window_hours'])
    assert prio_res_2['urgency_score'] > 0

    # 3. Test Route Step Individually
    print("\n[Step 3: Route Solver Integration]")
    seed()  # Reset DB
    route_res = step_route(intake_res_1, prio_res_1)
    print("Routing Solver Output:")
    print(" - Routes Generated:", len(route_res['routes']))
    print(" - Total Distance:", route_res['metrics']['total_distance_km'], "km")
    assert len(route_res['routes']) > 0

    # 4. Test Dispatch Step Individually
    print("\n[Step 4: Dispatch Generator]")
    dispatch_res = step_dispatch(route_res['routes'])
    print("Dispatch Driver Instructions (Sample):")
    for manifest in dispatch_res:
        print(f"\n[{manifest['vehicleName']}] Summary: {manifest['shortSummary']}")
        for line in manifest['instructions'][:3]:
            print("   ", line)
    assert len(dispatch_res) > 0

    print("\n--- TEST 2: END-TO-END PIPELINE TESTING ---")
    seed()
    e2e_res = run_four_step_pipeline(sample_report_1, report_timestamp=two_hours_ago)
    assert e2e_res['pipeline_status'] == 'success'
    print("E2E Pipeline execution successful!")
    print(" - Created Site:", e2e_res['intake_site']['name'])
    print(" - Urgency Window:", e2e_res['urgency_info']['urgency_window_hours'], "hours")
    print(" - Dispatched Vehicles:", len(e2e_res['dispatch_manifests']))

    print("\nALL STEP-BY-STEP & END-TO-END PIPELINE TESTS PASSED 100%!")

if __name__ == '__main__':
    test_individual_steps()
