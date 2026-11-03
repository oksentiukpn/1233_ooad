SELECT
    hour(from_iso8601_timestamp(createdDate)) AS hour_of_day_utc,
    COUNT(*) AS total_payments,
    COUNT(CASE WHEN status = 'success' THEN 1 END) AS successful_payments,
    COUNT(CASE WHEN status = 'failure' THEN 1 END) AS failed_payments
FROM lab8_payments.payments
GROUP BY hour(from_iso8601_timestamp(createdDate))
ORDER BY hour_of_day_utc ASC;
