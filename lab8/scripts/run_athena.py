#!/usr/bin/env python3
"""Helper script to run Athena queries, wait for completion, and return results/statistics."""

import argparse
import json
import sys
import time
import boto3

REGION = "us-east-1"
WORKGROUP = "primary"
OUTPUT_LOCATION = "s3://spry-analytics-791614297907/athena-results/"

athena = boto3.client("athena", region_name=REGION)


def run_query(sql: str, database: str = "default") -> dict:
    start_kwargs = {
        "QueryString": sql,
        "WorkGroup": WORKGROUP,
        "ResultConfiguration": {"OutputLocation": OUTPUT_LOCATION},
    }
    if database:
        start_kwargs["QueryExecutionContext"] = {"Database": database}

    res = athena.start_query_execution(**start_kwargs)
    query_id = res["QueryExecutionId"]
    print(f"Started query {query_id}...")

    while True:
        status_resp = athena.get_query_execution(QueryExecutionId=query_id)
        state = status_resp["QueryExecution"]["Status"]["State"]
        if state in ("SUCCEEDED", "FAILED", "CANCELLED"):
            break
        time.sleep(1)

    exec_info = status_resp["QueryExecution"]
    stats = exec_info.get("Statistics", {})
    run_time = stats.get("EngineExecutionTimeInMillis", 0) / 1000.0
    scanned_bytes = stats.get("DataScannedInBytes", 0)
    scanned_mb = scanned_bytes / (1024 * 1024)

    if state != "SUCCEEDED":
        reason = exec_info["Status"].get("StateChangeReason", "Unknown error")
        raise RuntimeError(f"Query {query_id} failed: {reason}")

    print(f"Query {query_id} succeeded in {run_time:.2f}s, scanned {scanned_mb:.2f} MB ({scanned_bytes} bytes)")

    # Fetch rows
    rows = []
    paginator = athena.get_paginator("get_query_results")
    for page in paginator.paginate(QueryExecutionId=query_id):
        raw_rows = page["ResultSet"]["Rows"]
        for r in raw_rows:
            row_data = [col.get("VarCharValue", "") for col in r.get("Data", [])]
            rows.append(row_data)

    return {
        "query_id": query_id,
        "runtime_seconds": run_time,
        "data_scanned_bytes": scanned_bytes,
        "data_scanned_mb": scanned_mb,
        "rows": rows,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--sql", required=True, help="SQL string or path to .sql file")
    parser.add_argument("--database", default="default", help="Database name")
    parser.add_argument("--output", default=None, help="Path to save result JSON/CSV")
    args = parser.parse_args()

    sql_query = args.sql
    if args.sql.endswith(".sql"):
        with open(args.sql, "r") as f:
            sql_query = f.read()

    result = run_query(sql_query, database=args.database)
    if args.output:
        with open(args.output, "w") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print(f"Results saved to {args.output}")
    else:
        for r in result["rows"][:25]:
            print("\t".join(r))
