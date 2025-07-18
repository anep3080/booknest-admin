// --- Global Data (Will be fetched from Supabase) ---
let users = [];
let allBooks = []; // New global for all books report
let allReviews = []; // New global for all reviews report
let reviewStatusChartInstance = null; // To store Chart.js instance
let genreDistributionChartInstance = null; // To store Chart.js instance


// --- Tab Functionality ---
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tabId).classList.add('active');
    // Find the button that triggered the event and add 'active' class
    const clickedButton = event.currentTarget;
    if (clickedButton) {
        clickedButton.classList.add('active');
    }

    // Re-render data when their tab is activated
    if (tabId === 'users-tab') {
        fetchUsers();
    } else if (tabId === 'reports-tab') {
        fetchReports();
        fetchAllBooksForReport();
        fetchAllReviewsForReport();
    }
}

// --- Delete Confirmation Modal (Generic for Users) ---
let currentItemToDelete = null;
let deleteType = ''; // 'user'

function showDeleteConfirmation(id, name, type) {
    deleteType = type;
    currentItemToDelete = id;
    
    const modalMessage = document.getElementById('deleteModalMessage');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    
    if (type === 'user') {
        modalMessage.innerHTML = `
            <p>You are about to delete user:</p>
            <p><strong>${name}</strong> (ID: ${id})</p>
            <p class="text-danger">This will permanently delete the user account!</p>
        `;
        confirmBtn.onclick = () => {
            confirmDeleteUser(id, name);
        };
    }
    
    document.getElementById('deleteModal').classList.add('active');
}

function hideModal() {
    document.getElementById('deleteModal').classList.remove('active');
    currentItemToDelete = null;
    document.getElementById('confirmDeleteBtn').onclick = null; // Reset onclick
}

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        hideModal();
        hideAddUserModal();
        hideEditUserModal();
    }
});

// --- User Management Functions ---
async function fetchUsers() {
    const userTableBody = document.getElementById('userTableBody');
    const userCountBadge = document.getElementById('userCountBadge');
    const userEmptyState = document.getElementById('userEmptyState');
    userTableBody.innerHTML = ''; 

    const searchTerm = document.getElementById('user-search').value.toLowerCase();
    
    try {
        const response = await fetch(`api.php?action=getUsers&search=${searchTerm}`);
        const result = await response.json();

        if (result.success) {
            users = result.data; // Update global users array
            if (users.length === 0) {
                userEmptyState.style.display = 'block';
                userCountBadge.textContent = '0 users';
                return;
            } else {
                userEmptyState.style.display = 'none';
            }

            users.forEach(user => {
                const tr = document.createElement('tr');
                tr.classList.add('user-row');
                tr.innerHTML = `
                    <td data-label="ID">${user.user_id.substring(0, 8)}...</td>
                    <td data-label="Full Name">${user.name}</td>
                    <td data-label="Email">${user.email}</td>
                    <td data-label="Phone">${user.phone_number || 'N/A'}</td>
                    <td data-label="User Type">
                        ${user.roles === 'admin' ? 
                            `<span class="btn btn-light btn-small"><i class="fas fa-crown"></i> Admin</span>` :
                            `<select name="new_user_type" onchange="updateUserType('${user.user_id}', this.value)">
                                <option value="reader" ${user.roles === 'reader' ? 'selected' : ''}>Reader</option>
                                <option value="clerk" ${user.roles === 'clerk' ? 'selected' : ''}>Clerk</option>
                            </select>`
                        }
                    </td>
                    <td class="actions-cell">
                        <button class="btn btn-primary btn-small" onclick="showEditUserModal('${user.user_id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        ${user.roles !== 'admin' ? 
                            `<button class="btn btn-danger btn-small" onclick="showDeleteConfirmation('${user.user_id}', '${user.name}', 'user')">
                                <i class="fas fa-trash"></i> Delete
                            </button>` : ''
                        }
                    </td>
                `;
                userTableBody.appendChild(tr);
            });
            userCountBadge.textContent = `${users.length} users`;
        } else {
            console.error('Failed to fetch users:', result.message);
            userEmptyState.style.display = 'block';
            userEmptyState.innerHTML = `<i class="fas fa-exclamation-circle"></i><p>${result.message}</p>`;
            userCountBadge.textContent = '0 users';
        }
    } catch (error) {
        console.error('Error fetching users:', error);
        userEmptyState.style.display = 'block';
        userEmptyState.innerHTML = `<i class="fas fa-exclamation-circle"></i><p>An error occurred while fetching users.</p>`;
        userCountBadge.textContent = '0 users';
    }
}

