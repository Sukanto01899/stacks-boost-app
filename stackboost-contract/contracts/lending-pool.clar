;; @clarity-version 3
;; ============================================
;; Stacks Boost - Lending Pool (Demo + Mock sBTC)
;; ============================================

;; ============================================
;; Error Constants
;; ============================================
(define-constant ERR_INVALID_WITHDRAW_AMOUNT (err u100))
(define-constant ERR_EXCEEDED_MAX_BORROW (err u101))
(define-constant ERR_CANNOT_BE_LIQUIDATED (err u102))
(define-constant ERR_INVALID_ORACLE (err u104))
(define-constant ERR_INVALID_SBTC_CONTRACT (err u105))
(define-constant ERR_INVALID_DEX_CONTRACT (err u106))
(define-constant ERR_UNAUTHORIZED (err u107))
(define-constant ERR_PAUSED (err u108))
(define-constant ERR_INVALID_BORROW_AMOUNT (err u109))
(define-constant ERR_INVALID_LIQUIDATION (err u110))
(define-constant ERR_INVALID_DEPOSIT_AMOUNT (err u111))
(define-constant ERR_INSUFFICIENT_LIQUIDITY (err u112))
(define-constant ERR_INVALID_PRICE (err u113))

;; ============================================
;; Protocol Constants
;; ============================================
(define-constant LTV_PERCENTAGE u70)
(define-constant INTEREST_RATE_PERCENTAGE u10)
(define-constant LIQUIDATION_THRESHOLD_PERCENTAGE u100)
(define-constant LIQUIDATION_PENALTY_PERCENTAGE u10)
(define-constant ONE_YEAR_IN_SECS u31556952)
(define-constant DEFAULT_ADMIN 'SP1G4ZDXED8XM2XJ4Q4GJ7F4PG4EJQ1KKXRCD0S3K)
(define-constant DEFAULT_SBTC_TOKEN .mock-sbtc-token-v2)

;; ============================================
;; Data Variables
;; ============================================
(define-data-var total-sbtc-collateral uint u0)
(define-data-var total-stx-deposits uint u0)
(define-data-var total-stx-borrows uint u0)
(define-data-var last-interest-accrual uint u0)
(define-data-var cumulative-yield-bips uint u0)
(define-data-var admin principal DEFAULT_ADMIN)
(define-data-var paused bool false)
(define-data-var ltv-percentage uint LTV_PERCENTAGE)
(define-data-var interest-rate-percentage uint INTEREST_RATE_PERCENTAGE)
(define-data-var liquidation-threshold-percentage uint LIQUIDATION_THRESHOLD_PERCENTAGE)
(define-data-var liquidation-penalty-percentage uint LIQUIDATION_PENALTY_PERCENTAGE)
(define-data-var sbtc-token principal DEFAULT_SBTC_TOKEN)

;; ============================================
;; Maps
;; ============================================
(define-map collateral
  { user: principal }
  { amount: uint }
)

(define-map deposits
  { user: principal }
  {
    amount: uint,
    yield-index: uint,
  }
)

(define-map borrows
  { user: principal }
  {
    amount: uint,
    last-accrued: uint,
  }
)

;; ============================================
;; Public Functions
;; ============================================
(define-public (get-sbtc-stx-price)
  (contract-call? .mock-oracle-v2 get-price)
)

(define-public (deposit-stx (amount uint))
  (let (
      (existing (map-get? deposits { user: tx-sender }))
      (deposited-stx (default-to u0 (get amount existing)))
    )
    (asserts! (is-eq (var-get paused) false) ERR_PAUSED)
    (asserts! (> amount u0) ERR_INVALID_DEPOSIT_AMOUNT)

    (unwrap-panic (accrue-interest))

    (unwrap! (stx-transfer? amount tx-sender (contract-principal)) (err u1))

    (map-set deposits
      { user: tx-sender }
      {
        amount: (+ deposited-stx amount),
        yield-index: (var-get cumulative-yield-bips)
      }
    )

    (var-set total-stx-deposits (+ (var-get total-stx-deposits) amount))

    (ok true)
  )
)

(define-public (withdraw-stx (amount uint))
  (let (
      (deposit (unwrap! (map-get? deposits { user: tx-sender }) ERR_INVALID_WITHDRAW_AMOUNT))
      (deposited-stx (get amount deposit))
      (caller tx-sender)
    )
    (asserts! (is-eq (var-get paused) false) ERR_PAUSED)
    (asserts! (> amount u0) ERR_INVALID_WITHDRAW_AMOUNT)
    (asserts! (>= deposited-stx amount) ERR_INVALID_WITHDRAW_AMOUNT)
    
    (unwrap-panic (accrue-interest))
    
    (let (
        (pending-yield (unwrap-panic (get-pending-yield tx-sender)))
        (new-amount (- deposited-stx amount))
      )
      (if (is-eq new-amount u0)
        (map-delete deposits { user: tx-sender })
        (map-set deposits
          { user: tx-sender }
          {
            amount: new-amount,
            yield-index: (var-get cumulative-yield-bips)
          }
        )
      )

      (var-set total-stx-deposits (- (var-get total-stx-deposits) amount))

      (asserts! (>= (get-contract-balance) (+ amount pending-yield)) ERR_INSUFFICIENT_LIQUIDITY)
      (unwrap!
        (as-contract (stx-transfer? (+ amount pending-yield) (contract-principal) caller))
        (err u1)
      )

      (ok true)
    )
  )
)

(define-public (borrow-stx
    (collateral-amount uint)
    (amount-stx uint)
  )
  (let (
      (existing-borrow (map-get? borrows { user: tx-sender }))
      (existing-collateral (map-get? collateral { user: tx-sender }))
      (caller tx-sender)
    )
    (asserts! (is-eq (var-get paused) false) ERR_PAUSED)
    (asserts! (> amount-stx u0) ERR_INVALID_BORROW_AMOUNT)
    (asserts!
      (or (> collateral-amount u0) (> (default-to u0 (get amount existing-collateral)) u0))
      ERR_EXCEEDED_MAX_BORROW
    )

    (unwrap-panic (accrue-interest))

    (let (
        (existing-collateral-amount (default-to u0 (get amount existing-collateral)))
        (total-collateral (+ existing-collateral-amount collateral-amount))
        (price (unwrap-panic (get-sbtc-stx-price)))
        (collateral-value total-collateral)
        (max-borrow (/ (* (* collateral-value price) (var-get ltv-percentage)) u100))
        (current-borrow (default-to u0 (get amount existing-borrow)))
        (last-accrued (default-to (get-current-time) (get last-accrued existing-borrow)))
        (interest (unwrap-panic (calculate-interest current-borrow last-accrued)))
        (new-borrow (+ (+ current-borrow interest) amount-stx))
      )
      (asserts! (> price u0) ERR_INVALID_PRICE)
      (asserts! (<= new-borrow max-borrow) ERR_EXCEEDED_MAX_BORROW)
      (asserts! (>= (get-contract-balance) amount-stx) ERR_INSUFFICIENT_LIQUIDITY)

      (if (> collateral-amount u0)
        (unwrap!
          (contract-call? .mock-sbtc-token-v2 transfer collateral-amount tx-sender (contract-principal) none)
          ERR_INVALID_SBTC_CONTRACT
        )
        true
      )

      (unwrap!
        (as-contract (stx-transfer? amount-stx (contract-principal) caller))
        (err u1)
      )

      (map-set collateral
        { user: tx-sender }
        { amount: total-collateral }
      )
      (map-set borrows
        { user: tx-sender }
        {
          amount: new-borrow,
          last-accrued: (get-current-time)
        }
      )

      (var-set total-stx-borrows (+ (var-get total-stx-borrows) amount-stx))
      (if (> collateral-amount u0)
        (var-set total-sbtc-collateral (+ (var-get total-sbtc-collateral) collateral-amount))
        true
      )

      (ok true)
    )
  )
)

(define-public (repay)
  (let (
      (borrow (unwrap! (map-get? borrows { user: tx-sender }) ERR_INVALID_WITHDRAW_AMOUNT))
      (borrowed (get amount borrow))
      (last-accrued (get last-accrued borrow))
      (collateral-entry (map-get? collateral { user: tx-sender }))
      (collateral-amount (default-to u0 (get amount collateral-entry)))
      (caller tx-sender)
    )
    (asserts! (is-eq (var-get paused) false) ERR_PAUSED)
    (asserts! (> borrowed u0) ERR_INVALID_WITHDRAW_AMOUNT)

    (let (
        (interest (unwrap-panic (calculate-interest borrowed last-accrued)))
        (total-owed (+ borrowed interest))
      )
      (unwrap! (stx-transfer? total-owed tx-sender (contract-principal)) (err u1))

      (if (> collateral-amount u0)
        (unwrap!
          (as-contract (contract-call? .mock-sbtc-token-v2 transfer collateral-amount (contract-principal) caller none))
          ERR_INVALID_SBTC_CONTRACT
        )
        true
      )

      (map-delete borrows { user: tx-sender })
      (map-delete collateral { user: tx-sender })
      (var-set total-stx-borrows (- (var-get total-stx-borrows) total-owed))
      (var-set total-sbtc-collateral (- (var-get total-sbtc-collateral) collateral-amount))

      (ok true)
    )
  )
)

(define-public (liquidate (user principal))
  (let (
      (borrow (unwrap! (map-get? borrows { user: user }) ERR_CANNOT_BE_LIQUIDATED))
      (borrowed (get amount borrow))
      (last-accrued (get last-accrued borrow))
      (collateral-entry (unwrap! (map-get? collateral { user: user }) ERR_CANNOT_BE_LIQUIDATED))
      (collateral-amount (get amount collateral-entry))
      (liquidator tx-sender)
    )
    (asserts! (is-eq (var-get paused) false) ERR_PAUSED)
    (let (
        (interest (unwrap-panic (calculate-interest borrowed last-accrued)))
      (total-owed (+ borrowed interest))
      (price (unwrap-panic (get-sbtc-stx-price)))
      (collateral-value (* collateral-amount price))
      (threshold (var-get liquidation-threshold-percentage))
      (penalty (var-get liquidation-penalty-percentage))
    )
    (asserts! (> price u0) ERR_INVALID_PRICE)
    (asserts! (>= (* total-owed u100) (* collateral-value threshold)) ERR_CANNOT_BE_LIQUIDATED)

      (let (
          (repay-amount (/ (* total-owed (- u100 penalty)) u100))
        )
        (unwrap! (stx-transfer? repay-amount tx-sender (contract-principal)) (err u1))
        (unwrap!
          (as-contract (contract-call? .mock-sbtc-token-v2 transfer collateral-amount (contract-principal) liquidator none))
          ERR_INVALID_SBTC_CONTRACT
        )

        (map-delete borrows { user: user })
        (map-delete collateral { user: user })
        (var-set total-stx-borrows (- (var-get total-stx-borrows) total-owed))
        (var-set total-sbtc-collateral (- (var-get total-sbtc-collateral) collateral-amount))

        (ok true)
      )
    )
  )
)

;; ============================================
;; Read-Only Functions
;; ============================================
(define-read-only (get-pending-yield (user principal))
  (let (
      (deposit (map-get? deposits { user: user }))
      (amount-stx (default-to u0 (get amount deposit)))
      (yield-index (default-to u0 (get yield-index deposit)))
    )
    (let (
        (delta (- (var-get cumulative-yield-bips) yield-index))
        (pending-yield (/ (* amount-stx delta) u10000))
      )
      (ok pending-yield)
    )
  )
)

(define-read-only (get-debt (user principal))
  (let (
      (borrow (map-get? borrows { user: user }))
      (amount (default-to u0 (get amount borrow)))
      (last-accrued (default-to (get-current-time) (get last-accrued borrow)))
    )
    (let (
        (interest (unwrap-panic (calculate-interest amount last-accrued)))
      )
      (ok (+ amount interest))
    )
  )
)

(define-read-only (get-collateral (user principal))
  (let (
      (entry (map-get? collateral { user: user }))
      (amount (default-to u0 (get amount entry)))
    )
    (ok amount)
  )
)

(define-read-only (get-params)
  (ok {
    ltv: (var-get ltv-percentage),
    interest: (var-get interest-rate-percentage),
    liquidation-threshold: (var-get liquidation-threshold-percentage),
    liquidation-penalty: (var-get liquidation-penalty-percentage)
  })
)

(define-read-only (get-sbtc-token)
  (ok (var-get sbtc-token))
)

;; ============================================
;; Admin Functions
;; ============================================
(define-public (set-paused (paused-value bool))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_UNAUTHORIZED)
    (var-set paused paused-value)
    (ok true)
  )
)

