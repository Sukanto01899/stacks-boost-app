;; @clarity-version 3
;; ============================================
;; Dummy sBTC Deposit (Testnet/Mainnet demo only)
;; ============================================

(define-constant ERR_UNAUTHORIZED (err u100))
(define-constant ERR_ALREADY_INITIALIZED (err u101))
(define-constant INITIAL_SUPPLY u10000000000000)

(define-data-var admin principal tx-sender)
(define-data-var initialized bool false)

(define-fungible-token sbtc)

(define-read-only (get-name)
  (ok "Dummy sBTC")
)

(define-read-only (get-symbol)
  (ok "sBTC")
)

(define-read-only (get-decimals)
  (ok u8)
)

(define-read-only (get-total-supply)
  (ok (ft-get-supply sbtc))
)

(define-read-only (get-balance (who principal))
  (ok (ft-get-balance sbtc who))
)

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (is-eq sender tx-sender) ERR_UNAUTHORIZED)
    (try! (ft-transfer? sbtc amount sender recipient))
    (ok true)
  )
)

(define-public (mint (amount uint) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_UNAUTHORIZED)
    (try! (ft-mint? sbtc amount recipient))
    (ok true)
  )
)

(define-public (init-supply)
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_UNAUTHORIZED)
    (asserts! (not (var-get initialized)) ERR_ALREADY_INITIALIZED)
    (var-set initialized true)
    (try! (ft-mint? sbtc INITIAL_SUPPLY (var-get admin)))
    (ok true)
  )
)

(define-public (burn (amount uint) (owner principal))
  (begin
    (asserts! (is-eq tx-sender owner) ERR_UNAUTHORIZED)
    (try! (ft-burn? sbtc amount owner))
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