// User search functionality
document.getElementById('user-search').addEventListener('input', fetchUsers);

async function updateUserType(userId, newUserType) {
    if (newUserType === 'admin') {
        // Using a custom message box instead of alert
        displayMessage('Cannot change user type to admin directly from this dropdown for security. Please use the edit modal.', 'warning', 'userTableBody');
        fetchUsers(); // Re-fetch to revert dropdown
        return;
    }
    try {
        const response = await fetch('api.php?action=updateUser', {
            method: 'PATCH', // Changed to PATCH
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: userId,
                fullName: fullName,
                email: email,
                phone: phone || null,
                userType: newUserType
            })
        });
        const result = await response.json();
        if (result.success) {
            console.log(result.message);
            fetchUsers(); 
        } else {
            console.error(result.message);
            displayMessage('Failed to update user type: ' + result.message, 'danger', 'userTableBody');
            fetchUsers(); 
        }
    } catch (error) {
        console.error('Error updating user type:', error);
        displayMessage('An error occurred while updating user type.', 'danger', 'userTableBody');
        fetchUsers(); 
    }
}

// Add User Modal
function showAddUserModal() {
    document.getElementById('addUserModal').classList.add('active');
    document.getElementById('addUserForm').reset();
    document.getElementById('addUserMessage').textContent = '';
}

function hideAddUserModal() {
    document.getElementById('addUserModal').classList.remove('active');
}

async function addNewUser() {
    const fullName = document.getElementById('addFullName').value.trim();
    const email = document.getElementById('addEmail').value.trim();
    const phone = document.getElementById('addPhone').value.trim();
    const userType = document.getElementById('addUserType').value;
    const password = document.getElementById('addPassword').value;
    const addUserMessage = document.getElementById('addUserMessage');

    if (!fullName || !email || !password) {
        addUserMessage.textContent = 'Full Name, Email, and Password are required.';
        addUserMessage.style.color = 'var(--danger)';
        return;
    }
    if (!email.includes('@') || !email.includes('.')) {
        addUserMessage.textContent = 'Please enter a valid email address.';
        addUserMessage.style.color = 'var(--danger)';
        return;
    }

    try {
        const response = await fetch('api.php?action=addUser', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fullName: fullName,
                email: email,
                phone: phone || null, // Send null if empty
                userType: userType,
                password: password
            })
        });
        const result = await response.json();
        if (result.success) {
            addUserMessage.textContent = result.message;
            addUserMessage.style.color = 'var(--success)';
            fetchUsers(); 
            setTimeout(hideAddUserModal, 1500);
        } else {
            addUserMessage.textContent = result.message;
            addUserMessage.style.color = 'var(--danger)';
        }
    } catch (error) {
        console.error('Error adding user:', error);
        addUserMessage.textContent = 'An error occurred while adding the user.';
        addUserMessage.style.color = 'var(--danger)';
    }
}

// Edit User Modal
let editingUserId = null;

function showEditUserModal(userId) {
    editingUserId = userId;
    const user = users.find(u => u.user_id === userId);
    if (user) {
        document.getElementById('editUserId').value = user.user_id;
        document.getElementById('editFullName').value = user.name;
        document.getElementById('editEmail').value = user.email;
        document.getElementById('editPhone').value = user.phone_number || '';
        document.getElementById('editUserType').value = user.roles;
        document.getElementById('editUserMessage').textContent = '';
        document.getElementById('editUserModal').classList.add('active');
    }
}

