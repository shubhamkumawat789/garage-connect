window.openReviewModal = (bookingId) => {
    const modal = document.getElementById('reviewModal');
    const input = document.getElementById('reviewBookingId');
    if (modal && input) {
        input.value = bookingId;
        modal.classList.add('active');
    } else {
        console.error('Review Modal elements not found');
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Auth & Session check
    const user = await window.gcApi.checkAuth();
    if (!user || user.role !== 'CUSTOMER') {
        window.gcApi.logout();
        return;
    }

    // 2. UI Initialization
    document.querySelector('header h2').innerText = `Welcome Back, ${user.fullName}!`;
    
    // Fill profile tab
    const profileForm = document.querySelector('.profile-form');
    if (profileForm) {
        profileForm.querySelector('input[type="text"]').value = user.fullName;
        profileForm.querySelector('input[type="email"]').value = user.email;
    }

    // 3. Tab Loaders
    let allGarages = [];
    const loadGarages = async () => {
        const resultsArea = document.querySelector('.garage-list');
        resultsArea.innerHTML = '<p>Loading garages...</p>';
        try {
            const data = await window.gcApi.fetch('/garages');
            if (data.success) {
                allGarages = data.garages;
                initMap(); // Ensure map is initialized before first render
                renderDashboard(allGarages);
            }
        } catch (err) {
            resultsArea.innerHTML = `<p>Error loading garages: ${err.message}</p>`;
        }
    };

    const renderDashboard = (garages) => {
        const resultsArea = document.querySelector('.garage-list');
        
        // 1. One source of truth for cards
        if (garages.length === 0) {
            resultsArea.innerHTML = '<p>No garages found matching your criteria.</p>';
        } else {
            resultsArea.innerHTML = garages.map(g => {
                const addressParts = [g.address, g.city, g.state].filter(v => v && String(v).toLowerCase() !== 'null');
                const formattedAddress = addressParts.join(', ');
                
                return `
                    <div class="garage-card" data-garage-id="${g.id}" data-garage-name="${g.garageName.replace(/"/g, '&quot;')}" style="cursor:pointer;">
                        <img src="${g.images?.[0] || 'Auto pro.png'}" alt="Garage Image">
                        <div class="card-details">
                            <h3>${g.garageName}</h3>
                            <p class="rating">
                                <i class="fas fa-star"></i> ${g.rating.toFixed(1)} (${g._count?.reviews ?? g.reviewCount ?? 0} Reviews)
                            </p>
                            <p><i class="fas fa-map-marker-alt"></i> ${formattedAddress}</p>
                            <p><i class="fas fa-tag"></i> ${g.services?.map(s => s.name).join(', ') || 'General Service'}</p>
                            <button class="view-btn" onclick="event.stopPropagation(); window.location.href='booking.html?id=${g.id}'">View & Book</button>
                        </div>
                    </div>
                `;
            }).join('');

            // Card click sync: center map & open marker popup
            document.querySelectorAll('.garage-card').forEach(card => {
                card.addEventListener('click', () => {
                    const garageId = card.getAttribute('data-garage-id');
                    const marker = markers.find(m => m.options.garageId === garageId);
                    if (marker) {
                        marker.openPopup();
                        map.setView(marker.getLatLng(), 15);
                    }
                });
            });
        }

        // 2. One source of truth for markers
        updateMapMarkers(garages);
    };

    // --- UI Logic Fixes (Real Maps & Emergency) ---
    let map;
    let markers = [];
    const emergencyBtn = document.querySelector('.emergency-btn');
    
    const initMap = () => {
        if (map) return;
        try {
            // Default to Portland (matching seed data)
            map = L.map('map').setView([45.5231, -122.6765], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
            console.log("[MAP] Leaflet initialized successfully.");
            
            // Fix for hidden containers or delayed layout
            setTimeout(() => map.invalidateSize(), 300);
        } catch (err) {
            console.error("[MAP] Failed to initialize Leaflet:", err);
        }
    };

    const updateMapMarkers = (garages) => {
        if (!map) initMap();
        
        // Clear old markers
        markers.forEach(m => map.removeLayer(m));
        markers = [];

        const bounds = [];
        garages.forEach(g => {
            if (g.latitude && g.longitude) {
                const marker = L.marker([g.latitude, g.longitude], { garageId: g.id }).addTo(map);
                
                const addressParts = [g.address, g.city, g.state].filter(v => v && String(v).toLowerCase() !== 'null');
                const formattedAddress = addressParts.join(', ');
                
                marker.bindPopup(`<b>${g.garageName}</b><br>${formattedAddress}`);
                
                // Marker click sync: scroll into view and highlight card
                marker.on('click', () => {
                    const card = document.querySelector(`.garage-card[data-garage-id="${g.id}"]`);
                    if (card) {
                        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        card.style.border = '2px solid #409db6';
                        card.style.backgroundColor = '#f0f9fb';
                        setTimeout(() => {
                            card.style.border = 'none';
                            card.style.backgroundColor = 'white';
                        }, 3000);
                    }
                });

                markers.push(marker);
                bounds.push([g.latitude, g.longitude]);
            }
        });

        // Fit map to visible markers
        if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
        
        // Ensure tiles are correctly rendered
        map.invalidateSize();
    };

    const applyFilters = () => {
        const rating = parseInt(document.getElementById('filterRating').value) || 0;
        const type = document.getElementById('filterType').value;
        const service = document.getElementById('filterService').value;
        const query = document.querySelector('.search-container input').value.toLowerCase();
        const isEmergencyMode = emergencyBtn.classList.contains('active');

        let filtered = allGarages.filter(g => {
            const matchesQuery = !query || g.garageName.toLowerCase().includes(query) || 
                               (g.address && g.address.toLowerCase().includes(query)) || 
                               (g.city && g.city.toLowerCase().includes(query));
            const matchesRating = g.rating >= rating;
            const matchesType = !type || g.services.some(s => s.vehicleTypes.includes(type));
            const matchesService = !service || g.services.some(s => s.name === service);
            
            // Emergency Logic: service=Emergency + isVerified=true
            if (isEmergencyMode) {
                const hasEmergencyService = g.services.some(s => s.name.toLowerCase().includes('emergency'));
                if (!hasEmergencyService || !g.isVerified) return false;
            }

            return matchesQuery && matchesRating && matchesType && matchesService;
        });

        // Geolocation Radius Logic for Emergency Mode (Optional layer)
        if (isEmergencyMode && "geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const radiusKm = 10;
                    
                    const nearbyFiltered = filtered.filter(g => {
                        if (!g.latitude || !g.longitude) return false;
                        const dist = window.gcApi.getDistance(latitude, longitude, g.latitude, g.longitude);
                        return dist <= radiusKm;
                    });
                    
                    renderDashboard(nearbyFiltered);
                    console.log("[EMERGENCY] Radius filter (10km) applied.");
                },
                (err) => {
                    console.warn("[EMERGENCY] Geolocation fallback: showing all verified emergency garages.");
                    renderDashboard(filtered);
                }
            );
        } else {
            renderDashboard(filtered);
        }
    };

    emergencyBtn?.addEventListener('click', () => {
        emergencyBtn.classList.toggle('active');
        emergencyBtn.style.backgroundColor = emergencyBtn.classList.contains('active') ? '#b64040' : 'red';
        applyFilters();
    });

    document.getElementById('filterRating').addEventListener('change', applyFilters);
    document.getElementById('filterType').addEventListener('change', applyFilters);
    document.getElementById('filterService').addEventListener('change', applyFilters);
    document.querySelector('.search-container button').addEventListener('click', applyFilters);
    document.querySelector('.search-container input').addEventListener('keyup', (e) => { if (e.key === 'Enter') applyFilters(); });

    const loadBookings = async () => {
        const bookingsSection = document.getElementById('bookings');
        const container = bookingsSection.querySelector('.booking-card')?.parentElement || bookingsSection;
        const h2 = bookingsSection.querySelector('h2');
        container.innerHTML = '';
        if(h2) container.appendChild(h2);

        try {
            const data = await window.gcApi.fetch('/bookings/my');
            if (data.success) {
                if (data.bookings.length === 0) {
                    container.innerHTML += '<p>No bookings found.</p>';
                } else {
                    data.bookings.forEach(b => {
                        const date = new Date(b.scheduledDate).toLocaleDateString();
                        const time = new Date(b.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        
                        // Progress Tracker Logic
                        const statusOrder = ['PENDING', 'APPROVED', 'IN_PROGRESS', 'COMPLETED'];
                        const currentIndex = statusOrder.indexOf(b.status);
                        const progressHtml = `
                            <div class="progress-container" style="display:flex; gap:10px; margin-top:10px;">
                                ${statusOrder.map((s, idx) => `
                                    <div class="prog-dot" style="flex:1; height:4px; border-radius:2px; background:${idx <= currentIndex ? '#409db6' : '#eee'};"></div>
                                `).join('')}
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-top:5px; color:#999;">
                                <span>Pending</span><span>Done</span>
                            </div>
                        `;

                        container.innerHTML += `
                            <div class="booking-card">
                                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                                    <h4>${b.items.map(i => i.service.name).join(', ')} at ${b.garage.garageName}</h4>
                                    <span class="status ${b.status.toLowerCase()}">${b.status}</span>
                                </div>
                                <p><i class="fas fa-calendar-alt"></i> Date: ${date} | <i class="fas fa-clock"></i> Time: ${time}</p>
                                ${progressHtml}
                                ${b.status === 'COMPLETED' ? `<button class="view-btn" onclick="openReviewModal('${b.id}')" style="margin-top:15px">Leave Review</button>` : ''}
                            </div>
                        `;
                    });
                }
            }
        } catch (err) {
            container.innerHTML += `<p>Error loading bookings: ${err.message}</p>`;
        }
    };

    // 4. Initial Load
    loadGarages();

    // 5. Event Listeners for tabs (skip logout)
    document.querySelectorAll('.nav li').forEach(li => {
        if (li.classList.contains('logout')) return;
        li.addEventListener('click', () => {
            const target = li.getAttribute('data-target');
            if (target === 'search') loadGarages();
            if (target === 'bookings') loadBookings();
        });
    });

    // Profile update
    profileForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = profileForm.querySelector('button');
        const fullName = profileForm.querySelector('input[type="text"]').value;

        try {
            btn.disabled = true;
            const data = await window.gcApi.fetch('/users/profile/customer', {
                method: 'PUT',
                body: JSON.stringify({ fullName })
            });
            if (data.success) {
                alert('Profile updated!');
                document.querySelector('header h2').innerText = `Welcome Back, ${data.user.fullName}!`;
            }
        } catch (err) {
            alert(err.message);
        } finally {
            btn.disabled = false;
        }
    });

    // 6. Manage Vehicles Modal & Logic
    const addVehicleModal = document.getElementById('addVehicleModal');
    const addVehicleBtn = document.querySelector('.add-btn');
    const closeBtn = document.querySelector('.close-btn');
    const addVehicleForm = document.getElementById('addVehicleForm');

    addVehicleBtn?.addEventListener('click', () => addVehicleModal.classList.add('active'));
    closeBtn?.addEventListener('click', () => addVehicleModal.classList.remove('active'));
    window.addEventListener('click', (e) => { if (e.target === addVehicleModal) addVehicleModal.classList.remove('active'); });

    const loadVehicles = async () => {
        const vehiclesSection = document.getElementById('vehicles');
        const list = vehiclesSection.querySelector('.vehicle-card')?.parentElement || vehiclesSection;
        const h2 = vehiclesSection.querySelector('h2');
        const btn = vehiclesSection.querySelector('.add-btn');

        list.innerHTML = '';
        if(h2) list.appendChild(h2);

        try {
            const data = await window.gcApi.fetch('/users/me'); // Using /me to get profile data
            if (data.success && data.profile.vehicles) {
                data.profile.vehicles.forEach(v => {
                    list.innerHTML += `
                        <div class="vehicle-card">
                            <h4>${v.make} ${v.model} - ${v.vehicleNumber}</h4>
                            <p><strong>Type:</strong> ${v.vehicleType.replace('_', ' ')}</p>
                            <button>View History</button>
                        </div>
                    `;
                });
            }
        } catch (err) {
            console.error(err);
        }
        if(btn) list.appendChild(btn);
    };

    addVehicleForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = addVehicleForm.querySelector('button');
        const payload = {
            make: document.getElementById('vMake').value,
            model: document.getElementById('vModel').value,
            year: parseInt(document.getElementById('vYear').value),
            vehicleNumber: document.getElementById('vNumber').value,
            vehicleType: document.getElementById('vType').value
        };

        try {
            btn.disabled = true;
            btn.innerText = 'Adding...';
            const data = await window.gcApi.fetch('/users/vehicles', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            if (data.success) {
                alert('Vehicle added!');
                addVehicleModal.classList.remove('active');
                addVehicleForm.reset();
                loadVehicles();
            }
        } catch (err) {
            alert(err.message);
        } finally {
            btn.disabled = false;
            btn.innerText = 'Add Vehicle';
        }
    });

    loadVehicles();

    // 7. Review Modal Logic
    const reviewModal = document.getElementById('reviewModal');
    const reviewForm = document.getElementById('reviewForm');
    const closeReview = document.getElementById('closeReview');

    closeReview?.addEventListener('click', () => reviewModal.classList.remove('active'));
    window.addEventListener('click', (e) => { if (e.target === reviewModal) reviewModal.classList.remove('active'); });

    reviewForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = reviewForm.querySelector('button');
        const bookingId = document.getElementById('reviewBookingId').value;
        const rating = parseInt(document.getElementById('reviewRating').value);
        const comment = document.getElementById('reviewComment').value;

        try {
            btn.disabled = true;
            btn.innerText = 'Submitting...';

            const data = await window.gcApi.fetch('/reviews', {
                method: 'POST',
                body: JSON.stringify({ bookingId, rating, comment })
            });

            if (data.success) {
                alert('Review submitted successfully!');
                reviewModal.classList.remove('active');
                reviewForm.reset();
                loadBookings(); // Refresh to remove button
            }
        } catch (err) {
            alert(err.message || 'Failed to submit review');
        } finally {
            btn.disabled = false;
            btn.innerText = 'Submit Review';
        }
    });
});

