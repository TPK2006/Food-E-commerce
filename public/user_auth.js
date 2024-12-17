document.addEventListener('DOMContentLoaded', () => {
    const loginView = document.getElementById('loginView');
    const signupView = document.getElementById('signupView');
    const showSignupLink = document.getElementById('showSignup');
    const showLoginLink = document.getElementById('showLogin');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

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
    document.getElementById('fullscreenToggle').addEventListener('click', toggleFullscreen);

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

function toggleFullscreen() {
    const mapContainer = document.getElementById('mapContainer');
    const searchContainer = document.getElementById('searchContainer');
    mapContainer.classList.toggle('fullscreen');
    searchContainer.classList.toggle('hidden');
    google.maps.event.trigger(map, 'resize');
}

window.onload = initMap;

    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginView.classList.add('hidden');
        signupView.classList.remove('hidden');
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        signupView.classList.add('hidden');
        loginView.classList.remove('hidden');
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(loginForm);
        const loginData = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/user/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(loginData),
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('userToken', data.token);
                window.location.href = 'main_user.html';
            } else {
                const errorData = await response.json();
                alert(`Error: ${errorData.message}`);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        }
    });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(signupForm);
        const userData = Object.fromEntries(formData.entries());

        if (userData.password !== userData.confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        try {
            const response = await fetch('/api/user/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message);
                signupView.classList.add('hidden');
                loginView.classList.remove('hidden');
            } else {
                alert(`Error: ${data.message}`);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        }
    });
});