// --- Global Data ---
let currentReviews = []; // Still needed to store fetched reviews
let books = []; // New global for books
let categories = []; // New global for categories

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

    if (tabId === 'books-tab') {
        fetchBooks();
        fetchCategoriesForDropdowns(); // Fetch categories for book forms/filters
    } else if (tabId === 'categories-tab') {
        fetchCategories();
    } else if (tabId === 'moderation-tab') {
        fetchPendingReviews();
    }
}

// --- Modal Functionality (Generic for Clerk Panel) ---
// showClerkModal now directly sets the confirm button's onclick handler
function showClerkModal(id, type, text) { // Renamed 'reviewText' to 'text' for generality
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const confirmBtn = document.getElementById('confirmClerkActionBtn');
    
    // Reset modal content
    modalTitle.innerHTML = '';
    modalMessage.innerHTML = '';
    confirmBtn.onclick = null;
    confirmBtn.className = 'btn btn-primary';

    if (type === 'approve' || type === 'reject') {
        // Review Moderation
        if (type === 'approve') {
            modalTitle.innerHTML = '<i class="fas fa-check-circle"></i> Confirm Approval';
            modalMessage.innerHTML = `
                <p>Approve this review?</p>
                <p class="review-text-preview"><strong>Review:</strong> "${text}"</p>
                <p class="text-success">The review will become visible to all users.</p>
            `;
            confirmBtn.textContent = 'Approve';
            confirmBtn.className = 'btn btn-success';
            confirmBtn.onclick = () => confirmReviewAction(id, type);
        } else if (type === 'reject') {
            modalTitle.innerHTML = '<i class="fas fa-times-circle"></i> Confirm Rejection';
            modalMessage.innerHTML = `
                <p>Reject this review?</p>
                <p class="review-text-preview"><strong>Review:</strong> "${text}"</p>
                <p class="text-danger">The review will be permanently removed.</p>
            `;
            confirmBtn.textContent = 'Reject';
            confirmBtn.className = 'btn btn-danger';
            confirmBtn.onclick = () => confirmReviewAction(id, type);
        }
    } else if (type === 'deleteBook') {
        modalTitle.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Confirm Book Deletion';
        modalMessage.innerHTML = `
            <p>You are about to delete the book:</p>
            <p><strong>${text}</strong> (ID: ${id})</p>
            <p class="text-danger">This will permanently delete the book record!</p>
        `;
        confirmBtn.textContent = 'Confirm Delete';
        confirmBtn.className = 'btn btn-danger';
        confirmBtn.onclick = () => confirmDeleteBook(id, text);
    } else if (type === 'deleteCategory') {
        modalTitle.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Confirm Category Deletion';
        modalMessage.innerHTML = `
            <p>You are about to delete category:</p>
            <p><strong>${text}</strong> (ID: ${id})</p>
            <p class="text-danger">This will delete the category and may affect associated books!</p>
        `;
        confirmBtn.textContent = 'Confirm Delete';
        confirmBtn.className = 'btn btn-danger';
        confirmBtn.onclick = () => confirmDeleteCategory(id, text);
    }

    document.getElementById('actionConfirmModal').classList.add('active');
}

function hideClerkModal() {
    document.getElementById('actionConfirmModal').classList.remove('active');
    document.getElementById('confirmClerkActionBtn').onclick = null; // Clear the handler
}

