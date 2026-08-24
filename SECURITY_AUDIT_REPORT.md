# Enterprise Security Audit — LuckyNova / omega-new
**Scope:** Full repository — authentication, authorization, wallet, payments, betting/game engines, admin panel, API, infrastructure, secrets, frontend.
**Audit date:** 2026-07-18
**Auditor stance:** Assume nothing is secure; every finding below was verified against the actual source, not inferred.

---

## 0. READ THIS FIRST — Active credential leak, act before anything else

The repository's git history contains **live, currently-valid credentials**, and it has a remote at `github.com/Prince04u/11luckynovaaa`. This is independent of code-quality findings below and needs to happen **today**, regardless of when the rest of this report gets addressed:

| Secret | Where | Action |
|---|---|---|
| Postgres DB password (pooled + direct) | `.env` (tracked since first commit) **and independently duplicated in `check-balance.js`, `check-bets.js`** | Rotate Supabase DB password now |
| Redis password | `.env` | Rotate now |
| Supabase `service_role` key (full DB/storage admin) | `.env` | Rotate now |
| NOWPayments API key | `.env`, and hardcoded fallback in `lib/nowpayments.ts:1` | Rotate now, remove fallback |
| Sunpays pay-in/payout API key+secret | `.env` | Rotate now |
| Telegram bot token + chat IDs | Hardcoded in `lib/telegram.ts:1-2`, duplicated in `scratch/test_telegram.js` | Revoke token in BotFather, reissue, move to env |
| JWT signing secret | Hardcoded fallback `"luckynova-super-secret-jwt-key-2026"` in `lib/auth/jwt.ts:4`, `lib/auth/session.ts:9` | Set a real `JWT_SECRET`, remove fallback, this invalidates all outstanding tokens |
| A real user's live Bearer JWT (valid until 2026-08-13) | `scratch/test_limbo_api.ts:1` | Force session invalidation for user `7c3a7401-dc94-46c2-8845-d91b08bf6985` |

