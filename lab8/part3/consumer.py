#!/usr/bin/env python3
"""Consumer for Part 3:
- Drops exact duplicates
- 1-minute tumbling windows based on event time (modifiedDate)
- Wait watermark (default 2 minutes) for late events
- Emits alert if failure rate > 10%
"""

import argparse
import json
import sys
from collections import defaultdict
from datetime import datetime, timezone

from kafka import KafkaConsumer


def parse_iso(ts_str: str) -> datetime:
    return datetime.fromisoformat(ts_str.replace("Z", "+00:00"))


def run_consumer(
    broker: str,
    topic: str,
    group_id: str,
    wait_minutes: float = 2.0,
    max_messages: int = 0,
):
    print(
        f"Starting consumer '{group_id}' on topic '{topic}' (Wait watermark: {wait_minutes} min)..."
    )
    consumer = KafkaConsumer(
        topic,
        bootstrap_servers=[broker],
        group_id=group_id,
        auto_offset_reset="earliest",
        enable_auto_commit=True,
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
    )

    seen_event_keys = set()
    windows = defaultdict(lambda: defaultdict(lambda: {"total": 0, "failure": 0}))
    watermark_event_time = None
    rejected_late_count = 0
    processed_count = 0

    try:
        for msg in consumer:
            ev = msg.value
            processed_count += 1

            invoice_id = ev.get("invoiceId")
            status = ev.get("status")
            mod_date_str = ev.get("modifiedDate")
            rec_at_str = ev.get("receivedAt")
            pay_method = ev.get("paymentMethod", "unknown")

            # 1. Deduplication
            ev_key = (invoice_id, status, mod_date_str)
            if ev_key in seen_event_keys:
                print(f"[DUPLICATE DROPPED] invoiceId={invoice_id}, status={status}")
                continue
            seen_event_keys.add(ev_key)

            ev_time = parse_iso(mod_date_str)
            if watermark_event_time is None or ev_time > watermark_event_time:
                watermark_event_time = ev_time

            # 2. Check Late Events / Watermark
            # Window key: 1-minute bucket (YYYY-MM-DD HH:MM:00)
            window_minute = ev_time.replace(second=0, microsecond=0)
            delay_sec = (watermark_event_time - ev_time).total_seconds()

            if wait_minutes == 0 and delay_sec > 0:
                rejected_late_count += 1
                print(
                    f"[LATE EVENT REJECTED] delay={delay_sec:.1f}s, invoiceId={invoice_id}, window={window_minute.strftime('%H:%M')}"
                )
                continue
            elif delay_sec > (wait_minutes * 60):
                rejected_late_count += 1
                print(
                    f"[EXPIRED REJECTED] delay={delay_sec:.1f}s > {wait_minutes * 60}s, invoiceId={invoice_id}"
                )
                continue

            # Accumulate in window
            windows[window_minute][pay_method]["total"] += 1
            if status == "failure":
                windows[window_minute][pay_method]["failure"] += 1

            # Check and alert for current window
            totals = windows[window_minute][pay_method]["total"]
            fails = windows[window_minute][pay_method]["failure"]
            rate = (fails / totals) * 100.0

            if totals >= 5 and rate > 10.0:
                print(
                    f"\033[91m⚠️ [ALERT >10% FAILURE] Window {window_minute.strftime('%H:%M')} | Method: {pay_method} | Rate: {rate:.1f}% ({fails}/{totals})\033[0m"
                )

            if max_messages > 0 and processed_count >= max_messages:
                break

    except KeyboardInterrupt:
        pass

    print("\n--- Consumer Summary ---")
    print(f"Total processed: {processed_count}")
    print(f"Rejected late events: {rejected_late_count}")
    print("Computed windows:")
    for w_time in sorted(windows.keys()):
        print(f"  Window {w_time.strftime('%Y-%m-%d %H:%M')}:")
        for method, stats in windows[w_time].items():
            r = (stats["failure"] / stats["total"]) * 100.0 if stats["total"] else 0
            print(
                f"    - {method:12s}: Total={stats['total']}, Fails={stats['failure']}, Rate={r:.1f}%"
            )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--broker", default="localhost:19092")
    parser.add_argument("--topic", default="payments")
    parser.add_argument("--group", default="payment-analyzers-group")
    parser.add_argument("--wait-min", type=float, default=2.0)
    parser.add_argument("--max", type=int, default=0)
    args = parser.parse_args()

    run_consumer(args.broker, args.topic, args.group, args.wait_min, args.max)
