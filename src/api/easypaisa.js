// EasyPaisa API Integration
const EASYPAISA_API_URL = process.env.REACT_APP_EASYPAISA_API_URL;
const EASYPAISA_MERCHANT_ID = process.env.REACT_APP_EASYPAISA_MERCHANT_ID;
const EASYPAISA_SECRET_KEY = process.env.REACT_APP_EASYPAISA_SECRET_KEY;

export const initiatePayment = async (paymentData) => {
  try {
    const response = await fetch(`${EASYPAISA_API_URL}/initiate-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EASYPAISA_SECRET_KEY}`,
      },
      body: JSON.stringify({
        merchantId: EASYPAISA_MERCHANT_ID,
        amount: paymentData.amount,
        mobileNumber: paymentData.mobileNumber,
        email: paymentData.email,
        orderId: paymentData.orderId,
        callbackUrl: `${window.location.origin}/payment-callback`,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('EasyPaisa payment initiation error:', error);
    throw new Error('Failed to initiate payment');
  }
};

export const verifyPayment = async (transactionId) => {
  try {
    const response = await fetch(`${EASYPAISA_API_URL}/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EASYPAISA_SECRET_KEY}`,
      },
      body: JSON.stringify({
        merchantId: EASYPAISA_MERCHANT_ID,
        transactionId,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('EasyPaisa payment verification error:', error);
    throw new Error('Failed to verify payment');
  }
}; 