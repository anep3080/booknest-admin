// --- Global Data ---
// Removed global currentActionReviewId and currentActionType as they are now passed directly

let currentReviews = []; // Still needed to store fetched reviews

// --- Tab Functionality ---
function showClerkTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tabId).classList.add('active');
    const clickedButton = event.currentTarget;
    if (clickedButton) {
        clickedButton.classList.add('active');
    }

    if (tabId === 'reports-tab') {
        fetchReports();
    } else if (tabId === 'moderation-tab') {
        fetchPendingReviews();
    }
}

// --- Modal Functionality ---
// showClerkModal now directly sets the confirm button's onclick handler
function showClerkModal(reviewId, type, reviewText) {
    // console.log("showClerkModal called:", { reviewId, type, reviewText }); // For debugging

    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const confirmBtn = document.getElementById('confirmClerkActionBtn');

    if (type === 'approve') {
        modalTitle.innerHTML = '<i class="fas fa-check-circle"></i> Confirm Approval';
        modalMessage.innerHTML = `
            <p>Approve this review?</p>
            <p class="review-text-preview"><strong>Review:</strong> "${reviewText}"</p>
            <p class="text-success">The review will become visible to all users.</p>
        `;
        confirmBtn.textContent = 'Approve';
        confirmBtn.className = 'btn btn-success';
        // Pass reviewId and type directly to confirmReviewAction
        confirmBtn.onclick = () => confirmReviewAction(reviewId, type);
    } else if (type === 'reject') {
        modalTitle.innerHTML = '<i class="fas fa-times-circle"></i> Confirm Rejection';
        modalMessage.innerHTML = `
            <p>Reject this review?</p>
            <p class="review-text-preview"><strong>Review:</strong> "${reviewText}"</p>
            <p class="text-danger">The review will be permanently removed.</p>
        `;
        confirmBtn.textContent = 'Reject';
        confirmBtn.className = 'btn btn-danger';
        // Pass reviewId and type directly to confirmReviewAction
        confirmBtn.onclick = () => confirmReviewAction(reviewId, type);
    }
    document.getElementById('actionConfirmModal').classList.add('active');
}

function hideClerkModal() {
    document.getElementById('actionConfirmModal').classList.remove('active');
    // No need to clear global variables as they are no longer used
    document.getElementById('confirmClerkActionBtn').onclick = null; // Clear the handler
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        hideClerkModal();
    }
});

// --- Reports Functions ---
async function fetchReports() {
    const reportsMessage = document.getElementById('reportsMessage');
    reportsMessage.textContent = 'Fetching reports...';
    reportsMessage.style.color = 'var(--primary)';

    try {
        const response = await fetch('api.php?action=getReports');
        const result = await response.json();

        if (result.success) {
            document.getElementById('totalBooksCount').innerHTML = `<i class="fas fa-book-open"></i> ${result.data.total_books}`;
            document.getElementById('totalUsersCount').innerHTML = `<i class="fas fa-users"></i> ${result.data.total_users}`;
            document.getElementById('totalReviewsCount').innerHTML = `<i class="fas fa-comments"></i> ${result.data.total_reviews}`;
            document.getElementById('approvedReviewsCount').innerHTML = `<i class="fas fa-check-circle"></i> ${result.data.approved_reviews}`;
            document.getElementById('pendingReviewsCount').innerHTML = `<i class="fas fa-hourglass-half"></i> ${result.data.pending_reviews}`;
            reportsMessage.textContent = 'Reports updated successfully!';
            reportsMessage.style.color = 'var(--success)';
        } else {
            console.error('Failed to fetch reports:', result.message);
            reportsMessage.textContent = 'Failed to load reports: ' + result.message;
            reportsMessage.style.color = 'var(--danger)';
        }
    } catch (error) {
        console.error('Error fetching reports:', error);
        reportsMessage.textContent = 'An error occurred while fetching reports.';
        reportsMessage.style.color = 'var(--danger)';
    }
    setTimeout(() => reportsMessage.textContent = '', 3000);
}

