SELECT
    COUNT(*) AS late_over_60s,
    (SELECT COUNT(*) FROM lab8_payments.payment_events) AS total_events,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM lab8_payments.payment_events), 4) AS pct_late_60s,
    COUNT(CASE WHEN date_diff('second', from_iso8601_timestamp(modifiedDate), from_iso8601_timestamp(receivedAt)) > 3600 THEN 1 END) AS late_over_1h,
    ROUND(100.0 * COUNT(CASE WHEN date_diff('second', from_iso8601_timestamp(modifiedDate), from_iso8601_timestamp(receivedAt)) > 3600 THEN 1 END) / (SELECT COUNT(*) FROM lab8_payments.payment_events), 4) AS pct_late_1h
FROM lab8_payments.payment_events
WHERE date_diff('second', from_iso8601_timestamp(modifiedDate), from_iso8601_timestamp(receivedAt)) > 60;
