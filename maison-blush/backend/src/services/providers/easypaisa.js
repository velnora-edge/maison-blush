/**
 * Easypaisa — SKELETON. Abhi implement nahi hai (merchant credentials aur Easypaisa ka official documentation chahiye).
 * Jab credentials mil jayen: jazzcash.js ki tarah verifyCallback likhein jo Easypaisa ki signature/hash verify kare,
 * aur isConfigured() ko env variables se jorein. Tab tak ye provider hamesha "not configured" rahega aur koi payment "paid" nahi hogi.
 */
export const easypaisa = {
  name: 'easypaisa',
  isConfigured: () => false,
  verifyCallback() { throw new Error('Easypaisa integration is not implemented yet') },
}
