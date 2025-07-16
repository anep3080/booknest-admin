// --- Global Data (Will be fetched from Supabase) ---
let users = [];
let categories = [];

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

    // Re-render users or categories when their tab is activated
    if (tabId === 'users-tab') {
        fetchUsers();
    } else if (tabId === 'categories-tab') {
        fetchCategories();
    }
}

// --- Delete Confirmation Modal (Generic for Users and Categories) ---
let currentItemToDelete = null;
let deleteType = ''; // 'user' or 'category'

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
    } else if (type === 'category') {
        modalMessage.innerHTML = `
            <p>You are about to delete category:</p>
            <p><strong>${name}</strong> (ID: ${id})</p>
            <p class="text-danger">This will delete the category and may affect associated books!</p>
        `;
        confirmBtn.onclick = () => {
            confirmDeleteCategory(id, name);
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
        hideEditCategoryModal();
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
        alert("Cannot change user type to admin directly from this dropdown for security. Please use the edit modal.");
        fetchUsers(); // Re-fetch to revert dropdown
        return;
    }
    try {
        const response = await fetch('api.php?action=updateUser', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: userId,
                userType: newUserType
            })
        });
        const result = await response.json();
        if (result.success) {
            console.log(result.message);
            fetchUsers(); 
        } else {
            console.error(result.message);
            alert('Failed to update user type: ' + result.message);
            fetchUsers(); 
        }
    } catch (error) {
        console.error('Error updating user type:', error);
        alert('An error occurred while updating user type.');
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
            method: 'PUT',
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

// --- Category Management Functions ---
async function fetchCategories() {
    const categoriesList = document.getElementById('categoriesList');
    const categoryListMessage = document.getElementById('categoryListMessage');
    categoriesList.innerHTML = ''; 
    categoryListMessage.textContent = '';

    try {
        const response = await fetch('api.php?action=getCategories');
        const result = await response.json();

        if (result.success) {
            categories = result.data; // Update global categories array
            if (categories.length === 0) {
                categoriesList.innerHTML = '<li class="empty-state-small">No categories added yet.</li>';
                return;
            }
            categories.forEach(category => {
                const li = document.createElement('li');
                li.setAttribute('data-id', category.genre_id);
                li.innerHTML = `
                    <span>${category.genre_name}</span>
                    <div class="actions-cell">
                        <button class="btn btn-primary btn-small" onclick="showEditCategoryModal('${category.genre_id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-danger btn-small" onclick="showDeleteConfirmation('${category.genre_id}', '${category.genre_name}', 'category')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                `;
                categoriesList.appendChild(li);
            });
        } else {
            console.error('Failed to fetch categories:', result.message);
            categoriesList.innerHTML = `<li class="empty-state-small" style="color:var(--danger);">${result.message}</li>`;
        }
    } catch (error) {
        console.error('Error fetching categories:', error);
        categoriesList.innerHTML = `<li class="empty-state-small" style="color:var(--danger);">An error occurred while fetching categories.</li>`;
    }
}

async function addCategory() {
    const newCategoryNameInput = document.getElementById('newCategoryName');
    const newCategoryName = newCategoryNameInput.value.trim();
    const addCategoryMessage = document.getElementById('addCategoryMessage');

    if (newCategoryName === '') {
        addCategoryMessage.textContent = 'Category name cannot be empty.';
        addCategoryMessage.style.color = 'var(--danger)';
        return;
    }

    try {
        const response = await fetch('api.php?action=addCategory', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: newCategoryName })
        });
        const result = await response.json();
        if (result.success) {
            addCategoryMessage.textContent = result.message;
            addCategoryMessage.style.color = 'var(--success)';
            newCategoryNameInput.value = '';
            fetchCategories(); 
        } else {
            addCategoryMessage.textContent = result.message;
            addCategoryMessage.style.color = 'var(--danger)';
        }
    } catch (error) {
        console.error('Error adding category:', error);
        addCategoryMessage.textContent = 'An error occurred while adding the category.';
        addCategoryMessage.style.color = 'var(--danger)';
    }
}

// Edit Category Modal
let editingCategoryId = null;

function showEditCategoryModal(categoryId) {
    editingCategoryId = categoryId;
    const category = categories.find(c => c.genre_id === categoryId);
    if (category) {
        document.getElementById('editCategoryId').value = category.genre_id;
        document.getElementById('editCategoryName').value = category.genre_name;
        document.getElementById('editCategoryMessage').textContent = '';
        document.getElementById('editCategoryModal').classList.add('active');
    }
}

function hideEditCategoryModal() {
    document.getElementById('editCategoryModal').classList.remove('active');
    editingCategoryId = null;
}

async function saveCategoryChanges() {
    const categoryId = document.getElementById('editCategoryId').value;
    const newCategoryName = document.getElementById('editCategoryName').value.trim();
    const editCategoryMessage = document.getElementById('editCategoryMessage');

    if (newCategoryName === '') {
        editCategoryMessage.textContent = 'Category name cannot be empty.';
        editCategoryMessage.style.color = 'var(--danger)';
        return;
    }

    try {
        const response = await fetch('api.php?action=updateCategory', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: categoryId, name: newCategoryName })
        });
        const result = await response.json();
        if (result.success) {
            editCategoryMessage.textContent = result.message;
            editCategoryMessage.style.color = 'var(--success)';
            fetchCategories(); 
            setTimeout(hideEditCategoryModal, 1500);
        } else {
            editCategoryMessage.textContent = result.message;
            editCategoryMessage.style.color = 'var(--danger)';
        }
    } catch (error) {
        console.error('Error saving category changes:', error);
        editCategoryMessage.textContent = 'An error occurred while saving changes.';
        editCategoryMessage.style.color = 'var(--danger)';
    }
}

async function confirmDeleteCategory(categoryId, categoryName) {
    try {
        const response = await fetch(`api.php?action=deleteCategory&id=${categoryId}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (result.success) {
            hideModal();
            fetchCategories();
            displayMessage('Category "' + categoryName + '" deleted successfully!', 'success', 'categoryListMessage');
        } else {
            hideModal();
            displayMessage('Failed to delete category: ' + result.message, 'danger', 'categoryListMessage');
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        hideModal();
        displayMessage('An error occurred while deleting the category.', 'danger', 'categoryListMessage');
    }
}

// Utility function to display messages temporarily
function displayMessage(message, type, targetElementId) {
    const targetElement = document.getElementById(targetElementId);
    if (!targetElement) return;

    const msgDiv = document.createElement('div');
    msgDiv.textContent = message;
    msgDiv.classList.add('message');
    msgDiv.style.color = `var(--${type})`;
    
    targetElement.parentNode.insertBefore(msgDiv, targetElement.nextSibling);

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
    fetchUsers(); 
});