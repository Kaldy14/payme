# PayMe Lightweight Verified Plan

## Summary

- web-first
- iPhone Safari on NFC tap
- single friend group
- manual monthly settlement
- magic link plus optional passkey
- active batch per shelf
- Supabase-hosted Postgres with Next.js

## Core decisions

- v1 is online-only at the shelf
- each shelf is permanently bound to one product in v1
- one active batch per shelf
- month close is manual and admin-triggered
- settlement lines are either open or paid

## Domain model

- `member`
- `member_payout_account`
- `invite`
- `product`
- `shelf`
- `tag`
- `batch`
- `take_event`
- `settlement_period`
- `settlement_line`

## Ledger rules

- `unit_price_minor` is the per-item source of truth
- `purchase_total_minor` is stored for receipt reference
- all stock changes append `take_event` rows
- takes and undos run in a single database transaction
- after month close, mistakes are fixed only through compensating events in the open month

## Routes to implement

- `GET /t/[tagToken]`
- `POST /api/takes`
- `POST /api/takes/:id/undo`
- `POST /api/batches`
- `POST /api/shelves/:id/activate-batch`
- `POST /api/months/:yyyy-mm/close`
- `POST /api/settlements/:id/mark-paid`
- `GET /report/[yyyy-mm]`

## Notes

This repository currently implements the backend and project foundation first. The UI work is intentionally deferred.
