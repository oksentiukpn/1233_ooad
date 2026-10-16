from datetime import date
from unittest.mock import MagicMock

import pytest
from pydantic import ValidationError

from app.ai.agenda import (
    ActionItem,
    AgendaItem,
    AgendaParseError,
    ParsedAgenda,
    cost_usd,
    parse_agenda,
)


def test_schema_models():
    item = AgendaItem(topic="Discuss roadmap", owner="Alex", minutes=30)
    assert item.topic == "Discuss roadmap"
    assert item.owner == "Alex"
    assert item.minutes == 30

    action = ActionItem(task="Write RFC", owner="Alex", due=date(2026, 10, 20))
    assert action.task == "Write RFC"
    assert action.due == date(2026, 10, 20)

    parsed = ParsedAgenda(
        title="Weekly Sync",
        starts_at="2026-10-19T10:00:00+03:00",
        duration_minutes=45,
        items=[item],
        action_items=[action],
        language="en",
    )
    assert parsed.title == "Weekly Sync"
    assert len(parsed.items) == 1
    assert len(parsed.action_items) == 1


def test_schema_validation_failure():
    # Empty topic is not allowed
    with pytest.raises(ValidationError):
        AgendaItem(topic="")

    # Duration over 600 minutes is not allowed
    with pytest.raises(ValidationError):
        ParsedAgenda(
            duration_minutes=700,
            items=[AgendaItem(topic="Topic")],
            language="en",
        )


def test_cost_usd_calculation():
    # qwen.qwen3-32b-v1:0: input=0.15, output=0.60 per 1M
    cost = cost_usd("qwen.qwen3-32b-v1:0", {"input_tokens": 1000, "output_tokens": 500})
    expected = (1000 / 1e6) * 0.15 + (500 / 1e6) * 0.60
    assert cost == round(expected, 6)


def test_parse_agenda_empty_text():
    with pytest.raises(AgendaParseError, match="empty"):
        parse_agenda("")


def test_parse_agenda_length_limit():
    long_text = "a" * 10001
    with pytest.raises(AgendaParseError, match="maximum allowed length"):
        parse_agenda(long_text)


def test_parse_agenda_with_mock_client():
    mock_client = MagicMock()
    mock_client.converse.return_value = {
        "stopReason": "tool_use",
        "output": {
            "message": {
                "content": [
                    {
                        "toolUse": {
                            "toolUseId": "tool_123",
                            "name": "record_agenda",
                            "input": {
                                "title": "Planning",
                                "starts_at": "2026-10-19T10:00:00Z",
                                "duration_minutes": 30,
                                "items": [
                                    {
                                        "topic": "Sprint 1",
                                        "owner": "Olena",
                                        "minutes": 15,
                                    }
                                ],
                                "action_items": [],
                                "language": "uk",
                            },
                        }
                    }
                ]
            }
        },
        "usage": {"inputTokens": 120, "outputTokens": 80},
    }

    agenda, usage = parse_agenda(
        "Пн 10:00, планінг",
        today=date(2026, 10, 19),
        tz="Europe/Kyiv",
        model_id="qwen.qwen3-32b-v1:0",
        client=mock_client,
    )

    assert agenda.title == "Planning"
    assert agenda.duration_minutes == 30
    assert len(agenda.items) == 1
    assert agenda.items[0].owner == "Olena"
    assert usage["input_tokens"] == 120
    assert usage["output_tokens"] == 80
    assert usage["cost_usd"] > 0
    assert mock_client.converse.call_count == 1


def test_parse_agenda_retry_on_validation_error():
    mock_client = MagicMock()
    # First response: invalid input (empty topic)
    first_resp = {
        "stopReason": "tool_use",
        "output": {
            "message": {
                "content": [
                    {
                        "toolUse": {
                            "toolUseId": "tool_1",
                            "name": "record_agenda",
                            "input": {
                                "items": [{"topic": ""}],
                                "language": "en",
                            },
                        }
                    }
                ]
            }
        },
        "usage": {"inputTokens": 100, "outputTokens": 50},
    }
    # Second response: corrected valid input
    second_resp = {
        "stopReason": "tool_use",
        "output": {
            "message": {
                "content": [
                    {
                        "toolUse": {
                            "toolUseId": "tool_2",
                            "name": "record_agenda",
                            "input": {
                                "title": "Retried Meeting",
                                "items": [{"topic": "Valid Topic"}],
                                "language": "en",
                            },
                        }
                    }
                ]
            }
        },
        "usage": {"inputTokens": 150, "outputTokens": 60},
    }
    mock_client.converse.side_effect = [first_resp, second_resp]

    agenda, usage = parse_agenda(
        "Some meeting notes",
        today=date(2026, 10, 19),
        client=mock_client,
    )

    assert agenda.title == "Retried Meeting"
    assert agenda.items[0].topic == "Valid Topic"
    assert usage["input_tokens"] == 250
    assert usage["output_tokens"] == 110
    assert mock_client.converse.call_count == 2
