CREATE TABLE lab8_payments.curated_payments
WITH (
    format = 'PARQUET',
    parquet_compression = 'SNAPPY',
    external_location = 's3://spry-analytics-791614297907/curated/payments/',
    partitioned_by = ARRAY['dt']
) AS
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
FROM lab8_payments.payments;