**Rotating secrets is not enough** — because they were committed to git history (not just present in the working tree), anyone who ever cloned the repo, or who can view it on GitHub (confirm the repo's visibility — a 404 from the unauthenticated API doesn't prove it's private), retains the old values forever. After rotating, scrub history with `git filter-repo` or BFG Repo-Cleaner, and force-push. Delete `.env`, `check-balance.js`, `check-bets.js`, `scratch/`, `prisma/_temp_qa_admin.ts`, `test-api-wrapper.ts`, and `output.html` from the working tree and history.

---

## 1. Overall Security Score

## Overall Security: 24 / 100

This is not production-ready for real money. The two most severe issues — a forgeable JWT secret and an unauthenticated payment webhook that lets an attacker mint unlimited deposit credit for themselves — each independently constitute a complete compromise of the platform's financial integrity.

| Category | Score | Rationale |
|---|---|---|
| Authentication | 20/100 | Fake OTP (universal `123456` bypass), hardcoded JWT secret fallback, no brute-force protection anywhere, no token revocation, auth token in `localStorage` |
| Authorization | 58/100 | Genuinely well-designed, consistently-applied RBAC (`assertPermission`/`requirePermission`) — but one IDOR, a staff self-privilege-escalation path, and a redemption race pull it down |
| Database | 60/100 | No SQL injection anywhere (Prisma parameterized throughout) — but no `CHECK(balance>=0)` constraint, and DB credentials leaked twice over |
| Payments | 12/100 | NOWPayments IPN accepts forged crediting (critical, active exploit); Sunpays IPN is implemented correctly by contrast |
| Wallet | 25/100 | Bet-placement race conditions permit negative balances on 3 of 6 games; Mines/Crash cashout can double-pay; admin adjustment/approval flows are transactional and audited (good) |
| Admin Panel | 48/100 | Clean permission model and audit logging, undercut by a built-in "rig the result" tool usable after bets lock, and staff self-escalation |
| Infrastructure | 8/100 | No security headers at all (no CSP/HSTS/X-Frame-Options), secrets everywhere, no rate limiting anywhere |
| Frontend | 55/100 | Minimal XSS surface, single safe `dangerouslySetInnerHTML`; undermined by `localStorage` token storage and an unrestricted public file-upload bucket |
| API | 32/100 | No schema validation on any `route.ts` (zod only used in server actions); one endpoint fully unauthenticated; no rate limiting |
| Logging/Monitoring | 22/100 | Admin actions are audit-logged (good); password-reset OTPs are logged in plaintext to server logs instead of emailed; debug file-write left in a hot path |
| Deployment | 15/100 | Live secrets, live user tokens, and a script that creates a hardcoded-password SUPER_ADMIN are all committed to the repo |

---

## 2. Critical Findings

### CRIT-01 — NOWPayments IPN webhook lets anyone mint unlimited deposit credit
- **File:** `app/api/wallet/nowpayments-ipn/route.ts:8-37` (same gap in `app/api/wallet/payment-status/route.ts:8-43`)
- **Endpoint:** `POST /api/wallet/nowpayments-ipn` — no auth, no signature verification.
- The handler takes attacker-supplied `{ payment_id, order_id }`, asks NOWPayments for the status of `payment_id`, and if `"finished"`, credits the `DepositRequest` looked up by `order_id` — **without ever checking that NOWPayments' own record ties that `payment_id` to that `order_id`**, and without verifying an IPN signature.
- **Exploit:** Attacker pays a real, small deposit (e.g. ₹10) legitimately to get one genuine `"finished"` `payment_id`. They separately create an unpaid, large `DepositRequest` (e.g. ₹100,000) to get an `order_id`. They `POST` that real `payment_id` paired with the large `order_id` directly to the IPN endpoint. The server confirms the payment is genuinely finished (true, for the ₹10 payment) and credits the full ₹100,000 to the attacker's wallet. Repeatable indefinitely with the same one real payment against any number of orders.
- **Fix:** Check `npStatus.order_id === order_id` and `npStatus.price_amount` against the deposit's actual amount before crediting; add HMAC/IPN-secret verification (NOWPayments supports `x-nowpayments-sig`) matching the pattern already used correctly for Sunpays.

### CRIT-02 — Hardcoded JWT secret fallback enables full account takeover
- **Files:** `lib/auth/jwt.ts:4`, `lib/auth/session.ts:9`
  ```ts
  const JWT_SECRET = process.env.JWT_SECRET || "luckynova-super-secret-jwt-key-2026";
  ```
- `.env` has **no `JWT_SECRET` key at all**, so every JWT this deployment has ever issued is signed with this hardcoded, now-public string.
- **Exploit:** `jwt.sign({id: "<any-user-id>"}, "luckynova-super-secret-jwt-key-2026", {expiresIn:"30d"})` forges a valid 30-day session for any known user id — including staff/admin ids visible via CSV exports/audit logs — usable against every wallet/bet/admin endpoint that trusts `getAuthUser`.
- **Fix:** Remove the fallback; fail startup if `JWT_SECRET` is unset; rotate; pin `algorithms: ["HS256"]` on all `jwt.verify` calls.

### CRIT-03 — Wallet balance race condition permits betting beyond funds (double-spend)
- **Files:** `app/api/wingo/[mode]/bet/route.ts:81-106`, `app/api/k3/[mode]/bet/route.ts:123-147`, `lib/actions/fived.ts:64-88`
- Balance is checked via a separate `SELECT` (`wallet.balance < amount`), then debited via raw SQL `UPDATE "Wallet" SET balance = balance - ${amount} WHERE "userId" = ...` with **no `AND balance >= amount` guard**, no post-write negative check, and no DB `CHECK` constraint.
- **Exploit:** Fire two (or more) concurrent bet requests for an amount close to the wallet's balance. Both pass the stale pre-check, both `UPDATE`s apply, wallet balance goes negative while both bets remain live — free stake beyond what the user funded, on Wingo, K3, and 5D specifically (Dice/Limbo/Mines use a safer shared `debitBet` helper that correctly rejects negative results).
- **Fix:** Add `AND balance >= ${amount}` to the `UPDATE` and check the returned row count before inserting the bet; or route these three games through the existing `lib/games/wallet.ts` `debitBet` helper.

### CRIT-04 — Insecure `Math.random()` RNG determines real-money outcomes (K3, 5D, Limbo)
- **Files:** `lib/k3/rounds.ts:99`, `lib/fived/rounds.ts:69`, `app/api/limbo/play/route.ts:33`
- `Math.random()` (V8 xorshift128+) is not cryptographically secure and its state is recoverable from a handful of observed outputs (publicly documented technique), after which all future outputs become predictable. Results are public/broadcast, giving an attacker the observation stream needed.
- Contrast: Wingo, Mines, and Dice in the *same repo* correctly use `crypto.randomInt`/`randomBytes` — this is an isolated regression in 3 of 6 games, not a project-wide design choice.
- **Exploit:** Observe a sequence of K3/5D/Limbo results, reconstruct PRNG state, predict the next round, bet the maximum on the predicted outcome (K3 triple ≈207x, Limbo up to 1000x).
- **Fix:** Replace all three `Math.random()` call sites with `crypto.randomInt`.

### CRIT-05 — Mines/Crash cashout can be double-paid (race condition)
- **Files:** `app/api/mines/cashout/route.ts:32-48`, `app/api/mines/reveal/route.ts:73-114`, `lib/actions/games.ts:158-284`
- The active-game read (`findFirst`) and the state-transition `update` are separate statements with no atomic conditional guard (`updateMany({where:{id,status:"ACTIVE"}})` + count check), unlike the correct pattern already used in Wingo/K3/5D settlement (`lib/wingo/settle.ts:264-268`).
- **Exploit:** Fire two parallel cashout requests for the same active game; both can pass the `status === "ACTIVE"` check before either commits, producing two payout ledger entries for one game.
- **Fix:** Mirror the round-settlement pattern: `updateMany` conditioned on current status, only credit if exactly one row was updated.

### CRIT-06 — OTP verification is a hardcoded universal-bypass stub, live in production
- **Files:** `app/api/auth/send-otp/route.ts:1-14`, `app/api/auth/verify-otp/route.ts:5-6`
  ```ts
  if (code === "123456" || code === 123456) { /* always succeeds */ }
  ```
- No SMS is ever sent; no `NODE_ENV` gate. Anyone can "verify" any phone number with `123456`.
- **Fix:** Generate a real `crypto.randomInt` OTP, store hashed with TTL + attempt counter in Redis (the correct pattern already exists for password-reset OTP — reuse it), remove the hardcoded acceptance, gate any dev mock behind `NODE_ENV !== "production"`.

### CRIT-07 — Live secrets, a live user session, and a live SUPER_ADMIN-creation script are committed to the repo
- `lib/telegram.ts:1-2` — hardcoded bot token + chat IDs (not env), duplicated in `scratch/test_telegram.js`.
- `check-balance.js:2`, `check-bets.js:2` — a second, independent hardcoded copy of the full production DB connection string.
- `scratch/test_limbo_api.ts:1` — a real user's Bearer JWT, valid until 2026-08-13 as of this audit.
- `prisma/_temp_qa_admin.ts` — creates/promotes a `SUPER_ADMIN` account with hardcoded phone `8000000001` / password `TempAdmin_9911`, runs against `process.env.DATABASE_URL` (i.e., prod) with zero environment guard, logs the plaintext password to console.
- **Fix:** Delete all of the above from the working tree and git history (see §0); scrub history; rotate everything.

### CRIT-08 — Guest-account signup bonus can be farmed for real wallet balance
- **File:** `lib/actions/auth.ts:171-206` `continueAsGuestAction()`
- Creates a new user + wallet + `WELCOME_BONUS` ledger credit on every invocation, with a random guest identity, no CAPTCHA, no IP/device throttling.
- **Exploit:** Script the guest-signup action in a loop to mint unlimited accounts, each pre-funded with real wallet balance, then wager/attempt withdrawal on each (subject to KYC on withdrawal, but still a direct bonus-abuse and potential money-laundering vector).
- **Fix:** Rate-limit by IP/device fingerprint, add CAPTCHA, and/or gate the bonus behind a verified first deposit.

---

## 3. High Findings

| ID | Finding | File(s) |
|---|---|---|
| H-01 | No brute-force/rate limiting on user login, admin login, OTP, bet placement, or withdrawal — Redis is available and used elsewhere but never for throttling | `app/api/auth/login/route.ts`, `lib/actions/admin.ts:37-65`, bet/withdraw routes |
| H-02 | IDOR: any authenticated user can fetch any other user's deposit-proof screenshot (bank/UPI/ID details) — no ownership check | `app/api/wallet/deposits/[id]/proof/route.ts:15-23` |
| H-03 | Deposit-proof upload has no MIME/extension/size whitelist, stored in a **public** Supabase bucket with attacker-controlled `Content-Type` → stored-XSS/phishing vector via a trusted `*.supabase.co` URL | `app/api/wallet/deposit/proof/route.ts:19-21`, `lib/storage/supabase.ts:30-65` |
| H-04 | Auth token stored in `localStorage` (parallel to the correctly httpOnly-cookied session) — any future XSS fully compromises the account | `lib/auth.js:4-29` |
| H-05 | Logout and password-reset never revoke previously issued Bearer JWTs — a captured token stays valid up to 30 days regardless | `lib/auth/session.ts:44-65`, `lib/actions/auth.ts:252-289` |
| H-06 | Registration via the JSON API accepts 1-character passwords; the parallel server-action path enforces `min(8)` — two divergent implementations of the same operation | `app/api/auth/register/route.ts:14` vs `lib/actions/auth.ts:24` |
| H-07 | Withdrawal payout amount computed with floating-point math (`Math.round(amount * 0.95 * 100) / 100`) — systematic real-money rounding drift on every payout | `lib/actions/admin.ts:370,457` |
| H-08 | Admin "force result" tool can override a round's outcome up to round-*end* rather than bet-*lock*, i.e. after the stake distribution is fully known — combined with no player-verifiable provably-fair scheme (`lib/provablyFair.js` is unused dead code), any compromised/malicious staff credential converts into invisible, deterministic game rigging | `lib/actions/admin.ts:579-636`, `lib/actions/gameAdmin.ts:23-135`, `app/admin/(dashboard)/results/LiveControl.tsx` |
| H-09 | Gift-code redemption cap (`maxRedemptions`) is enforced via a stale pre-check + unconditional increment on the mobile API path — exceedable under concurrent redemption, unlike the correctly atomic server-action twin | `app/api/gifts/redeem/route.ts:36,64-101` vs `lib/actions/rewards.ts:130-134` |
| H-10 | No security headers configured anywhere — no CSP, HSTS, X-Frame-Options, or Referrer-Policy | `next.config.ts`, `vercel.json` |
| H-11 | Password-reset OTP is only ever `console.log`'d (never emailed), since `RESEND_API_KEY` is empty in the current `.env` — real reset codes leak into server logs and the feature is silently non-functional for users | `lib/mailer.ts:8-12` |
| H-12 | No schema validation (zod) on any `app/api/**/route.ts` handler — only server actions use zod; ad-hoc `if (!x)` checks are inconsistent and easy to regress | repo-wide, 71 route files |

---

## 4. Medium Findings

| ID | Finding | File(s) |
|---|---|---|
| M-01 | Sunpays signature comparison uses `===` instead of `crypto.timingSafeEqual` | `lib/sunpays.ts:7-10` |
| M-02 | `payment-status` polling endpoint is unauthenticated — leaks deposit status/amount and can trigger the credit side-effect for any known deposit id | `app/api/wallet/payment-status/route.ts:8-14` |
| M-03 | Dead-but-dangerous `requestWithdrawAction` performs a check-then-act balance read with no decrement/transaction at all — currently unused, but a landmine if wired up later without re-audit | `lib/actions/wallet.ts:202-220` |
| M-04 | No max-bet cap on Wingo/K3 (every other game has one) — compounds CRIT-03 | `app/api/wingo/[mode]/bet/route.ts:47`, `app/api/k3/[mode]/bet/route.ts:55` |
| M-05 | `/api/cron/settle-rounds` fails **open** (no auth) if `CRON_SECRET` is unset, rather than failing closed | `app/api/cron/settle-rounds/route.ts:24-30` |
| M-06 | Hardcoded absolute dev-machine path written to on every single Wingo bet in production code | `app/api/wingo/[mode]/bet/route.ts:111-118` |
| M-07 | A `staff.manage` permission holder can grant themselves (or any staff) every other permission in the catalog, including re-granting `staff.manage` — no protection against self-escalation | `lib/actions/staff.ts:76-98` |
| M-08 | CSV exports have no formula-injection neutralization — a user-controlled `displayName`/agent name beginning with `=`/`+`/`-`/`@` executes as a formula when an admin opens the export in Excel/Sheets | `app/api/admin/*/export/route.ts`, `lib/csv.ts` |
| M-09 | Telegram admin notifications interpolate unescaped IPN-sourced fields (`txid`, order id) into `parse_mode: "HTML"` messages — malformed/crafted values can break or spoof formatting in the admin ops channel | `lib/telegram.ts:81-110` |
| M-10 | Two independent implementations of register/login (API route vs. server action) with drifting validation/rate-limiting — a fix applied to one is easily forgotten in the other (already the root cause of H-06) | `app/api/auth/*`, `lib/actions/auth.ts` |
| M-11 | `jwt.verify` calls don't pin `algorithms: ["HS256"]` — no current exploit path, but removes a defense-in-depth guard against future algorithm-confusion regressions | `lib/auth/jwt.ts`, `lib/auth/session.ts` |
| M-12 | Weak hardcoded fallback admin seed password (`z0MkT3A_Ag6x`) used if `ADMIN_PASSWORD` is unset when seeding | `prisma/seed.ts:18-19` |

---

## 5. Low Findings

| ID | Finding | File(s) |
|---|---|---|
| L-01 | JWT-fallback cookie always gets a 30-day `maxAge` regardless of "remember me," silently extending the effective session lifetime past the intended 1-day default | `lib/auth/session.ts`, `app/api/auth/login/route.ts:34-51` |
| L-02 | `mobile.includes("@")` used as the sole email/phone discriminator on API routes with no upstream format validation (Prisma still prevents injection; consistency-only issue) | `app/api/auth/login/route.ts:16-18`, `register/route.ts:18-21` |
| L-03 | Hardcoded `mongodb://localhost:27017/...` fallback URI (low risk — points at localhost) but continues the `process.env.X || "hardcoded"` anti-pattern seen throughout the codebase | `scripts/migrate.ts:6` |
| L-04 | Repo clutter that should never have been committed: `output.html` (0 bytes), `fix.js`, `test-api-wrapper.ts`, entire `scratch/` directory | root, `scratch/` |

---

## 6. OWASP Top 10 (2021) Mapping

| Category | Status | Evidence |
|---|---|---|
| A01 Broken Access Control | **Fail** | H-02 (IDOR), M-07 (self-escalation), H-09 (race on redemption cap) |
| A02 Cryptographic Failures | **Fail** | CRIT-02 (hardcoded JWT secret), CRIT-04 (insecure RNG), M-01 (non-constant-time compare) |
| A03 Injection | **Pass** | No SQL injection found — all `$queryRaw` usage is tagged-template parameterized; no `$queryRawUnsafe` anywhere |
| A04 Insecure Design | **Fail** | CRIT-01 (webhook trust model), H-08 (result-override tool with no provably-fair counterweight), CRIT-03/05 (missing atomic guards by design) |
| A05 Security Misconfiguration | **Fail** | H-10 (no security headers), M-05 (cron fails open) |
| A06 Vulnerable/Outdated Components | Not assessed this pass | Recommend `npm audit` / Snyk as a follow-up |
| A07 Identification & Auth Failures | **Fail** | CRIT-06 (fake OTP), H-01 (no brute-force protection), H-04/H-05 (token storage/revocation) |
| A08 Software/Data Integrity Failures | **Fail** | CRIT-01 (unsigned webhook trusted for financial crediting) |
| A09 Security Logging & Monitoring Failures | **Fail** | H-11 (secrets in logs), but admin actions are audit-logged — partial credit |
| A10 SSRF | **Pass** | No user-controlled URL fetch found on the server side in the areas reviewed |

---

## 7. Business-Logic Exploit Summary ("Can money be created?")

| Question | Answer |
|---|---|
| Can money be generated from nothing? | **Yes** — CRIT-01 (NOWPayments IPR replay) |
| Can balances go negative / bets exceed funds? | **Yes** — CRIT-03 |
| Can a single win be paid out twice? | **Yes** — CRIT-05 (Mines/Crash) |
| Can results be predicted? | **Yes** — CRIT-04 (K3/5D/Limbo `Math.random()`) |
| Can an insider rig a result after seeing all bets? | **Yes, by design** — H-08 |
| Can accounts be farmed for signup bonus? | **Yes** — CRIT-08 |
| Can a promo code be over-redeemed past its cap? | **Yes** — H-09 |
| Can an attacker impersonate any user/admin? | **Yes** — CRIT-02, if the JWT secret was ever unset or is now exploited since it's public |
| Can withdrawal amounts be tampered with client-side? | **No** — server re-validates against DB in the correct path (`withdraw/request/route.ts`) |
| Is there SQL injection anywhere? | **No** |

---

## 8. What Is Already Done Well (do not regress these)

- **RBAC design** (`lib/admin/permissions.ts`) — a clean, data-driven permission catalog consistently enforced via `requirePermission`/`assertPermission` on every admin page and server action reviewed; no page relies on client-side-only hiding.
- **Round settlement idempotency** for Wingo/K3/5D — unique `(mode, roundNumber)` constraint + Redis lock + `updateMany`-with-count-check before crediting. This is the correct pattern; CRIT-05 exists precisely because Mines/Crash don't use it.
- **Sunpays IPN handlers** correctly verify HMAC signatures and re-check status inside the transaction — the template CRIT-01 should be made to match.
- **Bet-locking timing** — round lock/end times are computed server-side everywhere; no client-supplied timestamp is ever trusted for locking bets.
- **Password hashing** — bcrypt, cost factor 10, timing-safe compare.
- **User-enumeration protections** — generic error messages on login and password-reset-request.
- **Money stored as integer** (`Wallet.balance: Int`) — no floating-point drift in the core ledger (only the payout-fee calc in H-07 uses floats).
- **`debitBet` helper** (`lib/games/wallet.ts`) used by Dice/Limbo/Mines/Wheel correctly performs an atomic decrement-then-check-negative-then-rollback — the pattern CRIT-03 needs applied to Wingo/K3/5D.

---

## 9. Fix Plan

| Priority | ID | Fix | Est. Time | Risk of fix |
|---|---|---|---|---|
| P0 | §0 | Rotate all leaked credentials; scrub git history; delete `scratch/`, `check-*.js`, `prisma/_temp_qa_admin.ts` | 2-4h | Low |
| P0 | CRIT-01 | Verify `order_id`/amount match in NOWPayments IPN + add signature check | 2-3h | Low |
| P0 | CRIT-02 | Remove JWT secret fallback, require env var, rotate secret | 1h | Medium (invalidates all sessions — plan a deploy window) |
| P0 | CRIT-03 | Add `AND balance >= amount` guard + row-count check to Wingo/K3/5D bet debit | 3-4h | Low |
| P0 | CRIT-04 | Swap `Math.random()` → `crypto.randomInt` in K3/5D/Limbo | 1h | Low |
| P0 | CRIT-05 | Atomic conditional update for Mines/Crash cashout & reveal | 3-4h | Low |
| P0 | CRIT-06 | Implement real OTP generation/storage/verification; gate mock behind non-prod | 4-6h | Low |
| P0 | CRIT-08 | Rate-limit/CAPTCHA guest signup and bonus grant | 2-3h | Low |
| P1 | H-01 | Redis-backed rate limiting on login/OTP/bet/withdraw | 4-6h | Low |
| P1 | H-02 | Add ownership check to deposit-proof route | 15m | None |
| P1 | H-03 | Whitelist MIME/size on deposit-proof upload (reuse `lib/actions/cms.ts` pattern) | 1h | Low |
| P1 | H-04/H-05 | Drop `localStorage` token or add server-side revocation (session-version claim) | 4-8h | Medium |
| P1 | H-08 | Restrict result-override to pre-bet state only; wire up `lib/provablyFair.js` commit-reveal | 1-2d | Medium (product decision) |
| P1 | H-09 | Atomic conditional update on gift-code redemption count | 1h | Low |
| P1 | H-10 | Add CSP/HSTS/X-Frame-Options/Referrer-Policy headers | 1-2h | Low |
| P1 | H-11 | Configure a real transactional email provider (Resend key) | 30m | None |
| P2 | H-06, M-10 | Unify duplicate register/login implementations behind one zod-validated function | 4-6h | Low |
| P2 | H-07 | Integer-safe payout fee math | 30m | None |
| P2 | H-12 | Add zod schemas to all API routes | 1-2d | Low |
| P2 | M-01..M-12 | Timing-safe compare, unauthenticated status endpoint, dead-code removal, max-bet caps, cron fail-closed, remove debug file write, self-escalation guard, CSV formula-escaping, Telegram HTML-escaping | 1-2d total | Low |
| P3 | L-01..L-04 | Cookie maxAge consistency, input format validation, remove hardcoded fallback URIs, repo cleanup | half day | Low |

---

## 10. Immediate Action Checklist

1. Rotate every credential listed in §0, today.
2. Scrub git history of `.env`, `check-*.js`, `scratch/test_telegram.js`, `scratch/test_limbo_api.ts`, `prisma/_temp_qa_admin.ts`.
3. Force-invalidate all existing sessions once the JWT secret is rotated (expected side effect, not a bug).
4. Patch CRIT-01 (NOWPayments IPN) before allowing any further real deposits.
5. Patch CRIT-03/CRIT-05 (wallet races) before allowing further real-money betting.
6. Replace `Math.random()` in K3/5D/Limbo (CRIT-04) before those games process more bets.
7. Only after the above: proceed to the P1/P2/P3 items.

No code changes have been made as part of this audit. Awaiting approval before implementing fixes.
