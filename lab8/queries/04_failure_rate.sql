SELECT
    paymentMethod,
    device,
    COUNT(*) AS total_payments,
    COUNT(CASE WHEN status = 'failure' THEN 1 END) AS failed_payments,
    ROUND(100.0 * COUNT(CASE WHEN status = 'failure' THEN 1 END) / COUNT(*), 2) AS failure_rate_pct
FROM lab8_payments.payments
GROUP BY paymentMethod, device
ORDER BY failure_rate_pct DESC;
