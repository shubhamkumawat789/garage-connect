document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const garageId = params.get('id');

    if (!garageId) {
        alert('No garage selected');
        window.location.href = 'user-dashboard.html';
        return;
    }

    const user = await window.gcApi.checkAuth();
    if (!user || user.role !== 'CUSTOMER') {
        window.gcApi.logout();
        return;
    }

    const loading = document.getElementById('loading');
    const content = document.getElementById('booking-content');
    const servicesList = document.getElementById('servicesList');
    const vehicleSelect = document.getElementById('vehicleSelect');
    const totalPriceEl = document.getElementById('totalPrice');
    const confirmBtn = document.getElementById('confirmBooking');

    let selectedServices = new Set();
    let garageData = null;

    try {
        // Load Garage Details
        const data = await window.gcApi.fetch(`/garages/${garageId}`);
        if (data.success) {
            garageData = data.garage;
            document.getElementById('garageName').innerText = garageData.garageName;
            document.getElementById('garageAddress').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${garageData.address}, ${garageData.city}`;
            if (garageData.openingHours) {
                document.getElementById('garageAddress').innerHTML += `<br><i class="fas fa-clock"></i> Timing: ${garageData.openingHours}`;
            }
            document.getElementById('garageRating').innerHTML = `<i class="fas fa-star" style="color:#f1c40f"></i> ${garageData.rating.toFixed(1)} (${garageData.reviews?.length || 0} Reviews)`;

            // Populate Services
            servicesList.innerHTML = garageData.services.map(s => `
                <div class="service-item" data-id="${s.id}" data-price="${s.basePrice}">
                    <div>
                        <strong>${s.name}</strong><br>
                        <small>${s.vehicleTypes.join(', ')}</small>
                        ${s.partsAvailable ? `<br><small style="color: #27ae60;"><i class="fas fa-check-circle"></i> Parts: ${s.partsAvailable}</small>` : ''}
                    </div>
                    <div>Rs. ${s.basePrice}</div>
                </div>
            `).join('');

            // Add click handlers for services
            document.querySelectorAll('.service-item').forEach(item => {
                item.addEventListener('click', () => {
                    const id = item.getAttribute('data-id');
                    if (selectedServices.has(id)) {
                        selectedServices.delete(id);
                        item.classList.remove('selected');
                    } else {
                        selectedServices.add(id);
                        item.classList.add('selected');
                    }
                    updateSummary();
                });
            });

            // Populate Reviews
            const reviewsContainer = document.getElementById('reviews-all');
            if (garageData.reviews && garageData.reviews.length > 0) {
                reviewsContainer.innerHTML = garageData.reviews.map(r => `
                    <div style="padding: 15px; border-bottom: 1px solid #eee;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                            <strong>${r.customer.user.fullName}</strong>
                            <span style="color:#f1c40f">${'⭐'.repeat(r.rating)}</span>
                        </div>
                        <p style="font-size: 0.9rem; color: #666; margin: 0;">${r.comment || 'No comment provided.'}</p>
                        <small style="color:#999">${new Date(r.createdAt).toLocaleDateString()}</small>
                    </div>
                `).join('');
            } else {
                reviewsContainer.innerHTML = '<p>No reviews yet for this garage.</p>';
            }
        }

        // Load User Vehicles
        const profileData = await window.gcApi.fetch('/users/me');
        if (profileData.success && profileData.profile.vehicles) {
            vehicleSelect.innerHTML += profileData.profile.vehicles.map(v => `
                <option value="${v.id}">${v.make} ${v.model} (${v.vehicleNumber})</option>
            `).join('');
        }

        loading.style.display = 'none';
        content.style.display = 'block';

    } catch (err) {
        alert('Error loading booking page: ' + err.message);
        window.location.href = 'user-dashboard.html';
    }

    function updateSummary() {
        let total = 0;
        let names = [];
        document.querySelectorAll('.service-item.selected').forEach(item => {
            total += parseFloat(item.getAttribute('data-price'));
            names.push(item.querySelector('strong').innerText);
        });

        document.getElementById('selectedServicesSummary').innerText = names.length > 0 ? names.join(', ') : 'No services selected';
        totalPriceEl.innerText = `Total: Rs. ${total}`;
    }

    confirmBtn.addEventListener('click', async () => {
        if (selectedServices.size === 0) {
            alert('Please select at least one service');
            return;
        }
        if (!vehicleSelect.value) {
            alert('Please select a vehicle');
            return;
        }
        const scheduledDate = document.getElementById('bookingDate').value;
        if (!scheduledDate) {
            alert('Please select a date and time');
            return;
        }

        try {
            confirmBtn.disabled = true;
            confirmBtn.innerText = 'Confirming...';

            const response = await window.gcApi.fetch('/bookings', {
                method: 'POST',
                body: JSON.stringify({
                    garageId,
                    vehicleId: vehicleSelect.value,
                    serviceIds: Array.from(selectedServices),
                    scheduledDate: new Date(scheduledDate).toISOString()
                })
            });

            if (response.success) {
                alert('Booking Confirmed Successfully!');
                window.location.href = 'user-dashboard.html';
            }
        } catch (err) {
            alert(err.message);
            confirmBtn.disabled = false;
            confirmBtn.innerText = 'Confirm Appointment';
        }
    });
});
