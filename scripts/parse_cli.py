import json
import sys
from datetime import date

from app.ai.agenda import parse_agenda

text = (
    sys.argv[1]
    if len(sys.argv) > 1 and sys.argv[1]
    else (
        "Пн 10:00, синк по прайсингу, 45 хв. 1) нові тарифи Pro — Олена, 15 хв "
        "2) фідбек від клієнтів — Taras 3) що робимо з річною знижкою. "
        "Taras до пʼятниці збирає порівняння з конкурентами."
    )
)

model_id = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] else None

print(f"--> Parsing agenda with Bedrock model: {model_id or 'default'}...")
try:
    agenda, usage = parse_agenda(
        text=text,
        today=date.today(),
        tz="Europe/Kyiv",
        model_id=model_id,
    )
    print("\n=== PARSED AGENDA JSON ===")
    print(json.dumps(agenda.model_dump(mode="json"), indent=2, ensure_ascii=False))
    print("\n=== USAGE & ESTIMATED COST ===")
    print(json.dumps(usage, indent=2))
except Exception as e:
    print(f"Error parsing agenda: {e}", file=sys.stderr)
    sys.exit(1)
