import sys
import boto3

model_id = sys.argv[1] if len(sys.argv) > 1 else "qwen.qwen3-32b-v1:0"
region = sys.argv[2] if len(sys.argv) > 2 else "us-east-1"

print(f"--> Connecting to Amazon Bedrock ({region}) with model: {model_id}...")
client = boto3.client("bedrock-runtime", region_name=region)

resp = client.converse(
    modelId=model_id,
    messages=[{"role": "user", "content": [{"text": "In one sentence: what is an ISO week?"}]}],
    inferenceConfig={"maxTokens": 200},
)

ans = resp["output"]["message"]["content"][0]["text"].strip()
stop = resp.get("stopReason")
usage = resp.get("usage", {})

print("\nModel:     ", model_id)
print("Answer:    ", ans)
print("Stop:      ", stop)
print(f"Tokens in:  {usage.get('inputTokens', 0)} | out: {usage.get('outputTokens', 0)}")
