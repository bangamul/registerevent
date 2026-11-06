<?php
/**
 * Skrip Sinkronisasi & Penambahan Data Tamu Undangan
 * Jalankan file ini melalui browser:
 * https://event-rsvp.lotusparking.my.id/trisakti/api/update_tamu.php
 */

require_once 'cors.php';
header('Content-Type: application/json; charset=utf-8');

require_once 'db.php';

try {
    $updatedNames = [];
    $insertedNames = [];

    // ==============================================================================
    // 1. UPDATE JABATAN & NAMA TAMU PEJABAT BKPM (IDEMPOTENT)
    // ==============================================================================
    $pejabatBkpm = [
        [
            'search' => '%HELDY SATRYA PUTERA%',
            'name' => null,
            'job' => 'Deputi Bidang Hilirisasi Investasi Strategis BKPM',
        ],
        [
            'search' => '%RIYATNO%',
            'name' => null,
            'job' => 'Deputi Bidang Pengembangan Iklim Penanaman Modal BKPM',
        ],
        [
            'search' => '%NURUL ICHWAN%',
            'name' => null,
            'job' => 'Deputi Bidang Promosi Penanaman Modal BKPM',
        ],
        [
            'search' => '%EDY JUNAEDI%',
            'name' => 'Dr. Edy Junaedi, S.STP., M.Si.',
            'job' => 'Deputi Bidang Pengendalian Pelaksanaan Penanaman Modal BKPM',
        ],
    ];

    foreach ($pejabatBkpm as $pejabat) {
        if ($pejabat['name'] !== null) {
            $stmt = $pdo->prepare("UPDATE user_peserta SET name = ?, pekerjaan = ? WHERE name LIKE ?");
            $stmt->execute([$pejabat['name'], $pejabat['job'], $pejabat['search']]);
        } else {
            $stmt = $pdo->prepare("UPDATE user_peserta SET pekerjaan = ? WHERE name LIKE ?");
            $stmt->execute([$pejabat['job'], $pejabat['search']]);
        }
        if ($stmt->rowCount() > 0) {
            $updatedNames[] = $pejabat['search'];
        }
    }

    // ==============================================================================
    // 2. DATA TAMU BARU (KLHK, BAPETEN, BKPM, BALITBANG GOLKAR, ORMAS BUDDHIS & GEMABUDHI)
    // ==============================================================================
    $tamuBaru = [
        // Batch 1: KLHK, BAPETEN, BKPM (11 Orang)
        [
            'name' => 'Ir. Noer Adi Wardojo, M.Sc',
            'job' => 'Plt. DEPUTI BIDANG PENGENDALIAN PENCEMARAN DAN KERUSAKAN LINGKUNGAN',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-10A1F442',
            'ind' => 'IND-D8DC7170'
        ],
        [
            'name' => 'VINDA DAMAYANTI ANSJAR, Ssi., M.Sc',
            'job' => 'DEPUTI BIDANG PENGELOLAAN SAMPAH, LIMBAH DAN BAHAN BERBAHAYA DAN BERACUN (B3)',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-37C1F9BA',
            'ind' => 'IND-C760F044'
        ],
        [
            'name' => 'Irjen Pol Adi Deriyan Jayamarta, S.I.K., M.H',
            'job' => 'DEPUTI GAKUM LINGKUNGAN HIDUP',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-475F4EA7',
            'ind' => 'IND-3FED9D4E'
        ],
        [
            'name' => 'Komjen Pol. Winarto, S.H., M.H',
            'job' => 'IRTAMA KEMENTERIAN LINGKUNGAN HIDUP',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-16BEA6F4',
            'ind' => 'IND-BF54F979'
        ],
        [
            'name' => 'HAENDRA SUBEKTI, ST, MT',
            'job' => 'DEPUTI PENGKAJIAN KESELAMATAN NUKLIR BAPETEN',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-0119AA2A',
            'ind' => 'IND-4232290D'
        ],
        [
            'name' => 'MOHAMMAD RIDWAN, S.T., M.Eng',
            'job' => 'SEKRETARIS UTAMA BAPETEN',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-FC48110A',
            'ind' => 'IND-ABA7311C'
        ],
        [
            'name' => 'ASEP SAEFULLOH HERMAWAN, S.Si., M.T',
            'job' => 'DIREKTUR PERIZINAN FASILITAS RADIASI DAN ZAT RADIOAKTIF BAPETEN',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-2C7E71F8',
            'ind' => 'IND-23C82891'
        ],
        [
            'name' => 'Dr. Ir. Rudy Salahuddin, M.E.M.',
            'job' => 'Sekretaris Kementerian/Sekretaris Utama BKPM',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-51611E8B',
            'ind' => 'IND-3044E0DE'
        ],
        [
            'name' => 'Ichsan Zulkarnaen, S.E., M.Sc., Ph.D.',
            'job' => 'Deputi Bidang Perencanaan Penanaman Modal BKPM',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-FE37B9D7',
            'ind' => 'IND-96A01BF0'
        ],
        [
            'name' => 'Andi Maulana, S.E., M.M.',
            'job' => 'Deputi Bidang Pelayanan Penanaman Modal BKPM',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-16ED1BF8',
            'ind' => 'IND-A058A84D'
        ],
        [
            'name' => 'Siti Romayah, S. Kom., M.M.',
            'job' => 'Deputi Bidang Teknologi Informasi Penanaman Modal BKPM',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-95F88632',
            'ind' => 'IND-C17B6BEF'
        ],
        // Batch 2: BALITBANG GOLKAR (3 Orang)
        [
            'name' => 'RUSDI',
            'job' => 'BALITBANG GOLKAR',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-CFC539ED',
            'ind' => 'IND-83CB4415'
        ],
        [
            'name' => 'YURISMAN',
            'job' => 'BALITBANG GOLKAR',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-85124129',
            'ind' => 'IND-2E2E3CCD'
        ],
        [
            'name' => 'MUTMAINNAH',
            'job' => 'BALITBANG GOLKAR',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-2ADFE7FE',
            'ind' => 'IND-39912A66'
        ],
        // Batch 3: Tokoh Ormas Buddhis & Gemabudhi (26 Orang)
        [
            'name' => 'David Herman Jaya',
            'job' => 'Ketum LPTG N',
            'notelp' => '0816811051',
            'jalur' => 'blast',
            'reg' => 'REG-95C0B2C3',
            'ind' => 'IND-96DF3705'
        ],
        [
            'name' => 'Dharmanadi Chandra',
            'job' => 'Ketum Magabudhi',
            'notelp' => '085285528662',
            'jalur' => 'blast',
            'reg' => 'REG-F273F801',
            'ind' => 'IND-E421788E'
        ],
        [
            'name' => 'Andi Rojali',
            'job' => 'Ketum Mahasi',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-26DA6ABC',
            'ind' => 'IND-DD9AE701'
        ],
        [
            'name' => 'Romo Citra Surya',
            'job' => 'Ketum Mapanbumi',
            'notelp' => '08121061163',
            'jalur' => 'blast',
            'reg' => 'REG-97B2D3C5',
            'ind' => 'IND-7F1B7718'
        ],
        [
            'name' => 'Aiko Senosoenoto',
            'job' => 'Ketum MNSBDI',
            'notelp' => '0811926411',
            'jalur' => 'blast',
            'reg' => 'REG-16463CD0',
            'ind' => 'IND-77E508C7'
        ],
        [
            'name' => 'Amin Untario',
            'job' => 'Ketum MBI',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-6D4C479B',
            'ind' => 'IND-AA3CBE8C'
        ],
        [
            'name' => 'Hong Tjin',
            'job' => 'Tzu Chi',
            'notelp' => '08811235678',
            'jalur' => 'blast',
            'reg' => 'REG-EF4DB9C7',
            'ind' => 'IND-7D10DFAC'
        ],
        [
            'name' => 'Rahmat Harsono',
            'job' => 'Permabudhi / IKAL',
            'notelp' => '',
            'jalur' => 'manual',
            'reg' => 'REG-207A2C58',
            'ind' => 'IND-429DA8FA'
        ],
        [
            'name' => 'Winarso',
            'job' => 'Tzu Chi',
            'notelp' => '081806364999',
            'jalur' => 'blast',
            'reg' => 'REG-35933900',
            'ind' => 'IND-91D2772D'
        ],
        [
            'name' => 'Judha Hartono',
            'job' => 'Magabudhi',
            'notelp' => '08161890042',
            'jalur' => 'blast',
            'reg' => 'REG-A43DC794',
            'ind' => 'IND-B4C3BC53'
        ],
        [
            'name' => 'Erwin Tjioe',
            'job' => 'Matrisia',
            'notelp' => '0816725709',
            'jalur' => 'blast',
            'reg' => 'REG-4D1BBF79',
            'ind' => 'IND-B8172E90'
        ],
        [
            'name' => 'Alim Sudio',
            'job' => 'MNSBDI',
            'notelp' => '08159798078',
            'jalur' => 'blast',
            'reg' => 'REG-89634453',
            'ind' => 'IND-189262A5'
        ],
        [
            'name' => 'Rosmary',
            'job' => 'Magabudhi',
            'notelp' => '0811961878',
            'jalur' => 'blast',
            'reg' => 'REG-4ED0303A',
            'ind' => 'IND-4A708D85'
        ],
        [
            'name' => 'Piandi',
            'job' => 'MBI',
            'notelp' => '081388778778',
            'jalur' => 'blast',
            'reg' => 'REG-28429D1B',
            'ind' => 'IND-FE709FE4'
        ],
        [
            'name' => 'Romo M Canto Santoso',
            'job' => 'MBI',
            'notelp' => '081807882259',
            'jalur' => 'blast',
            'reg' => 'REG-D2C5FD4D',
            'ind' => 'IND-28024C72'
        ],
        [
            'name' => 'Pramana Winardi',
            'job' => 'Gemabudhi',
            'notelp' => '0818913719',
            'jalur' => 'blast',
            'reg' => 'REG-93D47B84',
            'ind' => 'IND-076CA672'
        ],
        [
            'name' => 'Edi Rahmawijaya Putra',
            'job' => 'Gemabudhi',
            'notelp' => '0818870511',
            'jalur' => 'blast',
            'reg' => 'REG-4B299F36',
            'ind' => 'IND-C2603A85'
        ],
        [
            'name' => 'Anes Dwi Prasetya',
            'job' => 'Gemabudhi',
            'notelp' => '087884408933',
            'jalur' => 'blast',
            'reg' => 'REG-3B67F7BC',
            'ind' => 'IND-3D2E5E0D'
        ],
        [
            'name' => 'Liedya Angowijaya',
            'job' => 'Gemabudhi',
            'notelp' => '089669996909',
            'jalur' => 'blast',
            'reg' => 'REG-AB55C8FC',
            'ind' => 'IND-EE303309'
        ],
        [
            'name' => 'Widhia Seni',
            'job' => 'Gemabudhi',
            'notelp' => '085640631686',
            'jalur' => 'blast',
            'reg' => 'REG-14CFD725',
            'ind' => 'IND-64489473'
        ],
        [
            'name' => 'Netta Hartini',
            'job' => 'Gemabudhi',
            'notelp' => '08998814797',
            'jalur' => 'blast',
            'reg' => 'REG-E5C984A4',
            'ind' => 'IND-57FB6A10'
        ],
        [
            'name' => 'Aili',
            'job' => 'Gemabudhi',
            'notelp' => '089619978789',
            'jalur' => 'blast',
            'reg' => 'REG-2367C12D',
            'ind' => 'IND-884D5E5E'
        ],
        [
            'name' => 'dr. Herna',
            'job' => 'Gemabudhi',
            'notelp' => '082310453683',
            'jalur' => 'blast',
            'reg' => 'REG-86437E26',
            'ind' => 'IND-79D85DCC'
        ],
        [
            'name' => 'Karsono Lismanto',
            'job' => 'Gemabudhi',
            'notelp' => '085289026486',
            'jalur' => 'blast',
            'reg' => 'REG-DDD4BA58',
            'ind' => 'IND-A9304292'
        ],
        [
            'name' => 'Aman Budi Manduro',
            'job' => 'Gemabudhi',
            'notelp' => '087799643463',
            'jalur' => 'blast',
            'reg' => 'REG-39A29856',
            'ind' => 'IND-DE9228CC'
        ],
        [
            'name' => 'dr. Yantony Wijaya',
            'job' => 'Gemabudhi',
            'notelp' => '081298022201',
            'jalur' => 'blast',
            'reg' => 'REG-2E4C671A',
            'ind' => 'IND-04990496'
        ],
    ];

    $stmtCheck = $pdo->prepare("SELECT id FROM user_peserta WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1");
    $stmtInsert = $pdo->prepare("
        INSERT INTO user_peserta (
            id_registrasi, id_independent, name, notelp, pekerjaan,
            gate, role_permission, status, rsvp_status, jalur_undangan, wa_status, souvenir_status
        ) VALUES (
            ?, ?, ?, ?, ?,
            '1', '1', 0, 'pending', ?, 'unsent', 'unclaimed'
        )
    ");

    foreach ($tamuBaru as $tamu) {
        $stmtCheck->execute([$tamu['name']]);
        $exists = $stmtCheck->fetchColumn();

        if (!$exists) {
            $stmtInsert->execute([
                $tamu['reg'],
                $tamu['ind'],
                $tamu['name'],
                $tamu['notelp'] ?? '',
                $tamu['job'],
                $tamu['jalur'] ?? 'manual'
            ]);
            $insertedNames[] = $tamu['name'];
        }
    }

    // ==============================================================================
    // 4. TAMBAH 7 TAMU VIP BALITBANG GOLKAR (KONFIRMASI LANGSUNG KE TUAN RUMAH)
    // Status langsung 'confirmed', waktu_konfirmasi = NOW(), jalur = 'manual'
    // ==============================================================================
    $tamuVipGolkar = [
        [
            'name' => 'Prof. Dr. Yuddy Chrisnandi, SH., SE., MSi',
            'job' => 'KETUA BALITBANG DPP PARTAI GOLKAR',
            'reg' => 'REG-037FD1E5',
            'ind' => 'IND-19E42B01',
        ],
        [
            'name' => 'Prof. Dr. Drs. Ganjar Razuni, SH., MSi',
            'job' => 'BALITBANG DPP PARTAI GOLKAR',
            'reg' => 'REG-CEC00749',
            'ind' => 'IND-7A8B429F',
        ],
        [
            'name' => 'Amir A. Gofur, SE., MSi',
            'job' => 'BALITBANG DPP PARTAI GOLKAR',
            'reg' => 'REG-5C08AE8A',
            'ind' => 'IND-628D3F11',
        ],
        [
            'name' => 'Bambang Susilo, AMd',
            'job' => 'BALITBANG DPP PARTAI GOLKAR',
            'reg' => 'REG-9B0A28E9',
            'ind' => 'IND-43C92B56',
        ],
        [
            'name' => 'Prof. Dr. Bomer Pasaribu',
            'job' => 'BALITBANG DPP PARTAI GOLKAR',
            'reg' => 'REG-DD4F2E45',
            'ind' => 'IND-3E77C189',
        ],
        [
            'name' => 'Dr. Syafrizal Rambe',
            'job' => 'BALITBANG DPP PARTAI GOLKAR',
            'reg' => 'REG-BBCAF3A4',
            'ind' => 'IND-9A5C7721',
        ],
        [
            'name' => 'Leriadi, S.IP., M.IP',
            'job' => 'BALITBANG DPP PARTAI GOLKAR',
            'reg' => 'REG-73D8666F',
            'ind' => 'IND-5DF081A4',
        ],
    ];

    $stmtInsertVip = $pdo->prepare("
        INSERT INTO user_peserta (
            id_registrasi, id_independent, name, notelp, pekerjaan,
            gate, role_permission, status, rsvp_status, waktu_konfirmasi, jalur_undangan, wa_status, souvenir_status
        ) VALUES (
            ?, ?, ?, '', ?,
            '1', '1', 0, 'confirmed', NOW(), 'manual', 'unsent', 'unclaimed'
        )
    ");

    foreach ($tamuVipGolkar as $tamu) {
        $stmtCheck->execute([$tamu['name']]);
        $exists = $stmtCheck->fetchColumn();

        if (!$exists) {
            $stmtInsertVip->execute([
                $tamu['reg'],
                $tamu['ind'],
                $tamu['name'],
                $tamu['job']
            ]);
            $insertedNames[] = $tamu['name'] . ' (VIP Hadir Langsung)';
        }
    }

    // ==============================================================================
    // 5. TAMBAH 9 DATA TAMU (ACE HASAN, SEKRETARIAT KOMISI XII, WIDJAJA)
    // ==============================================================================
    $tamuBatch9 = [
        [
            'name' => 'DR.TB. ACE HASAN SYADZILY, M.Si.',
            'job' => 'GUBERNUR LEMHANNAS RI',
            'reg' => 'REG-8D2D037C',
            'ind' => 'IND-8D1BCCF0',
        ],
        [
            'name' => 'WIWIEK',
            'job' => 'SEKRETARIAT KOMISI XII',
            'reg' => 'REG-05EF6C06',
            'ind' => 'IND-081C2DC9',
        ],
        [
            'name' => 'HARRY',
            'job' => 'SEKRETARIAT KOMISI XII',
            'reg' => 'REG-F5556446',
            'ind' => 'IND-06770651',
        ],
        [
            'name' => 'TENAGA AHLI 1',
            'job' => 'SEKRETARIAT KOMISI XII',
            'reg' => 'REG-11E98A0B',
            'ind' => 'IND-14149E66',
        ],
        [
            'name' => 'TENAGA AHLI 2',
            'job' => 'SEKRETARIAT KOMISI XII',
            'reg' => 'REG-A0953ADE',
            'ind' => 'IND-1C59FFCA',
        ],
        [
            'name' => 'TENAGA AHLI 3',
            'job' => 'SEKRETARIAT KOMISI XII',
            'reg' => 'REG-53881671',
            'ind' => 'IND-3D0E7934',
        ],
        [
            'name' => 'TENAGA AHLI 4',
            'job' => 'SEKRETARIAT KOMISI XII',
            'reg' => 'REG-BE485989',
            'ind' => 'IND-C2194AF0',
        ],
        [
            'name' => 'TENAGA AHLI 5',
            'job' => 'SEKRETARIAT KOMISI XII',
            'reg' => 'REG-3CEB179B',
            'ind' => 'IND-098EAF78',
        ],
        [
            'name' => 'Widjaja',
            'job' => 'CEO MSI GROUP',
            'reg' => 'REG-D37E5574',
            'ind' => 'IND-8144BF4B',
        ],
    ];

    $stmtInsertBatch9 = $pdo->prepare("
        INSERT INTO user_peserta (
            id_registrasi, id_independent, name, notelp, pekerjaan,
            gate, role_permission, status, rsvp_status, jalur_undangan, wa_status, souvenir_status
        ) VALUES (
            ?, ?, ?, '', ?,
            '1', '1', 0, 'pending', 'manual', 'unsent', 'unclaimed'
        )
    ");

    foreach ($tamuBatch9 as $tamu) {
        $stmtCheck->execute([$tamu['name']]);
        $exists = $stmtCheck->fetchColumn();

        if (!$exists) {
            $stmtInsertBatch9->execute([
                $tamu['reg'],
                $tamu['ind'],
                $tamu['name'],
                $tamu['job']
            ]);
            $insertedNames[] = $tamu['name'];
        }
    }

    // ==============================================================================
    // 6. UPDATE WIDJAJA (CONFIRMED) & TAMBAH 3 TAMU BARU (LUSIANA, PROF EVI, DR ERNY)
    // ==============================================================================
    // 6a. Update Widjaja jadi confirmed hadir
    $stmtUpWidjaja = $pdo->prepare("
        UPDATE user_peserta
        SET rsvp_status = 'confirmed',
            waktu_konfirmasi = COALESCE(waktu_konfirmasi, NOW())
        WHERE id_registrasi = 'REG-D37E5574' OR (LOWER(TRIM(name)) = 'widjaja' AND pekerjaan LIKE '%MSI%')
    ");
    $stmtUpWidjaja->execute();
    if ($stmtUpWidjaja->rowCount() > 0) {
        $updatedList[] = 'Widjaja (CEO MSI GROUP - Diupdate jadi Hadir)';
    }

    // 6b. Tambah 3 tamu baru
    $tamuBatchBaru = [
        [
            'name' => 'LUSIANA',
            'job' => 'FOUNDER AKUPINTAR',
            'reg' => 'REG-0E99DDAE',
            'ind' => 'IND-87F3DD6B',
            'rsvp' => 'confirmed',
            'waktu' => true
        ],
        [
            'name' => 'PROF. EVI FITRIANI, M.A., M.I.A., Ph.D.',
            'job' => 'DEKAN FISIP UNIVERSITAS INDONESIA',
            'reg' => 'REG-3F81AFEF',
            'ind' => 'IND-2A92C0BD',
            'rsvp' => 'pending',
            'waktu' => false
        ],
        [
            'name' => 'Dr. Erny Tajib',
            'job' => '',
            'reg' => 'REG-97B1B396',
            'ind' => 'IND-E53BCA93',
            'rsvp' => 'confirmed',
            'waktu' => true
        ],
    ];

    $stmtInsertBaru = $pdo->prepare("
        INSERT INTO user_peserta (
            id_registrasi, id_independent, name, notelp, pekerjaan,
            gate, role_permission, status, rsvp_status, waktu_konfirmasi, jalur_undangan, wa_status, souvenir_status
        ) VALUES (
            ?, ?, ?, '', ?,
            '1', '1', 0, ?, ?, 'manual', 'unsent', 'unclaimed'
        )
    ");

    foreach ($tamuBatchBaru as $tamu) {
        $stmtCheck->execute([$tamu['name']]);
        $exists = $stmtCheck->fetchColumn();

        if (!$exists) {
            $stmtInsertBaru->execute([
                $tamu['reg'],
                $tamu['ind'],
                $tamu['name'],
                $tamu['job'],
                $tamu['rsvp'],
                $tamu['waktu'] ? date('Y-m-d H:i:s') : null
            ]);
            $insertedNames[] = $tamu['name'] . ($tamu['rsvp'] === 'confirmed' ? ' (Confirmed Hadir)' : '');
        }
    }

    // ==============================================================================
    // 7. TAMBAH 2 TAMU BARU (NEPOS & SEBASTIAN)
    // ==============================================================================
    $tamuBatch7 = [
        [
            'name' => 'Nepos',
            'job' => 'Komisaris PHE',
            'reg' => 'REG-4CE2F208',
            'ind' => 'IND-461404C8',
        ],
        [
            'name' => 'Sebastian',
            'job' => '',
            'reg' => 'REG-76200377',
            'ind' => 'IND-636F231F',
        ],
    ];

    $stmtInsertBatch7 = $pdo->prepare("
        INSERT INTO user_peserta (
            id_registrasi, id_independent, name, notelp, pekerjaan,
            gate, role_permission, status, rsvp_status, jalur_undangan, wa_status, souvenir_status
        ) VALUES (
            ?, ?, ?, '', ?,
            '1', '1', 0, 'pending', 'manual', 'unsent', 'unclaimed'
        )
    ");

    foreach ($tamuBatch7 as $tamu) {
        $stmtCheck->execute([$tamu['name']]);
        $exists = $stmtCheck->fetchColumn();

        if (!$exists) {
            $stmtInsertBatch7->execute([
                $tamu['reg'],
                $tamu['ind'],
                $tamu['name'],
                $tamu['job']
            ]);
            $insertedNames[] = $tamu['name'];
        }
    }

    // ==============================================================================
    // 8. TAMBAH 20 DATA TAMU DELEGASI KOSGORO
    // ==============================================================================
    $tamuBatchKosgoro = [
        ['name' => 'Tengku Nur Hafidz', 'job' => 'KOSGORO', 'reg' => 'REG-0DBAA6AE', 'ind' => 'IND-83BC055D'],
        ['name' => 'Helmi Djen', 'job' => 'KOSGORO', 'reg' => 'REG-E34F605F', 'ind' => 'IND-7CC61D05'],
        ['name' => 'Mada Ayu Habsari', 'job' => 'KOSGORO', 'reg' => 'REG-76929E6E', 'ind' => 'IND-DD2943AD'],
        ['name' => 'Rizky Syahputra', 'job' => 'KOSGORO', 'reg' => 'REG-116066D4', 'ind' => 'IND-E51FE4DF'],
        ['name' => 'Mega Octaviany', 'job' => 'KOSGORO', 'reg' => 'REG-D41E1E60', 'ind' => 'IND-03798348'],
        ['name' => 'Notrida M Nur', 'job' => 'KOSGORO', 'reg' => 'REG-E3D24EC4', 'ind' => 'IND-6EDF5408'],
        ['name' => 'Nurikasari', 'job' => 'KOSGORO', 'reg' => 'REG-038F2056', 'ind' => 'IND-A479DE28'],
        ['name' => 'Razak Morin', 'job' => 'KOSGORO', 'reg' => 'REG-1C6E4F7C', 'ind' => 'IND-5554D610'],
        ['name' => 'Riyono Asnan', 'job' => 'KOSGORO', 'reg' => 'REG-DD6538A6', 'ind' => 'IND-60D39D53'],
        ['name' => 'Mustahudin', 'job' => 'KOSGORO', 'reg' => 'REG-455D73A9', 'ind' => 'IND-9FEB0B14'],
        ['name' => 'Rosdinal Salim', 'job' => 'KOSGORO', 'reg' => 'REG-B1827011', 'ind' => 'IND-3881F399'],
        ['name' => 'Robinsar Sinaga', 'job' => 'KOSGORO', 'reg' => 'REG-44A14664', 'ind' => 'IND-FFEB329C'],
        ['name' => 'David Tampubolon', 'job' => 'KOSGORO', 'reg' => 'REG-4B12DF9B', 'ind' => 'IND-6D9ED25B'],
        ['name' => 'Khatibur Rasyadi Alwi', 'job' => 'KOSGORO', 'reg' => 'REG-CC34BE57', 'ind' => 'IND-66AC332B'],
        ['name' => 'Doni Arlansyah Isman', 'job' => 'KOSGORO', 'reg' => 'REG-813C7885', 'ind' => 'IND-2961F350'],
        ['name' => 'Achmad Suhawi', 'job' => 'KOSGORO', 'reg' => 'REG-E99CA26A', 'ind' => 'IND-0B2AD1C3'],
        ['name' => 'M. Balyah', 'job' => 'KOSGORO', 'reg' => 'REG-CFD181E2', 'ind' => 'IND-13AB14FE'],
        ['name' => 'Jamal Syamsir', 'job' => 'KOSGORO', 'reg' => 'REG-0E3C4605', 'ind' => 'IND-0793C6E9'],
        ['name' => 'Anzas Tirta Bayu', 'job' => 'KOSGORO', 'reg' => 'REG-BB99F77E', 'ind' => 'IND-2F2724C5'],
        ['name' => 'Yuri Ashari', 'job' => 'KOSGORO', 'reg' => 'REG-DB1E5A1E', 'ind' => 'IND-D230F5B9'],
    ];

    $stmtInsertKosgoro = $pdo->prepare("
        INSERT INTO user_peserta (
            id_registrasi, id_independent, name, notelp, pekerjaan,
            gate, role_permission, status, rsvp_status, jalur_undangan, wa_status, souvenir_status
        ) VALUES (
            ?, ?, ?, '', ?,
            '1', '1', 0, 'pending', 'manual', 'unsent', 'unclaimed'
        )
    ");

    foreach ($tamuBatchKosgoro as $tamu) {
        $stmtCheck->execute([$tamu['name']]);
        $exists = $stmtCheck->fetchColumn();

        if (!$exists) {
            $stmtInsertKosgoro->execute([
                $tamu['reg'],
                $tamu['ind'],
                $tamu['name'],
                $tamu['job']
            ]);
            $insertedNames[] = $tamu['name'];
        }
    }

    // ==============================================================================
    // 9. TAMBAH 4 DATA TAMU (IKAL LEMHANNAS DPP & DIRUT PT BUKIT ASAM)
    // ==============================================================================
    $tamuBatchIkal = [
        ['name' => 'ABIDINSYAH', 'job' => 'IKAL LEMHANNAS DPP', 'reg' => 'REG-5A40C989', 'ind' => 'IND-AED10081'],
        ['name' => 'JOKO', 'job' => 'IKAL LEMHANNAS DPP', 'reg' => 'REG-83E4CE71', 'ind' => 'IND-FD678731'],
        ['name' => 'ENDING', 'job' => 'IKAL LEMHANNAS DPP', 'reg' => 'REG-C66A8669', 'ind' => 'IND-C2340BA8'],
        ['name' => 'BAMBANG ISNAWAN', 'job' => 'DIRUT PT BUKIT ASAM', 'reg' => 'REG-3DCC3BCB', 'ind' => 'IND-6DAF9F45'],
    ];

    $stmtInsertIkal = $pdo->prepare("
        INSERT INTO user_peserta (
            id_registrasi, id_independent, name, notelp, pekerjaan,
            gate, role_permission, status, rsvp_status, jalur_undangan, wa_status, souvenir_status
        ) VALUES (
            ?, ?, ?, '', ?,
            '1', '1', 0, 'pending', 'manual', 'unsent', 'unclaimed'
        )
    ");

    foreach ($tamuBatchIkal as $tamu) {
        $stmtCheck->execute([$tamu['name']]);
        $exists = $stmtCheck->fetchColumn();

        if (!$exists) {
            $stmtInsertIkal->execute([
                $tamu['reg'],
                $tamu['ind'],
                $tamu['name'],
                $tamu['job']
            ]);
            $insertedNames[] = $tamu['name'];
        }
    }

    // ==============================================================================
    // 10. TAMBAH 7 DATA TAMU (LEMHANNAS PPRA 55)
    // ==============================================================================
    $tamuBatchPpra55 = [
        ['name' => 'AGUS RADAR SUCAHYO', 'job' => 'LEMHANNAS PPRA 55', 'reg' => 'REG-0EC863B4', 'ind' => 'IND-1A408C79'],
        ['name' => 'NURHIDAYAT', 'job' => 'LEMHANNAS PPRA 55', 'reg' => 'REG-A0204308', 'ind' => 'IND-F7317412'],
        ['name' => 'UDYATMIKO', 'job' => 'LEMHANNAS PPRA 55', 'reg' => 'REG-7B3896C4', 'ind' => 'IND-BDC0E94D'],
        ['name' => 'JHON PIETER', 'job' => 'LEMHANNAS PPRA 55', 'reg' => 'REG-E5A50C65', 'ind' => 'IND-67C7A654'],
        ['name' => 'AGUS PURWO', 'job' => 'LEMHANNAS PPRA 55', 'reg' => 'REG-8BD677AC', 'ind' => 'IND-9822C1CD'],
        ['name' => 'BAMBANG SUTRISNO', 'job' => 'LEMHANNAS PPRA 55', 'reg' => 'REG-A66EB45F', 'ind' => 'IND-0EE97145'],
        ['name' => 'IKAL PPRA 55', 'job' => 'LEMHANNAS PPRA 55', 'reg' => 'REG-B9866AA6', 'ind' => 'IND-995ADDB5'],
    ];

    $stmtInsertPpra55 = $pdo->prepare("
        INSERT INTO user_peserta (
            id_registrasi, id_independent, name, notelp, pekerjaan,
            gate, role_permission, status, rsvp_status, jalur_undangan, wa_status, souvenir_status
        ) VALUES (
            ?, ?, ?, '', ?,
            '1', '1', 0, 'pending', 'manual', 'unsent', 'unclaimed'
        )
    ");

    foreach ($tamuBatchPpra55 as $tamu) {
        $stmtCheck->execute([$tamu['name']]);
        $exists = $stmtCheck->fetchColumn();

        if (!$exists) {
            $stmtInsertPpra55->execute([
                $tamu['reg'],
                $tamu['ind'],
                $tamu['name'],
                $tamu['job']
            ]);
            $insertedNames[] = $tamu['name'];
        }
    }

    // ==============================================================================
    // 12. TAMBAH 10 DATA TAMU (KELUARGA PAK BPJ, KELUARGA PAK SOFIAN, TVR PARLEMEN)
    // ==============================================================================
    $tamuBatch12 = [
        ['name' => 'LILI HENDRAWATI', 'job' => 'KELUARGA PAK BPJ', 'reg' => 'REG-EBEE6D91', 'ind' => 'IND-9C3177F2'],
        ['name' => 'KATHLEEN PATIJAYA', 'job' => 'KELUARGA PAK BPJ', 'reg' => 'REG-D6124F52', 'ind' => 'IND-75292EF5'],
        ['name' => 'JOYCELIEN PATIJAYA', 'job' => 'KELUARGA PAK BPJ', 'reg' => 'REG-78E5B663', 'ind' => 'IND-AD332BA9'],
        ['name' => 'REIGN DAPUNTA PATIJAYA', 'job' => 'KELUARGA PAK BPJ', 'reg' => 'REG-D9E4C25D', 'ind' => 'IND-D9759259'],
        ['name' => 'ANGELYN PATIJAYA', 'job' => 'KELUARGA PAK BPJ', 'reg' => 'REG-67A6B7D9', 'ind' => 'IND-0C435BBE'],
        ['name' => 'CUCULIA', 'job' => 'KELUARGA PAK BPJ', 'reg' => 'REG-C76CDAE3', 'ind' => 'IND-B1CB8770'],
        ['name' => 'WONG DJOENG LEW', 'job' => 'KELUARGA PAK BPJ', 'reg' => 'REG-D706885F', 'ind' => 'IND-6F61477A'],
        ['name' => 'NOVIANA', 'job' => 'KELUARGA PAK SOFIAN', 'reg' => 'REG-81ACD4E6', 'ind' => 'IND-35BABE76'],
        ['name' => 'RAISEL', 'job' => 'KELUARGA PAK SOFIAN', 'reg' => 'REG-9AB4BEDF', 'ind' => 'IND-9DAE9A60'],
        ['name' => 'PIMPINAN REDAKSI TVR PARLEMEN', 'job' => 'PIMPINAN REDAKSI TVR PARLEMEN', 'reg' => 'REG-D79865E5', 'ind' => 'IND-1BCD5517'],
    ];

    $stmtInsertBatch12 = $pdo->prepare("
        INSERT INTO user_peserta (
            id_registrasi, id_independent, name, notelp, pekerjaan,
            gate, role_permission, status, rsvp_status, jalur_undangan, wa_status, souvenir_status
        ) VALUES (
            ?, ?, ?, '', ?,
            '1', '1', 0, 'pending', 'manual', 'unsent', 'unclaimed'
        )
    ");

    foreach ($tamuBatch12 as $tamu) {
        $stmtCheck->execute([$tamu['name']]);
        $exists = $stmtCheck->fetchColumn();

        if (!$exists) {
            $stmtInsertBatch12->execute([
                $tamu['reg'],
                $tamu['ind'],
                $tamu['name'],
                $tamu['job']
            ]);
            $insertedNames[] = $tamu['name'];
        }
    }

    // ==============================================================================
    // 11. CLEANUP 9 DATA DUPLIKAT (SESUAI ATURAN: HAPUS YANG PENDING)
    // ==============================================================================
    $idsToDelete = [43, 54, 262, 263, 155, 156, 164, 162, 159];
    $placeholders = implode(',', array_fill(0, count($idsToDelete), '?'));
    $stmtDel = $pdo->prepare("DELETE FROM user_peserta WHERE id IN ($placeholders) AND rsvp_status = 'pending'");
    $stmtDel->execute($idsToDelete);
    $deletedCount = $stmtDel->rowCount();

    $totalTamuSekarang = $pdo->query("SELECT COUNT(*) FROM user_peserta")->fetchColumn();

    echo json_encode([
        'success' => true,
        'message' => 'Data tamu berhasil diperbarui dan ditambahkan!',
        'updated_count' => count($updatedNames),
        'inserted_count' => count($insertedNames),
        'inserted_names' => $insertedNames,
        'deleted_duplikat_count' => $deletedCount,
        'total_tamu_sekarang' => (int) $totalTamuSekarang
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Gagal memperbarui data: ' . $e->getMessage()
    ]);
}
