<?php
/**
 * Book Auto PB - Direct Email Dispatcher API (DreamHost Server)
 * Dispatches transactional emails (OTP recovery codes, expiration alerts) directly to user recipients.
 */

// Headers for JSON response & CORS
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Cache-Control: no-cache, no-store, must-revalidate');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'success' => false,
        'message' => 'Metodo non consentito. Usa POST con payload JSON.'
    ]);
    exit;
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Payload JSON non valido.'
    ]);
    exit;
}

$to = trim($data['to'] ?? $data['email'] ?? $data['recipient'] ?? '');
$subject = trim($data['subject'] ?? $data['_subject'] ?? 'Notifica Book Auto PB');
$messageText = trim($data['message'] ?? $data['text'] ?? '');
$otpCode = trim($data['otpCode'] ?? '');
$userName = trim($data['userName'] ?? $data['name'] ?? 'Utente');
$username = trim($data['username'] ?? '');

if (empty($to) || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Indirizzo email destinatario mancante o non valido.'
    ]);
    exit;
}

// Build clean, modern HTML email
$htmlBody = '<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <title>' . htmlspecialchars($subject, ENT_QUOTES, 'UTF-8') . '</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; color: #f1f5f9; margin: 0; padding: 20px; }
    .card { max-width: 540px; margin: 0 auto; background-color: #0f172a; border: 1px solid #334155; border-radius: 16px; padding: 28px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .header { border-bottom: 1px solid #1e293b; padding-bottom: 16px; margin-bottom: 20px; }
    .title { color: #f59e0b; font-size: 20px; font-weight: bold; margin: 0 0 6px 0; }
    .subtitle { color: #94a3b8; font-size: 13px; margin: 0; }
    .content { font-size: 14px; line-height: 1.6; color: #cbd5e1; }
    .otp-box { background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.15)); border: 2px dashed #f59e0b; border-radius: 14px; padding: 20px; text-align: center; margin: 24px 0; }
    .otp-label { color: #fbbf24; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px; }
    .otp-code { font-family: monospace, Courier; font-size: 34px; font-weight: 900; letter-spacing: 6px; color: #ffffff; text-shadow: 0 0 12px rgba(245,158,11,0.5); }
    .user-pill { display: inline-block; background-color: #1e293b; color: #38bdf8; padding: 4px 10px; border-radius: 8px; font-family: monospace; font-size: 13px; font-weight: bold; }
    .footer { border-top: 1px solid #1e293b; padding-top: 16px; margin-top: 24px; font-size: 11px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1 class="title">Book Auto PB</h1>
      <p class="subtitle">Gestione &amp; Catalogo Vetture — Servizio Notifiche Sicure</p>
    </div>
    <div class="content">
      <p>Ciao <strong>' . htmlspecialchars($userName, ENT_QUOTES, 'UTF-8') . '</strong>,</p>
      <p>Hai richiesto il recupero delle credenziali di accesso al sistema.</p>';

if (!empty($username)) {
    $htmlBody .= '<p>👤 Il tuo Nome Utente registrato è: <span class="user-pill">@' . htmlspecialchars($username, ENT_QUOTES, 'UTF-8') . '</span></p>';
}

if (!empty($otpCode)) {
    $htmlBody .= '
      <div class="otp-box">
        <div class="otp-label">Codice di Sicurezza Temporaneo</div>
        <div class="otp-code">' . htmlspecialchars($otpCode, ENT_QUOTES, 'UTF-8') . '</div>
      </div>
      <p style="font-size: 12px; color: #94a3b8; text-align: center;">Inserisci questo codice a 6 cifre nella schermata di recupero per reimpostare la tua password.<br>Il codice è valido per 15 minuti.</p>';
} else if (!empty($messageText)) {
    $htmlBody .= '<div style="background-color: #1e293b; border-radius: 10px; padding: 14px; margin: 16px 0; font-family: monospace; font-size: 12px; white-space: pre-wrap; color: #e2e8f0;">' . htmlspecialchars($messageText, ENT_QUOTES, 'UTF-8') . '</div>';
}

$htmlBody .= '
      <p style="margin-top: 24px; font-size: 12px; color: #64748b;">Se non sei stato tu a richiedere questa operazione, puoi tranquillamente ignorare questo messaggio: le tue credenziali rimarranno protette e invariate.</p>
    </div>
    <div class="footer">
      Book Auto PB Management &bull; Notifica di sicurezza generata automaticamente
    </div>
  </div>
</body>
</html>';

// Mail headers
$fromEmail = 'noreply@nisshi.dreamhosters.com';
$fromName = 'Book Auto PB';
$headers = [];
$headers[] = 'MIME-Version: 1.0';
$headers[] = 'Content-type: text/html; charset=utf-8';
$headers[] = 'From: =?UTF-8?B?' . base64_encode($fromName) . '?= <' . $fromEmail . '>';
$headers[] = 'Reply-To: ' . $to;
$headers[] = 'X-Mailer: BookAutoPB-PHP/' . phpversion();

$subjectEncoded = '=?UTF-8?B?' . base64_encode($subject) . '?=';

// Send email via PHP mail()
$mailSent = @mail($to, $subjectEncoded, $htmlBody, implode("\r\n", $headers), "-f " . $fromEmail);

// If first attempt fails without -f flag, try without extra parameter
if (!$mailSent) {
    $mailSent = @mail($to, $subjectEncoded, $htmlBody, implode("\r\n", $headers));
}

if ($mailSent) {
    echo json_encode([
        'success' => true,
        'message' => 'Email inviata con successo!',
        'recipient' => $to,
        'method' => 'dreamhost_mail'
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Invio email non riuscito tramite il server di posta.',
        'recipient' => $to
    ]);
}