// --- Review Moderation Functions ---
async function fetchPendingReviews() {
    const reviewsTableBody = document.getElementById('reviewsTableBody');
    const reviewsEmptyState = document.getElementById('reviewsEmptyState');
    const pendingReviewsCountBadge = document.getElementById('pendingReviewsCountBadge');
    const moderationMessage = document.getElementById('moderationMessage');
    reviewsTableBody.innerHTML = ''; 
    moderationMessage.textContent = 'Loading pending reviews...';
    moderationMessage.style.color = 'var(--primary)';

    try {
        const response = await fetch('api.php?action=getPendingReviews');
        const result = await response.json();

        if (result.success) {
            currentReviews = result.data;
            if (currentReviews.length === 0) {
                reviewsEmptyState.style.display = 'block';
                pendingReviewsCountBadge.textContent = '0 pending';
                moderationMessage.textContent = 'No pending reviews to moderate.';
                moderationMessage.style.color = 'var(--success)';
            } else {
                reviewsEmptyState.style.display = 'none';
                pendingReviewsCountBadge.textContent = `${currentReviews.length} pending`;
                moderationMessage.textContent = ''; // Clear message if reviews are found
            }

            currentReviews.forEach(review => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td data-label="Review ID">${review.review_id.substring(0, 8)}...</td>
                    <td data-label="Ebook Title">${review.ebook_title}</td>
                    <td data-label="Author">${review.ebook_author}</td>
                    <td data-label="User">${review.user_name} (${review.user_email})</td>
                    <td data-label="Rating">${'⭐'.repeat(review.rating)} (${review.rating}/5)</td>
                    <td data-label="Review Text" class="review-text-cell">${review.review_text.substring(0, 100)}${review.review_text.length > 100 ? '...' : ''}</td>
                    <td data-label="Date">${new Date(review.review_date).toLocaleDateString()}</td>
                    <td class="actions-cell">
                        <button class="btn btn-success btn-small" onclick="showClerkModal('${review.review_id}', 'approve', '${review.review_text.replace(/'/g, "\\'")}')">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button class="btn btn-danger btn-small" onclick="showClerkModal('${review.review_id}', 'reject', '${review.review_text.replace(/'/g, "\\'")}')">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    </td>
                `;
                reviewsTableBody.appendChild(tr);
            });
        } else {
            console.error('Failed to fetch pending reviews:', result.message);
            reviewsEmptyState.style.display = 'block';
            reviewsEmptyState.innerHTML = `<i class="fas fa-exclamation-circle"></i><p>${result.message}</p>`;
            pendingReviewsCountBadge.textContent = '0 pending';
            moderationMessage.textContent = 'Error loading reviews: ' + result.message;
            moderationMessage.style.color = 'var(--danger)';
        }
    } catch (error) {
        console.error('Error fetching pending reviews:', error);
        reviewsEmptyState.style.display = 'block';
        reviewsEmptyState.innerHTML = `<i class="fas fa-exclamation-circle"></i><p>An error occurred while fetching reviews.</p>`;
        pendingReviewsCountBadge.textContent = '0 pending';
        moderationMessage.textContent = 'Network error fetching reviews.';
        moderationMessage.style.color = 'var(--danger)';
    }
    setTimeout(() => moderationMessage.textContent = '', 3000);
}

// confirmReviewAction now accepts arguments directly
async function confirmReviewAction(reviewId, actionType) {
    // console.log("confirmReviewAction called:", { reviewId, actionType }); // For debugging

    if (!reviewId || !actionType) {
        console.error('No review ID or action type received for moderation.');
        // Display a user-friendly message on the UI
        const moderationMessage = document.getElementById('moderationMessage');
        moderationMessage.textContent = 'Error: Missing review details for action.';
        moderationMessage.style.color = 'var(--danger)';
        setTimeout(() => moderationMessage.textContent = '', 3000);
        return;
    }

    const moderationMessage = document.getElementById('moderationMessage');
    hideClerkModal(); // Hide modal immediately

    moderationMessage.textContent = `Performing ${actionType} action...`;
    moderationMessage.style.color = 'var(--primary)';

    try {
        const response = await fetch('api.php?action=updateReviewStatus', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reviewId: reviewId, // Use passed argument
                newStatus: actionType === 'approve' ? 'approved' : 'rejected' // Use passed argument
            })
        });
        const result = await response.json();

        if (result.success) {
            moderationMessage.textContent = `Review ${actionType}d successfully!`;
            moderationMessage.style.color = 'var(--success)';
            fetchPendingReviews(); // Refresh the list
            fetchReports(); // Update report counts
        } else {
            moderationMessage.textContent = `Failed to ${actionType} review: ${result.message}`;
            moderationMessage.style.color = 'var(--danger)';
        }
    } catch (error) {
        console.error(`Error ${actionType}ing review:`, error);
        moderationMessage.textContent = `An error occurred while ${actionType}ing the review.`;
        moderationMessage.style.color = 'var(--danger)';
    }
    setTimeout(() => moderationMessage.textContent = '', 3000);
}

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
    // Check if the user is a clerk. If not, redirect to login (basic check)
    const userRole = sessionStorage.getItem('userRole');
    if (userRole !== 'clerk') {
        alert('Access denied. Please log in as a clerk.');
        window.location.href = 'admin_login.html';
        return;
    }
    fetchReports(); // Load reports when the page loads
});