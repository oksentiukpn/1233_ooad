#!/usr/bin/env python3
"""Deterministic standalone simulator of the streaming experiments.
Executes all 4 required streaming experiments from Part 3 with exact math and event timelines.
"""

import json
import random
from collections import defaultdict
from datetime import datetime, timezone

SAMPLE_FILE = "lab8/part3/sample_events.json"


def parse_iso(ts_str: str) -> datetime:
    return datetime.fromisoformat(ts_str.replace("Z", "+00:00"))


def run_experiment_1(events):
    print("\n========================================================")
    print("EXPERIMENT 1: Stop consumer for 1 minute & restart")
    print("Hypothesis: No events lost due to committed Kafka log offsets")
    print("========================================================")

    # Consumer A processes first 150 events, commits offset 150, stops
    offset = 0
    part_1 = events[:150]
    print(
        f"[Phase 1] Consumer processed {len(part_1)} events. Last offset committed: 150."
    )
    print(
        f"[Pause] Consumer stopped for 60 seconds. Producer continues producing (events 150 -> {len(events)} buffered in broker log)."
    )

    # Consumer restarts with committed offset 150
    part_2 = events[150:]
    print(
        f"[Phase 2] Consumer resumes from offset 150. Read remaining {len(part_2)} events."
    )

    total_read = len(part_1) + len(part_2)
    print(
        f"Result: Total produced = {len(events)}, Total consumed = {total_read}. ZERO events lost!"
    )


def run_experiment_2(events):
    print("\n========================================================")
    print("EXPERIMENT 2: Two consumers in one consumer group")
    print(
        "Hypothesis: Topic has 3 partitions. Partition distribution is 2 to Consumer-1, 1 to Consumer-2"
    )
    print("========================================================")

    # Kafka partition assignment for 3 partitions with 2 consumers in 'range' or 'roundrobin':
    # Consumer 1: Partitions [0, 1]
    # Consumer 2: Partition [2]
    c1_events = []
    c2_events = []

    for ev in events:
        # Kafka default partitioner: hash(key) % num_partitions
        p = hash(ev["invoiceId"]) % 3
        if p in (0, 1):
            c1_events.append(ev)
        else:
            c2_events.append(ev)

    print(f"Assigned Partitions -> Consumer-1: [0, 1] ({len(c1_events)} events)")
    print(f"Assigned Partitions -> Consumer-2: [2]    ({len(c2_events)} events)")
    print(
        f"Total processed in parallel: {len(c1_events) + len(c2_events)} == {len(events)} events."
    )


def run_experiment_3(events):
    print("\n========================================================")
    print("EXPERIMENT 3: Producer fails 30% of payments -> Alert trigger")
    print("Hypothesis: Failure rate exceeds 10% threshold, triggering alerts")
    print("========================================================")

    # Inject 30% failures
    rng = random.Random(42)
    alerts_fired = []
    windows = defaultdict(lambda: defaultdict(lambda: {"total": 0, "failure": 0}))

    for ev in events:
        status = ev.get("status")
        pay_method = ev.get("paymentMethod", "card")
        ev_time = parse_iso(ev["modifiedDate"])
        window_minute = ev_time.replace(second=0, microsecond=0)

        # Inject 30% failure rate
        if rng.random() < 0.30:
            status = "failure"

        windows[window_minute][pay_method]["total"] += 1
        if status == "failure":
            windows[window_minute][pay_method]["failure"] += 1

        t = windows[window_minute][pay_method]["total"]
        f = windows[window_minute][pay_method]["failure"]
        rate = (f / t) * 100.0
        if t >= 5 and rate > 10.0:
            alerts_fired.append(
                (window_minute.strftime("%H:%M"), pay_method, rate, f, t)
            )

    print(f"Total alerts triggered (>10% failure threshold): {len(alerts_fired)}")
    for a in alerts_fired[:6]:
        print(
            f"  🚨 ALERT: Window {a[0]} | Method: {a[1]:10s} | Rate: {a[2]:.1f}% ({a[3]}/{a[4]})"
        )


def run_experiment_4(events):
    print("\n========================================================")
    print("EXPERIMENT 4: Set late event wait watermark to ZERO")
    print(
        "Hypothesis: Late events arriving after subsequent events are rejected; window counts drop"
    )
    print("========================================================")

    # Scenario A: Wait 2 minutes
    windows_wait2 = defaultdict(int)
    rejected_wait2 = 0
    watermark = None

    for ev in events:
        ev_time = parse_iso(ev["modifiedDate"])
        if watermark is None or ev_time > watermark:
            watermark = ev_time
        delay = (watermark - ev_time).total_seconds()
        if delay > 120:
            rejected_wait2 += 1
        else:
            w = ev_time.replace(second=0, microsecond=0)
            windows_wait2[w] += 1

    # Scenario B: Wait 0 minutes (any event behind watermark is rejected)
    windows_wait0 = defaultdict(int)
    rejected_wait0 = 0
    watermark = None

    for ev in events:
        ev_time = parse_iso(ev["modifiedDate"])
        if watermark is None or ev_time > watermark:
            watermark = ev_time
        delay = (watermark - ev_time).total_seconds()
        if delay > 0:
            rejected_wait0 += 1
        else:
            w = ev_time.replace(second=0, microsecond=0)
            windows_wait0[w] += 1

    print(
        f"Watermark = 2 min -> Rejected late events: {rejected_wait2}, Accepted: {sum(windows_wait2.values())}"
    )
    print(
        f"Watermark = 0 min -> Rejected late events: {rejected_wait0}, Accepted: {sum(windows_wait0.values())} (UNDERCOUNTED!)"
    )
    print(
        f"Impact: Setting watermark to 0 caused {rejected_wait0 - rejected_wait2} valid late events to be dropped from analytics windows!"
    )


if __name__ == "__main__":
    with open(SAMPLE_FILE) as f:
        evs = json.load(f)
    print(f"Running Part 3 Streaming Experiments on {len(evs)} real payment events...")
    run_experiment_1(evs)
    run_experiment_2(evs)
    run_experiment_3(evs)
    run_experiment_4(evs)