function hideEditUserModal() {
    document.getElementById('editUserModal').classList.remove('active');
    editingUserId = null;
}

async function saveUserChanges() {
    const userId = document.getElementById('editUserId').value;
    const fullName = document.getElementById('editFullName').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const phone = document.getElementById('editPhone').value.trim();
    const userType = document.getElementById('editUserType').value;
    const editUserMessage = document.getElementById('editUserMessage');

    if (!fullName || !email) {
        editUserMessage.textContent = 'Full Name and Email are required.';
        editUserMessage.style.color = 'var(--danger)';
        return;
    }
    if (!email.includes('@') || !email.includes('.')) {
        editUserMessage.textContent = 'Please enter a valid email address.';
        editUserMessage.style.color = 'var(--danger)';
        return;
    }

    try {
        const response = await fetch('api.php?action=updateUser', {
            method: 'PATCH', // Changed to PATCH
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: userId,
                fullName: fullName,
                email: email,
                phone: phone || null,
                userType: userType
            })
        });
        const result = await response.json();
        if (result.success) {
            editUserMessage.textContent = result.message;
            editUserMessage.style.color = 'var(--success)';
            fetchUsers(); 
            setTimeout(hideEditUserModal, 1500);
        } else {
            editUserMessage.textContent = result.message;
            editUserMessage.style.color = 'var(--danger)';
        }
    } catch (error) {
        console.error('Error saving user changes:', error);
        editUserMessage.textContent = 'An error occurred while saving changes.';
        editUserMessage.style.color = 'var(--danger)';
    }
}

async function confirmDeleteUser(userId, userName) {
    try {
        const response = await fetch(`api.php?action=deleteUser&id=${userId}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (result.success) {
            hideModal();
            fetchUsers();
            displayMessage('User "' + userName + '" deleted successfully!', 'success', 'userTableBody');
        } else {
            hideModal();
            displayMessage('Failed to delete user: ' + result.message, 'danger', 'userTableBody');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        hideModal();
        displayMessage('An error occurred while deleting the user.', 'danger', 'userTableBody');
    }
}

// --- Reports Functions (Moved from clerk_script.js and enhanced) ---
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

            // Render charts
            renderReviewStatusChart(result.data.approved_reviews, result.data.pending_reviews, result.data.rejected_reviews);
            renderGenreDistributionChart(result.data.all_books);

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

// --- All Books Report (New for Admin) ---
async function fetchAllBooksForReport() {
    const allBooksTableBody = document.getElementById('allBooksTableBody');
    const allBooksCountBadge = document.getElementById('allBooksCountBadge');
    const allBooksEmptyState = document.getElementById('allBooksEmptyState');
    allBooksTableBody.innerHTML = '';
    allBooksEmptyState.style.display = 'none';

    const searchTerm = document.getElementById('all-books-search').value.toLowerCase();

    try {
        // Fetch all reports, which now includes all_books
        const response = await fetch(`api.php?action=getReports`);
        const result = await response.json();

        if (result.success) {
            allBooks = result.data.all_books.filter(book => 
                book.title.toLowerCase().includes(searchTerm) ||
                book.author.toLowerCase().includes(searchTerm) ||
                book.isbn.toLowerCase().includes(searchTerm)
            );

            if (allBooks.length === 0) {
                allBooksEmptyState.style.display = 'block';
                allBooksCountBadge.textContent = '0 books';
                return;
            }

            allBooks.forEach(book => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td data-label="ID">${book.ebook_id.substring(0, 8)}...</td>
                    <td data-label="Title">${book.title}</td>
                    <td data-label="Author">${book.author}</td>
                    <td data-label="ISBN">${book.isbn}</td>
                    <td data-label="Genre">${book.genres?.genre_name || 'N/A'}</td>
                    <td data-label="Pub. Date">${book.publication_date}</td>
                    <td data-label="Availability">${book.availability_status}</td>
                `;
                allBooksTableBody.appendChild(tr);
            });
            allBooksCountBadge.textContent = `${allBooks.length} books`;
        } else {
            console.error('Failed to fetch all books for report:', result.message);
            allBooksEmptyState.style.display = 'block';
            allBooksEmptyState.innerHTML = `<i class="fas fa-exclamation-circle"></i><p>${result.message}</p>`;
            allBooksCountBadge.textContent = '0 books';
        }
    } catch (error) {
        console.error('Error fetching all books for report:', error);
        allBooksEmptyState.style.display = 'block';
        allBooksEmptyState.innerHTML = `<i class="fas fa-exclamation-circle"></i><p>An error occurred while fetching books.</p>`;
        allBooksCountBadge.textContent = '0 books';
    }
}