(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_UNAUTHORIZED)
    (var-set admin new-admin)
    (ok true)
  )
)

(define-public (set-params
    (new-ltv uint)
    (new-interest uint)
    (new-threshold uint)
    (new-penalty uint)
  )
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_UNAUTHORIZED)
    (asserts! (<= new-ltv u90) ERR_INVALID_LIQUIDATION)
    (asserts! (<= new-interest u100) ERR_INVALID_LIQUIDATION)
    (asserts! (<= new-threshold u150) ERR_INVALID_LIQUIDATION)
    (asserts! (<= new-penalty u30) ERR_INVALID_LIQUIDATION)
    (var-set ltv-percentage new-ltv)
    (var-set interest-rate-percentage new-interest)
    (var-set liquidation-threshold-percentage new-threshold)
    (var-set liquidation-penalty-percentage new-penalty)
    (ok true)
  )
)

(define-public (set-sbtc-token (new-token principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_UNAUTHORIZED)
    (var-set sbtc-token new-token)
    (ok true)
  )
)

;; ============================================
;; Private Functions
;; ============================================
(define-private (contract-principal)
  (as-contract tx-sender)
)

(define-private (get-contract-balance)
  (stx-get-balance (contract-principal))
)

(define-private (get-current-time)
  u0
)

