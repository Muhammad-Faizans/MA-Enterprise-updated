import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { 
  Search, 
  ShoppingCart, 
  Menu, 
  X, 
  Filter, 
  Plus, 
  Minus, 
  Trash2, 
  Star, 
  Package, 
  CreditCard, 
  Check, 
  AlertCircle,
  Heart,
  User,
  LogOut
} from 'lucide-react';
import { collection, getDocs, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase';
import EasyPaisaPayment from './Components/EasyPaisaPayment';
import Login from './Components/Login';
import Signup from './Components/Signup';
import Profile from './Components/Profile';

// Custom Alert Component
const Alert = ({ isOpen, type, title, message, onConfirm, onCancel, showCancel = false }) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return <Check className="alert-icon success" />;
      case 'error': return <X className="alert-icon error" />;
      case 'warning': return <AlertCircle className="alert-icon warning" />;
      default: return <AlertCircle className="alert-icon info" />;
    }
  };

  return (
    <div className="alert-overlay">
      <div className="alert-container">
        {getIcon()}
        <h3 className="alert-title">{title}</h3>
        <p className="alert-message">{message}</p>
        <div className="alert-buttons">
          {showCancel && (
            <button onClick={onCancel} className="btn btn-secondary">
              Cancel
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`btn ${type === 'error' ? 'btn-danger' : 'btn-primary'}`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

const MAEnterprise = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [priceRange, setPriceRange] = useState([0, 1000000]);
  const [alert, setAlert] = useState({ isOpen: false, type: '', title: '', message: '' });
  const [loading, setLoading] = useState(true);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  
  // Authentication state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'

  // Initialize Firebase and fetch products
  useEffect(() => {
    const setupFirebaseAndFetchProducts = async () => {
      try {
        setLoading(true);
        
        
        // Firebase is already initialized in firebase.js
        setFirebaseReady(true);
        
        const productsCollection = collection(db, 'products');
        const snapshot = await getDocs(productsCollection);
        const productsData = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        
        setProducts(productsData);
        setLoading(false);
        
        if (productsData.length === 0) {
          showAlert('warning', 'No Products', 'No products found in the database. Please add some products to your Firestore collection.');
        }
        
      } catch (error) {
        console.error('Firebase setup error:', error);
        setLoading(false);
        setFirebaseReady(false);
        
        if (error.message.includes('Firebase configuration')) {
          showAlert('error', 'Configuration Error', 'Please update your Firebase configuration in the code with your actual Firebase project details.');
        } else {
          showAlert('error', 'Connection Error', 'Failed to connect to Firebase. Please check your configuration and internet connection.');
        }
      }
    };
    
    setupFirebaseAndFetchProducts();
  }, []);

  // Authentication state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Redirect to home if user is not logged in and trying to access product pages
  useEffect(() => {
    if (!authLoading && !user && currentPage !== 'home' && currentPage !== 'checkout' && currentPage !== 'favorites' && currentPage !== 'profile') {
      setCurrentPage('home');
    }
  }, [user, authLoading, currentPage]);

  const showAlert = (type, title, message, showCancel = false, onConfirm = () => {}) => {
    setAlert({
      isOpen: true,
      type,
      title,
      message,
      showCancel,
      onConfirm: () => {
        setAlert({ ...alert, isOpen: false });
        onConfirm();
      },
      onCancel: () => setAlert({ ...alert, isOpen: false })
    });
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    showAlert('success', 'Success!', `${product.name} added to cart`);
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity === 0) {
      removeFromCart(productId);
    } else {
      setCart(cart.map(item => 
        item.id === productId 
          ? { ...item, quantity: newQuantity }
          : item
      ));
    }
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };



  const handleCheckout = async () => {
    if (cart.length === 0) {
      showAlert('warning', 'Cart Empty', 'Please add items to cart before checkout');
      return;
    }
    if (!firebaseReady) {
      showAlert('error', 'Connection Error', 'Firebase is not connected. Please check your configuration.');
      return;
    }
    if (!user) {
      showAlert('warning', 'Authentication Required', 'Please sign in to complete your purchase.');
      handleShowAuth('login');
      return;
    }
    const order = {
      items: cart,
      total: getTotalPrice(),
      userInfo: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      },
      createdAt: new Date(),
      status: 'pending'
    };
    try {
      const orderWithTimestamp = {
        ...order,
        createdAt: serverTimestamp()
      };
      const ordersCollection = collection(db, 'orders');
      const docRef = await addDoc(ordersCollection, orderWithTimestamp);
      setCurrentOrder({
        id: docRef.id,
        ...order
      });
      setShowPayment(true);
    } catch (error) {
      console.error('Error adding order: ', error);
      showAlert('error', 'Checkout Failed', 'There was an error processing your order. Please try again.');
    }
  };

  const handlePaymentComplete = async () => {
    try {
      // Update order status in Firebase
      const orderRef = doc(db, 'orders', currentOrder.id);
      await updateDoc(orderRef, {
        status: 'paid',
        paymentMethod: 'easypaisa',
        paymentDate: serverTimestamp()
      });

      setCart([]);
      setIsCartOpen(false);
      setShowPayment(false);
      setCurrentOrder(null);
      showAlert('success', 'Payment Successful!', 'Your order has been confirmed and payment has been processed.');
      setCurrentPage('home');
    } catch (error) {
      console.error('Error updating order status:', error);
      showAlert('error', 'Payment Update Failed', 'There was an error updating your order status. Please contact support.');
    }
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
    setCurrentOrder(null);
    showAlert('warning', 'Payment Cancelled', 'Your order has been cancelled. You can try again later.');
  };

  // Authentication handlers
  const handleShowAuth = (mode = 'login') => {
    setAuthMode(mode);
    setShowAuth(true);
  };

  const handleAuthSuccess = () => {
    setShowAuth(false);
    showAlert('success', 'Welcome!', `Welcome back, ${user?.displayName || 'User'}!`);
  };

  const handleLogout = () => {
    setUser(null);
    setCart([]);
    setFavorites([]);
    setCurrentPage('home');
    showAlert('success', 'Logged Out', 'You have been successfully logged out.');
  };

  const getFilteredProducts = () => {
    let filtered = products;
    console.log('All products:', products);

    // Filter by category if not on home page
    if (currentPage !== 'home') {
      const categoryMap = {
        'mac': 'Mac',
        'laptop': 'Laptop',
        'computer': 'Computer'
      };
      
      const targetCategory = categoryMap[currentPage];
      console.log('Current page:', currentPage);
      console.log('Target category:', targetCategory);
      
      filtered = filtered.filter(product => {
        console.log('Product:', product.name, 'Category:', product.category);
        // Make the comparison case-insensitive and handle potential undefined values
        const productCategory = product.category?.toString().toLowerCase();
        const targetCategoryLower = targetCategory?.toLowerCase();
        
        // Show products that match the target category OR have category "all"
        return productCategory === targetCategoryLower || productCategory === 'all';
      });
      console.log('Filtered products after category filter:', filtered);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(product => 
        product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      console.log('Filtered products after search filter:', filtered);
    }

    // Filter by price range (only on category pages)
    if (currentPage !== 'home') {
      filtered = filtered.filter(product => {
        const price = parseFloat(product.price) || 0;
        return price >= priceRange[0] && price <= priceRange[1];
      });
      console.log('Filtered products after price filter:', filtered);
    }

    return filtered;
  };

  const toggleFavorite = (product) => {
    const isFavorite = favorites.some(fav => fav.id === product.id);
    if (isFavorite) {
      setFavorites(favorites.filter(fav => fav.id !== product.id));
      showAlert('success', 'Removed from Favorites', `${product.name} removed from favorites`);
    } else {
      setFavorites([...favorites, product]);
      showAlert('success', 'Added to Favorites', `${product.name} added to favorites`);
    }
  };

  const isFavorite = (productId) => {
    return favorites.some(fav => fav.id === productId);
  };

  const ProductCard = ({ product }) => (
    <div className="product-card">
      <div className="product-image-container">
        <img 
          src={product.image} 
          alt={product.name}
          className="product-image"
        />
        <div className="product-rating">
          <Star className="star-icon" />
          <span>{product.rating}</span>
        </div>
        <button
          onClick={() => toggleFavorite(product)}
          className={`favorite-btn ${isFavorite(product.id) ? 'active' : ''}`}
        >
          <Heart className={`heart-icon ${isFavorite(product.id) ? 'filled' : ''}`} />
        </button>
      </div>
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-description">{product.description}</p>
        <div className="product-footer">
          <span className="product-price">{product.price} pkr</span>
          <button
            onClick={() => addToCart(product)}
            className="btn btn-primary add-to-cart-btn"
          >
            <ShoppingCart className="btn-icon" />
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );

  const CartSidebar = () => (
    <div className={`cart-sidebar ${isCartOpen ? 'cart-open' : ''}`}>
      <div className="cart-content">
        <div className="cart-header">
          <h2>Shopping Cart</h2>
          <button onClick={() => setIsCartOpen(false)} className="close-btn">
            <X />
          </button>
        </div>
        
        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="empty-cart">
              <ShoppingCart className="empty-cart-icon" />
              <p>Your cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="cart-item">
                <img src={item.image} alt={item.name} className="cart-item-image" />
                <div className="cart-item-info">
                  <h4>{item.name}</h4>
                  <p className="cart-item-price">{item.price} pkr</p>
                </div>
                <div className="cart-item-controls">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="quantity-btn"
                  >
                    <Minus />
                  </button>
                  <span className="quantity">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="quantity-btn"
                  >
                    <Plus />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="remove-btn"
                  >
                    <Trash2 />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total">
              <span>Total: {getTotalPrice()} pkr</span>
            </div>
            <button
              onClick={() => setCurrentPage('checkout')}
              className="btn btn-success checkout-btn"
            >
              <CreditCard className="btn-icon" />
              Go to Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  const Header = () => (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <h1 
            className="logo"
            onClick={() => setCurrentPage('home')}
          >
            MA Enterprise
          </h1>
          
          <nav className="desktop-nav">
            <button
              onClick={() => setCurrentPage('home')}
              className={`nav-link ${currentPage === 'home' ? 'active' : ''}`}
            >
              Home
            </button>
            {user && (
              <>
                <button
                  onClick={() => setCurrentPage('mac')}
                  className={`nav-link ${currentPage === 'mac' ? 'active' : ''}`}
                >
                  Mac
                </button>
                <button
                  onClick={() => setCurrentPage('laptop')}
                  className={`nav-link ${currentPage === 'laptop' ? 'active' : ''}`}
                >
                  Laptop
                </button>
                <button
                  onClick={() => setCurrentPage('computer')}
                  className={`nav-link ${currentPage === 'computer' ? 'active' : ''}`}
                >
                  Computer
                </button>
              </>
            )}
          </nav>
        </div>

        <div className="header-right">
          {user ? (
            <>
              <button
                onClick={() => setCurrentPage('profile')}
                className="profile-btn"
              >
                <User />
                <span className="user-name">{user.displayName || 'User'}</span>
              </button>
              
              <button
                onClick={() => setIsCartOpen(true)}
                className="cart-btn"
              >
                <ShoppingCart />
                {cart.length > 0 && (
                  <span className="cart-count">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </button>
            </>
          ) : (
            <div className="auth-buttons">
              <button
                onClick={() => handleShowAuth('login')}
                className="btn btn-secondary"
              >
                Sign In
              </button>
              <button
                onClick={() => handleShowAuth('signup')}
                className="btn btn-primary"
              >
                Sign Up
              </button>
            </div>
          )}

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="mobile-menu-btn"
          >
            <Menu />
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="mobile-menu">
          <button
            onClick={() => {setCurrentPage('home'); setIsMobileMenuOpen(false);}}
            className="mobile-nav-link"
          >
            Home
          </button>
          {user && (
            <>
              <button
                onClick={() => {setCurrentPage('mac'); setIsMobileMenuOpen(false);}}
                className="mobile-nav-link"
              >
                Mac 
              </button>
              <button
                onClick={() => {setCurrentPage('laptop'); setIsMobileMenuOpen(false);}}
                className="mobile-nav-link"
              >
                Laptop 
              </button>
              <button
                onClick={() => {setCurrentPage('computer'); setIsMobileMenuOpen(false);}}
                className="mobile-nav-link"
              >
                Computer 
              </button>
              <button
                onClick={() => {setCurrentPage('profile'); setIsMobileMenuOpen(false);}}
                className="mobile-nav-link"
              >
                Profile
              </button>
              <button
                onClick={() => {handleLogout(); setIsMobileMenuOpen(false);}}
                className="mobile-nav-link logout-link"
              >
                <LogOut />
                Logout
              </button>
            </>
          )}
          {!user && (
            <>
              <button
                onClick={() => {handleShowAuth('login'); setIsMobileMenuOpen(false);}}
                className="mobile-nav-link"
              >
                Sign In
              </button>
              <button
                onClick={() => {handleShowAuth('signup'); setIsMobileMenuOpen(false);}}
                className="mobile-nav-link"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );

  const FilterSection = () => {
    if (currentPage === 'home') return null;
    
    return (
      <div className="filter-section">
        <div className="filter-header">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3>Price Filter</h3>
        </div>
        
        <div className="filter-content">
          <div className="price-filter">
            <div className="price-inputs">
              <div className="price-input-group">
                <label>Min Price (pkr)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="Min"
                  value={priceRange[0]}
                  onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                  className="price-input"
                />
              </div>
              <div className="price-input-group">
                <label>Max Price (pkr)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="Max"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 5000])}
                  className="price-input"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CheckoutPage = () => (
    <div className="checkout-page">
      <div className="checkout-container">
        <div className="checkout-header">
          <Package />
          <h1>Checkout</h1>
        </div>
        {cart.length === 0 ? (
          <div className="empty-checkout">
            <ShoppingCart className="empty-icon" />
            <h2>Your cart is empty</h2>
            <p>Add some products to your cart to proceed with checkout</p>
            <button
              onClick={() => setCurrentPage('home')}
              className="btn btn-primary"
            >
              Continue Shopping
            </button>
          </div>
        ) : showPayment ? (
          <div className="checkout-content">
            <EasyPaisaPayment
              amount={getTotalPrice()}
              onPaymentComplete={handlePaymentComplete}
              onPaymentCancel={handlePaymentCancel}
            />
          </div>
        ) : (
          <div className="checkout-content">
            <div className="order-summary">
              <h2>Order Summary</h2>
              {cart.map(item => (
                <div key={item.id} className="checkout-item">
                  <div className="checkout-item-info">
                    <img src={item.image} alt={item.name} />
                    <div>
                      <h3>{item.name}</h3>
                      <p>Quantity: {item.quantity}</p>
                    </div>
                  </div>
                  <span className="checkout-item-price">{item.price * item.quantity} pkr</span>
                </div>
              ))}
            </div>
            <div className="checkout-total">
              <div className="total-amount">
                <span>Total: {getTotalPrice()} pkr</span>
              </div>
            </div>
            <button
              onClick={handleCheckout}
              className="btn btn-success place-order-btn"
            >
              <CreditCard />
              Proceed to Payment
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const FavoritesPage = () => (
    <div className="favorites-page">
      <div className="page-header">
        <h1>My Favorites</h1>
      </div>

      {favorites.length === 0 ? (
        <div className="no-favorites">
          <Heart className="no-favorites-icon" />
          <h2>No favorites yet</h2>
          <p>Items you mark as favorite will appear here</p>
          <button
            onClick={() => setCurrentPage('home')}
            className="btn btn-primary"
          >
            Browse Products
          </button>
        </div>
      ) : (
        <div className="products-grid">
          {favorites.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );

  if (loading || authLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="spinner"></div>
          <p>Connecting</p>
          <p className="loading-subtitle">
            {loading ? 'Loading Products...' : 'Checking Authentication...'}
          </p>
        </div>
      </div>
    );
  }

  

  return (
    <div className="app">
      <Header />
      
      {isCartOpen && (
        <div 
          className="cart-overlay"
          onClick={() => setIsCartOpen(false)}
        />
      )}
      
      <CartSidebar />

      {currentPage === 'checkout' ? (
        <CheckoutPage />
      ) : currentPage === 'favorites' ? (
        <FavoritesPage />
      ) : currentPage === 'profile' ? (
        <Profile user={user} onLogout={handleLogout} />
      ) : (
        <main className="main-content">
          {!user ? (
            <div className="auth-required-section">
              <div className="auth-required-content">
                <div className="auth-required-icon">
                  <User />
                </div>
                <h1>Authentication Required</h1>
                <p>Please sign in to browse our products and start shopping</p>
                <div className="auth-required-buttons">
                  <button
                    onClick={() => handleShowAuth('login')}
                    className="btn btn-primary"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => handleShowAuth('signup')}
                    className="btn btn-secondary"
                  >
                    Create Account
                  </button>
                </div>
                <div className="auth-required-features">
                  <h3>Why create an account?</h3>
                  <ul>
                    <li>Browse our premium computer and laptop collection</li>
                    <li>Add items to your cart and save favorites</li>
                    <li>Secure checkout with EasyPaisa payment</li>
                    <li>Track your order history</li>
                    <li>Get personalized recommendations</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <>
              {currentPage === 'home' && (
                <div className="hero-section">
                  <h1>Welcome to MA Enterprise</h1>
                  <p>Your one-stop shop for premium computers and laptops</p>
                  {user && (
                    <button
                      onClick={() => setCurrentPage('mac')}
                      className="btn btn-primary hero-btn"
                    >
                      Shop Now
                    </button>
                  )}
                </div>
              )}

              <div className="page-header">
                <h1>
                  {currentPage === 'home' ? 'All Products' : `${currentPage.charAt(0).toUpperCase() + currentPage.slice(1)} Products`}
                </h1>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCurrentPage('checkout')}
                    className="btn btn-secondary checkout-header-btn"
                  >
                    <Package />
                    Checkout ({cart.reduce((sum, item) => sum + item.quantity, 0)})
                  </button>
                )}
              </div>
              {/* <FilterSection /> */}

              <div className="products-container">
                <div className="products-grid">
                  {getFilteredProducts().map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {getFilteredProducts().length === 0 && (
                  <div className="no-products">
                    <Package className="no-products-icon" />
                    <h2>No products found</h2>
                    <p>Try adjusting your search or filter criteria</p>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      )}

      {/* Authentication Modal */}
      {showAuth && (
        <div className="auth-modal-overlay">
          <div className="auth-modal">
            <button
              onClick={() => setShowAuth(false)}
              className="auth-close-btn"
            >
              <X />
            </button>
            {authMode === 'login' ? (
              <Login
                onSwitchToSignup={() => setAuthMode('signup')}
                onLoginSuccess={handleAuthSuccess}
              />
            ) : (
              <Signup
                onSwitchToLogin={() => setAuthMode('login')}
                onSignupSuccess={handleAuthSuccess}
              />
            )}
          </div>
        </div>
      )}

      <Alert
        isOpen={alert.isOpen}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        showCancel={alert.showCancel}
        onConfirm={alert.onConfirm}
        onCancel={alert.onCancel}
      />
    </div>
  );
};

export default MAEnterprise;