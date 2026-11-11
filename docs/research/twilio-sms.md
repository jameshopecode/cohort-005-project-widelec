# Twilio Messaging API for Cadence SMS

Research for issue #2 (feeds #8, SMS Channel). Question: what does sending an SMS
through Twilio's Messaging API require and cost for Cadence, whose customers are
mostly in Poland?

All pages below were fetched on **2026-11-11**. Only Twilio's own pages were used
(twilio.com/docs, twilio.com/en-us pricing and guidelines pages, Twilio's pricing
CSV, and one Twilio blog post, flagged as such). Where a fact could not be found on a
Twilio page this note says so instead of guessing. Prices are USD as published; the
SMS and Voice pricing pages state "Pricing current as of October 2026".

## 1. Request shape for sending one SMS

Source: Message resource reference,
<https://www.twilio.com/docs/messaging/api/message-resource> (fetched 2026-11-11).

- **Endpoint**: `POST https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json`,
  body encoded as `application/x-www-form-urlencoded`.
- **Auth**: HTTP Basic. The reference examples use `-u $TWILIO_API_KEY:$TWILIO_API_SECRET`
  and the SDK notes say "For local testing, you can use your Account SID and Auth
  token." Error 20003 "Permission Denied" is what a wrong or scoped-to-the-wrong-account
  credential produces; its page says "For production, use an API Key and Secret"
  (<https://www.twilio.com/docs/api/errors/20003>).
- **Required fields**: each request "requires a recipient, a sender, and content":
  - `To`: "The recipient's phone number in E.164 format (for SMS/MMS)", e.g. `+48...`.
  - Sender: either `From` ("The sender's phone number (in E.164 format), alphanumeric
    sender ID, Wireless SIM, short code, or channel address") or `MessagingServiceSid`
    (then `From` may be omitted and Twilio picks a sender from the service's Sender Pool).
  - Content: one of `Body`, `MediaUrl`, or `ContentSid`. `Body` "Can be up to 1,600
    characters in length."
- **Response** (HTTP 201 with a JSON Message): `sid` (`SM...`), `status`, `num_segments`
  (initially `0` when sent via a Messaging Service), `price` and `price_unit` ("populated
  after the message has been sent/received, and may not be immediately available"),
  `error_code` / `error_message` ("The error code returned if the Message `status` is
  `failed` or `undelivered`", otherwise `null`), `date_created`.
- **Status values** (same page): `queued` ("The API request to send an outbound message
  was successful and the message is queued"; initial status when sent with `From`),
  `accepted` (initial status when sent with `MessagingServiceSid` only), `sending`,
  `sent` ("The nearest upstream carrier accepted the outbound message"), `delivered`
  ("Twilio has received confirmation of outbound message delivery from the upstream
  carrier"), `undelivered` ("Twilio received a delivery receipt indicating that the
  outbound message was not delivered"), `failed` ("The outbound message failed to send"),
  plus `scheduled`, `canceled`, `receiving`, `received`, `read` (WhatsApp/RCS).
  The create response therefore only tells you the message was accepted; delivery
  outcome arrives later via a `StatusCallback` URL or by re-fetching the Message
  (<https://www.twilio.com/docs/messaging/guides/outbound-message-status-in-status-callbacks>,
  fetched 2026-11-11, which notes "no status callback is sent for the initial status").
- **Synchronous error shape** (<https://www.twilio.com/docs/usage/twilios-response>,
  fetched 2026-11-11): non-2xx responses carry JSON with `status` (HTTP code), `message`,
  `code` ("A Twilio-specific error code") and `more_info` (URL). 401 = "The credentials
  you provided are missing or invalid", 429 = "You have reached the Twilio API
  concurrency limit", 503 = retry later. Example given: `{"status": 400, "message":
  "No to number is specified", "code": 21201, ...}`.

### Error codes worth surfacing to a Platform Admin

| Code | Meaning (Twilio's wording) | When Cadence would see it | Source |
| --- | --- | --- | --- |
| 20003 | "Permission Denied" — credentials incorrect, expired, deleted, or wrong account | Misconfigured env vars | <https://www.twilio.com/docs/api/errors/20003> |
| 21211 | "Invalid 'To' Phone Number" — not E.164, typo, or To equals From | Bad phone number on a user record | <https://www.twilio.com/docs/api/errors/21211> |
| 21606 | "'From' number is not a valid message-capable Twilio number for this account" — includes "An Alphanumeric Sender ID is used in a country that doesn't support it, or one that requires registration you haven't completed" | Wrong `TWILIO_FROM` | <https://www.twilio.com/docs/api/errors/21606> |
| 21608 | "Upgrade and create an approved primary compliance profile to reach unverified numbers" — "trial accounts and accounts without an approved PCP can only send messages to phone numbers you've verified with Twilio" | Admin test on a trial account to an unverified number | <https://www.twilio.com/docs/api/errors/21608> |
| 21614 | "'To' number is not a valid mobile number" (landline); Poland guidelines: message not charged | Landline on a user record | <https://www.twilio.com/docs/api/errors/21614> |
| 21408 | "Message blocked: permissions disabled for the destination region" — "New accounts are limited to their verified home country until you enable more destinations" in Messaging Geo Permissions | First send to a non-Polish number | <https://www.twilio.com/docs/api/errors/21408> |
| 30003 | "Unreachable destination handset" (async, `undelivered`) | Phone off / no signal | <https://www.twilio.com/docs/api/errors/30003> |
| 30005 | "Unknown destination handset" — number "may no longer exist" (async) | Stale number | <https://www.twilio.com/docs/api/errors/30005> |
| 30007 | "Message filtered" — "blocked by Twilio or by the carrier" (async) | Generic alpha sender or URL-heavy text in PL | <https://www.twilio.com/docs/api/errors/30007> |

All error pages fetched 2026-11-11. The 21xxx codes come back synchronously (HTTP 400);
the 300xx codes arrive asynchronously on the Message's `error_code` after status
`undelivered`/`failed`.

## 2. Sender requirements for Polish mobile numbers

Source: Poland SMS guidelines, <https://www.twilio.com/en-us/guidelines/pl/sms>
(fetched 2026-11-11), unless noted.

- **Alphanumeric sender ID**: supported; "Dynamic Alphanumeric Sender IDs are
  supported" and operator pre-registration is listed as "Not Required". Caveat on the
  same page: "The use of generic Alphanumeric Sender IDs should be avoided as local
  mobile operators tend to filter them and block those messages." A sender like
  `Cadence` is specific, not generic.
- **Domestic long code (Polish number)**: supported by operators and Twilio, sender ID
  preserved.
- **International long code (a non-Polish Twilio number)**: operators do *not* support it;
  Twilio delivers but the sender ID is not preserved. Numeric sender IDs "will be
  overwritten with a generic Alphanumeric Sender ID outside the Twilio platform."
  So a cheap US/UK number is not a good Polish sender.
- **Short codes**: not supported by Polish operators.
- **Two-way SMS**: supported (only on a Polish number; alphanumeric IDs are one-way).
- **Landlines**: "SMS to landlines is not possible"; API returns 21614, not charged.
- **URLs**: "URL shorteners are strictly prohibited in Poland"; use full URLs. The page
  also warns that local networks tend to block long SMS containing URLs and suggests
  testing before bulk sends.
- **Content/consent**: obtain opt-in, send in daytime hours unless urgent, support
  HELP/STOP in Polish, respect do-not-disturb registries.

Alphanumeric sender ID rules in general
(<https://www.twilio.com/docs/glossary/what-alphanumeric-sender-id> and
<https://www.twilio.com/docs/messaging/services/alphanumeric-sender-ids-in-messaging-services>,
both fetched 2026-11-11):

- "Limit length to 11 characters"; letters, digits and space; "They can't be numbers
  only." Not available in the US or Canada.
- "Alphanumeric Sender IDs are only supported for paid Twilio accounts; not for free
  trial accounts."
- "Alphanumeric Sender IDs are only available for one-way outbound messages"; recipients
  cannot reply and Twilio's STOP keyword does not work on them, so an alternative opt-out
  must be offered.
- Recommended usage is through a Messaging Service: enable Alphanumeric Sender ID in
  Messaging > Settings, add the Alpha Sender to the service's Sender Pool, then send with
  `MessagingServiceSid`; "Twilio will select the Alphanumeric Sender ID automatically"
  for supported countries. The Message resource also accepts the alphanumeric string
  directly in `From`.
- Registration, where needed, goes through Trust Hub
  (<https://www.twilio.com/docs/trust-hub/registrations/alphanumeric-sender-id>, fetched
  2026-11-11): the per-country list of which countries require pre-registration is only
  in a Help Center article that could not be fetched (JS-rendered), so for countries
  other than those checked below this note does not claim either way.

### What changes for other EU countries

- **Germany** (<https://www.twilio.com/en-us/guidelines/de/sms>, fetched 2026-11-11):
  dynamic alphanumeric supported, no pre-registration listed; domestic *and*
  international long codes supported with sender ID preserved; short codes supported.
- **France** (<https://www.twilio.com/en-us/guidelines/fr/sms>, fetched 2026-11-11):
  dynamic alphanumeric supported, pre-registration "Not Required"; international long
  codes *not* supported by operators; marketing SMS only "between 08:00 and 21:30 local
  French time, Monday through Saturday" (transactional exempt); opt-out via a mobile
  number is "strictly forbidden", a web link is acceptable.
- General: every destination country must be enabled in Messaging Geo Permissions or
  the send fails with 21408; some countries "require additional registration or restrict
  certain sender types or use cases" (<https://www.twilio.com/docs/api/errors/21408>).
  Each country's rules live at `twilio.com/en-us/guidelines/<cc>/sms`.

## 3. Trial-account restrictions

Sources: <https://www.twilio.com/docs/usage/trials> and
<https://www.twilio.com/docs/usage/tutorials/how-to-use-your-free-trial-account>
(both fetched 2026-11-11). Twilio's trial model as currently documented differs from
the older "trial balance" model that most tutorials describe.

- **Verified recipients only**: "You can send messages and make calls only to verified
  phone numbers", up to 5 verified recipients per account, shared across Messaging,
  WhatsApp, Voice and Verify. The sign-up number is verified automatically. Sending to
  anyone else returns 21608. "Twilio removes this security restriction when you upgrade
  your account."
- **Country lock**: "SMS messages and voice calls are restricted to your sign-up
  country." Poland is listed among the countries where trials are available.
- **Template-only content**: "You must use Twilio-provided templates or message
  examples." For SMS: "Custom message bodies are not supported." The docs do not say how
  the templates are referenced from the REST API (e.g. `ContentSid`), so this note
  cannot state whether an arbitrary `Body` is rejected or rewritten on a trial.
- **Shared trial sender**: "Trial numbers are shared Twilio-owned numbers, not dedicated
  numbers assigned to your account", and they may vary by product and recipient. You
  cannot keep the trial number after upgrading.
- **No alphanumeric sender ID on trial** (see section 2).
- **Free units instead of a dollar balance**: 100 SMS, 100 WhatsApp, 75 voice minutes,
  3,000 emails, 40 Verify, 100 Lookup. Trials expire 30 days after sign-up.
- **Message prefix**: the current trial docs do not mention the "Sent from your Twilio
  trial account" watermark. The only Twilio-authored mention found is a Twilio blog post
  dated 2021-12-14 ("if you don't want your messages to say 'Sent from your Twilio trial
  account.'", <https://www.twilio.com/en-us/blog/send-quick-sms>, fetched 2026-11-11).
  Treat the prefix as part of the older trial model; under the current template-only
  model the body is not Cadence's text anyway.
- **Upgrading**: removes verified-recipient and template restrictions, makes multiple
  (purchased) numbers available, and bills usage beyond post-upgrade free units at
  standard rates. A2P 10DLC (US only) needs a paid account.

## 4. Message length limits and segmentation

Source: <https://www.twilio.com/docs/glossary/what-sms-character-limit> (fetched
2026-11-11), plus the Message resource reference.

- A single-segment SMS is 160 GSM-7 characters or 70 UCS-2 characters. Concatenated
  messages carry 153 GSM-7 or 67 UCS-2 characters per segment (the rest is the
  concatenation header).
- Twilio accepts bodies "up to 1,600 characters" (GSM-7); the UCS-2 maximum is 700. The
  page recommends staying under 320 characters.
- "Twilio bills SMS per message segment sent." `num_segments` in the response says how
  many were billed.
- Any character outside GSM-7 (emoji, curly quotes, and — relevant for Polish text —
  letters such as ą, ę, ł, ś, ż, ź, ć, ń, which are not in the GSM 03.38 basic set)
  switches the whole message to UCS-2 and drops the per-segment capacity to 70/67.
  Twilio's page names emoji, hanzi and curly quotes as examples; the Polish-letter
  consequence follows from the GSM-7 rule but is not spelled out on the page. Smart
  Encoding (a Messaging Service content setting) "detects hidden Unicode characters and
  replaces them with a similar GSM-encoded character"
  (<https://www.twilio.com/docs/messaging/services>, fetched 2026-11-11); it handles
  punctuation look-alikes, not Polish diacritics.
- **A message with a URL**: a URL is ordinary GSM-7 text, so it counts character for
  character towards the 160/153 limit; Twilio's pages do not describe any special
  segmentation for URLs. Billing is per segment as above. For Poland specifically, URL
  shorteners are prohibited and long SMS with URLs are prone to carrier blocking (section
  2), so a notification with a full `https://` link plus Polish diacritics can easily be
  2 UCS-2 segments and should be tested. Twilio Link Shortening exists but "is only
  available for use with Messaging Services" and "You must own the domain"
  (<https://www.twilio.com/docs/messaging/features/link-shortening>, fetched 2026-11-11).

## 5. Price to Poland and sender costs

- **Outbound SMS to Polish mobiles**: **$0.0457 per segment**, both from a phone number
  and from an alphanumeric sender ID; inbound SMS $0.0075 per segment; "Pricing current
  as of October 2026". A $0.001 "failed message processing fee" applies to messages that
  end in `failed`. (<https://www.twilio.com/en-us/sms/pricing/pl>, fetched 2026-11-11.)
  Per-carrier breakdown and carrier surcharges were not shown on the fetched page; the
  Pricing API `GET https://pricing.twilio.com/v1/Messaging/Countries/PL` returns
  per-carrier `outbound_sms_prices`
  (<https://www.twilio.com/docs/messaging/api/pricing>, fetched 2026-11-11).
- **Alphanumeric sender ID**: no monthly charge on the Poland SMS pricing page (listed
  as free, SMS-only).
- **Polish phone numbers (monthly)**, from Twilio's published numbers pricing CSV
  (<https://www.twilio.com/content/dam/twilio-com/pricing-data/en/csv/PMded94a0dae30eaaec0f115f22859bd38_SiteNumbersPricing.csv>,
  fetched 2026-11-11): Mobile **$4.00/month**, SMS enabled, address required; Toll Free
  $20.00/month, SMS *not* enabled. The Voice pricing page lists Local numbers at
  $2.90/month (<https://www.twilio.com/en-us/voice/pricing/pl>), but the CSV has no PL
  Local row and neither page states whether Polish local numbers are SMS-capable, so
  the only Polish number type confirmed as SMS-capable is Mobile. A standalone
  `twilio.com/en-us/phone-numbers/pricing/pl` page returned 404.
- **Regulatory bundle for a Polish number**
  (<https://www.twilio.com/en-us/guidelines/pl/regulatory>, fetched 2026-11-11): a
  business buying a Mobile number must supply a business-register excerpt (name), a
  registration number (REGON, NIP, KRS or activity register) and a power of attorney for
  the representative; the address "May be anywhere in the world". Local numbers
  additionally need an address inside the number's locality (no PO Box).
- **Rough monthly maths**: 1,000 single-segment notifications ≈ $45.70; a Polish mobile
  number adds $4.00; an alphanumeric sender adds $0.

## 6. Twilio Verify (one paragraph)

Twilio Verify is a separate API (`https://verify.twilio.com/v2/`, HTTP Basic with API key
and secret) that "enables you to add user verification to your web application": you
create a Verification Service, create a Verification for an E.164 number on a channel
(`sms`, `call`, `email`, `whatsapp`; also TOTP, passkeys, silent network auth) which sends
a one-time code, then create a Verification Check with the user's code and get `approved`
or `pending` back (<https://www.twilio.com/docs/verify/api>, fetched 2026-11-11). Pricing
is "$0.05 per successful verification plus standard channel fees"
(<https://www.twilio.com/en-us/verify/pricing>, fetched 2026-11-11; a Poland-specific
Verify page returned 404, so assume the PL SMS rate above as the channel fee). Trials get
40 free verifications, deducted only when the code is successfully checked, and Verify
recipients count against the same 5 verified numbers
(<https://www.twilio.com/docs/usage/trials>). A later Cadence version could use it to
confirm that a user owns the mobile number they entered before Cadence sends
notifications to it, without building OTP storage itself.

## What this means for Cadence

1. Transport: `POST .../Accounts/{SID}/Messages.json` with Basic auth (API key + secret), `To` in E.164, `Body` ≤ 1,600 chars; mirror the mailer with an `.outbox/` JSON fallback when `TWILIO_*` is unset.
2. Treat the create response as "accepted", not "delivered"; store `sid` and `status`, and surface 400-level `code`/`message` (20003, 21211, 21606, 21608, 21408, 21614) to the Platform Admin verbatim.
3. For Poland, prefer an alphanumeric sender (`Cadence`, ≤ 11 chars, free, no registration) via a Messaging Service; buy a Polish Mobile number ($4/mo, KRS/NIP paperwork) only if replies/STOP are needed. Never use a foreign number as the sender.
4. The one-click admin test on a trial account only works to the ≤ 5 verified numbers, in the sign-up country, with Twilio template content and a shared trial number; alphanumeric senders are paid-only. Expect 21608 and say so in the UI until the account is upgraded.
5. Budget ≈ $0.046 per segment; Polish diacritics force UCS-2 (70/67 chars per segment), so keep notifications short, avoid URL shorteners (prohibited in PL), and test any message that carries a link.
6. Verify ($0.05 + SMS fee per success) is a drop-in for a later "confirm your phone number" step; not needed for v1.
