document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const registrationForm = document.getElementById('registrationForm');
    const loginIdentifier = document.getElementById('loginIdentifier');
    const passwordField = document.getElementById('passwordField');
    const loginPassword = document.getElementById('loginPassword');
    const tabTriggers = document.querySelectorAll('.tab-trigger');
    const tabContents = document.querySelectorAll('.tab-content');
    const nextButton = document.getElementById('nextButton');
    const getStartedBtn = document.getElementById('getStartedBtn');
    const authSection = document.getElementById('auth-section');
    const registrationSection = document.getElementById('registration-section');

    // Tab functionality
    tabTriggers.forEach(trigger => {
        trigger.addEventListener('click', () => {
            const tabId = trigger.getAttribute('data-tab');
            tabTriggers.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            trigger.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Get Started button functionality
    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', () => {
            authSection.classList.add('hidden');
            registrationSection.classList.remove('hidden');
            // Automatically show the restaurant info tab
            document.querySelector('.tab-trigger[data-tab="restaurant-info"]').click();
        });
    }

    // Next button functionality for registration form
    if (nextButton) {
        nextButton.addEventListener('click', () => {
            document.querySelector('.tab-trigger[data-tab="owner-details"]').click();
        });
    }

    // Show password field when identifier is entered in login form
    if (loginIdentifier) {
        loginIdentifier.addEventListener('blur', async () => {
            const identifier = loginIdentifier.value;
            if (identifier) {
                try {
                    const response = await fetch('/api/check-user', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ identifier })
                    });
                    const data = await response.json();
                    if (data.exists) {
                        passwordField.classList.remove('hidden');
                    } else {
                        alert('User not found. Please sign up.');
                    }
                } catch (error) {
                    console.error('Error checking user:', error);
                }
            }
        });
    }

    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const identifier = loginIdentifier.value;
            const password = loginPassword.value;
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier, password })
                });
                const data = await response.json();
                if (data.token) {
                    localStorage.setItem('token', data.token);
                    window.location.href = 'dashboard.html';
                } else {
                    alert('Invalid credentials');
                }
            } catch (error) {
                console.error('Error logging in:', error);
            }
        });
    }

    // Registration form submission
    if (registrationForm) {
        registrationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(registrationForm);
            
            // Client-side validation
            const email = formData.get('email');
            const phoneNumber = formData.get('phoneNumber');
            const password = formData.get('password');
            const confirmPassword = formData.get('confirmPassword');
            const restaurantName = formData.get('restaurantName');
            const ownerName = formData.get('ownerName');
            const latitude = formData.get('latitude');
            const longitude = formData.get('longitude');
            const upiId = formData.get('upiId');
            const accountHolderName = formData.get('accountHolderName');
            const bankName = formData.get('bankName');
            const accountNumber = formData.get('accountNumber');
            const ifscCode = formData.get('ifscCode');
            
            if (!email || !phoneNumber || !password || !confirmPassword || !restaurantName || !ownerName || !latitude || !longitude || !upiId || !accountHolderName || !bankName || !accountNumber || !ifscCode) {
                alert('All required fields must be filled');
                return;
            }

            if (password !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                if (data.token) {
                    localStorage.setItem('token', data.token);
                    window.location.href = 'dashboard.html';
                } else {
                    alert('Registration failed: ' + (data.message || 'Unknown error'));
                }
            } catch (error) {
                console.error('Error registering:', error);
                alert('An error occurred: ' + error.message);
            }
        });
    }

    // Map and location functionality
    let map, marker, searchBox;

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

        document.getElementById('useCurrentLocation').addEventListener('click', useCurrentLocation);

        // Initialize the search box
        const input = document.getElementById('locationSearch');
        searchBox = new google.maps.places.SearchBox(input);

        // Bias the SearchBox results towards current map's viewport.
        map.addListener('bounds_changed', function() {
            searchBox.setBounds(map.getBounds());
        });

        // Listen for the event fired when the user selects a prediction and retrieve
        // more details for that place.
        searchBox.addListener('places_changed', function() {
            const places = searchBox.getPlaces();

            if (places.length == 0) {
                return;
            }

            // For each place, get the icon, name and location.
            const bounds = new google.maps.LatLngBounds();
            places.forEach(function(place) {
                if (!place.geometry) {
                    console.log("Returned place contains no geometry");
                    return;
                }

                placeMarker(place.geometry.location);

                if (place.geometry.viewport) {
                    // Only geocodes have viewport.
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

    function useCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                placeMarker(new google.maps.LatLng(pos.lat, pos.lng));
            }, function() {
                handleLocationError(true, map.getCenter());
            });
        } else {
            handleLocationError(false, map.getCenter());
        }
    }

    function handleLocationError(browserHasGeolocation, pos) {
        alert(browserHasGeolocation ?
            'Error: The Geolocation service failed.' :
            'Error: Your browser doesn\'t support geolocation.');
    }

    window.onload = initMap;
});