// All books search functionality
document.getElementById('all-books-search').addEventListener('input', fetchAllBooksForReport);

// --- All Reviews Report (New for Admin) ---
async function fetchAllReviewsForReport() {
    const allReviewsTableBody = document.getElementById('allReviewsTableBody');
    const allReviewsCountBadge = document.getElementById('allReviewsCountBadge');
    const allReviewsEmptyState = document.getElementById('allReviewsEmptyState');
    allReviewsTableBody.innerHTML = '';
    allReviewsEmptyState.style.display = 'none';

    const searchTerm = document.getElementById('all-reviews-search').value.toLowerCase();

    try {
        // Fetch all reports, which now includes all_reviews
        const response = await fetch(`api.php?action=getReports`);
        const result = await response.json();

        if (result.success) {
            allReviews = result.data.all_reviews.filter(review =>
                review.user_name.toLowerCase().includes(searchTerm) ||
                review.user_email.toLowerCase().includes(searchTerm) ||
                review.review_text.toLowerCase().includes(searchTerm) ||
                review.ebook_title.toLowerCase().includes(searchTerm)
            );

            if (allReviews.length === 0) {
                allReviewsEmptyState.style.display = 'block';
                allReviewsCountBadge.textContent = '0 reviews';
                return;
            }

            allReviews.forEach(review => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td data-label="Review ID">${review.review_id.substring(0, 8)}...</td>
                    <td data-label="Ebook Title">${review.ebook_title}</td>
                    <td data-label="User">${review.user_name} (${review.user_email})</td>
                    <td data-label="Rating">${'⭐'.repeat(review.rating)} (${review.rating}/5)</td>
                    <td data-label="Review Text" class="review-text-cell">${review.review_text.substring(0, 100)}${review.review_text.length > 100 ? '...' : ''}</td>
                    <td data-label="Date">${new Date(review.review_date).toLocaleDateString()}</td>
                    <td data-label="Status" class="status-badge status-${review.status}">${review.status}</td>
                `;
                allReviewsTableBody.appendChild(tr);
            });
            allReviewsCountBadge.textContent = `${allReviews.length} reviews`;
        } else {
            console.error('Failed to fetch all reviews for report:', result.message);
            allReviewsEmptyState.style.display = 'block';
            allReviewsEmptyState.innerHTML = `<i class="fas fa-exclamation-circle"></i><p>${result.message}</p>`;
            allReviewsCountBadge.textContent = '0 reviews';
        }
    } catch (error) {
        console.error('Error fetching all reviews for report:', error);
        allReviewsEmptyState.style.display = 'block';
        allReviewsEmptyState.innerHTML = `<i class="fas fa-exclamation-circle"></i><p>An error occurred while fetching reviews.</p>`;
        allReviewsCountBadge.textContent = '0 reviews';
    }
}

// All reviews search functionality
document.getElementById('all-reviews-search').addEventListener('input', fetchAllReviewsForReport);


// --- Charting Functions ---
function renderReviewStatusChart(approved, pending, rejected) {
    const ctx = document.getElementById('reviewStatusChart').getContext('2d');
    if (reviewStatusChartInstance) {
        reviewStatusChartInstance.destroy(); // Destroy previous chart instance if it exists
    }
    reviewStatusChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Approved', 'Pending', 'Rejected'],
            datasets: [{
                data: [approved, pending, rejected],
                backgroundColor: [
                    'rgba(76, 201, 240, 0.8)', // --success
                    'rgba(255, 159, 28, 0.8)', // --warning
                    'rgba(247, 37, 133, 0.8)'  // --danger
                ],
                borderColor: [
                    'rgba(76, 201, 240, 1)',
                    'rgba(255, 159, 28, 1)',
                    'rgba(247, 37, 133, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Review Status Distribution'
                }
            }
        }
    });
}

function renderGenreDistributionChart(booksData) {
    const ctx = document.getElementById('genreDistributionChart').getContext('2d');
    if (genreDistributionChartInstance) {
        genreDistributionChartInstance.destroy(); // Destroy previous chart instance
    }

    const genreCounts = {};
    booksData.forEach(book => {
        const genreName = book.genres?.genre_name || 'Uncategorized';
        genreCounts[genreName] = (genreCounts[genreName] || 0) + 1;
    });

    const labels = Object.keys(genreCounts);
    const data = Object.values(genreCounts);

    // Generate distinct colors for each genre
    const backgroundColors = labels.map((_, index) => `hsl(${(index * 137) % 360}, 70%, 60%)`);
    const borderColors = labels.map((_, index) => `hsl(${(index * 137) % 360}, 70%, 40%)`);


    genreDistributionChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Books',
                data: data,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false,
                },
                title: {
                    display: true,
                    text: 'Book Genre Distribution'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1, // Ensure integer ticks for counts
                    }
                }
            }
        }
    });
}


// --- Export Reports to Excel ---
function exportReportsExcel() {
    window.location.href = 'api.php?action=exportReportsExcel';
    displayMessage('Exporting reports... Your download should start shortly.', 'info', 'reportsMessage');
}


// Utility function to display messages temporarily
function displayMessage(message, type, targetElementId) {
    const targetElement = document.getElementById(targetElementId);
    if (!targetElement) return;

    const msgDiv = document.createElement('div');
    msgDiv.textContent = message;
    msgDiv.classList.add('message');
    msgDiv.style.color = `var(--${type})`;
    
    // Insert after the target element (or its parent's last child if target is tbody)
    if (targetElement.tagName === 'TBODY' || targetElement.tagName === 'TABLE') {
        targetElement.parentNode.insertBefore(msgDiv, targetElement.nextSibling);
    } else {
        targetElement.parentNode.insertBefore(msgDiv, targetElement.nextSibling);
    }


    setTimeout(() => {
        msgDiv.remove();
    }, 3000);
}

// Export Users function (now fully functional)
function exportUsers() {
    window.location.href = 'api.php?action=exportUsersExcel';
    displayMessage('Exporting users... Your download should start shortly.', 'info', 'userTableBody');
}


// --- Initial Render on Load ---
document.addEventListener('DOMContentLoaded', () => {
    // Check if the user is an admin. If not, redirect to login (basic check)
    const userRole = sessionStorage.getItem('userRole');
    if (userRole !== 'admin') {
        // Using a custom message box instead of alert
        // This message will not be shown if the redirect happens immediately.
        // It's mainly for debugging or if the redirect is delayed.
        const loginMessageDiv = document.createElement('div');
        loginMessageDiv.textContent = 'Access denied. Please log in as an admin.';
        loginMessageDiv.style.color = 'var(--danger)';
        loginMessageDiv.style.textAlign = 'center';
        loginMessageDiv.style.marginTop = '20px';
        document.body.prepend(loginMessageDiv);
        
        setTimeout(() => {
            window.location.href = 'admin_login.html';
        }, 500); // Give a small delay to potentially show message
        return;
    }
    fetchUsers(); 
});