(define-private (accrue-interest)
  (let (
      (current-time (get-current-time))
      (last-accrual (var-get last-interest-accrual))
    )
    (if (is-eq last-accrual u0)
      (begin
        (var-set last-interest-accrual current-time)
        (ok true)
      )
      (let (
          (dt (- current-time last-accrual))
        )
    (if (> dt u0)
      (let (
          (total-borrows (var-get total-stx-borrows))
          (interest-numerator (* (* total-borrows (var-get interest-rate-percentage)) dt))
          (interest-denominator (* ONE_YEAR_IN_SECS u100))
          (interest (/ interest-numerator interest-denominator))
          (total-deposits (var-get total-stx-deposits))
          (new-yield (if (> total-deposits u0) (/ (* interest u10000) total-deposits) u0))
        )
        (var-set last-interest-accrual current-time)
        (var-set total-stx-borrows (+ total-borrows interest))
        (var-set cumulative-yield-bips
          (+ (var-get cumulative-yield-bips) new-yield)
        )
        (ok true)
      )
      (ok true)
    )
      )
    )
  )
)

(define-private (calculate-interest (principal uint) (last-accrued uint))
  (let (
      (current-time (get-current-time))
      (dt (- current-time last-accrued))
    )
    (if (> dt u0)
      (let (
          (rate (var-get interest-rate-percentage))
          (numerator (* principal (* rate dt)))
          (denominator (* ONE_YEAR_IN_SECS u100))
        )
        (ok (/ numerator denominator))
      )
      (ok u0)
    )
  )
)
