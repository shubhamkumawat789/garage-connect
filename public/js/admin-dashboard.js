document.addEventListener('DOMContentLoaded', () => {
    // 1. Guard pattern — explicitly check if user is an ADMIN
    const user = window.gcApi.getUser();
    if (!user || user.role !== 'ADMIN') {
        alert("Unauthorized. Admin access only.");
        window.gcApi.logout();
        return;
    }

    document.getElementById('adminGreeting').innerText = `Welcome Back, ${user.fullName || 'Admin'}!`;

    // 2. DOM Elements
    const usersTbody = document.querySelector('#usersTable tbody');
    const garagesTbody = document.querySelector('#garagesTable tbody');
    const reviewsTbody = document.querySelector('#reviewsTable tbody');

    // 3. Data Loaders
    async function loadUsers() {
        usersTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading users...</td></tr>';
        const data = await window.gcApi.fetch('/admin/users');
        if (data && data.success) {
            if (data.users.length === 0) {
                usersTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No users found.</td></tr>';
                return;
            }
            usersTbody.innerHTML = data.users.map(u => `
                <tr>
                    <td>${u.fullName || 'N/A'}</td>
                    <td>${u.email}</td>
                    <td><span class="badge ${u.role === 'ADMIN' ? 'badge-verified' : ''}" style="${u.role==='ADMIN'?'background:#cce5ff;color:#004085':''}">${u.role}</span></td>
                    <td>${new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
            `).join('');
        } else {
            usersTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Failed to load users.</td></tr>';
        }
    }

    async function loadGarages() {
        garagesTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading garages...</td></tr>';
        const data = await window.gcApi.fetch('/admin/garages');
        if (data && data.success) {
            if (data.garages.length === 0) {
                garagesTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No garages found.</td></tr>';
                return;
            }
            garagesTbody.innerHTML = data.garages.map(g => `
                <tr>
                    <td><strong>${g.garageName}</strong></td>
                    <td>${g.user?.fullName || 'Unknown'} (${g.user?.email || ''})</td>
                    <td>${g.address}<br><small>${g.city}, ${g.state} ${g.pincode}</small></td>
                    <td><span class="badge ${g.isVerified ? 'badge-verified' : 'badge-unverified'}">${g.isVerified ? 'Verified' : 'Unverified'}</span></td>
                    <td>
                        <button class="btn-verify" onclick="verifyGarage('${g.id}')" ${g.isVerified ? 'disabled' : ''}>
                            ${g.isVerified ? 'Verified' : 'Verify Now'}
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            garagesTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Failed to load garages.</td></tr>';
        }
    }

    async function loadReviews() {
        reviewsTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading reviews...</td></tr>';
        try {
            // Success Criterion: Check reviews associated with all garages via admin
            const data = await window.gcApi.fetch('/admin/garages');
            if (data && data.success) {
                // Flatten reviews from all garages (simplified since we don't have a direct /admin/reviews GET yet)
                // In real implementation, /admin/reviews would exist. Using collected data for now.
                let allReviews = [];
                for (const g of data.garages) {
                    // We fetch detail for each to get reviews if count > 0
                    if (g._count.reviews > 0) {
                        const detail = await window.gcApi.fetch(`/garages/${g.id}`);
                        if (detail.success) allReviews = [...allReviews, ...detail.garage.reviews];
                    }
                }

                if (allReviews.length === 0) {
                    reviewsTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No reviews found.</td></tr>';
                    return;
                }

                reviewsTbody.innerHTML = allReviews.map(r => `
                    <tr>
                        <td><strong>${r.booking?.garage?.garageName || 'Garage'}</strong></td>
                        <td>${r.customer?.user?.fullName || 'User'}</td>
                        <td>${'⭐'.repeat(r.rating)} (${r.rating}/5)</td>
                        <td>${r.comment || '<i>No comment</i>'}</td>
                        <td>
                            <button class="btn-verify" style="background:#dc3545; border-color:#dc3545;" onclick="deleteReview('${r.id}')">
                                Delete
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        } catch (err) {
            reviewsTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Failed to load reviews.</td></tr>';
        }
    }

    // 4. Verification Action
    window.verifyGarage = async (garageId) => {
        if (!confirm('Are you sure you want to verify this garage?')) return;
        
        try {
            const data = await window.gcApi.fetch(`/admin/garages/${garageId}/verify`, {
                method: 'PATCH',
                body: JSON.stringify({ isVerified: true })
            });

            if (data && data.success) {
                alert('Garage successfully verified!');
                loadGarages(); // Refresh table
            } else {
                alert('Failed to verify garage: ' + (data?.message || 'Unknown error'));
            }
        } catch (err) {
            console.error('Verify error:', err);
            alert('An error occurred while verifying.');
        }
    };

    window.deleteReview = async (reviewId) => {
        if (!confirm('Are you sure you want to delete this review? This will recalculate the garage rating.')) return;
        
        try {
            const data = await window.gcApi.fetch(`/admin/reviews/${reviewId}`, {
                method: 'DELETE'
            });

            if (data && data.success) {
                alert('Review deleted and rating updated!');
                loadReviews(); 
            } else {
                alert('Failed to delete review: ' + (data?.message || 'Unknown error'));
            }
        } catch (err) {
            console.error('Delete error:', err);
            alert('An error occurred while deleting.');
        }
    };

    // 5. Initial Load & Tab Listeners
    loadUsers();

    document.querySelectorAll('.nav li').forEach(li => {
        if (li.classList.contains('logout')) return;
        li.addEventListener('click', () => {
            const target = li.getAttribute('data-target');
            if (target === 'users') loadUsers();
            if (target === 'garages') loadGarages();
            if (target === 'reviews') loadReviews();
        });
    });
});
