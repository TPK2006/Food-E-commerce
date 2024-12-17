document.addEventListener('DOMContentLoaded', function() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  const addMenuItemForm = document.getElementById('addMenuItemForm');
  const menuItemsContainer = document.getElementById('menuItems');
  const ownerProfileForm = document.getElementById('ownerProfileForm');
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  const userMenuButton = document.getElementById('userMenuButton');
  const userMenu = document.getElementById('userMenu');
  const logoutButton = document.getElementById('logoutButton');
  const profileLink = document.getElementById('profileLink');
  const profileModal = document.getElementById('profileModal');
  const closeProfileModal = profileModal.querySelector('.close');
  const restaurantImage = document.getElementById('restaurantImage');
  const imagePreview = document.getElementById('imagePreview');
  const chooseCurrentLocationBtn = document.getElementById('chooseCurrentLocation');
  const addToppingBtn = document.getElementById('addToppingBtn');
  const toppingsList = document.getElementById('toppingsList');
  const addSizeBtn = document.getElementById('addSizeBtn');
  const sizesList = document.getElementById('sizesList');
  const ordersList = document.getElementById('ordersList');
  let map, marker, searchBox;

  // Tab functionality
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      button.classList.add('active');
      document.getElementById(tabName).classList.add('active');

      if (tabName === 'orders') {
        fetchOrders();
      }
    });
  });

  // User menu functionality
  userMenuButton.addEventListener('click', function(event) {
    event.stopPropagation();
    userMenu.classList.toggle('hidden');
  });

  // Close the menu when clicking outside
  document.addEventListener('click', function(event) {
    if (!userMenuButton.contains(event.target) && !userMenu.contains(event.target)) {
      userMenu.classList.add('hidden');
    }
  });

  // Logout functionality
  logoutButton.addEventListener('click', function(e) {
    e.preventDefault();
    localStorage.removeItem('token');
    window.location.href = 'index.html';
  });

  // Profile modal functionality
  profileLink.addEventListener('click', function(e) {
    e.preventDefault();
    profileModal.style.display = 'block';
    document.getElementById('mainContent').classList.add('blur');
    fetchOwnerProfile();
  });

  closeProfileModal.addEventListener('click', function() {
    profileModal.style.display = 'none';
    document.getElementById('mainContent').classList.remove('blur');
  });

  window.addEventListener('click', function(event) {
    if (event.target === profileModal) {
      profileModal.style.display = 'none';
      document.getElementById('mainContent').classList.remove('blur');
    }
  });

  // Topping functionality
  addToppingBtn.addEventListener('click', () => {
    const toppingDiv = document.createElement('div');
    toppingDiv.className = 'topping-item';
    toppingDiv.innerHTML = `
      <input type="text" placeholder="Topping name" class="topping-name" required>
      <input type="number" step="0.01" placeholder="Topping price" class="topping-price" required>
      <button type="button" class="remove-topping btn btn-danger">Remove</button>
    `;
    toppingsList.appendChild(toppingDiv);
  });

  toppingsList.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-topping')) {
      e.target.closest('.topping-item').remove();
    }
  });

  // Size functionality
  addSizeBtn.addEventListener('click', () => {
    const sizeDiv = document.createElement('div');
    sizeDiv.className = 'size-item';
    sizeDiv.innerHTML = `
      <input type="text" placeholder="Size name" class="size-name" required>
      <input type="number" step="0.01" placeholder="Size price" class="size-price" required>
      <button type="button" class="remove-size btn btn-danger">Remove</button>
    `;
    sizesList.appendChild(sizeDiv);
  });

  sizesList.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-size')) {
      e.target.closest('.size-item').remove();
    }
  });

  // Menu management
  addMenuItemForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    const submitButton = this.querySelector('button[type="submit"]');
    const itemId = submitButton.getAttribute('data-edit-id');

    // Collect toppings data
    const toppings = [];
    document.querySelectorAll('.topping-item').forEach(item => {
      const name = item.querySelector('.topping-name').value;
      const price = item.querySelector('.topping-price').value;
      if (name && price) {
        toppings.push({ name, price: parseFloat(price) });
      }
    });
    
    formData.append('toppings', JSON.stringify(toppings));

    // Collect sizes data
    const sizes = [];
    document.querySelectorAll('.size-item').forEach(item => {
      const name = item.querySelector('.size-name').value;
      const price = item.querySelector('.size-price').value;
      if (name && price) {
        sizes.push({ name, price: parseFloat(price) });
      }
    });
    
    formData.append('sizes', JSON.stringify(sizes));

    try {
      let url = '/api/menu';
      let method = 'POST';

      if (itemId) {
        url += `/${itemId}`;
        method = 'PATCH';
      }

      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const item = await response.json();
        console.log(itemId ? 'Item updated:' : 'New item added:', item);
        await fetchMenuItems();
        resetMenuForm();
      } else {
        const errorData = await response.json();
        console.error('Failed to add/update menu item:', errorData.message);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  });

  function resetMenuForm() {
    addMenuItemForm.reset();
    toppingsList.innerHTML = '';
    sizesList.innerHTML = '';
    const submitButton = addMenuItemForm.querySelector('button[type="submit"]');
    submitButton.textContent = 'Add Item';
    submitButton.removeAttribute('data-edit-id');
  }

  async function fetchMenuItems() {
    try {
      const response = await fetch('/api/menu', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const menuItems = await response.json();
        updateMenuDisplay(menuItems);
      } else {
        console.error('Failed to fetch menu items');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  function updateMenuDisplay(menuItems) {
    menuItemsContainer.innerHTML = '';
    menuItems.forEach(item => {
      const itemElement = document.createElement('div');
      itemElement.className = 'card menu-item-card';
      itemElement.innerHTML = `
        <div class="card-header">
          <h3 class="card-title">${item.name}</h3>
          <p class="card-description">${item.type}</p>
        </div>
        <div class="card-content">
          ${item.imagePath ? `<img src="${item.imagePath}" alt="${item.name}" class="food-image">` : ''}
          <p class="font-bold mt-2">₹${item.price.toFixed(2)}</p>
          <p class="mt-1 mb-2">${item.description}</p>
          <p class="mb-2">Estimated Preparation Time: ${item.estimatedPreparationTime} minutes</p>
          <div class="toppings-list">
            <h4>Toppings:</h4>
            <ul>
              ${item.toppings.map(topping => `<li>${topping.name}: ₹${topping.price.toFixed(2)}</li>`).join('')}
            </ul>
          </div>
          <div class="sizes-list">
            <h4>Sizes:</h4>
            <ul>
              ${item.sizes.map(size => `<li>${size.name}: ₹${size.price.toFixed(2)}</li>`).join('')}
            </ul>
          </div>
          <div class="btn-group">
            <button class="btn btn-edit" data-id="${item._id}">Edit</button>
            <button class="btn btn-delete" data-id="${item._id}">Delete</button>
          </div>
        </div>
      `;
      menuItemsContainer.appendChild(itemElement);
    });

    // Add event listeners for edit and delete buttons
    document.querySelectorAll('.btn-edit').forEach(button => {
      button.addEventListener('click', editMenuItem);
    });
    document.querySelectorAll('.btn-delete').forEach(button => {
      button.addEventListener('click', deleteMenuItem);
    });
  }

  async function editMenuItem(e) {
    const itemId = e.target.getAttribute('data-id');
    try {
      const response = await fetch(`/api/menu-item/${itemId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const item = await response.json();
        // Populate the form with item data
        document.getElementById('name').value = item.name;
        document.getElementById('price').value = item.price;
        document.getElementById('type').value = item.type;
        document.getElementById('description').value = item.description;
        document.getElementById('estimatedPreparationTime').value = item.estimatedPreparationTime;
        
        // Populate toppings
        toppingsList.innerHTML = '';
        item.toppings.forEach(topping => {
          const toppingDiv = document.createElement('div');
          toppingDiv.className = 'topping-item';
          toppingDiv.innerHTML = `
            <input type="text" value="${topping.name}" class="topping-name" required>
            <input type="number" step="0.01" value="${topping.price}" class="topping-price" required>
            <button type="button" class="remove-topping btn btn-danger">Remove</button>
          `;
          toppingsList.appendChild(toppingDiv);
        });

        // Populate sizes
        sizesList.innerHTML = '';
        item.sizes.forEach(size => {
          const sizeDiv = document.createElement('div');
          sizeDiv.className = 'size-item';
          sizeDiv.innerHTML = `
            <input type="text" value="${size.name}" class="size-name" required>
            <input type="number" step="0.01" value="${size.price}" class="size-price" required>
            <button type="button" class="remove-size btn btn-danger">Remove</button>
          `;
          sizesList.appendChild(sizeDiv);
        });

        // Change the submit button text and add a data attribute for the item ID
        const submitButton = addMenuItemForm.querySelector('button[type="submit"]');
        submitButton.textContent = 'Update Item';
        submitButton.setAttribute('data-edit-id', itemId);
        // Scroll to the form
        addMenuItemForm.scrollIntoView({ behavior: 'smooth' });
      } else {
        console.error('Failed to fetch item details');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async function deleteMenuItem(e) {
    const itemId = e.target.getAttribute('data-id');
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        const response = await fetch(`/api/menu/${itemId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          console.log('Item deleted successfully');
          await fetchMenuItems();
        } else {
          console.error('Failed to delete item');
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }
  }

  // Profile management
  ownerProfileForm.addEventListener('submit', updateOwnerProfile);

  async function fetchOwnerProfile() {
    try {
      const response = await fetch('/api/owner/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const profile = await response.json();
        populateProfileForm(profile);
      } else {
        console.error('Failed to fetch owner profile');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  function populateProfileForm(profile) {
    document.getElementById('email').value = profile.email;
    document.getElementById('phoneNumber').value = profile.phoneNumber;
    document.getElementById('restaurantName').value = profile.restaurantName;
    document.getElementById('ownerName').value = profile.ownerName;
    document.getElementById('category').value = profile.category || '';
    document.getElementById('address').value = profile.address || '';
    document.getElementById('landmark').value = profile.landmark || '';
    document.getElementById('operatingHoursStart').value = profile.operatingHours?.start || '';
    document.getElementById('operatingHoursEnd').value = profile.operatingHours?.end || '';
    document.getElementById('latitude').value = profile.location?.coordinates[1] || '';
    document.getElementById('longitude').value = profile.location?.coordinates[0] || '';
    document.getElementById('upiId').value = profile.paymentDetails?.upiId || '';
    document.getElementById('accountHolderName').value = profile.paymentDetails?.accountHolderName || '';
    document.getElementById('bankName').value = profile.paymentDetails?.bankName || '';
    document.getElementById('accountNumber').value = profile.paymentDetails?.accountNumber || '';
    document.getElementById('ifscCode').value = profile.paymentDetails?.ifscCode || '';

    if (profile.restaurantLogo) {
      imagePreview.style.backgroundImage = `url(${profile.restaurantLogo})`;
    }

    if (profile.location?.coordinates) {
      const latLng = new google.maps.LatLng(profile.location.coordinates[1], profile.location.coordinates[0]);
      placeMarker(latLng);
      map.setCenter(latLng);
      map.setZoom(15);
    }
  }

  async function updateOwnerProfile(e) {
    e.preventDefault();
    const formData = new FormData(ownerProfileForm);

    try {
      const response = await fetch('/api/owner/profile', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        console.log('Profile updated successfully:', updatedProfile);
        alert('Profile updated successfully!');
        profileModal.style.display = 'none';
        document.getElementById('mainContent').classList.remove('blur');
      } else {
        console.error('Failed to update profile');
        alert('Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while updating the profile.');
    }
  }

  // Map functionality
  function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
      center: { lat: 0, lng: 0 },
      zoom: 8
    });

    marker = new google.maps.Marker({
      map: map,
      draggable: true
    });

    map.addListener('click', function(e) {
      placeMarker(e.latLng);
    });

    marker.addListener('dragend', function() {
      updateLatLng(marker.getPosition());
    });

    // Initialize the search box
    const input = document.getElementById('locationSearch');
    searchBox = new google.maps.places.SearchBox(input);

    map.addListener('bounds_changed', function() {
      searchBox.setBounds(map.getBounds());
    });

    searchBox.addListener('places_changed', function() {
      const places = searchBox.getPlaces();

      if (places.length == 0) {
        return;
      }

      const bounds = new google.maps.LatLngBounds();
      places.forEach(function(place) {
        if (!place.geometry) {
          console.log("Returned place contains no geometry");
          return;
        }

        placeMarker(place.geometry.location);

        if (place.geometry.viewport) {
          bounds.union(place.geometry.viewport);
        } else {
          bounds.extend(place.geometry.location);
        }
      });
      map.fitBounds(bounds);
    });
  }

  function placeMarker(location) {
    marker.setPosition(location);
    map.panTo(location);
    updateLatLng(location);
  }

  function updateLatLng(location) {
    document.getElementById('latitude').value = location.lat();
    document.getElementById('longitude').value = location.lng();
  }

  // Choose Current Location functionality
  chooseCurrentLocationBtn.addEventListener('click', function() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        placeMarker(new google.maps.LatLng(pos.lat, pos.lng));
        map.setCenter(pos);
        map.setZoom(15);
      }, function() {
        handleLocationError(true, map.getCenter());
      });
    } else {
      handleLocationError(false, map.getCenter());
    }
  });

  function handleLocationError(browserHasGeolocation, pos) {
    alert(browserHasGeolocation ?
      'Error: The Geolocation service failed.' :
      'Error: Your browser doesn\'t support geolocation.');
  }

  // Image preview functionality
  restaurantImage.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        imagePreview.style.backgroundImage = `url(${e.target.result})`;
      }
      reader.readAsDataURL(file);
    }
  });

 
  // Order management
  async function fetchOrders() {
    try {
      const response = await fetch('/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const orders = await response.json();
        displayOrders(orders);
        updateDashboardStats(orders);
      } else {
        console.error('Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  }

  function getStatusClass(status) {
    switch (status) {
      case 'pending':
        return 'status-gray';
      case 'preparing':
        return 'status-yellow';
      case 'ready':
        return 'status-blue';
      case 'completed':
        return 'status-green';
      default:
        return '';
    }
  }

  function getStatusIcon(status) {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'preparing':
        return '🍴';
      case 'ready':
        return '✅';
      case 'completed':
        return '📦';
      default:
        return '';
    }
  }

  function getActionButton(order) {
    switch (order.status) {
      case 'pending':
        return `<button class="btn-status btn-preparing" data-order-id="${order._id}" data-status="preparing">Start Preparing</button>`;
      case 'preparing':
        return `<button class="btn-status btn-ready" data-order-id="${order._id}" data-status="ready">Ready</button>`;
      case 'ready':
        return `<button class="btn-status btn-completed" data-order-id="${order._id}" data-status="completed">Picked</button>`;
      default:
        return '';
    }
  }

  function displayOrders(orders) {
    ordersList.innerHTML = '';
    const preparingOrders = [];
    const pendingOrders = [];
    const readyOrders = [];
    const completedOrders = [];

    orders.forEach(order => {
      const orderElement = createOrderElement(order);
      switch (order.status) {
        case 'preparing':
          preparingOrders.push(orderElement);
          break;
        case 'pending':
          pendingOrders.push(orderElement);
          break;
        case 'ready':
          readyOrders.push(orderElement);
          break;
        case 'completed':
          completedOrders.push(orderElement);
          break;
      }
    });

    // Sort and append orders
    preparingOrders.sort((a, b) => new Date(b.dataset.startTime) - new Date(a.dataset.startTime));
    pendingOrders.sort((a, b) => new Date(a.dataset.createdAt) - new Date(b.dataset.createdAt));
    readyOrders.sort((a, b) => new Date(b.dataset.readyTime) - new Date(a.dataset.readyTime));
    completedOrders.sort((a, b) => new Date(b.dataset.completedTime) - new Date(a.dataset.completedTime));

    preparingOrders.forEach(order => ordersList.appendChild(order));
    pendingOrders.forEach(order => ordersList.appendChild(order));
    readyOrders.forEach(order => ordersList.appendChild(order));
    completedOrders.forEach(order => ordersList.appendChild(order));

    // Update Recent Ready Orders in the Dashboard tab
    updateRecentReadyOrders([...readyOrders, ...completedOrders].map(el => JSON.parse(el.dataset.orderData)));
  }

  function createOrderElement(order) {
    const orderElement = document.createElement('div');
    orderElement.className = 'order-item';
    orderElement.dataset.status = order.status;
    orderElement.dataset.createdAt = order.createdAt;
    orderElement.dataset.startTime = order.startTime || '';
    orderElement.dataset.readyTime = order.readyAt || '';
    orderElement.dataset.completedTime = order.completedAt || '';
    
    const statusClass = getStatusClass(order.status);
    const statusIcon = getStatusIcon(order.status);
    
    const scheduledTime = new Date(order.specificTime);
    const formattedTime = scheduledTime.toLocaleString('en-US', { 
      hour: 'numeric', 
      minute: 'numeric', 
      hour12: true 
    });

    const currentTime = new Date();
    let timeRemaining;
    if (order.deliveryOption === 'pickup') {
      const timeDiff = scheduledTime - currentTime;
      const minutesRemaining = Math.max(0, Math.floor(timeDiff / 60000));
      timeRemaining = `${minutesRemaining} minutes remaining`;
    } else {
      const deliveryTime = new Date(scheduledTime.getTime() - 15 * 60000);
      const timeDiff = deliveryTime - currentTime;
      const minutesRemaining = Math.max(0, Math.floor(timeDiff / 60000));
      timeRemaining = `${minutesRemaining} minutes + 15 minutes for delivery`;
    }

    let orderContent = `
      <div class="order-header">
        <h3>Order ID: ${order._id}</h3>
        <span class="order-status ${statusClass}">${statusIcon} ${order.status}</span>
      </div>
    `;

    if (order.status === 'completed') {
      orderContent += `
        <p>Customer Name: ${order.userId.fullName}</p>
        <p>Contact Number: ${order.contactNumber}</p>
        <p>Delivery Method: ${order.deliveryOption === 'delivery' ? 
          `Delivery to ${order.deliveryAddress.manual}` : 'Pickup'}</p>
        <p>Total Amount: ₹${order.totalAmount.toFixed(2)}</p>
      `;
    } else {
      orderContent += `
        <p>Customer Name: ${order.userId.fullName}</p>
        <p>Items Ordered:</p>
        <ul>
          ${order.items.map(item => `
            <li>
              ${item.menuItem.name} 🔍
              <div class="item-details" style="display: none;">
                <p>Quantity: ${item.quantity}</p>
                ${item.selectedSize ? `<p>Selected Size: ${item.selectedSize}</p>` : ''}
                ${item.selectedToppings && item.selectedToppings.length > 0 ? 
                  `<p>Selected Toppings: ${item.selectedToppings.join(', ')}</p>` : ''}
                ${item.additionalInstructions ? `<p>Additional Instructions: ${item.additionalInstructions}</p>` : ''}
                <p>Sub-Price: ₹${item.totalPrice.toFixed(2)}</p>
              </div>
            </li>
          `).join('')}
        </ul>
        <p>Total Amount: ₹${order.totalAmount.toFixed(2)}</p>
        <p>Delivery Method: ${order.deliveryOption === 'delivery' ? 
          `Delivery to ${order.deliveryAddress.manual}` : 'Pickup'}</p>
        <p>Contact Number: ${order.contactNumber}</p>
        <p>Scheduled Time: ${formattedTime}</p>
        <p>Time Remaining: ${timeRemaining}</p>
        <div class="order-actions">
          ${getActionButton(order)}
        </div>
      `;
    }

    orderElement.innerHTML = orderContent;

    // Add click event listeners to toggle item details
    const itemList = orderElement.querySelector('ul');
    if (itemList) {
      itemList.addEventListener('click', (e) => {
        if (e.target.tagName === 'LI') {
          const details = e.target.querySelector('.item-details');
          details.style.display = details.style.display === 'none' ? 'block' : 'none';
        }
      });
    }

    orderElement.dataset.orderData = JSON.stringify(order);
    return orderElement;
  }

  function updateRecentReadyOrders(readyOrders) {
    const recentOrdersTable = document.getElementById('recentOrdersTable').getElementsByTagName('tbody')[0];
    recentOrdersTable.innerHTML = '';
    
    // Separate ready and completed orders
    const readyOrdersArray = readyOrders.filter(order => order.status === 'ready');
    const completedOrdersArray = readyOrders.filter(order => order.status === 'completed');
    
    // Sort ready orders by readyTime (most recent first)
    readyOrdersArray.sort((a, b) => new Date(b.readyAt) - new Date(a.readyAt));
    
    // Sort completed orders by completedTime (most recent first)
    completedOrdersArray.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    
    // Combine arrays with ready orders first, then completed orders
    const sortedOrders = [...readyOrdersArray, ...completedOrdersArray];

    sortedOrders.forEach(order => {
      const row = recentOrdersTable.insertRow();
      row.innerHTML = `
        <td>${order._id}</td>
        <td>${order.userId.fullName}</td>
        <td>${order.contactNumber}</td>
        <td>${order.deliveryOption === 'delivery' ? `Delivery` : 'Pickup'}</td>
        <td>₹${order.totalAmount.toFixed(2)}</td>
        <td>${order.status === 'completed' ? 'Completed' : `<button class="btn-status btn-completed" data-order-id="${order._id}" data-status="completed">Picked</button>`}</td>
      `;
    });
  }

  async function updateOrderStatus(orderId, newStatus) {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        console.log(`Order ${orderId} updated to status: ${newStatus}`);
        await fetchOrders(); // Refresh the orders list and update dashboard stats
      } else {
        console.error('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  }

  // Dashboard statistics
  function updateDashboardStats(orders) {
    const pendingOrders = orders.filter(order => order.status === 'pending' || order.status === 'preparing').length;
    const completedOrders = orders.filter(order => order.status === 'completed').length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.status === 'completed' ? order.totalAmount : 0), 0);

    animateValue('pendingOrdersCount', parseInt(document.getElementById('pendingOrdersCount').textContent) || 0, pendingOrders, 1000);
    animateValue('completedOrdersCount', parseInt(document.getElementById('completedOrdersCount').textContent) || 0, completedOrders, 1000);
    animateValue('totalRevenue', parseFloat(document.getElementById('totalRevenue').textContent.replace('₹', '')) || 0, totalRevenue, 1000, '₹');

    fetchMenuItemsCount();
  }

  async function fetchMenuItemsCount() {
    try {
      const response = await fetch('/api/menu/count', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const { count } = await response.json();
        animateValue('menuItemsCount', parseInt(document.getElementById('menuItemsCount').textContent) || 0, count, 1000);
      } else {
        console.error('Failed to fetch menu items count');
      }
    } catch (error) {
      console.error('Error fetching menu items count:', error);
    }
  }

  function animateValue(id, start, end, duration, prefix = '') {
    const obj = document.getElementById(id);
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const value = Math.floor(progress * (end - start) + start);
      obj.textContent = `${prefix}${value.toLocaleString()}`;
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }

  // Analytics
  async function initializeAnalytics() {
    try {
      const response = await fetch('/api/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const analyticsData = await response.json();
        const ctx = document.getElementById('salesChart').getContext('2d');
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: analyticsData.labels,
            datasets: [{
              label: 'Sales',
              data: analyticsData.salesData,
              borderColor: 'rgb(75, 192, 192)',
              tension: 0.1
            }]
          },
          options: {
            responsive: true,
            scales: {
              y: {
                beginAtZero: true
              }
            }
          }
        });

        // Update popular items table
        const popularItemsTable = document.getElementById('popularItemsTable').getElementsByTagName('tbody')[0];
        analyticsData.popularItems.forEach(item => {
          const row = popularItemsTable.insertRow();
          row.insertCell(0).textContent = item.name;
          row.insertCell(1).textContent = item.totalSales;
          row.insertCell(2).textContent = `₹${item.revenue.toFixed(2)}`;
        });

        // Update customer feedback
        document.getElementById('averageRating').textContent = `${analyticsData.averageRating.toFixed(1)}/5`;
        document.getElementById('totalReviews').textContent = analyticsData.totalReviews;
      } else {
        console.error('Failed to fetch analytics data');
      }
    } catch (error) {
      console.error('Error initializing analytics:', error);
    }
  }

  // Event delegation for dynamically added elements
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('btn-status')) {
      const orderId = e.target.getAttribute('data-order-id');
      const newStatus = e.target.getAttribute('data-status');
      updateOrderStatus(orderId, newStatus);
    }
  });

  // Initial setup
  fetchOrders();
  fetchMenuItems();
  updateDashboardStats();
  initializeAnalytics();
  initMap();

  // Periodic refresh (every 30 seconds)
  setInterval(() => {
    fetchOrders();
    updateDashboardStats();
  }, 30000);
});