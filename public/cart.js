document.addEventListener('DOMContentLoaded', () => {
    const cartItemsContainer = document.getElementById('cartItems');
    const subtotalElement = document.getElementById('subtotal');
    const deliveryFeeElement = document.getElementById('deliveryFee');
    const totalElement = document.getElementById('total');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const cartEmptyMessage = document.getElementById('cartEmptyMessage');
    const cartContent = document.getElementById('cartContent');
    const continueShopping = document.getElementById('continueShopping');
    const addressSelect = document.getElementById('addressSelect');
    const newAddressBtn = document.getElementById('newAddressBtn');
    const deliveryOptions = document.querySelectorAll('input[name="deliveryOption"]');
    const orderNotesInput = document.getElementById('orderNotesInput');
    const homeBtn = document.getElementById('homeBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const contactNumberInput = document.getElementById('contactNumberInput');
    const estimatedReadyTimeElement = document.getElementById('estimatedReadyTime');
    const specificPickupTimeInput = document.getElementById('specificPickupTimeInput');
    const specificDeliveryTimeInput = document.getElementById('specificDeliveryTimeInput');
    const useCurrentLocationBtn = document.getElementById('useCurrentLocationBtn');
    const orderSummaryElement = document.getElementById('orderSummary');
    const modal = document.getElementById('customizationModal');
    const closeBtn = modal.querySelector('.close');
    const customizationForm = document.getElementById('customizationForm');
    const customizationTitle = document.getElementById('customizationTitle');
    const sizeOptions = document.getElementById('sizeOptions');
    const toppingOptions = document.getElementById('toppingOptions');
    const additionalInstructions = document.getElementById('additionalInstructions');

    const userToken = localStorage.getItem('userToken');
    let cartData = null;
    let userAddresses = [];

    if (!userToken) {
        window.location.href = 'user_auth.html';
        return;
    }

    async function fetchCart() {
        try {
            const [cartResponse, userResponse] = await Promise.all([
                fetch('/api/cart', {
                    headers: {
                        'Authorization': `Bearer ${userToken}`
                    }
                }),
                fetch('/api/user/profile', {
                    headers: {
                        'Authorization': `Bearer ${userToken}`
                    }
                })
            ]);

            if (cartResponse.ok && userResponse.ok) {
                cartData = await cartResponse.json();
                const userData = await userResponse.json();

                if (cartData && cartData.restaurants && cartData.restaurants.length > 0) {
                    renderCart(cartData);
                    updateEstimatedReadyTime();
                } else {
                    showEmptyCart();
                }

                prefillUserData(userData);
            } else {
                throw new Error('Failed to fetch cart or user data');
            }
        } catch (error) {
            console.error('Error:', error);
            showEmptyCart();
            showErrorMessage('Failed to load cart. Please try again later.');
        }
    }

    function renderCart(cart) {
        if (!cart || !cart.restaurants || cart.restaurants.length === 0) {
            showEmptyCart();
        } else {
            showCartContent(cart);
        }
    }

    function showEmptyCart() {
        if (cartEmptyMessage && cartContent) {
            cartEmptyMessage.classList.remove('hidden');
            cartContent.classList.add('hidden');
        }
        if (checkoutBtn) {
            checkoutBtn.disabled = true;
        }
    }

    function showCartContent(cart) {
        if (cartEmptyMessage && cartContent) {
            cartEmptyMessage.classList.add('hidden');
            cartContent.classList.remove('hidden');
        }
        if (checkoutBtn) {
            checkoutBtn.disabled = false;
        }

        if (cartItemsContainer) {
            cartItemsContainer.innerHTML = cart.restaurants.map((restaurant, restaurantIndex) => `
                <div class="restaurant-section">
                    <h3>${restaurant.restaurantId.restaurantName}</h3>
                    ${restaurant.items.map((item, itemIndex) => `
                        <div class="cart-item" data-restaurant-id="${restaurant.restaurantId._id}" data-item-id="${item._id}">
                            <input type="checkbox" class="cart-item-checkbox" data-restaurant-index="${restaurantIndex}" data-item-index="${itemIndex}" ${item.isSelected ? 'checked' : ''}>
                            <img src="${item.menuItem.imagePath || '/placeholder.svg?height=80&width=80'}" alt="${item.menuItem.name}" class="cart-item-image">
                            <div class="cart-item-details">
                                <h4>${item.menuItem.name}</h4>
                                <p>Quantity: ${item.quantity}</p>
                                ${item.selectedSize ? `<p>Size: ${item.selectedSize}</p>` : ''}
                                ${item.selectedToppings && item.selectedToppings.length > 0 ? `<p>Toppings: ${item.selectedToppings.join(', ')}</p>` : ''}
                                ${item.additionalInstructions ? `<p>Instructions: ${item.additionalInstructions}</p>` : ''}
                                <p>Price: ₹${item.totalPrice ? item.totalPrice.toFixed(2) : '0.00'}</p>
                            </div>
                            <div class="cart-item-actions">
                                <button class="btn btn-small btn-customize" data-restaurant-index="${restaurantIndex}" data-item-index="${itemIndex}">Customize</button>
                                <button class="btn btn-small btn-decrease" data-restaurant-index="${restaurantIndex}" data-item-index="${itemIndex}">-</button>
                                <span class="item-quantity">${item.quantity}</span>
                                <button class="btn btn-small btn-increase" data-restaurant-index="${restaurantIndex}" data-item-index="${itemIndex}">+</button>
                                <button class="btn btn-small btn-remove" data-restaurant-index="${restaurantIndex}" data-item-index="${itemIndex}">Remove</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `).join('');
        }

        updateCartSummary(cart);
        addCartItemEventListeners();
    }

    function updateCartSummary(cart) {
        const subtotal = cart.restaurants.reduce((sum, restaurant) => 
            sum + restaurant.items.reduce((restaurantSum, item) => 
                restaurantSum + (item.isSelected && item.totalPrice ? item.totalPrice : 0), 0), 0);
        
        let totalDeliveryFee = 0;
        const selectedRestaurants = new Set();

        cart.restaurants.forEach(restaurant => {
            if (restaurant.items.some(item => item.isSelected)) {
                selectedRestaurants.add(restaurant.restaurantId._id);
                totalDeliveryFee += restaurant.deliveryFee;
            }
        });

        const total = subtotal + totalDeliveryFee;

        if (subtotalElement) subtotalElement.textContent = subtotal.toFixed(2);
        if (deliveryFeeElement) deliveryFeeElement.textContent = totalDeliveryFee.toFixed(2);
        if (totalElement) totalElement.textContent = total.toFixed(2);

        const hasSelectedItems = cart.restaurants.some(restaurant => 
            restaurant.items.some(item => item.isSelected)
        );
        if (checkoutBtn) checkoutBtn.disabled = !hasSelectedItems;

        if (orderSummaryElement) {
            orderSummaryElement.innerHTML = `
                <h4>Order Summary:</h4>
                <div class="summary-item">
                    <span>Selected Items:</span>
                    <span class="amount">${getSelectedItemsCount(cart)}</span>
                </div>
                <div class="summary-item">
                    <span>Subtotal:</span>
                    <span class="amount">₹${subtotal.toFixed(2)}</span>
                </div>
                ${Array.from(selectedRestaurants).map(restaurantId => {
                    const restaurant = cart.restaurants.find(r => r.restaurantId._id === restaurantId);
                    return `
                        <div class="summary-item">
                            <span>Delivery fee (${restaurant.restaurantId.restaurantName} - ${restaurant.distance.toFixed(2)} km):</span>
                            <span class="amount">₹${restaurant.deliveryFee.toFixed(2)}</span>
                        </div>
                    `;
                }).join('')}
                <div class="summary-item total">
                    <span>Total:</span>
                    <span class="amount">₹${total.toFixed(2)}</span>
                </div>
            `;
        }
    }

    function getSelectedItemsCount(cart) {
        return cart.restaurants.reduce((sum, restaurant) => 
            sum + restaurant.items.filter(item => item.isSelected).length, 0);
    }

    function addCartItemEventListeners() {
        document.querySelectorAll('.btn-decrease').forEach(btn => {
            btn.addEventListener('click', (e) => updateCartItemQuantity(e.target.dataset.restaurantIndex, e.target.dataset.itemIndex, false));
        });

        document.querySelectorAll('.btn-increase').forEach(btn => {
            btn.addEventListener('click', (e) => updateCartItemQuantity(e.target.dataset.restaurantIndex, e.target.dataset.itemIndex, true));
        });

        document.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', (e) => removeCartItem(e.target.dataset.restaurantIndex, e.target.dataset.itemIndex));
        });

        document.querySelectorAll('.cart-item-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => updateCartItemSelection(e.target.dataset.restaurantIndex, e.target.dataset.itemIndex, e.target.checked));
        });

        document.querySelectorAll('.btn-customize').forEach(btn => {
            btn.addEventListener('click', (e) => customizeCartItem(e.target.dataset.restaurantIndex, e.target.dataset.itemIndex));
        });
    }

    async function updateCartItemQuantity(restaurantIndex, itemIndex, isIncrease) {
        try {
            const restaurant = cartData.restaurants[restaurantIndex];
            const item = restaurant.items[itemIndex];
            const newQuantity = isIncrease ? item.quantity + 1 : Math.max(1, item.quantity - 1);
            const newTotalPrice = (item.totalPrice / item.quantity) * newQuantity;

            const response = await fetch(`/api/cart/item/${restaurant.restaurantId._id}/${item._id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`
                },
                body: JSON.stringify({
                    increment: isIncrease, 
                    newQuantity: newQuantity,
                    newTotalPrice: newTotalPrice
                })
            });

            if (response.ok) {
                fetchCart();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update cart item quantity');
            }
        } catch (error) {
            console.error('Error:', error);
            showErrorMessage('Failed to update item quantity. Please try again.');
        }
    }

    async function removeCartItem(restaurantIndex, itemIndex) {
        try {
            const restaurant = cartData.restaurants[restaurantIndex];
            const item = restaurant.items[itemIndex];
            const response = await fetch(`/api/cart/item/${restaurant.restaurantId._id}/${item._id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${userToken}`
                }
            });

            if (response.ok) {
                fetchCart();
            } else {
                throw new Error('Failed to remove cart item');
            }
        } catch (error) {
            console.error('Error:', error);
            showErrorMessage('Failed to remove item. Please try again.');
        }
    }

    async function updateCartItemSelection(restaurantIndex, itemIndex, isSelected) {
        try {
            const restaurant = cartData.restaurants[restaurantIndex];
            const item = restaurant.items[itemIndex];
            
            item.isSelected = isSelected;

            updateCartSummary(cartData);
            updateEstimatedReadyTime();

            const response = await fetch(`/api/cart/item/${restaurant.restaurantId._id}/${item._id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`
                },
                body: JSON.stringify({ isSelected })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update cart item selection');
            }
        } catch (error) {
            console.error('Error:', error);
            const checkbox = document.querySelector(`.cart-item-checkbox[data-restaurant-index="${restaurantIndex}"][data-item-index="${itemIndex}"]`);
            if (checkbox) {
                checkbox.checked = !isSelected;
                cartData.restaurants[restaurantIndex].items[itemIndex].isSelected = !isSelected;
            }
            updateCartSummary(cartData);
            updateEstimatedReadyTime();
        }
    }

    function showCustomizationModal(menuItem, restaurantId, itemId) {
        customizationTitle.textContent = `Customize ${menuItem.name}`;
        sizeOptions.innerHTML = '';
        toppingOptions.innerHTML = '';
        additionalInstructions.value = '';

        if (menuItem.sizes && menuItem.sizes.length > 0) {
            sizeOptions.innerHTML = `
                <h4>Size:</h4>
                ${menuItem.sizes.map(size => `
                    <div class="option-item">
                        <input type="radio" id="size-${size.name}" name="size" value="${size.name}" data-price="${size.price}">
                        <label for="size-${size.name}">${size.name} (+₹${size.price.toFixed(2)})</label>
                    </div>
                `).join('')}
            `;
        }

        if (menuItem.toppings && menuItem.toppings.length > 0) {
            toppingOptions.innerHTML = `
                <h4>Toppings:</h4>
                ${menuItem.toppings.map(topping => `
                    <div class="option-item">
                        <input type="checkbox" id="topping-${topping.name}" name="topping" value="${topping.name}" data-price="${topping.price}">
                        <label for="topping-${topping.name}">${topping.name} (+₹${topping.price.toFixed(2)})</label>
                    </div>
                `).join('')}
            `;
        }

        modal.style.display = 'block';

        customizationForm.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(customizationForm);
            const selectedSize = formData.get('size');
            const selectedToppings = formData.getAll('topping');
            const additionalInstructions = formData.get('additionalInstructions');

            try {
                const response = await fetch(`/api/cart/item/${restaurantId}/${itemId}/customize`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${userToken}`
                    },
                    body: JSON.stringify({
                        selectedSize,
                        selectedToppings,
                        additionalInstructions
                    })
                });

                if (response.ok) {
                    modal.style.display = 'none';
                    fetchCart();
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to update cart item');
                }
            } catch (error) {
                console.error('Error:', error);
                showErrorMessage(`Failed to update item: ${error.message}`);
            }
        };
    }

    closeBtn.onclick = () => {
        modal.style.display = 'none';
    };

    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };

    async function customizeCartItem(restaurantIndex, itemIndex) {
        try {
            const restaurant = cartData.restaurants[restaurantIndex];
            const item = restaurant.items[itemIndex];
            const menuItemId = item.menuItem._id;
            const response = await fetch(`/api/menu-item/${menuItemId}`);
            if (response.ok) {
                const menuItem = await response.json();
                showCustomizationModal(menuItem, restaurant.restaurantId._id, item._id);
            } else {
                throw new Error('Failed to fetch menu item details');
            }
        } catch (error) {
            console.error('Error:', error);
            showErrorMessage('Failed to load item details. Please try again.');
        }
    }

    function showErrorMessage(message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        if (cartItemsContainer) {
            cartItemsContainer.innerHTML = '';
            cartItemsContainer.appendChild(errorElement);
        } else {
            console.error('Error:', message);
        }
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
                throw new Error('Failed to fetch addresses');
            }
        } catch (error) {
            console.error('Error:', error);
            showErrorMessage('Failed to load addresses. Please try again later.');
        }
    }

    function renderAddresses() {
        if (addressSelect) {
            addressSelect.innerHTML = '<option value="">Select an address</option>' +
                userAddresses.map((address, index) => `
                    <option value="${index}">${address.manual || address.auto}</option>
                `).join('');
        
            if (userAddresses.length > 0) {
                addressSelect.value = "0";
                updateDeliveryFees(userAddresses[0]);
            }
        }
    }

    async function updateDeliveryFees(address) {
        if (!address) return;

        const [lat, lon] = address.auto ? address.auto.split(',').map(Number) : [null, null];
        if (!lat || !lon) return;

        try {
            const response = await fetch('/api/cart/update-delivery-fees', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`
                },
                body: JSON.stringify({ lat, lon })
            });

            if (response.ok) {
                const updatedCart = await response.json();
                cartData = updatedCart;
                updateCartSummary(cartData);
            } else {
                throw new Error('Failed to update delivery fees');
            }
        } catch (error) {
            console.error('Error:', error);
            showErrorMessage('Failed to update delivery fees. Please try again.');
        }
    }

    function getSelectedItems() {
        if (!cartData || !cartData.restaurants) {
            return [];
        }
        return cartData.restaurants.flatMap(restaurant =>
            restaurant.items.filter(item => item.isSelected)
        );
    }

    function updateEstimatedReadyTime() {
        const selectedItems = getSelectedItems();

        if (selectedItems.length === 0) {
            if (estimatedReadyTimeElement) {
                estimatedReadyTimeElement.textContent = 'Please select the cart items';
            }
            return;
        }

        const maxPrepTime = Math.max(...selectedItems.map(item => item.menuItem.estimatedPreparationTime || 0));

        const now = new Date();
        const deliveryOption = document.querySelector('input[name="deliveryOption"]:checked');
        const additionalTime = deliveryOption && deliveryOption.value === 'delivery' ? 15 : 0;
        const readyTime = new Date(now.getTime() + (maxPrepTime + additionalTime) * 60000);

        if (estimatedReadyTimeElement) {
            estimatedReadyTimeElement.textContent = readyTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
        }

        if (specificPickupTimeInput && deliveryOption && deliveryOption.value === 'pickup') {
            specificPickupTimeInput.min = readyTime.toTimeString().slice(0, 5);
        }

        if (specificDeliveryTimeInput && deliveryOption && deliveryOption.value === 'delivery') {
            specificDeliveryTimeInput.min = readyTime.toTimeString().slice(0, 5);
        }
    }

    function toggleDeliveryMode() {
        const deliveryOption = document.querySelector('input[name="deliveryOption"]:checked');
        const deliveryAddressContainer = document.getElementById('deliveryAddress');
        const specificPickupTimeContainer = document.getElementById('specificPickupTime');
        const specificDeliveryTimeContainer = document.getElementById('specificDeliveryTime');

        if (deliveryOption) {
            if (deliveryOption.value === 'delivery') {
                if (deliveryAddressContainer) deliveryAddressContainer.classList.remove('hidden');
                if (specificPickupTimeContainer) specificPickupTimeContainer.classList.add('hidden');
                if (specificDeliveryTimeContainer) specificDeliveryTimeContainer.classList.remove('hidden');
            } else {
                if (deliveryAddressContainer) deliveryAddressContainer.classList.add('hidden');
                if (specificPickupTimeContainer) specificPickupTimeContainer.classList.remove('hidden');
                if (specificDeliveryTimeContainer) specificDeliveryTimeContainer.classList.add('hidden');
            }
        }

        updateEstimatedReadyTime();
        if (cartData) updateCartSummary(cartData);
    }

    async function useCurrentLocation() {
        if ("geolocation" in navigator) {
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject);
                });

                const { latitude, longitude } = position.coords;
                const response = await fetch('/api/user/addresses', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${userToken}`
                    },
                    body: JSON.stringify({ address_auto: `${latitude},${longitude}` })
                });

                if (response.ok) {
                    await fetchAddresses();
                    showSuccessMessage('Current location added as delivery address');
                    if (addressSelect) {
                        addressSelect.value = userAddresses.length - 1;
                        await updateDeliveryFees(userAddresses[userAddresses.length - 1]);
                    }
                } else {
                    throw new Error('Failed to add current location');
                }
            } catch (error) {
                console.error('Error:', error);
                showErrorMessage('Failed to get current location. Please try again.');
            }
        } else {
            showErrorMessage('Geolocation is not supported by your browser');
        }
    }

    function showSuccessMessage(message) {
        alert(message);
    }

    function prefillUserData(userData) {
        if (userData.phoneNumber && contactNumberInput) {
            contactNumberInput.value = userData.phoneNumber;
        }
    }

    async function checkout() {
        try {
            const selectedItems = getSelectedItems();
            const selectedAddress = addressSelect.value;
            const deliveryOption = document.querySelector('input[name="deliveryOption"]:checked').value;
            const orderNotes = orderNotesInput.value;
            const contactNumber = contactNumberInput.value;
            const specificTime = deliveryOption === 'pickup' ? specificPickupTimeInput.value : specificDeliveryTimeInput.value;

            if (selectedItems.length === 0) {
                showErrorMessage('Please select at least one item to proceed with the order.');
                return;
            }

            if (deliveryOption === 'delivery' && !selectedAddress) {
                showErrorMessage('Please select a delivery address.');
                return;
            }

            if (!contactNumber) {
                showErrorMessage('Please enter a contact number.');
                return;
            }

            const orderData = {
                restaurants: cartData.restaurants.map(restaurant => ({
                    restaurantId: restaurant.restaurantId._id,
                    items: restaurant.items.filter(item => item.isSelected).map(item => ({
                        menuItem: item.menuItem._id,
                        quantity: item.quantity,
                        selectedSize: item.selectedSize,
                        selectedToppings: item.selectedToppings,
                        additionalInstructions: item.additionalInstructions,
                        totalPrice: item.totalPrice
                    })),
                    subtotal: restaurant.items.filter(item => item.isSelected).reduce((sum, item) => sum + item.totalPrice, 0),
                    deliveryFee: restaurant.deliveryFee
                })).filter(restaurant => restaurant.items.length > 0),
                totalAmount: calculateTotalAmount(),
                deliveryAddress: userAddresses[selectedAddress],
                contactNumber,
                orderNotes,
                deliveryOption,
                specificTime: new Date(`${new Date().toDateString()} ${specificTime}`).toISOString()
            };

            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`
                },
                body: JSON.stringify(orderData)
            });

            if (response.ok) {
                const orders = await response.json();
                showSuccessMessage(`${orders.length} order(s) placed successfully!`);
                // Update the cart data to remove selected items
                cartData.restaurants = cartData.restaurants.map(restaurant => ({
                    ...restaurant,
                    items: restaurant.items.filter(item => !item.isSelected)
                })).filter(restaurant => restaurant.items.length > 0);
                renderCart(cartData);
            } else {
                throw new Error('Failed to place order');
            }
        } catch (error) {
            console.error('Error:', error);
            showErrorMessage('Failed to place order. Please try again.');
        }
    }

    function calculateTotalAmount() {
        return cartData.restaurants.reduce((total, restaurant) => {
            const restaurantTotal = restaurant.items.filter(item => item.isSelected).reduce((sum, item) => sum + item.totalPrice, 0);
            return total + restaurantTotal + restaurant.deliveryFee;
        }, 0);
    }


    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', checkout);
    }

    if (continueShopping) {
        continueShopping.addEventListener('click', () => {
            window.location.href = 'main_user.html';
        });
    }

    if (newAddressBtn) {
        newAddressBtn.addEventListener('click', async () => {
            const newAddress = prompt("Enter your new address:");
            if (newAddress) {
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
                        await fetchAddresses();
                        showSuccessMessage('New address added successfully');
                        if (addressSelect) {
                            addressSelect.value = userAddresses.length - 1;
                            await updateDeliveryFees(userAddresses[userAddresses.length - 1]);
                        }
                    } else {
                        throw new Error('Failed to add address');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    showErrorMessage('Failed to add address. Please try again.');
                }
            }
        });
    }

    if (deliveryOptions) {
        deliveryOptions.forEach(option => {
            option.addEventListener('change', toggleDeliveryMode);
        });
    }

    if (homeBtn) {
        homeBtn.addEventListener('click', () => {
            window.location.href = 'main_user.html';
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('userToken');
            window.location.href = 'user_auth.html';
        });
    }

    if (useCurrentLocationBtn) {
        useCurrentLocationBtn.addEventListener('click', useCurrentLocation);
    }

    if (specificPickupTimeInput) {
        specificPickupTimeInput.addEventListener('change', (e) => {
            validateSelectedTime(e.target, 'pickup');
        });
    }

    if (specificDeliveryTimeInput) {
        specificDeliveryTimeInput.addEventListener('change', (e) => {
            validateSelectedTime(e.target, 'delivery');
        });
    }

    function validateSelectedTime(input, type) {
        const selectedTime = new Date(`${new Date().toDateString()} ${input.value}`);
        const estimatedReadyTime = new Date(`${new Date().toDateString()} ${estimatedReadyTimeElement ? estimatedReadyTimeElement.textContent : ''}`);
        const errorMessageId = `${type}TimeError`;
        const existingErrorMessage = document.getElementById(errorMessageId);

        if (selectedTime < estimatedReadyTime) {
            if (!existingErrorMessage) {
                const error = document.createElement('div');
                error.id = errorMessageId;
                error.className = 'error-message';
                error.textContent = `Selected ${type} time cannot be earlier than the estimated ready time.`;
                input.parentNode.insertBefore(error, input.nextSibling);
            }
            input.style.borderColor = 'red';
        } else {
            if (existingErrorMessage) {
                existingErrorMessage.remove();
            }
            input.style.borderColor = '';
        }
    }

    if (addressSelect) {
        addressSelect.addEventListener('change', async (e) => {
            const selectedAddress = userAddresses[e.target.value];
            if (selectedAddress) {
                await updateDeliveryFees(selectedAddress);
            }
        });
    }

    fetchCart();
    fetchAddresses();
    toggleDeliveryMode();
});

