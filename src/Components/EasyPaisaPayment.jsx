import React, { useState } from 'react';
import { CreditCard, AlertCircle } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const EasyPaisaPayment = ({ amount, onPaymentComplete, onPaymentCancel }) => {
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsProcessing(true);

    try {
      // Save order to Firebase first
      const orderData = {
        amount: amount,
        mobileNumber,
        email,
        fullName,
        address,
        postalCode,
        city,
        paymentMethod: 'EasyPaisa',
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const orderRef = await addDoc(collection(db, 'orders'), orderData);
      const orderId = orderRef.id;

      // Here you would typically make an API call to your backend
      // which would then communicate with EasyPaisa's API
      const response = await fetch('/api/easypaisa/initiate-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          mobileNumber,
          email,
          fullName,
          address,
          postalCode,
          city,
          orderId, // Include the Firebase order ID
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Call the completion callback with payment data
        onPaymentComplete && onPaymentComplete({
          success: true,
          paymentUrl: data.paymentUrl,
          orderId: orderId,
          userData: {
            fullName,
            mobileNumber,
            email,
            address,
            postalCode,
            city
          }
        });
        // Redirect to EasyPaisa payment page
        window.location.href = data.paymentUrl;
      } else {
        setError(data.message || 'Payment initiation failed');
      }
    } catch (err) {
      console.error('Error saving order:', err);
      setError('An error occurred while processing your payment');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="easypaisa-payment">
      <div className="payment-header">
        <CreditCard className="payment-icon" />
        <h2>EasyPaisa Payment</h2>
      </div>

      <form onSubmit={handleSubmit} className="payment-form">
        <div className="form-group">
          <label htmlFor="fullName">Full Name</label>
          <input
            type="text"
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="mobileNumber">Mobile Number</label>
          <input
            type="tel"
            id="mobileNumber"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            placeholder="Enter your mobile number"
            required
            pattern="[0-9]{11}"
            title="Please enter a valid 11-digit mobile number"
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="address">Address</label>
          <textarea
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter your complete address"
            required
            rows="3"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="city">City</label>
            <input
              type="text"
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Enter your city"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="postalCode">Postal Code</label>
            <input
              type="text"
              id="postalCode"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="Enter postal code"
              required
              pattern="[0-9]{5}"
              title="Please enter a valid 5-digit postal code"
            />
          </div>
        </div>

        <div className="payment-amount">
          <span>Amount to Pay:</span>
          <span className="amount">{amount} PKR</span>
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle className="error-icon" />
            <span>{error}</span>
          </div>
        )}

        <div className="payment-buttons">
          <button
            type="button"
            onClick={onPaymentCancel}
            className="btn btn-secondary"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Pay with EasyPaisa'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EasyPaisaPayment; 