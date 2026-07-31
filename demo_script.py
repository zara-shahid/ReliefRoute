"""
ReliefRoute Demo Script - Days 12-13
Submit disaster reports in a controlled, scripted sequence for demo purposes.

Usage:
    python demo_script.py            # Run all reports with 3s pause between each
    python demo_script.py --pause 5  # Custom pause between reports (seconds)
    python demo_script.py --index 3  # Submit only report #3 (0-indexed)
    python demo_script.py --dry-run  # Preview reports without submitting

Each report triggers the full pipeline: Intake -> Prioritize -> VRP Solve -> Dispatch
The map at http://localhost:3000 will auto-update within 5 seconds.
"""

import urllib.request
import json
import time
import sys
import argparse

API_URL = "http://127.0.0.1:8000/api/agent/pipeline/"

# ─── 8-10 SCRIPTED DISASTER REPORTS ───────────────────────────────────────────
# Ordered for dramatic effect: start moderate, escalate to critical, end with closure
REPORTS = [
    {
        "index": 1,
        "title": "Gas Leak - Residential Area",
        "severity": "Moderate",
        "report": (
            "Gas leak reported at the corner of Haight Street and Masonic Avenue, San Francisco. "
            "Approximately 45 residents evacuated from nearby apartments. Need immediate supply of "
            "emergency respirators and first aid kits. The leak has been contained but residents "
            "cannot return home. Severity: 4 out of 10."
        )
    },
    {
        "index": 2,
        "title": "School Roof Collapse - Children Trapped",
        "severity": "High",
        "report": (
            "URGENT: Partial roof collapse at Lincoln Elementary School on 23rd Avenue. "
            "An estimated 60 children and 8 staff members are sheltering in place in the gymnasium. "
            "Structural integrity is compromised. Require rescue gear, medical supplies, and "
            "emergency food rations. No confirmed injuries yet but situation is deteriorating. Severity: 7."
        )
    },
    {
        "index": 3,
        "title": "Flash Flood - Residential Neighborhood",
        "severity": "High",
        "report": (
            "Flash flooding in the Sunset District near Irving Street and 9th Avenue. "
            "Street-level flooding is 1.5 meters deep in some areas. Around 120 residents stranded "
            "on upper floors. Need inflatable rescue boats, water purification units, and emergency "
            "food supplies for at least 72 hours. Three elderly residents cannot be evacuated without "
            "medical assistance. Severity: 8 out of 10."
        )
    },
    {
        "index": 4,
        "title": "Chemical Spill - Industrial Zone",
        "severity": "Critical",
        "report": (
            "CRITICAL EMERGENCY: Chemical tanker overturned on the Bay Bridge approach ramp near "
            "Fremont Street. Unknown industrial solvent leaking. 200-meter exclusion zone established. "
            "Approximately 90 people trapped in vehicles behind the cordon. Require hazmat suits, "
            "oxygen tanks, medical triage units, and decontamination equipment. Two confirmed injuries. "
            "Time-critical — fumes spreading. Severity: 9 out of 10. Respond immediately."
        )
    },
    {
        "index": 5,
        "title": "Elderly Care Facility - Power Outage",
        "severity": "Moderate",
        "report": (
            "Power outage at Sunset Valley Care Home on Taraval Street. The facility houses 80 elderly "
            "residents, 12 of whom are on life-support or oxygen-dependent equipment. Backup generator "
            "failed 2 hours ago. Need portable generators, emergency oxygen supplies, and medical staff "
            "immediately. Current temperature inside is dropping. Severity: 6 out of 10."
        )
    },
    {
        "index": 6,
        "title": "Earthquake Aftershock - Building Collapse",
        "severity": "Critical",
        "report": (
            "MAYDAY: Five-story residential building partially collapsed on Market Street near Castro. "
            "Triggered by a magnitude 4.2 aftershock at 14:32 local time. Estimated 35 people still "
            "inside, including families with children. Rescue teams require heavy hydraulic spreaders, "
            "search dogs, thermal imaging equipment, and emergency medical teams. "
            "Three confirmed fatalities, twelve injured. This is a SEVERITY 10 INCIDENT."
        )
    },
    {
        "index": 7,
        "title": "Hospital Emergency Supply Shortage",
        "severity": "High",
        "report": (
            "SF General Hospital on Potrero Avenue reporting critical shortage of blood plasma, "
            "surgical gloves, and IV fluids due to supply chain disruption following recent incidents. "
            "ICU capacity at 94 percent. Emergency resupply needed within 4 hours for 200 patients. "
            "Coordinates: 37.7555 N, 122.4055 W. Severity: 7 out of 10."
        )
    },
    {
        "index": 8,
        "title": "Wildfire Evacuation Route Blocked",
        "severity": "Critical",
        "report": (
            "Wildfire smoke and falling debris blocking the primary evacuation route on Twin Peaks "
            "Boulevard. Approximately 500 residents attempting to evacuate from Twin Peaks neighborhood "
            "are now stranded. Need emergency buses, water tanker trucks to clear ash, and police "
            "escort to redirect traffic through alternate routes. Three people treated for smoke "
            "inhalation on scene. Severity: 9, window closing fast."
        )
    },
    {
        "index": 9,
        "title": "Food Distribution Center - Crowd Emergency",
        "severity": "Low",
        "report": (
            "Emergency food distribution point at Civic Center Plaza overwhelmed. Over 800 displaced "
            "residents arrived seeking emergency rations but only supplies for 300 are available. "
            "Crowd management needed, plus emergency food resupply of ready-to-eat meals and bottled "
            "water. No violence reported but situation may escalate. Severity: 3 out of 10."
        )
    },
    {
        "index": 10,
        "title": "Bridge Infrastructure Damage - Ferry Terminal",
        "severity": "Moderate",
        "report": (
            "Structural crack detected in the Ferry Building terminal loading dock on the Embarcadero. "
            "Engineers have evacuated the area. Approximately 150 commuters stranded with no alternate "
            "transport. Need emergency temporary shelters, food, water for affected commuters, and "
            "engineering assessment team on site. Severity: 5 out of 10."
        )
    },
]


