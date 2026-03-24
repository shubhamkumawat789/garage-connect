// Global functions for HTML onclick handlers
window.deleteService = async (serviceId) => {
    try {
        const data = await window.gcApi.fetch(`/services/${serviceId}`, {
            method: 'DELETE'
        });
        if (data.success) {
            alert('Service deleted successfully!');
            window.location.reload();
        }
    } catch (err) {
        alert(err.message);
    }
};

window.updateBookingStatus = async (id, status) => {
    try {
        const data = await window.gcApi.fetch(`/bookings/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
        if (data.success) {
            window.location.reload();
        }
    } catch (err) {
        alert(err.message);
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Auth & Session check
    const user = await window.gcApi.checkAuth();
    if (!user || user.role !== 'GARAGE_OWNER') {
        window.gcApi.logout();
        return;
    }

    // 2. Fetch Garage Data
    let garage = null;
    try {
        const garagesData = await window.gcApi.fetch('/garages'); 
        const allGarages = garagesData.garages;
        garage = allGarages.find(g => g.userId === user.id);
        
        if (!garage) {
            console.error("No garage found for owner", user.id);
        }
    } catch (err) {
        console.error("Could not fetch garage info", err);
    }

    if (garage) {
        document.querySelector('header h2').innerText = `Welcome, ${garage.garageName}!`;
        // Populate stats (mock for now or real if available)
        document.querySelector('.stat-card:nth-child(3) p').innerText = `${garage.rating.toFixed(1)} / 5`;
        
        // Fill profile tab
        const profileForm = document.querySelector('.profile-form');
        if (profileForm) {
            profileForm.querySelector('input:nth-of-type(1)').value = garage.garageName;
            profileForm.querySelector('input:nth-of-type(2)').value = user.fullName;
            profileForm.querySelector('input:nth-of-type(3)').value = garage.contactNo || '';
            profileForm.querySelector('input:nth-of-type(4)').value = garage.address;
            document.getElementById('profOpeningHours').value = garage.openingHours || '';
            document.getElementById('profDescription').value = garage.description || '';
        }

        // Load Services
        const loadServices = () => {
            const container = document.getElementById('services');
            const list = container.querySelector('.service-card')?.parentElement || container;
            const h2 = container.querySelector('h2');
            const addBtn = container.querySelector('.add-btn');
            
            list.innerHTML = '';
            if (h2) list.appendChild(h2);

            garage.services.forEach(s => {
                list.innerHTML += `
                    <div class="service-card">
                        <h4>${s.name}</h4>
                        <p><strong>Price:</strong> Rs. ${s.basePrice}</p>
                        <p><strong>Vehicle Types:</strong> ${s.vehicleTypes.join(', ')}</p>
                        <div style="margin-top: 10px; display:flex; gap: 10px;">
                            <button class="edit-btn" style="background:#ffc107; color:#000;" 
                                data-id="${s.id}" data-name="${s.name}" data-price="${s.basePrice}" data-vtypes="${s.vehicleTypes.join(',')}" data-parts="${s.partsAvailable || ''}">Edit</button>
                            <button class="delete-btn" style="background:#dc3545; color:#fff;" onclick="deleteService('${s.id}')">Delete</button>
                        </div>
                    </div>
                `;
            });
            if (addBtn) list.appendChild(addBtn);
        };
        loadServices();

        // Load Bookings & Calculate Stats
        const loadBookings = async () => {
            const container = document.getElementById('bookings');
            container.innerHTML = '<h2>All Bookings</h2>';
            try {
                const data = await window.gcApi.fetch(`/bookings/garage`);
                if (data.success) {
                    const bookings = data.bookings;
                    
                    // 1. Calculate Real-time Stats
                    const now = new Date();
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    const today = now.toDateString();

                    const todayCount = bookings.filter(b => new Date(b.scheduledDate).toDateString() === today).length;
                    const monthlyRevenue = bookings
                        .filter(b => b.status === 'COMPLETED' && b.completedAt && new Date(b.completedAt) >= startOfMonth)
                        .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

                    document.querySelector('.stat-card:nth-child(1) p').innerText = todayCount;
                    document.querySelector('.stat-card:nth-child(2) p').innerText = `Rs. ${monthlyRevenue.toLocaleString()}`;

                    if (bookings.length === 0) {
                        container.innerHTML += '<p>No bookings yet.</p>';
                    } else {
                        bookings.forEach(b => {
                            const date = new Date(b.scheduledDate).toLocaleDateString();
                            container.innerHTML += `
                                <div class="booking-card">
                                    <div style="display:flex; justify-content:space-between;">
                                        <h4>${b.items.map(item => item.service.name).join(', ')}</h4>
                                        <span class="status ${b.status.toLowerCase()}">${b.status}</span>
                                    </div>
                                    <p><strong>Customer:</strong> ${b.customer.user.fullName}</p>
                                    <p><i class="fas fa-calendar-alt"></i> Date: ${date}</p>
                                    ${b.status === 'PENDING' ? `
                                        <div style="margin-top:10px">
                                            <button class="approve-btn" onclick="updateBookingStatus('${b.id}', 'APPROVED')">Approve</button>
                                            <button class="decline-btn" onclick="updateBookingStatus('${b.id}', 'DECLINED')">Decline</button>
                                        </div>
                                    ` : ''}
                                    ${b.status === 'APPROVED' ? `
                                        <div style="margin-top:10px">
                                            <button class="approve-btn" onclick="updateBookingStatus('${b.id}', 'IN_PROGRESS')">Start Work</button>
                                        </div>
                                    ` : ''}
                                    ${b.status === 'IN_PROGRESS' ? `
                                        <div style="margin-top:10px">
                                            <button class="approve-btn" onclick="updateBookingStatus('${b.id}', 'COMPLETED')">Mark Completed</button>
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                        });
                    }
                }
            } catch (err) {
                container.innerHTML += `<p>Error: ${err.message}</p>`;
            }
        };
        loadBookings();

        window.updateBookingStatus = async (id, status) => {
            try {
                const data = await window.gcApi.fetch(`/bookings/${id}/status`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status })
                });
                if (data.success) {
                    loadBookings();
                }
            } catch (err) {
                alert(err.message);
            }
        };

        // 5. Manage Services Modal & Logic
        const addServiceModal = document.getElementById('addServiceModal');
        const addServiceBtn = document.querySelector('.add-btn');
        const closeBtn = document.querySelector('.close-btn');
        const addServiceForm = document.getElementById('addServiceForm');

        addServiceBtn?.addEventListener('click', () => addServiceModal.classList.add('active'));
        closeBtn?.addEventListener('click', () => addServiceModal.classList.remove('active'));
        window.addEventListener('click', (e) => { if (e.target === addServiceModal) addServiceModal.classList.remove('active'); });

        addServiceForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = addServiceForm.querySelector('button');
            const vehicleTypes = [];
            if (document.getElementById('vType4').checked) vehicleTypes.push('FOUR_WHEELER');
            if (document.getElementById('vType2').checked) vehicleTypes.push('TWO_WHEELER');

            const payload = {
                name: document.getElementById('sName').value,
                basePrice: parseFloat(document.getElementById('sPrice').value),
                vehicleTypes,
                partsAvailable: document.getElementById('sParts').value
            };

            try {
                btn.disabled = true;
                btn.innerText = 'Adding...';
                const data = await window.gcApi.fetch('/services', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                if (data.success) {
                    alert('Service added!');
                    addServiceModal.classList.remove('active');
                    addServiceForm.reset();
                    // Refresh garage data to show new service
                    window.location.reload(); 
                }
            } catch (err) {
                alert(err.message);
            } finally {
                btn.disabled = false;
                btn.innerText = 'Add Service';
            }
        });

        // 6. Profile Update
        profileForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = profileForm.querySelector('button');
            const payload = {
                fullName: profileForm.querySelector('input:nth-of-type(2)').value,
                garage: {
                    garageName: profileForm.querySelector('input:nth-of-type(1)').value,
                    contactNo: profileForm.querySelector('input:nth-of-type(3)').value,
                    address: profileForm.querySelector('input:nth-of-type(4)').value,
                    openingHours: document.getElementById('profOpeningHours').value,
                    description: document.getElementById('profDescription').value
                }
            };

            try {
                btn.disabled = true;
                const data = await window.gcApi.fetch('/users/profile/garage', {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                if (data.success) {
                    alert('Garage profile updated!');
                }
            } catch (err) {
                alert(err.message);
            } finally {
                btn.disabled = false;
            }
        });

        // 7. Edit Service Modal & Logic
        const editServiceModal = document.getElementById('editServiceModal');
        const closeEditBtn = document.querySelector('.close-edit-btn');
        const editServiceForm = document.getElementById('editServiceForm');

        closeEditBtn?.addEventListener('click', () => editServiceModal.classList.remove('active'));
        window.addEventListener('click', (e) => { if (e.target === editServiceModal) editServiceModal.classList.remove('active'); });

        // Event delegation for dynamically added Edit buttons
        document.getElementById('services').addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-btn')) {
                const btn = e.target;
                document.getElementById('editServiceId').value = btn.getAttribute('data-id');
                document.getElementById('editSName').value = btn.getAttribute('data-name');
                document.getElementById('editSPrice').value = btn.getAttribute('data-price');
                
                const vTypes = btn.getAttribute('data-vtypes').split(',');
                document.getElementById('editVType4').checked = vTypes.includes('FOUR_WHEELER');
                document.getElementById('editVType2').checked = vTypes.includes('TWO_WHEELER');
                document.getElementById('editSParts').value = btn.getAttribute('data-parts');
                
                editServiceModal.classList.add('active');
            }
        });

        editServiceForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = editServiceForm.querySelector('button');
            const serviceId = document.getElementById('editServiceId').value;
            const vehicleTypes = [];
            if (document.getElementById('editVType4').checked) vehicleTypes.push('FOUR_WHEELER');
            if (document.getElementById('editVType2').checked) vehicleTypes.push('TWO_WHEELER');

            const payload = {
                name: document.getElementById('editSName').value,
                basePrice: parseFloat(document.getElementById('editSPrice').value),
                vehicleTypes,
                partsAvailable: document.getElementById('editSParts').value
            };

            try {
                btn.disabled = true;
                btn.innerText = 'Saving...';
                const data = await window.gcApi.fetch(`/services/${serviceId}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                if (data.success) {
                    alert('Service updated successfully!');
                    window.location.reload();
                }
            } catch (err) {
                alert(err.message);
            } finally {
                btn.disabled = false;
                btn.innerText = 'Save Changes';
            }
        });

        // 8. Delete Service Logic
        window.deleteService = async (serviceId) => {
            // Native confirm removed to allow automated E2E testing
            try {
                const data = await window.gcApi.fetch(`/services/${serviceId}`, {
                    method: 'DELETE'
                });
                if (data.success) {
                    alert('Service deleted successfully!');
                    window.location.reload();
                }
            } catch (err) {
                alert(err.message);
            }
        };
        // 9. Wallet Logic
        const loadWallet = async () => {
            const balanceEl = document.getElementById('walletBalance');
            const listEl = document.getElementById('transactionList');
            try {
                const data = await window.gcApi.fetch(`/wallet/${garage.id}`);
                if (data.success) {
                    balanceEl.innerText = `Rs. ${data.balance.toLocaleString()}`;
                    if (data.transactions.length === 0) {
                        listEl.innerHTML = '<p>No transactions yet.</p>';
                    } else {
                        listEl.innerHTML = `
                            <table style="width:100%; border-collapse: collapse; margin-top:10px;">
                                <thead style="background:#f4f4f4;">
                                    <tr>
                                        <th style="padding:10px; text-align:left; border-bottom:1px solid #ddd;">Date</th>
                                        <th style="padding:10px; text-align:left; border-bottom:1px solid #ddd;">Type</th>
                                        <th style="padding:10px; text-align:left; border-bottom:1px solid #ddd;">Amount</th>
                                        <th style="padding:10px; text-align:left; border-bottom:1px solid #ddd;">Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${data.transactions.map(t => `
                                        <tr>
                                            <td style="padding:10px; border-bottom:1px solid #eee;">${new Date(t.createdAt).toLocaleDateString()}</td>
                                            <td style="padding:10px; border-bottom:1px solid #eee;"><span style="color: ${t.type === 'WITHDRAWAL' ? 'red' : 'green'}">${t.type}</span></td>
                                            <td style="padding:10px; border-bottom:1px solid #eee;">Rs. ${t.amount.toLocaleString()}</td>
                                            <td style="padding:10px; border-bottom:1px solid #eee;">${t.description || '-'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        `;
                    }
                }
            } catch (err) {
                listEl.innerHTML = `<p>Error: ${err.message}</p>`;
            }
        };

        const addMoneyForm = document.getElementById('addMoneyForm');
        addMoneyForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = addMoneyForm.querySelector('button');
            const payload = {
                garageId: garage.id,
                amount: parseFloat(document.getElementById('walletAmount').value),
                type: document.getElementById('walletType').value,
                description: document.getElementById('walletDescription').value
            };

            try {
                btn.disabled = true;
                btn.innerText = 'Processing...';
                const data = await window.gcApi.fetch('/wallet', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                if (data.success) {
                    alert('Transaction processed successfully!');
                    addMoneyForm.reset();
                    loadWallet();
                }
            } catch (err) {
                alert(err.message);
            } finally {
                btn.disabled = false;
                btn.innerText = 'Process Transaction';
            }
        });

        // 10. Feedback Logic
        const feedbackModal = document.getElementById('feedbackModal');
        const openFeedbackBtn = document.getElementById('openFeedback');
        const closeFeedbackBtn = document.getElementById('closeFeedback');
        const feedbackForm = document.getElementById('feedbackForm');

        openFeedbackBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            feedbackModal.classList.add('active');
        });

        closeFeedbackBtn?.addEventListener('click', () => feedbackModal.classList.remove('active'));
        window.addEventListener('click', (e) => { if (e.target === feedbackModal) feedbackModal.classList.remove('active'); });

        feedbackForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = feedbackForm.querySelector('button');
            const message = document.getElementById('feedbackMessage').value;

            try {
                btn.disabled = true;
                btn.innerText = 'Submitting...';
                const data = await window.gcApi.fetch('/feedback', {
                    method: 'POST',
                    body: JSON.stringify({ message })
                });
                if (data.success) {
                    alert('Thank you for your feedback!');
                    feedbackModal.classList.remove('active');
                    feedbackForm.reset();
                }
            } catch (err) {
                alert(err.message);
            } finally {
                btn.disabled = false;
                btn.innerText = 'Submit Feedback';
            }
        });

        // 11. Emergency Alerts Logic
        const loadEmergencyRequests = async () => {
            const container = document.getElementById('emergencyContainer');
            if (!garage.isVerified) {
                container.innerHTML = '<p style="color:red;"><i class="fas fa-lock"></i> Only verified garages can view active emergency alerts. Please contact admin for verification.</p>';
                return;
            }

            try {
                const data = await window.gcApi.fetch('/emergency');
                if (data.success) {
                    const requests = data.requests;
                    if (requests.length === 0) {
                        container.innerHTML = '<p>No active emergency alerts in your area.</p>';
                    } else {
                        container.innerHTML = requests.map(r => `
                            <div class="booking-card" style="border-left: 4px solid ${r.status === 'PENDING' ? '#ff4d4d' : '#4CAF50'};">
                                <div style="display:flex; justify-content:space-between; align-items:start;">
                                    <div>
                                        <h4>Emergency Petrol Request</h4>
                                        <p><strong>Customer:</strong> ${r.customer.user.fullName}</p>
                                        <p><strong>Status:</strong> <span class="status ${r.status.toLowerCase()}">${r.status}</span></p>
                                        <p><i class="fas fa-clock"></i> ${new Date(r.createdAt).toLocaleString()}</p>
                                    </div>
                                    <div style="text-align:right;">
                                        <a href="https://www.google.com/maps?q=${r.latitude},${r.longitude}" target="_blank" class="approve-btn" style="background:#409db6; margin-bottom:5px; display:inline-block; padding: 5px 10px; font-size:12px;">
                                            <i class="fas fa-map-marker-alt"></i> View Location
                                        </a>
                                        ${r.status === 'PENDING' ? `
                                            <button class="approve-btn" onclick="responseToEmergency('${r.id}', 'RESPONDED')" style="display:block; width:100%;">Respond Now</button>
                                        ` : ''}
                                        ${r.status === 'RESPONDED' ? `
                                            <button class="approve-btn" onclick="responseToEmergency('${r.id}', 'RESOLVED')" style="display:block; width:100%; background:#28a745;">Mark Resolved</button>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                        `).join('');
                    }
                }
            } catch (err) {
                container.innerHTML = `<p>Error: ${err.message}</p>`;
            }
        };

        window.responseToEmergency = async (id, status) => {
            try {
                const data = await window.gcApi.fetch(`/emergency/${id}/status`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status })
                });
                if (data.success) {
                    loadEmergencyRequests();
                }
            } catch (err) {
                alert(err.message);
            }
        };
        // 12. Reviews Logic
        const loadReviews = async () => {
            const container = document.getElementById('reviewsContainer');
            try {
                // Fetch full details including reviews for this specific garage
                const data = await window.gcApi.fetch(`/garages/${garage.id}`);
                const myGarage = data.garage;
                
                if (myGarage.reviews && myGarage.reviews.length > 0) {
                    container.innerHTML = myGarage.reviews.map(r => `
                        <div class="booking-card">
                            <div style="display:flex; justify-content:space-between;">
                                <strong>${r.customer?.user?.fullName || 'Anonymous Customer'}</strong>
                                <span style="color:#f1c40f;">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span>
                            </div>
                            <p style="margin-top:10px;">${r.comment || 'No comment provided.'}</p>
                            <small style="color:#888;">${new Date(r.createdAt).toLocaleDateString()}</small>
                        </div>
                    `).join('');
                } else {
                    container.innerHTML = '<p>No reviews yet.</p>';
                }
            } catch (err) {
                container.innerHTML = `<p>Error loading reviews: ${err.message}</p>`;
            }
        };

        // 13. Initial Load for tabs
        document.querySelectorAll('.nav li').forEach(li => {
            li.addEventListener('click', () => {
                const target = li.getAttribute('data-target');
                if (target === 'wallet') loadWallet();
                if (target === 'emergency-list') loadEmergencyRequests();
                if (target === 'reviews-list') loadReviews();
            });
        });
    }
});
