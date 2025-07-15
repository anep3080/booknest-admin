<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Be cautious with '*' in production, restrict to your frontend domain
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization, apikey');

$supabaseUrl = 'https://fymykhhwvegsuqpekryy.supabase.co';
$supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5bXlraGh3dmVnc3VxcGVrcnl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NzM2NTMsImV4cCI6MjA2NzU0OTY1M30._B4DsNRBOvj1y5oFFOts40sAM-mTvE0cNioBfcavfS4';

function callSupabase($method, $endpoint, $data = null, $filters = [], $select = '*') {
    global $supabaseUrl, $supabaseAnonKey;
    $url = $supabaseUrl . '/rest/v1/' . $endpoint;

    // Build query parameters for GET requests
    if ($method === 'GET' && !empty($filters)) {
        $queryParams = [];
        foreach ($filters as $key => $value) {
            $queryParams[] = "$key=$value";
        }
        $url .= '?' . implode('&', $queryParams) . '&select=' . $select;
    } elseif ($method === 'GET' && $select !== '*') {
         $url .= '?select=' . $select;
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
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            break;
        case 'DELETE':
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
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

        // Supabase does not have a direct "login with email/password" endpoint via postgrest.
        // You would typically use the Auth API (which requires the JS SDK or a separate backend auth server).
        // For this simplified example, we'll simulate by checking against the 'users' table directly,
        // which is NOT secure for production as passwords should be hashed and compared.
        // A proper solution involves Supabase's GoTrue (Auth) service.
        $response = callSupabase('GET', 'users', null, [
            'email' => 'eq.' . $email,
            'password' => 'eq.' . $password, // WARNING: Insecure, passwords should be hashed
            'roles' => 'eq.admin' // Only allow admin role to login
        ]);

        if ($response['status'] === 200 && !empty($response['data'])) {
            echo json_encode(['success' => true, 'message' => 'Login successful!']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid credentials or not an admin.']);
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

        if (empty($fullName) || empty($email)) {
            echo json_encode(['success' => false, 'message' => 'Full Name and Email are required.']);
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
            echo json_encode(['success' => false, 'message' => 'Failed to add user.']);
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
        $response = callSupabase('PUT', 'users', $data, ['user_id' => 'eq.' . $userId]);

        if ($response['status'] === 204) { // 204 No Content for successful PUT
            echo json_encode(['success' => true, 'message' => 'User updated successfully!']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to update user.']);
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

        $response = callSupabase('PUT', 'genres', ['genre_name' => $categoryName], ['genre_id' => 'eq.' . $categoryId]);

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

    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action.']);
        break;
}
?>