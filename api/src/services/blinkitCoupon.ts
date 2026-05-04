/**
 * BlinkitCouponService stub.
 * Real integration TBD — contact Blinkit platform team for API shape.
 * This stub logs the coupon issuance and resolves successfully.
 */

export interface IssueCouponResult {
  success: boolean;
  externalCouponId?: string;
}

export const BlinkitCouponService = {
  /**
   * Issues a coupon to a user on Blinkit's platform.
   * @param userId   - Blinkit user identifier
   * @param couponCode - The generated coupon code (e.g. "XFORCE-AB12CD34")
   */
  async issueCoupon(
    userId: string,
    couponCode: string
  ): Promise<IssueCouponResult> {
    // TODO: Replace with real Blinkit Coupon API call.
    // Example shape (pending Blinkit platform team confirmation):
    // const response = await fetch(`${process.env.BLINKIT_API_URL}/coupons/issue`, {
    //   method: "POST",
    //   headers: {
    //     "Authorization": `Bearer ${process.env.BLINKIT_API_KEY}`,
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({ userId, couponCode, type: "xforce_free_can" }),
    // });
    // return response.json();

    console.info(
      `[BlinkitCouponService] STUB: Issuing coupon ${couponCode} for user ${userId}`
    );
    return { success: true };
  },
};
