# Nova Launch Webhook System

Backend API for managing webhook subscriptions and delivering real-time notifications for burn events and token operations on the Stellar blockchain.

## Features

- ✅ Subscribe to webhook events
- ✅ Unsubscribe from webhooks
- ✅ List user subscriptions
- ✅ Automatic event detection from Stellar
- ✅ Retry logic with exponential backoff
- ✅ HMAC signature verification
- ✅ Rate limiting per webhook
- ✅ Delivery logs and monitoring
- ✅ PostgreSQL database storage

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Stellar Network (Horizon API)              │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│           Stellar Event Listener (Polling)              │
│  - Monitors contract events                             │
│  - Parses burn/create/update events                     │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│            Webhook Delivery Service                     │
│  - Finds matching subscriptions                         │
│  - Generates signed payloads                            │
│  - Delivers with retry logic                            │
│  - Logs delivery attempts                               │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              User Webhook Endpoints                     │
└─────────────────────────────────────────────────────────┘
```

## Installation

```bash
cd backend
npm install
```

## Database Setup

1. Install PostgreSQL
2. Create database:

```bash
createdb nova_launch
```

3. Run schema:

```bash
psql -d nova_launch -f src/database/schema.sql
```

## Configuration

Copy `.env.example` to `.env` and configure:

```env
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/nova_launch

# Stellar
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
FACTORY_CONTRACT_ID=<your-contract-id>

# Webhook Settings
WEBHOOK_TIMEOUT_MS=5000
WEBHOOK_MAX_RETRIES=3
WEBHOOK_RETRY_DELAY_MS=1000
```

## Running

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

### Testing

```bash
npm test
npm run test:coverage
```

## API Endpoints

### POST /api/webhooks/subscribe

Create a new webhook subscription.

**Request:**
```json
{
  "url": "https://example.com/webhook",
  "tokenAddress": "GTOKEN...", // optional, null = all tokens
  "events": ["token.burn.self", "token.created"],
  "createdBy": "GUSER..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "url": "https://example.com/webhook",
    "tokenAddress": null,
    "events": ["token.burn.self", "token.created"],
    "secret": "abcd1234...", // truncated for security
    "active": true,
    "createdBy": "GUSER...",
    "createdAt": "2026-02-23T10:00:00Z",
    "lastTriggered": null
  },
  "message": "Webhook subscription created successfully"
}
```

### DELETE /api/webhooks/unsubscribe/:id

Delete a webhook subscription.

**Request:**
```json
{
  "createdBy": "GUSER..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook subscription deleted successfully"
}
```

### POST /api/webhooks/list

List webhook subscriptions for a user.

**Request:**
```json
{
  "createdBy": "GUSER...",
  "active": true // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "url": "https://example.com/webhook",
      "tokenAddress": null,
      "events": ["token.burn.self"],
      "secret": "abcd1234...",
      "active": true,
      "createdBy": "GUSER...",
      "createdAt": "2026-02-23T10:00:00Z",
      "lastTriggered": "2026-02-23T11:00:00Z"
    }
  ],
  "count": 1
}
```

### GET /api/webhooks/:id

Get a specific webhook subscription.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "url": "https://example.com/webhook",
    "tokenAddress": null,
    "events": ["token.burn.self"],
    "secret": "abcd1234...",
    "active": true,
    "createdBy": "GUSER...",
    "createdAt": "2026-02-23T10:00:00Z",
    "lastTriggered": "2026-02-23T11:00:00Z"
  }
}
```

### PATCH /api/webhooks/:id/toggle

Toggle webhook active status.

**Request:**
```json
{
  "active": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription deactivated successfully"
}
```

### GET /api/webhooks/:id/logs

Get delivery logs for a subscription.

**Query Parameters:**
- `limit` (optional): Number of logs to return (default: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "subscriptionId": "uuid",
      "event": "token.burn.self",
      "payload": { ... },
      "statusCode": 200,
      "success": true,
      "attempts": 1,
      "lastAttemptAt": "2026-02-23T11:00:00Z",
      "errorMessage": null,
      "createdAt": "2026-02-23T11:00:00Z"
    }
  ],
  "count": 1
}
```

### POST /api/webhooks/:id/test

Test a webhook subscription.

**Response:**
```json
{
  "success": true,
  "message": "Test webhook delivered successfully"
}
```

## Event Types

| Event Type | Description |
|------------|-------------|
| `token.burn.self` | User burns their own tokens |
| `token.burn.admin` | Admin burns tokens |
| `token.created` | New token deployed |
| `token.metadata.updated` | Token metadata updated |

## Webhook Payload

All webhook deliveries include:

```json
{
  "event": "token.burn.self",
  "timestamp": "2026-02-23T11:00:00Z",
  "data": {
    "tokenAddress": "GTOKEN...",
    "from": "GUSER...",
    "amount": "1000000",
    "burner": "GUSER...",
    "transactionHash": "abc123...",
    "ledger": 12345
  },
  "signature": "hmac-sha256-signature"
}
```

### Headers

- `Content-Type: application/json`
- `X-Webhook-Signature`: HMAC SHA256 signature
- `X-Webhook-Event`: Event type
- `User-Agent: Nova-Launch-Webhook/1.0`

## Signature Verification

Verify webhook authenticity:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## Rate Limiting

- Global: 100 requests per 15 minutes per IP
- Webhook operations: 20 requests per 15 minutes per IP
- Per-webhook delivery: Configurable via database

## Retry Logic

Failed webhook deliveries are retried with exponential backoff:

1. Attempt 1: Immediate
2. Attempt 2: After 1 second
3. Attempt 3: After 2 seconds

After 3 failed attempts, the delivery is marked as failed and logged.

## Monitoring

Check delivery logs via:
- `GET /api/webhooks/:id/logs` - View delivery history
- Database `webhook_delivery_logs` table
- Application logs

## Security

- HMAC SHA256 signature verification
- HTTPS-only webhook URLs recommended
- Rate limiting on all endpoints
- Helmet.js security headers
- Input validation with express-validator
- SQL injection prevention via parameterized queries

## Example Webhook Receiver

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const WEBHOOK_SECRET = 'your-webhook-secret';

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  
  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  
  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process event
  const { event, data } = req.body;
  console.log(`Received ${event}:`, data);
  
  // Respond quickly
  res.json({ received: true });
});

app.listen(3000);
```

## Troubleshooting

### Webhooks not being delivered

1. Check subscription is active: `GET /api/webhooks/:id`
2. Verify event listener is running (check logs)
3. Check delivery logs: `GET /api/webhooks/:id/logs`
4. Test webhook manually: `POST /api/webhooks/:id/test`

### Database connection errors

1. Verify PostgreSQL is running
2. Check `.env` database credentials
3. Ensure database exists and schema is loaded

### Event listener not detecting events

1. Verify `FACTORY_CONTRACT_ID` is set in `.env`
2. Check Stellar network configuration
3. Ensure contract is deployed and emitting events

## License

MIT
