<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Be cautious with '*' in production, restrict to your frontend domain
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH'); // Added PATCH
header('Access-Control-Allow-Headers: Content-Type, Authorization, apikey');

$supabaseUrl = 'https://fymykhhwvegsuqpekryy.supabase.co';
$supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5bXlraGh3dmVnc3VxcGVrcnl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NzM2NTMsImV4cCI6MjA2NzU0OTY1M30._B4DsNRBOvj1y5oFFOts40sAM-mTvE0cNioBfcavfS4';

function callSupabase($method, $endpoint, $data = null, $filters = [], $select = '*') {
    global $supabaseUrl, $supabaseAnonKey;
    $url = $supabaseUrl . '/rest/v1/' . $endpoint;
    $queryParams = [];

    // Always add 'select' if specified (though primarily for GET)
    if ($select !== '*') {
        $queryParams[] = 'select=' . $select;
    }

    // Build query parameters for filters (for GET, PUT, DELETE, PATCH)
    // Supabase PostgREST requires filters for PUT/DELETE/PATCH to be in the URL for identification
    if (!empty($filters)) {
        foreach ($filters as $key => $value) {
            $queryParams[] = "$key=$value";
        }
    }

    // Append all collected query parameters to the URL
    if (!empty($queryParams)) {
        $url .= '?' . implode('&', $queryParams);
    }

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'apikey: ' . $supabaseAnonKey,
        'Authorization: Bearer ' . $supabaseAnonKey,
        'x-client-info: postgrest-php' // Can be anything, useful for logging in Supabase
    ]);

    switch ($method) {
        case 'POST':
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            break;
        case 'PUT':
        case 'PATCH': // Added PATCH method
        case 'DELETE':
            // --- NEW DEBUG LOGGING FOR PAYLOAD ---
            error_log("Debug: Data for $method request to $endpoint: " . print_r($data, true));
            // --- END NEW DEBUG LOGGING ---
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
            if ($data !== null) { // Only set POSTFIELDS if data is actually provided for PUT/PATCH
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            }
            break;
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return [
        'status' => $httpCode,
        'data' => json_decode($response, true)
    ];
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {
    case 'login':
        $input = json_decode(file_get_contents('php://input'), true);
        $email = $input['email'] ?? '';
        $password = $input['password'] ?? '';

        if (empty($email) || empty($password)) {
            echo json_encode(['success' => false, 'message' => 'Email and password are required.']);
            exit;
        }

        // For this simplified example, we'll simulate by checking against the 'users' table directly,
        // which is NOT secure for production as passwords should be hashed and compared.
        // A proper solution involves Supabase's GoTrue (Auth) service.
        $response = callSupabase('GET', 'users', null, [
            'email' => 'eq.' . $email,
            'password' => 'eq.' . $password // WARNING: Insecure, passwords should be hashed
        ], 'user_id,name,email,roles'); // Select roles to return it

        if ($response['status'] === 200 && !empty($response['data'])) {
            $user = $response['data'][0]; // Get the first user found
            $role = $user['roles'];

            // Only allow 'admin' and 'clerk' to proceed to their respective panels
            if ($role === 'admin' || $role === 'clerk') {
                echo json_encode(['success' => true, 'message' => 'Login successful!', 'role' => $role]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Your role does not have access to an administrative panel.']);
            }
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid credentials.']);
        }
        break;

    case 'getUsers':
        $searchTerm = $_GET['search'] ?? '';
        $filters = [];
        if (!empty($searchTerm)) {
            // This assumes full-text search is configured or relies on simple LIKE behavior
            // For more robust search, Supabase FTS or RLS policies might be needed.
            $filters['or'] = '(name.ilike.%' . $searchTerm . '%,email.ilike.%' . $searchTerm . '%,phone_number.ilike.%' . $searchTerm . '%)';
        }
        $response = callSupabase('GET', 'users', null, $filters);
        if ($response['status'] === 200) {
            echo json_encode(['success' => true, 'data' => $response['data']]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to fetch users.']);
        }
        break;

    case 'addUser':
        $input = json_decode(file_get_contents('php://input'), true);
        $fullName = $input['fullName'] ?? '';
        $email = $input['email'] ?? '';
        $phone = $input['phone'] ?? null;
        $userType = $input['userType'] ?? 'reader';
        $password = $input['password'] ?? 'default_password'; // A default password for new users, should be more robust in production

        if (empty($fullName) || empty($email) || empty($password)) {
            echo json_encode(['success' => false, 'message' => 'Full Name, Email, and Password are required.']);
            exit;
        }

        $data = [
            'name' => $fullName,
            'email' => $email,
            'phone_number' => $phone,
            'roles' => $userType,
            'password' => $password // WARNING: Should be hashed
        ];
        $response = callSupabase('POST', 'users', $data);

        if ($response['status'] === 201) { // 201 Created
            echo json_encode(['success' => true, 'message' => 'User added successfully!']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to add user. Email might already exist or other database error.']);
        }
        break;

    case 'updateUser':
        $input = json_decode(file_get_contents('php://input'), true);
        $userId = $input['id'] ?? '';
        $fullName = $input['fullName'] ?? '';
        $email = $input['email'] ?? '';
        $phone = $input['phone'] ?? null;
        $userType = $input['userType'] ?? 'reader';

        if (empty($userId) || empty($fullName) || empty($email)) {
            echo json_encode(['success' => false, 'message' => 'User ID, Full Name, and Email are required.']);
            exit;
        }

        $data = [
            'name' => $fullName,
            'email' => $email,
            'phone_number' => $phone,
            'roles' => $userType
        ];
        // Changed PUT to PATCH for user updates as well, for consistency and partial update semantics
        $response = callSupabase('PATCH', 'users', $data, ['user_id' => 'eq.' . $userId]);

        if ($response['status'] === 204) { // 204 No Content for successful PATCH
            echo json_encode(['success' => true, 'message' => 'User updated successfully!']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to update user. Email might already exist or other database error.']);
        }
        break;

    case 'deleteUser':
        $userId = $_GET['id'] ?? '';
        if (empty($userId)) {
            echo json_encode(['success' => false, 'message' => 'User ID is required.']);
            exit;
        }
        $response = callSupabase('DELETE', 'users', null, ['user_id' => 'eq.' . $userId]);

        if ($response['status'] === 204) { // 204 No Content for successful DELETE
            echo json_encode(['success' => true, 'message' => 'User deleted successfully!']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to delete user.']);
        }
        break;

    case 'exportUsersExcel':
        // Fetch all users
        $response = callSupabase('GET', 'users', null, [], '*'); // Get all columns

        if ($response['status'] === 200 && !empty($response['data'])) {
            $usersData = $response['data'];

            // Set headers for CSV download
            header('Content-Type: text/csv');
            header('Content-Disposition: attachment; filename="users_export_' . date('Ymd_His') . '.csv"');
            header('Pragma: no-cache');
            header('Expires: 0');

            $output = fopen('php://output', 'w');

            // Output CSV header
            $header = ['User ID', 'Name', 'Email', 'Phone Number', 'Roles', 'Password', 'Created At'];
            fputcsv($output, $header);

            // Output user data
            foreach ($usersData as $user) {
                // Ensure all keys exist and handle potential nulls
                $row = [
                    $user['user_id'] ?? '',
                    $user['name'] ?? '',
                    $user['email'] ?? '',
                    $user['phone_number'] ?? '',
                    $user['roles'] ?? '',
                    $user['password'] ?? '', // WARNING: Exporting plain passwords is a security risk
                    $user['created_at'] ?? '' // Assuming a created_at column for completeness
                ];
                fputcsv($output, $row);
            }

            fclose($output);
            exit; // Terminate script after file download
        } else {
            echo json_encode(['success' => false, 'message' => 'No users found or failed to fetch data for export.']);
        }
        break;

    case 'getCategories':
        $response = callSupabase('GET', 'genres');
        if ($response['status'] === 200) {
            echo json_encode(['success' => true, 'data' => $response['data']]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to fetch categories.']);
        }
        break;

    case 'addCategory':
        $input = json_decode(file_get_contents('php://input'), true);
        $categoryName = $input['name'] ?? '';

        if (empty($categoryName)) {
            echo json_encode(['success' => false, 'message' => 'Category name cannot be empty.']);
            exit;
        }

        $response = callSupabase('POST', 'genres', ['genre_name' => $categoryName]);

        if ($response['status'] === 201) {
            echo json_encode(['success' => true, 'message' => 'Category added successfully!']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to add category. Category might already exist.']);
        }
        break;

    case 'updateCategory':
        $input = json_decode(file_get_contents('php://input'), true);
        $categoryId = $input['id'] ?? '';
        $categoryName = $input['name'] ?? '';

        if (empty($categoryId) || empty($categoryName)) {
            echo json_encode(['success' => false, 'message' => 'Category ID and name are required.']);
            exit;
        }

        // Changed PUT to PATCH for category updates as well
        $response = callSupabase('PATCH', 'genres', ['genre_name' => $categoryName], ['genre_id' => 'eq.' . $categoryId]);

        if ($response['status'] === 204) {
            echo json_encode(['success' => true, 'message' => 'Category updated successfully!']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to update category. Category name might already exist.']);
        }
        break;

    case 'deleteCategory':
        $categoryId = $_GET['id'] ?? '';
        if (empty($categoryId)) {
            echo json_encode(['success' => false, 'message' => 'Category ID is required.']);
            exit;
        }
        $response = callSupabase('DELETE', 'genres', null, ['genre_id' => 'eq.' . $categoryId]);

        if ($response['status'] === 204) {
            echo json_encode(['success' => true, 'message' => 'Category deleted successfully!']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to delete category.']);
        }
        break;

    // --- Clerk Specific Actions ---

    case 'getPendingReviews':
        $response = callSupabase('GET', 'reviews', null, ['status' => 'eq.pending']);
        if ($response['status'] === 200) {
            // Join with ebooks and users tables to get more context
            $reviewsWithDetails = [];
            foreach ($response['data'] as $review) {
                $ebookResponse = callSupabase('GET', 'ebooks', null, ['ebook_id' => 'eq.' . $review['ebook_id']], 'title,author');
                $userResponse = callSupabase('GET', 'users', null, ['user_id' => 'eq.' . $review['user_id']], 'name,email');
                
                $review['ebook_title'] = $ebookResponse['data'][0]['title'] ?? 'Unknown Ebook';
                $review['ebook_author'] = $ebookResponse['data'][0]['author'] ?? 'Unknown Author';
                $review['user_name'] = $userResponse['data'][0]['name'] ?? 'Unknown User';
                $review['user_email'] = $userResponse['data'][0]['email'] ?? 'N/A';
                $reviewsWithDetails[] = $review;
            }
            echo json_encode(['success' => true, 'data' => $reviewsWithDetails]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to fetch pending reviews.']);
        }
        break;

    case 'updateReviewStatus':
        // --- START DEBUG LOGGING ---
        error_log("Debug: api.php received RAW input: " . file_get_contents('php://input'));
        $input = json_decode(file_get_contents('php://input'), true);
        error_log("Debug: api.php received JSON decoded input: " . print_r($input, true));
        $reviewId = $input['reviewId'] ?? '';
        $newStatus = $input['newStatus'] ?? ''; // 'approved' or 'rejected'
        error_log("Debug: Extracted reviewId: '" . $reviewId . "', newStatus: '" . $newStatus . "'");
        // --- END DEBUG LOGGING ---

        if (empty($reviewId) || !in_array($newStatus, ['approved', 'rejected'])) {
            echo json_encode(['success' => false, 'message' => 'Review ID and a valid new status (approved/rejected) are required.']);
            exit;
        }

        $data = ['status' => $newStatus];
        // Changed method from 'PUT' to 'PATCH'
        $response = callSupabase('PATCH', 'reviews', $data, ['review_id' => 'eq.' . $reviewId]);

        // --- DEBUG LOGGING FOR SUPABASE RESPONSE ---
        error_log("Debug: Supabase API response for updateReviewStatus: " . print_r($response, true));
        // --- END DEBUG LOGGING ---

        if ($response['status'] === 204) { // 204 No Content for successful PATCH (usually)
            echo json_encode(['success' => true, 'message' => 'Review status updated successfully!']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to update review status.']);
        }
        break;

    case 'getReports':
        // This is a placeholder for actual report generation.
        // For example, fetch count of books, users, reviews, popular genres etc.
        // Let's fetch some simple aggregated data for demonstration.

        $booksResponse = callSupabase('GET', 'ebooks', null, [], 'count');
        $usersResponse = callSupabase('GET', 'users', null, [], 'count');
        $reviewsResponse = callSupabase('GET', 'reviews', null, [], 'count');
        $approvedReviewsResponse = callSupabase('GET', 'reviews', null, ['status' => 'eq.approved'], 'count');
        $pendingReviewsResponse = callSupabase('GET', 'reviews', null, ['status' => 'eq.pending'], 'count');

        $reports = [
            'total_books' => $booksResponse['data'][0]['count'] ?? 0,
            'total_users' => $usersResponse['data'][0]['count'] ?? 0,
            'total_reviews' => $reviewsResponse['data'][0]['count'] ?? 0,
            'approved_reviews' => $approvedReviewsResponse['data'][0]['count'] ?? 0,
            'pending_reviews' => $pendingReviewsResponse['data'][0]['count'] ?? 0,
            // Add more complex reports here as needed, e.g.,
            // - Top 5 Authors: SELECT author, count(*) FROM ebooks GROUP BY author ORDER BY count(*) DESC LIMIT 5
            // - Average Rating per Ebook: SELECT ebook_id, AVG(rating) FROM reviews GROUP BY ebook_id
        ];

        echo json_encode(['success' => true, 'data' => $reports]);
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action.']);
        break;
}
?>