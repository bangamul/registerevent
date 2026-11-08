<?php

require_once 'cors.php';
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

require_once 'db.php';

$stmt = $pdo->prepare("
    SELECT
        id,
        id_registrasi,
        id_independent,
        name,
        notelp,
        email,
        foto,
        pekerjaan,
        waktu_hadir,
        waktu_sesi_2,
        waktu_konfirmasi,
        waktu_kirim_wa,
        wa_status,
        gate,
        role_permission,
        status,
        rsvp_status,
        COALESCE(jalur_undangan, 'blast') as jalur_undangan,
        waktu_souvenir,
        COALESCE(souvenir_status, 'unclaimed') as souvenir_status,
        souvenir_petugas,
        seating_arrangement
    FROM user_peserta
    ORDER BY name ASC
");

$stmt->execute();

$peserta = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($peserta as &$item) {
    $item['status'] = (bool) $item['status'];
}

echo json_encode([
    'success' => true,
    'data' => $peserta,
    'total' => count($peserta),
]);
