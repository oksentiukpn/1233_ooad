#!/usr/bin/env python3
"""Producer for Part 3: replays payment events into topic in receivedAt order."""

import argparse
import json
import time

from kafka import KafkaProducer


def run_producer(
    broker: str,
    topic: str,
    events_file: str,
    fail_rate_override: float = 0.0,
    rate_per_sec: float = 20.0,
):
    print(f"Connecting to broker {broker}...")
    producer = KafkaProducer(
        bootstrap_servers=[broker],
        key_serializer=lambda k: k.encode("utf-8") if k else None,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        acks="all",
    )

    with open(events_file, "r") as f:
        events = json.load(f)

    # Sort strictly by receivedAt
    events.sort(key=lambda x: x.get("receivedAt", ""))
    print(
        f"Loaded {len(events)} events. Replaying into topic '{topic}' at ~{rate_per_sec} msgs/sec..."
    )

    delay = 1.0 / rate_per_sec if rate_per_sec > 0 else 0
    count = 0

    for ev in events:
        invoice_id = ev["invoiceId"]

        # Experiment 3: Override fail rate if specified
        if fail_rate_override > 0.0:
            import random

            if random.random() < fail_rate_override:
                ev["status"] = "failure"
                ev["failureReason"] = "Simulated bank card timeout"

        producer.send(topic, key=invoice_id, value=ev)
        count += 1
        if count % 50 == 0:
            print(
                f"Sent {count}/{len(events)} events (last invoiceId: {invoice_id}, status: {ev.get('status')})"
            )
        if delay > 0:
            time.sleep(delay)

    producer.flush()
    print(f"Producer finished. Total {count} events produced.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--broker", default="localhost:19092")
    parser.add_argument("--topic", default="payments")
    parser.add_argument("--file", default="lab8/part3/sample_events.json")
    parser.add_argument("--fail-rate", type=float, default=0.0)
    parser.add_argument("--rate", type=float, default=20.0)
    args = parser.parse_args()

    run_producer(args.broker, args.topic, args.file, args.fail_rate, args.rate)
