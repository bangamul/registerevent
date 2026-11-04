<?php

require_once 'cors.php';
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

require_once 'db.php';

try {
    $updatedList = [];
    $insertedList = [];

    // 1. UPDATE 4 PEJABAT BKPM
    $updates = [
        [
            'keyword' => '%HELDY SATRYA PUTERA%',
            'name' => null,
            'job' => 'Deputi Bidang Hilirisasi Investasi Strategis BKPM',
        ],
        [
            'keyword' => '%RIYATNO%',
            'name' => null,
            'job' => 'Deputi Bidang Pengembangan Iklim Penanaman Modal BKPM',
        ],
        [
            'keyword' => '%NURUL ICHWAN%',
            'name' => null,
            'job' => 'Deputi Bidang Promosi Penanaman Modal BKPM',
        ],
        [
            'keyword' => '%EDY JUNAEDI%',
            'name' => 'Dr. Edy Junaedi, S.STP., M.Si.',
            'job' => 'Deputi Bidang Pengendalian Pelaksanaan Penanaman Modal BKPM',
        ],
    ];

    foreach ($updates as $u) {
        if ($u['name']) {
            $stmt = $pdo->prepare("UPDATE user_peserta SET name = ?, pekerjaan = ? WHERE name LIKE ?");
            $stmt->execute([$u['name'], $u['job'], $u['keyword']]);
        } else {
            $stmt = $pdo->prepare("UPDATE user_peserta SET pekerjaan = ? WHERE name LIKE ?");
            $stmt->execute([$u['job'], $u['keyword']]);
        }
        $updatedList[] = $u['name'] ?? $u['keyword'];
    }

    // 2. TAMBAH 11 DATA BARU (Idempotent: cek dulu agar tidak duplikat)
    $newParticipants = [
        [
            'name' => 'Ir. Noer Adi Wardojo, M.Sc',
            'job' => 'Plt. DEPUTI BIDANG PENGENDALIAN PENCEMARAN DAN KERUSAKAN LINGKUNGAN',
            'reg' => 'REG-10A1F442',
            'ind' => 'IND-D8DC7170'
        ],
        [
            'name' => 'VINDA DAMAYANTI ANSJAR, Ssi., M.Sc',
            'job' => 'DEPUTI BIDANG PENGELOLAAN SAMPAH, LIMBAH DAN BAHAN BERBAHAYA DAN BERACUN (B3)',
            'reg' => 'REG-37C1F9BA',
            'ind' => 'IND-C760F044'
        ],
        [
            'name' => 'Irjen Pol Adi Deriyan Jayamarta, S.I.K., M.H',
            'job' => 'DEPUTI GAKUM LINGKUNGAN HIDUP',
            'reg' => 'REG-475F4EA7',
            'ind' => 'IND-3FED9D4E'
        ],
        [
            'name' => 'Komjen Pol. Winarto, S.H., M.H',
            'job' => 'IRTAMA KEMENTERIAN LINGKUNGAN HIDUP',
            'reg' => 'REG-16BEA6F4',
            'ind' => 'IND-BF54F979'
        ],
        [
            'name' => 'HAENDRA SUBEKTI, ST, MT',
            'job' => 'DEPUTI PENGKAJIAN KESELAMATAN NUKLIR BAPETEN',
            'reg' => 'REG-0119AA2A',
            'ind' => 'IND-4232290D'
        ],
        [
            'name' => 'MOHAMMAD RIDWAN, S.T., M.Eng',
            'job' => 'SEKRETARIS UTAMA BAPETEN',
            'reg' => 'REG-FC48110A',
            'ind' => 'IND-ABA7311C'
        ],
        [
            'name' => 'ASEP SAEFULLOH HERMAWAN, S.Si., M.T',
            'job' => 'DIREKTUR PERIZINAN FASILITAS RADIASI DAN ZAT RADIOAKTIF BAPETEN',
            'reg' => 'REG-2C7E71F8',
            'ind' => 'IND-23C82891'
        ],
        [
            'name' => 'Dr. Ir. Rudy Salahuddin, M.E.M.',
            'job' => 'Sekretaris Kementerian/Sekretaris Utama BKPM',
            'reg' => 'REG-51611E8B',
            'ind' => 'IND-3044E0DE'
        ],
        [
            'name' => 'Ichsan Zulkarnaen, S.E., M.Sc., Ph.D.',
            'job' => 'Deputi Bidang Perencanaan Penanaman Modal BKPM',
            'reg' => 'REG-FE37B9D7',
            'ind' => 'IND-96A01BF0'
        ],
        [
            'name' => 'Andi Maulana, S.E., M.M.',
            'job' => 'Deputi Bidang Pelayanan Penanaman Modal BKPM',
            'reg' => 'REG-16ED1BF8',
            'ind' => 'IND-A058A84D'
        ],
        [
            'name' => 'Siti Romayah, S. Kom., M.M.',
            'job' => 'Deputi Bidang Teknologi Informasi Penanaman Modal BKPM',
            'reg' => 'REG-95F88632',
            'ind' => 'IND-C17B6BEF'
        ],
        [
            'name' => 'RUSDI',
            'job' => 'BALITBANG GOLKAR',
            'reg' => 'REG-CFC539ED',
            'ind' => 'IND-83CB4415'
        ],
        [
            'name' => 'YURISMAN',
            'job' => 'BALITBANG GOLKAR',
            'reg' => 'REG-85124129',
            'ind' => 'IND-2E2E3CCD'
        ],
        [
            'name' => 'MUTMAINNAH',
            'job' => 'BALITBANG GOLKAR',
            'reg' => 'REG-2ADFE7FE',
            'ind' => 'IND-39912A66'
        ],
    ];

    $stmtCheck = $pdo->prepare("SELECT id FROM user_peserta WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1");
    $stmtInsert = $pdo->prepare("
        INSERT INTO user_peserta (
            id_registrasi, id_independent, name, notelp, pekerjaan,
            gate, role_permission, status, rsvp_status, jalur_undangan, wa_status, souvenir_status
        ) VALUES (
            ?, ?, ?, '', ?,
            '1', '1', 0, 'pending', 'manual', 'unsent', 'unclaimed'
        )
    ");

    foreach ($newParticipants as $np) {
        $stmtCheck->execute([$np['name']]);
        $exists = $stmtCheck->fetchColumn();

        if (!$exists) {
            $stmtInsert->execute([
                $np['reg'],
                $np['ind'],
                $np['name'],
                $np['job'],
            ]);
            $insertedList[] = $np['name'];
        }
    }

    $totalCount = $pdo->query("SELECT COUNT(*) FROM user_peserta")->fetchColumn();

    echo json_encode([
        'success' => true,
        'message' => 'Data tamu berhasil diperbarui dan ditambahkan!',
        'updated_count' => count($updatedList),
        'inserted_count' => count($insertedList),
        'inserted_names' => $insertedList,
        'total_tamu_sekarang' => (int) $totalCount
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Gagal memperbarui data: ' . $e->getMessage()
    ]);
}