// Close all modals with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        hideClerkModal();
        hideAddBookModal();
        hideEditBookModal();
        hideEditCategoryModal();
    }
});


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
    if (!reviewId || !actionType) {
        console.error('No review ID or action type received for moderation.');
        displayMessage('Error: Missing review details for action.', 'danger', 'moderationMessage');
        return;
    }

    const moderationMessage = document.getElementById('moderationMessage');
    hideClerkModal(); // Hide modal immediately

    moderationMessage.textContent = `Performing ${actionType} action...`;
    moderationMessage.style.color = 'var(--primary)';

    try {
        const response = await fetch('api.php?action=updateReviewStatus', {
            method: 'PATCH', // Changed to PATCH
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
            // No need to fetch reports here, as reports are now on admin side
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

// --- Book Management Functions (New) ---
async function fetchBooks() {
    const booksTableBody = document.getElementById('booksTableBody');
    const bookCountBadge = document.getElementById('bookCountBadge');
    const booksEmptyState = document.getElementById('booksEmptyState');
    booksTableBody.innerHTML = '';
    booksEmptyState.style.display = 'none';

    const searchTerm = document.getElementById('book-search').value.toLowerCase();
    const genreFilter = document.getElementById('genreFilter').value;

    try {
        const response = await fetch(`api.php?action=getEbooks&search=${searchTerm}&genre=${genreFilter}`);
        const result = await response.json();

        if (result.success) {
            books = result.data;
            if (books.length === 0) {
                booksEmptyState.style.display = 'block';
                bookCountBadge.textContent = '0 books';
                return;
            }

            books.forEach(book => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td data-label="ID">${book.ebook_id.substring(0, 8)}...</td>
                    <td data-label="Title">${book.title}</td>
                    <td data-label="Author">${book.author}</td>
                    <td data-label="ISBN">${book.isbn}</td>
                    <td data-label="Genre">${book.genres?.genre_name || 'N/A'}</td>
                    <td data-label="Pub. Date">${book.publication_date}</td>
                    <td data-label="Availability">${book.availability_status}</td>
                    <td class="actions-cell">
                        <button class="btn btn-primary btn-small" onclick="showEditBookModal('${book.ebook_id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-danger btn-small" onclick="showClerkModal('${book.ebook_id}', 'deleteBook', '${book.title.replace(/'/g, "\\'")}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </td>
                `;
                booksTableBody.appendChild(tr);
            });
            bookCountBadge.textContent = `${books.length} books`;
        } else {
            console.error('Failed to fetch books:', result.message);
            booksEmptyState.style.display = 'block';
            booksEmptyState.innerHTML = `<i class="fas fa-exclamation-circle"></i><p>${result.message}</p>`;
            bookCountBadge.textContent = '0 books';
        }
    } catch (error) {
        console.error('Error fetching books:', error);
        booksEmptyState.style.display = 'block';
        booksEmptyState.innerHTML = `<i class="fas fa-exclamation-circle"></i><p>An error occurred while fetching books.</p>`;
        bookCountBadge.textContent = '0 books';
    }
}

// Book search functionality
document.getElementById('book-search').addEventListener('input', fetchBooks);

// Add Book Modal
function showAddBookModal() {
    document.getElementById('addBookModal').classList.add('active');
    document.getElementById('addBookForm').reset();
    document.getElementById('addBookMessage').textContent = '';
    populateGenreDropdown('addBookGenre');
}

function hideAddBookModal() {
    document.getElementById('addBookModal').classList.remove('active');
}

async function addNewBook() {
    const title = document.getElementById('addBookTitle').value.trim();
    const author = document.getElementById('addBookAuthor').value.trim();
    const isbn = document.getElementById('addBookISBN').value.trim();
    const publicationDate = document.getElementById('addBookPublicationDate').value;
    const genreId = document.getElementById('addBookGenre').value;
    const availability = document.getElementById('addBookAvailability').value;
    const description = document.getElementById('addBookDescription').value.trim();
    const coverUrl = document.getElementById('addBookCoverUrl').value.trim();
    const addBookMessage = document.getElementById('addBookMessage');

    if (!title || !author || !isbn || !publicationDate || !genreId) {
        addBookMessage.textContent = 'Title, Author, ISBN, Publication Date, and Genre are required.';
        addBookMessage.style.color = 'var(--danger)';
        return;
    }

    try {
        const response = await fetch('api.php?action=addEbook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                author: author,
                isbn: isbn,
                publicationDate: publicationDate,
                genreId: genreId,
                availability: availability,
                description: description || null,
                coverUrl: coverUrl || null
            })
        });
        const result = await response.json();
        if (result.success) {
            addBookMessage.textContent = result.message;
            addBookMessage.style.color = 'var(--success)';
            fetchBooks();
            setTimeout(hideAddBookModal, 1500);
        } else {
            addBookMessage.textContent = result.message;
            addBookMessage.style.color = 'var(--danger)';
        }
    } catch (error) {
        console.error('Error adding book:', error);
        addBookMessage.textContent = 'An error occurred while adding the book.';
        addBookMessage.style.color = 'var(--danger)';
    }
}

// Edit Book Modal
let editingBookId = null;

function showEditBookModal(bookId) {
    editingBookId = bookId;
    const book = books.find(b => b.ebook_id === bookId);
    if (book) {
        document.getElementById('editBookId').value = book.ebook_id;
        document.getElementById('editBookTitle').value = book.title;
        document.getElementById('editBookAuthor').value = book.author;
        document.getElementById('editBookISBN').value = book.isbn;
        document.getElementById('editBookPublicationDate').value = book.publication_date;
        document.getElementById('editBookAvailability').value = book.availability_status;
        document.getElementById('editBookDescription').value = book.description || '';
        document.getElementById('editBookCoverUrl').value = book.cover_image_url || '';
        document.getElementById('editBookMessage').textContent = '';
        populateGenreDropdown('editBookGenre', book.genre_id); // Populate and select current genre
        document.getElementById('editBookModal').classList.add('active');
    }
}

function hideEditBookModal() {
    document.getElementById('editBookModal').classList.remove('active');
    editingBookId = null;
}

async function saveBookChanges() {
    const bookId = document.getElementById('editBookId').value;
    const title = document.getElementById('editBookTitle').value.trim();
    const author = document.getElementById('editBookAuthor').value.trim();
    const isbn = document.getElementById('editBookISBN').value.trim();
    const publicationDate = document.getElementById('editBookPublicationDate').value;
    const genreId = document.getElementById('editBookGenre').value;
    const availability = document.getElementById('editBookAvailability').value;
    const description = document.getElementById('editBookDescription').value.trim();
    const coverUrl = document.getElementById('editBookCoverUrl').value.trim();
    const editBookMessage = document.getElementById('editBookMessage');

    if (!title || !author || !isbn || !publicationDate || !genreId) {
        editBookMessage.textContent = 'Title, Author, ISBN, Publication Date, and Genre are required.';
        editBookMessage.style.color = 'var(--danger)';
        return;
    }

    try {
        const response = await fetch('api.php?action=updateEbook', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: bookId,
                title: title,
                author: author,
                isbn: isbn,
                publicationDate: publicationDate,
                genreId: genreId,
                availability: availability,
                description: description || null,
                coverUrl: coverUrl || null
            })
        });
        const result = await response.json();
        if (result.success) {
            editBookMessage.textContent = result.message;
            editBookMessage.style.color = 'var(--success)';
            fetchBooks();
            setTimeout(hideEditBookModal, 1500);
        } else {
            editBookMessage.textContent = result.message;
            editBookMessage.style.color = 'var(--danger)';
        }
    } catch (error) {
        console.error('Error saving book changes:', error);
        editBookMessage.textContent = 'An error occurred while saving changes.';
        editBookMessage.style.color = 'var(--danger)';
    }
}

async function confirmDeleteBook(bookId, bookTitle) {
    try {
        const response = await fetch(`api.php?action=deleteEbook&id=${bookId}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (result.success) {
            hideClerkModal();
            fetchBooks();
            displayMessage('Book "' + bookTitle + '" deleted successfully!', 'success', 'booksTableBody');
        } else {
            hideClerkModal();
            displayMessage('Failed to delete book: ' + result.message, 'danger', 'booksTableBody');
        }
    } catch (error) {
        console.error('Error deleting book:', error);
        hideClerkModal();
        displayMessage('An error occurred while deleting the book.', 'danger', 'booksTableBody');
    }
}

// --- Category Management Functions (Moved from script.js) ---
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
                        <button class="btn btn-danger btn-small" onclick="showClerkModal('${category.genre_id}', 'deleteCategory', '${category.genre_name.replace(/'/g, "\\'")}')">
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

// Function to populate genre dropdowns
async function fetchCategoriesForDropdowns() {
    try {
        const response = await fetch('api.php?action=getCategories');
        const result = await response.json();
        if (result.success) {
            categories = result.data; // Update global categories array
            const genreFilterDropdown = document.getElementById('genreFilter');
            const addBookGenreDropdown = document.getElementById('addBookGenre');
            const editBookGenreDropdown = document.getElementById('editBookGenre');

            // Clear existing options except "All Genres" for filter
            genreFilterDropdown.innerHTML = '<option value="">All Genres</option>';
            addBookGenreDropdown.innerHTML = '';
            if (editBookGenreDropdown) editBookGenreDropdown.innerHTML = '';

            categories.forEach(category => {
                const optionFilter = document.createElement('option');
                optionFilter.value = category.genre_name; // Use name for filter
                optionFilter.textContent = category.genre_name;
                genreFilterDropdown.appendChild(optionFilter);

                const optionAdd = document.createElement('option');
                optionAdd.value = category.genre_id; // Use ID for adding/editing books
                optionAdd.textContent = category.genre_name;
                addBookGenreDropdown.appendChild(optionAdd);

                if (editBookGenreDropdown) {
                    const optionEdit = document.createElement('option');
                    optionEdit.value = category.genre_id;
                    optionEdit.textContent = category.genre_name;
                    editBookGenreDropdown.appendChild(optionEdit);
                }
            });
        } else {
            console.error('Failed to fetch categories for dropdowns:', result.message);
        }
    } catch (error) {
        console.error('Error fetching categories for dropdowns:', error);
    }
}

// Helper to populate a specific genre dropdown and select a value
function populateGenreDropdown(dropdownId, selectedGenreId = null) {
    const dropdown = document.getElementById(dropdownId);
    dropdown.innerHTML = ''; // Clear existing options

    if (categories.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No genres available';
        dropdown.appendChild(option);
        dropdown.disabled = true;
        return;
    }
    dropdown.disabled = false;

    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.genre_id;
        option.textContent = category.genre_name;
        if (selectedGenreId && category.genre_id === selectedGenreId) {
            option.selected = true;
        }
        dropdown.appendChild(option);
    });
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
            fetchCategoriesForDropdowns(); // Update book genre dropdowns
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
            method: 'PATCH', // Changed to PATCH
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
            fetchCategoriesForDropdowns(); // Update book genre dropdowns
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
            hideClerkModal();
            fetchCategories();
            fetchCategoriesForDropdowns(); // Update book genre dropdowns
            displayMessage('Category "' + categoryName + '" deleted successfully!', 'success', 'categoryListMessage');
        } else {
            hideClerkModal();
            displayMessage('Failed to delete category: ' + result.message, 'danger', 'categoryListMessage');
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        hideClerkModal();
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
    
    // Insert after the target element (or its parent's last child if target is tbody)
    if (targetElement.tagName === 'TBODY') {
        targetElement.parentNode.insertBefore(msgDiv, targetElement.nextSibling);
    } else {
        targetElement.parentNode.insertBefore(msgDiv, targetElement.nextSibling);
    }

    setTimeout(() => {
        msgDiv.remove();
    }, 3000);
}


// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
    // Check if the user is a clerk. If not, redirect to login (basic check)
    const userRole = sessionStorage.getItem('userRole');
    if (userRole !== 'clerk') {
        // Using a custom message box instead of alert
        const loginMessageDiv = document.createElement('div');
        loginMessageDiv.textContent = 'Access denied. Please log in as a clerk.';
        loginMessageDiv.style.color = 'var(--danger)';
        loginMessageDiv.style.textAlign = 'center';
        loginMessageDiv.style.marginTop = '20px';
        document.body.prepend(loginMessageDiv);

        setTimeout(() => {
            window.location.href = 'admin_login.html';
        }, 500); // Give a small delay to potentially show message
        return;
    }
    fetchBooks(); // Load books when the page loads
    fetchCategoriesForDropdowns(); // Load categories for dropdowns
});
