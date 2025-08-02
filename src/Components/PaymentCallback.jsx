import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, X, AlertCircle } from 'lucide-react';
import { verifyPayment } from '../api/easypaisa';

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyTransaction = async () => {
      const transactionId = searchParams.get('transactionId');
      const orderId = searchParams.get('orderId');

      if (!transactionId || !orderId) {
        setStatus('error');
        setError('Invalid payment response');
        return;
      }

      try {
        const response = await verifyPayment(transactionId);
        
        if (response.success) {
          setStatus('success');
          // Redirect to success page after 3 seconds
          setTimeout(() => {
            navigate('/payment-success', { 
              state: { 
                orderId,
                transactionId,
                amount: response.amount
              }
            });
          }, 3000);
        } else {
          setStatus('error');
          setError(response.message || 'Payment verification failed');
        }
      } catch (err) {
        setStatus('error');
        setError('Failed to verify payment status');
      }
    };

    verifyTransaction();
  }, [searchParams, navigate]);

  const getStatusContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <div className="payment-status verifying">
            <div className="spinner"></div>
            <h2>Verifying Payment</h2>
            <p>Please wait while we verify your payment...</p>
          </div>
        );
      case 'success':
        return (
          <div className="payment-status success">
            <Check className="status-icon" />
            <h2>Payment Successful!</h2>
            <p>Your payment has been processed successfully.</p>
            <p className="redirect-message">Redirecting to order confirmation...</p>
          </div>
        );
      case 'error':
        return (
          <div className="payment-status error">
            <X className="status-icon" />
            <h2>Payment Failed</h2>
            <p>{error}</p>
            <button
              onClick={() => navigate('/checkout')}
              className="btn btn-primary"
            >
              Try Again
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="payment-callback">
      {getStatusContent()}
    </div>
  );
};

export default PaymentCallback; 