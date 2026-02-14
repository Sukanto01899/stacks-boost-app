;; @clarity-version 3
;; ============================================
;; Mock Oracle Contract
;; Provides BTC/STX price data for development and testing
;; ============================================

;; ============================================
;; Error Constants
;; ============================================
(define-constant ERR_NOT_OWNER (err u100))
(define-constant ERR_ALREADY_INITIALIZED (err u101))
(define-constant ERR_NOT_UPDATER (err u102))
(define-constant ERR_NOT_INITIALIZED (err u103))

;; ============================================
;; Data Variables
;; ============================================
(define-data-var owner (optional principal) none)
(define-data-var updater (optional principal) none)
(define-data-var initialized bool false)
(define-data-var btc-stx-price uint u0)

;; ============================================
;; Public Functions
;; ============================================
(define-public (initialize (new-updater principal))
  (let (
    (current-owner (var-get owner))
    (initialized-status (var-get initialized))
  )
    ;; Set owner to tx-sender on first call if not set
    (if (is-none current-owner)
      (var-set owner (some tx-sender))
      true
    )
    
    ;; Get the owner (now guaranteed to be set)
    (let ((owner-principal (unwrap! (var-get owner) ERR_NOT_OWNER)))
      ;; Verify tx-sender equals owner
      (asserts! (is-eq tx-sender owner-principal) ERR_NOT_OWNER)
      
      ;; Check initialized is false
      (asserts! (not initialized-status) ERR_ALREADY_INITIALIZED)
      
      ;; Set updater to new-updater
      (var-set updater (some new-updater))
      
      ;; Set initialized to true
      (var-set initialized true)
      
      ;; Return success
      (ok true)
    )
  )
)

(define-public (update-price (new-price uint))
  (let (
    (initialized-status (var-get initialized))
    (current-updater (var-get updater))
  )
    ;; Verify contract is initialized
    (asserts! initialized-status ERR_NOT_INITIALIZED)
    
    ;; Verify tx-sender equals updater
    (let ((updater-principal (unwrap! current-updater ERR_NOT_UPDATER)))
      (asserts! (is-eq tx-sender updater-principal) ERR_NOT_UPDATER)
    )
    
    ;; Set btc-stx-price to new-price
    (var-set btc-stx-price new-price)
    
    ;; Return success
    (ok true)
  )
)

;; ============================================
;; Read-Only Functions
;; ============================================
(define-read-only (get-price)
  (ok (var-get btc-stx-price))
)

(define-read-only (get-updater)
  (var-get updater)
)

(define-read-only (is-initialized)
  (var-get initialized)
)

;; Clarity 3 compatible: no contract-hash? helper
