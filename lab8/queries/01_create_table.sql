CREATE EXTERNAL TABLE IF NOT EXISTS lab8_payments.payment_events (
    invoiceId STRING,
    amount BIGINT,
    ccy INT,
    reference STRING,
    createdDate STRING,
    merchantId STRING,
    merchantName STRING,
    mcc INT,
    customerId STRING,
    paymentMethod STRING,
    device STRING,
    status STRING,
    failureReason STRING,
    modifiedDate STRING,
    finalAmount BIGINT,
    receivedAt STRING
)
PARTITIONED BY (dt STRING)
ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
WITH SERDEPROPERTIES (
    'ignore.malformed.json' = 'true',
    'mapping.invoiceId' = 'invoiceId',
    'mapping.amount' = 'amount',
    'mapping.ccy' = 'ccy',
    'mapping.reference' = 'reference',
    'mapping.createdDate' = 'createdDate',
    'mapping.merchantId' = 'merchantId',
    'mapping.merchantName' = 'merchantName',
    'mapping.mcc' = 'mcc',
    'mapping.customerId' = 'customerId',
    'mapping.paymentMethod' = 'paymentMethod',
    'mapping.device' = 'device',
    'mapping.status' = 'status',
    'mapping.failureReason' = 'failureReason',
    'mapping.modifiedDate' = 'modifiedDate',
    'mapping.finalAmount' = 'finalAmount',
    'mapping.receivedAt' = 'receivedAt'
)
LOCATION 's3://spry-analytics-791614297907/payments/'
TBLPROPERTIES (
    'has_encrypted_data'='false'
);
