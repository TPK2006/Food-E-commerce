document.addEventListener('DOMContentLoaded', () => {
  const homeView = document.getElementById('homeView');
  const menuView = document.getElementById('menuView');
  const restaurantGrid = document.getElementById('restaurantGrid');
  const dishesGrid = document.getElementById('dishesGrid');
  const searchResults = document.getElementById('searchResults');
  const searchFoodResults = document.getElementById('searchFoodResults');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const cartBadge = document.getElementById('cartBadge');
  const searchInput = document.getElementById('searchInput');
  const homeBtn = document.getElementById('homeBtn');
  const cartBtn = document.getElementById('cartBtn');
  const menuItemsContainer = document.getElementById('menuItemsContainer');
  const categoryContainer = document.getElementById('categoryContainer');
  const restaurantName = document.getElementById('restaurantName');
  const restaurantCategory = document.getElementById('restaurantCategory');
  const logoutBtn = document.getElementById('logoutBtn');
  const backToRestaurantsBtn = document.getElementById('backToRestaurantsBtn');
  const addressBtn = document.getElementById('addressBtn');
  const addressModal = document.getElementById('addressModal');
  const closeModal = addressModal.querySelector('.close');
  const addressForm = document.getElementById('addressForm');
  const addressInput = document.getElementById('addressInput');
  const useCurrentLocationBtn = document.getElementById('useCurrentLocation');
  const addressList = document.getElementById('addressList');
  const currentLocationDisplay = document.getElementById('currentLocation');
  const foodItemDetails = document.getElementById('foodItemDetails');

  const updateAddressModal = document.getElementById('updateAddressModal');
  const updateAddressForm = document.getElementById('updateAddressForm');
  const updateAddressInput = document.getElementById('updateAddressInput');
  const closeUpdateModal = updateAddressModal.querySelector('.close');

  let menuItems = [];
  let userAddresses = [];
  let currentAddressIndex = -1;
  let currentRestaurantId = null;

  // Check if user is logged in
  const userToken = localStorage.getItem('userToken');
  if (!userToken) {
    window.location.href = 'user_auth.html';
  } else {
    showHomeView();
    fetchUserProfile();
    getCurrentLocation();
    updateCartBadge();
  }

  function showHomeView() {
    homeView.classList.remove('hidden');
    menuView.classList.add('hidden');
    fetchRestaurants();
  }

  function showMenuView(ownerId) {
    homeView.classList.add('hidden');
    menuView.classList.remove('hidden');
    currentRestaurantId = ownerId;
    fetchMenuItems(ownerId);
    fetchRestaurantDetails(ownerId);
  }

  async function fetchUserProfile() {
    try {
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });
      if (response.ok) {
        const user = await response.json();
        document.getElementById('userName').textContent = user.fullName;
      } else {
        console.error('Failed to fetch user profile');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async function fetchRestaurants() {
    try {
      const response = await fetch('/api/restaurants', {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });
      if (response.ok) {
        const restaurants = await response.json();
        renderRestaurants(restaurants);
      } else {
        console.error('Failed to fetch restaurants');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  function renderRestaurants(restaurants) {
    restaurantGrid.innerHTML = restaurants.map(restaurant => `
      <div class="card" data-owner-id="${restaurant._id}">
        <div class="card-header">
          <h3 class="card-title">${restaurant.restaurantName}</h3>
          <p class="card-description">${restaurant.category || 'Various Cuisines'}</p>
        </div>
        <div class="card-content">
          <img src="${restaurant.restaurantLogo || '/placeholder.svg?height=200&width=200'}" alt="${restaurant.restaurantName}" class="card-image">
          <div class="card-footer">
            <div class="rating">
              <span class="star-icon">⭐</span>
              <span>4.5</span>
            </div>
            <span>30-40 min</span>
          </div>
          <p class="distance">📍 ${restaurant.distance} km away</p>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.card').forEach(card => {
      card.addEventListener('click', () => {
        const ownerId = card.dataset.ownerId;
        showMenuView(ownerId);
      });
    });
  }

  async function fetchMenuItems(ownerId) {
    try {
      const response = await fetch(`/api/restaurant/${ownerId}/menu`);
      if (response.ok) {
        menuItems = await response.json();
        const categories = ['all', ...new Set(menuItems.map(item => item.type))];
        renderCategories(categories);
        renderMenuItems('all');
      } else {
        console.error('Failed to fetch menu items');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async function fetchRestaurantDetails(ownerId) {
    try {
      const response = await fetch(`/api/restaurant/${ownerId}`);
      if (response.ok) {
        const restaurant = await response.json();
        restaurantName.textContent = restaurant.restaurantName;
        restaurantCategory.textContent = restaurant.category;
      } else {
        console.error('Failed to fetch restaurant details');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  function renderCategories(categories) {
    categoryContainer.innerHTML = categories.map(category => `
      <button class="category-btn" data-category="${category}">${category.charAt(0).toUpperCase() + category.slice(1)}</button>
    `).join('');

    document.querySelectorAll('.category-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderMenuItems(btn.dataset.category);
      });
    });

    // Set the first category (All) as active by default
    document.querySelector('.category-btn').classList.add('active');
  }

  function renderMenuItems(category) {
    const filteredItems = category === 'all'
      ? menuItems
      : menuItems.filter(item => item.type.toLowerCase() === category.toLowerCase());

    menuItemsContainer.innerHTML = filteredItems.map(item => `
      <div class="menu-item" data-id="${item._id}">
        <img src="${item.imagePath || '/placeholder.svg?height=200&width=200'}" alt="${item.name}" class="menu-item-image">
        <div class="menu-item-details">
          <h4 class="menu-item-name">${item.name}</h4>
          <p class="menu-item-description">${item.description || 'No description available'}</p>
          <div class="menu-item-footer">
            <span class="menu-item-price">₹${item.price.toFixed(2)}</span>
          </div>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', showFoodItemDetails);
    });
  }

  async function showFoodItemDetails(event) {
    const itemId = event.currentTarget.dataset.id;
    try {
      const response = await fetch(`/api/menu-item/${itemId}`);
      if (response.ok) {
        const item = await response.json();
        foodItemDetails.innerHTML = `
          <div class="food-item-header">
            <h3>${item.name}</h3>
            <button class="close-details">&times;</button>
          </div>
          <img src="${item.imagePath || '/placeholder.svg?height=300&width=300'}" alt="${item.name}" class="food-item-image">
          <p class="food-item-description">${item.description}</p>
          <p class="food-item-price">Base Price: ₹<span id="basePrice">${item.price.toFixed(2)}</span></p>
          <p class="food-item-total-price">Total Price: ₹<span id="totalPrice">${item.price.toFixed(2)}</span></p>
          <p class="food-item-prep-time">Estimated Preparation Time: ${item.estimatedPreparationTime} minutes</p>
          ${item.sizes.length > 0 ? `
            <div class="size-options">
              <h4>Available Sizes:</h4>
              ${item.sizes.map(size => `
                <label>
                  <input type="radio" name="size" value="${size.name}" data-price="${size.price}">
                  ${size.name} (+₹${size.price.toFixed(2)})
                </label>
              `).join('')}
            </div>
          ` : ''}
          ${item.toppings.length > 0 ? `
            <div class="topping-options">
              <h4>Topping Options:</h4>
              ${item.toppings.map(topping => `
                <label>
                  <input type="checkbox" name="topping" value="${topping.name}" data-price="${topping.price}">
                  ${topping.name} (+₹${topping.price.toFixed(2)})
                </label>
              `).join('')}
            </div>
          ` : ''}
          <div class="ratings-reviews">
            <h4>Ratings and Reviews:</h4>
            <p>Average Rating: ${calculateAverageRating(item.ratings)}</p>
            <ul>
              ${item.reviews.map(review => `
                <li>${review.text} - Rating: ${review.rating}</li>
              `).join('')}
            </ul>
          </div>
          <textarea id="additionalInstructions" placeholder="Additional Instructions (optional)"></textarea>
          <div class="quantity-selector">
            <button class="quantity-btn minus">-</button>
            <input type="number" id="quantity" value="1" min="1" max="10">
            <button class="quantity-btn plus">+</button>
          </div>
          <button id="addToCartBtn" class="btn btn-primary">Add to Cart</button>
        `;
        foodItemDetails.classList.remove('hidden');
        categoryContainer.classList.add('hidden');
        menuItemsContainer.classList.add('hidden');

        // Scroll to the top of the food item details
        foodItemDetails.scrollIntoView({ behavior: 'smooth', block: 'start' });

        document.querySelector('.close-details').addEventListener('click', closeFoodItemDetails);
        document.getElementById('addToCartBtn').addEventListener('click', () => addToCart(item));
        
        // Quantity selector functionality
        const quantityInput = document.getElementById('quantity');
        document.querySelector('.quantity-btn.minus').addEventListener('click', () => {
          if (quantityInput.value > 1) {
            quantityInput.value--;
            updateTotalPrice(item);
          }
        });
        document.querySelector('.quantity-btn.plus').addEventListener('click', () => {
          if (quantityInput.value < 10) {
            quantityInput.value++;
            updateTotalPrice(item);
          }
        });

        // Add event listeners for size and topping selections
        document.querySelectorAll('input[name="size"]').forEach(input => {
          input.addEventListener('change', () => updateTotalPrice(item));
        });
        document.querySelectorAll('input[name="topping"]').forEach(input => {
          input.addEventListener('change', () => updateTotalPrice(item));
        });

        // Initial price update
        updateTotalPrice(item);
      } else {
        console.error('Failed to fetch menu item details');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  function updateTotalPrice(item) {
    const basePrice = parseFloat(item.price);
    const quantity = parseInt(document.getElementById('quantity').value);
    const selectedSize = document.querySelector('input[name="size"]:checked');
    const selectedToppings = document.querySelectorAll('input[name="topping"]:checked');

    let totalPrice = basePrice;

    if (selectedSize) {
      totalPrice = parseFloat(selectedSize.dataset.price);
    }

    selectedToppings.forEach(topping => {
      totalPrice += parseFloat(topping.dataset.price);
    });

    totalPrice *= quantity;

    document.getElementById('totalPrice').textContent = totalPrice.toFixed(2);
  }

  function closeFoodItemDetails() {
    foodItemDetails.classList.add('hidden');
    categoryContainer.classList.remove('hidden');
    menuItemsContainer.classList.remove('hidden');
  }

  function calculateAverageRating(ratings) {
    if (ratings.length === 0) return 'No ratings yet';
    const sum = ratings.reduce((a, b) => a + b, 0);
    return (sum / ratings.length).toFixed(1);
  }

  async function addToCart(item) {
    const selectedSize = document.querySelector('input[name="size"]:checked');
    const selectedToppings = Array.from(document.querySelectorAll('input[name="topping"]:checked')).map(input => input.value);
    const additionalInstructions = document.getElementById('additionalInstructions').value;
    const quantity = parseInt(document.getElementById('quantity').value);
    const totalPrice = parseFloat(document.getElementById('totalPrice').textContent);

    const cartItem = {
      menuItemId: item._id,
      quantity: quantity,
      selectedSize: selectedSize ? selectedSize.value : null,
      selectedToppings,
      additionalInstructions,
      totalPrice
    };

    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify(cartItem)
      });

      if (response.ok) {
        const addToCartBtn = document.getElementById('addToCartBtn');
        addToCartBtn.textContent = 'Added to Cart';
        addToCartBtn.disabled = true;
        setTimeout(() => {
          closeFoodItemDetails();
          updateCartBadge();
        }, 1500);
      } else {
        console.error('Failed to add item to cart');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async function updateCartBadge() {
    try {
      const response = await fetch('/api/cart', {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });
      if (response.ok)   {
        const cart = await response.json();
        const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
        cartBadge.textContent = totalItems;
      } else {
        console.error('Failed to fetch cart');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    if (searchTerm.length > 2) {
      const filteredItems = menuItems.filter(item => 
        item.name.toLowerCase().includes(searchTerm) || 
        item.type.toLowerCase().includes(searchTerm)
      );
      renderMenuItems('all', filteredItems);
    } else {
      renderMenuItems('all');
    }
  });

  homeBtn.addEventListener('click', showHomeView);
  backToRestaurantsBtn.addEventListener('click', showHomeView);

  cartBtn.addEventListener('click', () => {
    window.location.href = 'cart.html';
  });

  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('userToken');
    window.location.href = 'user_auth.html';
  });

  addressBtn.addEventListener('click', openAddressModal);
  closeModal.addEventListener('click', closeAddressModal);
  addressForm.addEventListener('submit', addAddress);
  useCurrentLocationBtn.addEventListener('click', useCurrentLocation);

  function openAddressModal() {
    addressModal.style.display = 'block';
    fetchAddresses();
  }

  function closeAddressModal() {
    addressModal.style.display = 'none';
  }

  async function fetchAddresses() {
    try {
      const response = await fetch('/api/user/addresses', {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });
      if (response.ok) {
        userAddresses = await response.json();
        renderAddresses();
      } else {
        console.error('Failed to fetch addresses');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  function renderAddresses() {
    addressList.innerHTML = userAddresses.map((address, index) => `
      <div class="address-item">
        <p>${address.manual || address.auto}</p>
        <div>
          <button class="btn btn-small btn-update" data-index="${index}">Update</button>
          <button class="btn btn-small btn-delete" data-index="${index}">Delete</button>
        </div>
      </div>
    `).join('');

    // Add event listeners for update and delete buttons
    document.querySelectorAll('.btn-update').forEach(button => {
      button.addEventListener('click', (e) => {
        const index = e.target.dataset.index;
        openUpdateAddressModal(index);
      });
    });

    document.querySelectorAll('.btn-delete').forEach(button => {
      button.addEventListener('click', (e) => {
        const index = e.target.dataset.index;
        deleteAddress(index);
      });
    });
  }

  async function addAddress(e) {
    e.preventDefault();
    const newAddress = addressInput.value;
    try {
      const response = await fetch('/api/user/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({ address_manual: newAddress })
      });
      if (response.ok) {
        addressInput.value = '';
        fetchAddresses();
      } else {
        console.error('Failed to add address');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async function deleteAddress(index) {
    try {
      const response = await fetch(`/api/user/addresses/${index}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });
      if (response.ok) {
        fetchAddresses();
      } else {
        console.error('Failed to delete address');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  function useCurrentLocation() {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async function(position) {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        try {
          const response = await fetch('/api/user/addresses', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${userToken}`
            },
            body: JSON.stringify({ address_auto: `${lat},${lon}` })
          });
          if (response.ok) {
            fetchAddresses();
            updateCurrentLocationDisplay(lat, lon);
          } else {
            console.error('Failed to add current location');
          }
        } catch (error) {
          console.error('Error:', error);
        }
      });
    } else {
      alert("Geolocation is not supported by your browser");
    }
  }

  function updateCurrentLocationDisplay(lat, lon) {
    currentLocationDisplay.innerHTML = `
      <i class="fas fa-map-marker-alt"></i>
      <span>Current Location: ${lat.toFixed(6)}, ${lon.toFixed(6)}</span>
    `;
  }

  function openUpdateAddressModal(index) {
    currentAddressIndex = index;
    const address = userAddresses[index];
    updateAddressInput.value = address.manual || address.auto;
    updateAddressModal.style.display = 'block';
  }

  function closeUpdateAddressModal() {
    updateAddressModal.style.display = 'none';
    currentAddressIndex = -1;
  }

  async function updateAddress(e) {
    e.preventDefault();
    const updatedAddress = updateAddressInput.value;
    try {
      const response = await fetch(`/api/user/addresses/${currentAddressIndex}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({ address_manual: updatedAddress })
      });
      if (response.ok) {
        closeUpdateAddressModal();
        fetchAddresses();
      } else {
        console.error('Failed to update address');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  function getCurrentLocation() {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(function(position) {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        updateUserLocation(lat, lon);
        updateCurrentLocationDisplay(lat, lon);
      }, function(error) {
        console.error("Error getting location:", error);
      });
    } else {
      console.log("Geolocation is not supported by this browser.");
    }
  }

  async function updateUserLocation(lat, lon) {
    try {
      const response = await fetch('/api/user/location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({ lat, lon })
      });
      if (response.ok) {
        console.log('User location updated successfully');
      } else {
        console.error('Failed to update user location');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  // Event listeners
  updateAddressForm.addEventListener('submit', updateAddress);
  closeUpdateModal.addEventListener('click', closeUpdateAddressModal);

  // Initial setup
  if (userToken) {
    fetchRestaurants();
    fetchAddresses();
  }
});