def submit_report(report_text: str) -> dict:
    data = json.dumps({"report": report_text}).encode()
    req = urllib.request.Request(
        API_URL,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    res = urllib.request.urlopen(req, timeout=60)
    return json.loads(res.read())


def print_separator():
    print("\n" + "=" * 65)


def run_demo(pause: int = 3, only_index: int = None, dry_run: bool = False):
    reports_to_run = REPORTS if only_index is None else [REPORTS[only_index]]

    print_separator()
    print("  RELIEFROUTE DEMO - SCRIPTED DISASTER REPORT SEQUENCE")
    print(f"  Mode: {'DRY RUN (no submission)' if dry_run else 'LIVE'} | Pause: {pause}s between reports")
    print_separator()
    print(f"  Map Dashboard: http://localhost:3000")
    print(f"  Backend API:   http://localhost:8000")
    print(f"  Reports queued: {len(reports_to_run)}")
    print_separator()

    for i, report in enumerate(reports_to_run):
        print(f"\n[REPORT {report['index']}/{len(REPORTS)}] {report['title']}")
        print(f"  Severity: {report['severity']}")
        print(f"  Text preview: {report['report'][:80]}...")

        if dry_run:
            print(f"  [DRY RUN] Skipping submission.")
            continue

        print(f"  Submitting to pipeline...", end="", flush=True)
        try:
            start = time.time()
            result = submit_report(report["report"])
            elapsed = round(time.time() - start, 1)

            status = result.get("pipeline_status", "unknown")
            site_name = result.get("intake_site", {}).get("name", "N/A")
            routes_count = len(result.get("optimization_result", {}).get("routes", []))

            print(f" DONE in {elapsed}s")
            print(f"  Pipeline status : {status}")
            print(f"  Site created    : {site_name[:55]}")
            print(f"  Routes optimized: {routes_count} vehicle route(s)")
            print(f"  --> Refresh map at http://localhost:3000 to see update")

        except Exception as e:
            print(f" FAILED: {e}")

        if i < len(reports_to_run) - 1:
            print(f"\n  Waiting {pause}s before next report...")
            time.sleep(pause)

    print_separator()
    print("  ALL REPORTS SUBMITTED. Dashboard should now show full incident map.")
    print_separator()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ReliefRoute Demo Script")
    parser.add_argument("--pause", type=int, default=3, help="Seconds to pause between reports")
    parser.add_argument("--index", type=int, default=None, help="Submit only this report (0-indexed)")
    parser.add_argument("--dry-run", action="store_true", help="Preview reports without submitting")
    args = parser.parse_args()
    run_demo(pause=args.pause, only_index=args.index, dry_run=args.dry_run)
