import React, { useState } from 'react';
import { signOut, updateProfile, updateEmail, updatePassword, deleteUser, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User, Mail, Lock, LogOut, Trash2, Edit3, Save, X, AlertCircle } from 'lucide-react';

const Profile = ({ user, onLogout }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      onLogout();
    } catch (error) {
      console.error('Logout error:', error);
      setError('Failed to logout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!formData.displayName.trim()) {
      setError('Display name cannot be empty');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await updateProfile(auth.currentUser, {
        displayName: formData.displayName.trim()
      });
      
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Profile update error:', error);
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!formData.email.trim()) {
      setError('Email cannot be empty');
      return;
    }

    if (!formData.currentPassword) {
      setError('Current password is required to update email');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Re-authenticate user before updating email
      const credential = EmailAuthProvider.credential(
        user.email,
        formData.currentPassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      await updateEmail(auth.currentUser, formData.email.trim());
      setSuccess('Email updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Email update error:', error);
      switch (error.code) {
        case 'auth/wrong-password':
          setError('Current password is incorrect');
          break;
        case 'auth/email-already-in-use':
          setError('Email is already in use by another account');
          break;
        case 'auth/invalid-email':
          setError('Invalid email address');
          break;
        default:
          setError('Failed to update email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('All password fields are required');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Re-authenticate user before updating password
      const credential = EmailAuthProvider.credential(
        user.email,
        formData.currentPassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      await updatePassword(auth.currentUser, formData.newPassword);
      setSuccess('Password updated successfully!');
      setIsEditing(false);
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error) {
      console.error('Password update error:', error);
      switch (error.code) {
        case 'auth/wrong-password':
          setError('Current password is incorrect');
          break;
        case 'auth/weak-password':
          setError('New password is too weak');
          break;
        default:
          setError('Failed to update password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setError('Password is required to delete account');
      return;
    }

    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Re-authenticate user before deleting account
      const credential = EmailAuthProvider.credential(
        user.email,
        deletePassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // Delete user data from Firestore
      await deleteUserData(user.uid);
      
      // Delete the user account
      await deleteUser(auth.currentUser);
      onLogout();
    } catch (error) {
      console.error('Account deletion error:', error);
      switch (error.code) {
        case 'auth/wrong-password':
          setError('Password is incorrect');
          break;
        case 'auth/requires-recent-login':
          setError('Please log out and log back in before deleting your account');
          break;
        default:
          setError('Failed to delete account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteUserData = async (userId) => {
    try {
      // Delete user's orders
      const ordersQuery = query(
        collection(db, 'orders'),
        where('userInfo.uid', '==', userId)
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      const deleteOrdersPromises = ordersSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deleteOrdersPromises);

      // You can add more collections to clean up here
      // For example: favorites, user preferences, etc.
      
      console.log('User data deleted successfully');
    } catch (error) {
      console.error('Error deleting user data:', error);
      // Don't throw error here as we still want to delete the account
    }
  };

  const handleShowDeleteConfirm = () => {
    setShowDeleteConfirm(true);
    setDeletePassword('');
    setError('');
    setSuccess('');
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeletePassword('');
    setError('');
  };

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <h2>Profile Settings</h2>
          <p>Manage your account information</p>
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle className="error-icon" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="success-message">
            <span>{success}</span>
          </div>
        )}

        <div className="profile-section">
          <div className="profile-info">
            <div className="profile-avatar">
              <User className="avatar-icon" />
            </div>
            <div className="profile-details">
              <h3>{user?.displayName || 'User'}</h3>
              <p>{user?.email}</p>
              <p className="user-id">ID: {user?.uid}</p>
            </div>
          </div>

          <div className="profile-actions">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-secondary"
              >
                <Edit3 className="btn-icon" />
                Edit Profile
              </button>
            ) : (
              <div className="edit-actions">
                <button
                  onClick={() => setIsEditing(false)}
                  className="btn btn-secondary"
                >
                  <X className="btn-icon" />
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="edit-section">
            <div className="form-group">
              <label htmlFor="displayName">Display Name</label>
              <div className="input-group">
                <User className="input-icon" />
                <input
                  type="text"
                  id="displayName"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>
              <button
                onClick={handleUpdateProfile}
                disabled={loading}
                className="btn btn-primary"
              >
                <Save className="btn-icon" />
                Update Name
              </button>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <div className="input-group">
                <Mail className="input-icon" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>
              <div className="password-requirement">
                <label htmlFor="currentPassword">Current Password (required)</label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleInputChange}
                  placeholder="Enter current password"
                  className="form-input"
                />
              </div>
              <button
                onClick={handleUpdateEmail}
                disabled={loading}
                className="btn btn-primary"
              >
                <Save className="btn-icon" />
                Update Email
              </button>
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <div className="input-group">
                <Lock className="input-icon" />
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  placeholder="Enter new password"
                  className="form-input"
                />
              </div>
              <div className="input-group">
                <Lock className="input-icon" />
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm new password"
                  className="form-input"
                />
              </div>
              <button
                onClick={handleUpdatePassword}
                disabled={loading}
                className="btn btn-primary"
              >
                <Save className="btn-icon" />
                Update Password
              </button>
            </div>
          </div>
        )}

        <div className="profile-footer">
          <button
            onClick={handleLogout}
            disabled={loading}
            className="btn btn-secondary"
          >
            <LogOut className="btn-icon" />
            Logout
          </button>

          {!showDeleteConfirm ? (
            <button
              onClick={handleShowDeleteConfirm}
              disabled={loading}
              className="btn btn-danger"
            >
              <Trash2 className="btn-icon" />
              Delete Account
            </button>
          ) : (
            <div className="delete-account-section">
              <div className="delete-warning">
                <AlertCircle className="warning-icon" />
                <h4>Delete Account</h4>
                <p>This action cannot be undone. All your data will be permanently deleted.</p>
              </div>
              <div className="delete-password-input">
                <label htmlFor="deletePassword">Enter your password to confirm:</label>
                <input
                  type="password"
                  id="deletePassword"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter your password"
                  className="form-input"
                />
              </div>
              <div className="delete-actions">
                <button
                  onClick={handleDeleteAccount}
                  disabled={loading || !deletePassword}
                  className="btn btn-danger"
                >
                  <Trash2 className="btn-icon" />
                  {loading ? 'Deleting...' : 'Permanently Delete Account'}
                </button>
                <button
                  onClick={handleCancelDelete}
                  disabled={loading}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile; 