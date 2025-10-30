require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Health
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Codes router
const codesRouter = require('./routes-folder/codes');
app.use('/api', codesRouter);
app.use('/api', require('./routes-folder/square'));


// Root
app.get('/', (req, res) => {
  res.type('text').send('Capture Culture platform-api is running. Try /api/health');
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

/* ---- auto-added: connect to MongoDB on boot (no file editor used) ---- */
;(async () => {
  try {
    const { connectMongo } = require('./lib/db');
    await connectMongo();
    console.log('✅ MongoDB connected');
  } catch (e) {
    console.warn('⚠️ Mongo connect failed; continuing:', e.message);
  }
npm start
)();
npm start

✅ MongoDB connected
✅ Routes loaded from routes-folder/...
✅ Server running on http://localhost:3000
curl -sS http://localhost:3000/api/health
curl -sS https://platform-api-yl9n.onrender.com/api/health
curl -sS https://platform-api-yl9n.onrender.com/api/health
RESP=$(curl -sS -X POST https://platform-api-yl9n.onrender.com/api/codes -H "Content-Type: application/json" -d '{"tier":"double","usesAllowed":1,"minutesToLive":5}'); echo "$RESP"
CODE=$(printf '%s' "$RESP" | grep -o '"code":"[^"]*"' | cut -d':' -f2 | tr -d '"'); echo "CODE=$CODE"
curl -sS -X POST https://platform-api-yl9n.onrender.com/api/codes/validate -H "Content-Type: application/json" -d "{\"code\":\"$CODE\",\"consume\":false}"
curl -sS -X POST https://platform-api-yl9n.onrender.com/api/codes/validate -H "Content-Type: application/json" -d "{\"code\":\"$CODE\",\"consume\":true}"
CLOUD="https://platform-api-yl9n.onrender.com"
NOTIF_URL="$CLOUD/api/square-webhook"
BODY='{"event_id":"evt_live_probe_1","type":"payment.updated","data":{"object":{"payment":{"id":"PAY123","status":"COMPLETED","reference_id":"ORDER-1","amount_money":{"amount":900,"currency":"USD"}}}}}}'
read -s -p "AIRzy1hNF_qYpt7OnBmk0A: " SQUARE_WEBHOOK_SIGNATURE_KEY; echo
SIG=$(printf "%s%s" "$NOTIF_URL" "$BODY" | openssl dgst -sha256 -hmac "$SQUARE_WEBHOOK_SIGNATURE_KEY" -binary | openssl base64)
curl -sS -X POST "$NOTIF_URL" -H "Content-Type: application/json" -H "x-square-hmacsha256: $SIG" --data-binary "$BODY"curl -sS -w "\nHTTP:%{http_code}\n" http://localhost:3000/api/health
curl -sS -w "\nHTTP:%{http_code}\n" https://platform-api-yl9n.onrender.com/api/health
RESP=$(curl -sS -w "\nHTTP:%{http_code}\n" -X POST https://platform-api-yl9n.onrender.com/api/codes \
  -H "Content-Type: application/json" \
  -d '{"tier":"double","usesAllowed":1,"minutesToLive":5}')
echo "$RESP"

CODE=$(printf '%s' "$RESP" | head -n 1 | grep -o '"code":"[^"]*"' | cut -d':' -f2 | tr -d '"')
echo "CODE=$CODE"

curl -sS -w "\nHTTP:%{http_code}\n" -X POST https://platform-api-yl9n.onrender.com/api/codes/validate \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"$CODE\",\"consume\":false}"

curl -sS -w "\nHTTP:%{http_code}\n" -X POST https://platform-api-yl9n.onrender.com/api/codes/validate \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"$CODE\",\"consume\":true}"
CLOUD="https://platform-api-yl9n.onrender.com"
NOTIF_URL="$CLOUD/api/square-webhook"
BODY='{"event_id":"evt_live_probe_1","type":"payment.updated","data":{"object":{"payment":{"id":"PAY123","status":"COMPLETED","reference_id":"ORDER-1","amount_money":{"amount":900,"currency":"USD"}}}}}}'

# This time the prompt is just a label. Paste your LIVE Signature Key when asked, then press Enter.
read -s -p "Enter LIVE Signature Key: " SQUARE_WEBHOOK_SIGNATURE_KEY; echo

SIG=$(printf "%s%s" "$NOTIF_URL" "$BODY" | openssl dgst -sha256 -hmac "$SQUARE_WEBHOOK_SIGNATURE_KEY" -binary | openssl base64)

curl -sS -w "\nHTTP:%{http_code}\n" -X POST "$NOTIF_URL" \
  -H "Content-Type: application/json" \
  -H "x-square-hmacsha256: $SIG" \
  --data-binary "$BODY"
echo "NOTIF_URL=$NOTIF_URL"
echo "BODY=$BODY"

read -s -p "AIRzy1hNF_qYpt7OnBmk0A: " SQUARE_WEBHOOK_SIGNATURE_KEY; echo
SIG=$(printf "%s%s" "$NOTIF_URL" "$BODY" | openssl dgst -sha256 -hmac "$SQUARE_WEBHOOK_SIGNATURE_KEY" -binary | openssl base64)
echo "SIG=$SIG"
curl -sS -w "\nHTTP:%{http_code}\n" -X POST "$NOTIF_URL" \
  -H "Content-Type: application/json" \
  -H "x-square-hmacsha256: $SIG" \
  --data-binary "$BODY"
# 0) Set the cloud URL + endpoint (must match Render env exactly)
CLOUD="https://platform-api-yl9n.onrender.com"
NOTIF_URL="$CLOUD/api/square-webhook"
echo "NOTIF_URL=$NOTIF_URL"
# 1) Put the JSON body in a file *without a trailing newline*
cat > body.json <<'EOF'
{"event_id":"evt_live_probe_1","type":"payment.updated","data":{"object":{"payment":{"id":"PAY123","status":"COMPLETED","reference_id":"ORDER-1","amount_money":{"amount":900,"currency":"USD"}}}}}}
EOF
wc -c body.json  # just to see the byte length
# 2) Read your LIVE Signature Key into the variable (you won't see it as you type)
read -s -p "Enter LIVE Signature Key: " SQUARE_WEBHOOK_SIGNATURE_KEY; echo
# 3) Compute the signature over URL + body (exact Square formula)
SIG=$(printf "%s" "$NOTIF_URL" | cat - body.json | openssl dgst -sha256 -hmac "$SQUARE_WEBHOOK_SIGNATURE_KEY" -binary | openssl base64)
echo "SIG=$SIG"
# 4) Send the POST using the *same* bytes from body.json
curl -sS -w "\nHTTP:%{http_code}\n" -X POST "$NOTIF_URL" \
  -H "Content-Type: application/json" \
  -H "x-square-hmacsha256: $SIG" \
  --data-binary @body.json
# --- HMAC live probe: prints URL, body size, SIG, response, and HTTP code ---

CLOUD="https://platform-api-yl9n.onrender.com"
NOTIF_URL="$CLOUD/api/square-webhook"
echo "NOTIF_URL=$NOTIF_URL"

# Body saved with no trailing newline (important)
cat > body.json <<'EOF'
{"event_id":"evt_live_probe_1","type":"payment.updated","data":{"object":{"payment":{"id":"PAY123","status":"COMPLETED","reference_id":"ORDER-1","amount_money":{"amount":900,"currency":"USD"}}}}}}
EOF
echo -n "BODY_BYTES="; wc -c < body.json

# Paste your LIVE signature key (nothing will show as you type)
read -s -p "Enter LIVE Signature Key: " SQUARE_WEBHOOK_SIGNATURE_KEY; echo

# Compute SIG over: NOTIF_URL + raw body bytes (Square's formula)
SIG=$(printf "%s" "$NOTIF_URL" | cat - body.json | openssl dgst -sha256 -hmac "$SQUARE_WEBHOOK_SIGNATURE_KEY" -binary | openssl base64)
echo "SIG_LEN=${#SIG}"
echo "SIG=$SIG"

# Send using the same exact bytes
RESP=$(curl -sS -w "\nHTTP:%{http_code}\n" -X POST "$NOTIF_URL" \
  -H "Content-Type: application/json" \
  -H "x-square-hmacsha256: $SIG" \
  --data-binary @body.json)
echo "$RESP"


