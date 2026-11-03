SELECT
    merchantId,
    merchantName,
    CASE ccy
        WHEN 980 THEN 'UAH'
        WHEN 840 THEN 'USD'
        WHEN 978 THEN 'EUR'
        ELSE CAST(ccy AS VARCHAR)
    END AS currency,
    COUNT(*) AS successful_transactions_count,
    ROUND(SUM(finalAmount) / 100.0, 2) AS total_turnover
FROM lab8_payments.payments
WHERE status = 'success'
GROUP BY merchantId, merchantName, ccy
ORDER BY total_turnover DESC;
