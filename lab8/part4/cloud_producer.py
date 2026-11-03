#!/usr/bin/env python3
"""Cloud Stream Producer (Part 4):
Sends payment events directly to Amazon Kinesis Data Streams / Firehose.
"""

import boto3
import json
import time

STREAM_NAME = "payments-stream"
REGION = "us-east-1"

def produce_to_kinesis(events_file="lab8/part3/sample_events.json", limit=200):
    kinesis = boto3.client("kinesis", region_name=REGION)
    with open(events_file, "r") as f:
        events = json.load(f)

    print(f"Streaming {min(limit, len(events))} events into Kinesis stream '{STREAM_NAME}'...")
    count = 0
    for ev in events[:limit]:
        invoice_id = ev["invoiceId"]
        payload = json.dumps(ev) + "\n"
        kinesis.put_record(
            StreamName=STREAM_NAME,
            Data=payload.encode("utf-8"),
            PartitionKey=invoice_id
        )
        count += 1
        if count % 25 == 0:
            print(f"Sent {count} events to Kinesis (PartitionKey={invoice_id})")
        time.sleep(0.05)

    print(f"Cloud producer finished. Successfully ingested {count} events.")

if __name__ == "__main__":
    produce_to_kinesis()
