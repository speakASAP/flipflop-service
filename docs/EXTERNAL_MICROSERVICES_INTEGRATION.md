# External Microservices Integration

## Notifications Integration

- Flipflop uses `NOTIFICATION_SERVICE_URL` to call `notifications-microservice` for outbound notification delivery.
- Active email identity target is AWS SES via notifications channel/provider routing.
- Flipflop send path is migrated away from SendGrid identity; SendGrid is not the active Flipflop email target.
- No sender credentials are stored in this repository; runtime values are sourced from Vault-backed environment variables.

## Contract Notes

- Caller services should provide purpose-aware payloads so notifications can apply channel policy.
- `channelKey` can be provided when a specific registry channel must be selected.
- If `channelKey` is omitted, notifications applies backward-compatible default sender resolution.
