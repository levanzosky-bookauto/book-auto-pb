<?php
/**
 * Book Auto PB - Centralized Users API (DreamHost Server Sync)
 * Allows multi-device synchronization for user accounts, credentials and roles.
 */

// Headers for JSON response & CORS
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dataDir = __DIR__ . '/../data';
$usersFile = $dataDir . '/users.json';

// Ensure data directory exists
if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0755, true);
}

// Initial fallback users
$initialUsers = [
    [
        "id" => "user_shirantha",
        "username" => "shirantha",
        "password" => "Maduka0822",
        "name" => "Shirantha",
        "role" => "super_admin",
        "createdAt" => "2026-10-03T20:03:13.022Z"
    ],
    [
        "id" => "user_1791310116076",
        "username" => "luciano",
        "password" => "1234",
        "name" => "Luciano",
        "role" => "editor",
        "createdAt" => "2026-10-06T18:08:36.076Z"
    ]
];

// Handle GET request: Return current users list
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($usersFile)) {
        $content = file_get_contents($usersFile);
        $decoded = json_decode($content, true);
        if (is_array($decoded) && count($decoded) > 0) {
            echo json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    // Fallback: write and return initial users
    @file_put_contents($usersFile, json_encode($initialUsers, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
    echo json_encode($initialUsers, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// Handle POST request: Update users list
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    if (!$rawInput) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Payload mancante o vuoto"]);
        exit;
    }

    $newUsers = json_decode($rawInput, true);
    if (!is_array($newUsers) || count($newUsers) === 0) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Il formato dei dati deve essere un array di utenti"]);
        exit;
    }

    // Validate each user entry
    $validUsers = [];
    foreach ($newUsers as $u) {
        if (!is_array($u)) continue;
        $username = trim($u['username'] ?? '');
        $password = trim($u['password'] ?? '');
        if ($username !== '' && $password !== '') {
            $validUsers[] = [
                "id" => $u['id'] ?? ('user_' . time() . '_' . rand(100, 999)),
                "username" => strtolower($username),
                "password" => $password,
                "name" => trim($u['name'] ?? $username),
                "role" => trim($u['role'] ?? 'editor'),
                "email" => trim($u['email'] ?? ''),
                "createdAt" => $u['createdAt'] ?? date('c')
            ];
        }
    }

    if (count($validUsers) === 0) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Nessun utente valido trovato nel payload"]);
        exit;
    }

    $saved = @file_put_contents($usersFile, json_encode($validUsers, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
    if ($saved === false) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => "Impossibile scrivere users.json sul server"]);
        exit;
    }

    echo json_encode([
        "success" => true,
        "count" => count($validUsers),
        "message" => "Utenti salvati con successo sul server DreamHost"
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(405);
echo json_encode(["error" => "Metodo non consentito"]);
