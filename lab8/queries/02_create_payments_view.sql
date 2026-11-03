CREATE OR REPLACE VIEW lab8_payments.payments AS
WITH deduplicated_events AS (
    SELECT DISTINCT
        invoiceId,
        amount,
        ccy,
        reference,
        createdDate,
        merchantId,
        merchantName,
        mcc,
        customerId,
        paymentMethod,
        device,
        status,
        failureReason,
        modifiedDate,
        finalAmount,
        receivedAt,
        dt
    FROM lab8_payments.payment_events
),
ranked_payments AS (
    SELECT
        invoiceId,
        amount,
        ccy,
        reference,
        createdDate,
        merchantId,
        merchantName,
        mcc,
        customerId,
        paymentMethod,
        device,
        status,
        failureReason,
        modifiedDate,
        finalAmount,
        receivedAt,
        dt,
        ROW_NUMBER() OVER (
            PARTITION BY invoiceId
            ORDER BY from_iso8601_timestamp(modifiedDate) DESC, from_iso8601_timestamp(receivedAt) DESC
        ) AS rn
    FROM deduplicated_events
)
SELECT
    invoiceId,
    amount,
    ccy,
    reference,
    createdDate,
    merchantId,
    merchantName,
    mcc,
    customerId,
    paymentMethod,
    device,
    status,
    failureReason,
    modifiedDate,
    finalAmount,
    receivedAt,
    dt
FROM ranked_payments
WHERE rn = 1;
