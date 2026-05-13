// 1. MASUKKAN LINK JEMBATAN GOOGLE SHEETS ANDA DI SINI
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw2Dcig9_jLXMp5z2cAjqE5hssYFC02QyrFg4sUaeUG1crik9LwRY54EnVgwIDMwaw/exec";

// Variabel untuk menyimpan data agar tidak perlu ditarik berkali-kali
let dataMaster = null;
let grafikOrang = null;
let grafikKotak = null;

// Mengatur Navigasi Burger Menu (Sidebar)
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const btnBuka = document.getElementById('openSidebar');
const btnTutup = document.getElementById('closeSidebar');

btnBuka.addEventListener('click', () => {
    sidebar.classList.add('terbuka');
    overlay.classList.add('terbuka');
});

function tutupSidebar() {
    sidebar.classList.remove('terbuka');
    overlay.classList.remove('terbuka');
}
btnTutup.addEventListener('click', tutupSidebar);
overlay.addEventListener('click', tutupSidebar);

// Fungsi Utama: Menarik Data saat Aplikasi Dibuka
async function mulaiAplikasi() {
    document.getElementById('teksPersentase').innerText = "Loading...";
    
    try {
        const respons = await fetch(SCRIPT_URL);
        const hasilJson = await respons.json();
        dataMaster = hasilJson.data;
        
        // Memasukkan nama-nama petugas ke Dropdown
        isiDropdownPetugas();
        
        // Menghitung angka untuk pertama kalinya (Semua Petugas, Total Bulan)
        kalkulasiDasbor();
        
    } catch (error) {
        document.getElementById('teksPersentase').innerText = "ERROR";
        alert("Gagal terhubung ke Google Sheets. Pastikan URL sudah benar.");
    }
}

// Fungsi Mengisi Dropdown Petugas secara otomatis dari Data Master
function isiDropdownPetugas() {
    const dropdown = document.getElementById('filterPetugas');
    let daftarPetugas = new Set();
    
    // Ambil nama dari master orang
    dataMaster.master_orang.forEach(baris => {
        if(baris.Kolektor) daftarPetugas.add(baris.Kolektor.trim());
    });
    
    // Ambil nama dari master kotak
    dataMaster.master_kotak.forEach(baris => {
        if(baris.Kolektor) daftarPetugas.add(baris.Kolektor.trim());
    });

    daftarPetugas.forEach(nama => {
        let opsi = document.createElement('option');
        opsi.value = nama;
        opsi.text = nama;
        dropdown.appendChild(opsi);
    });
}

// Fungsi Menghitung Angka & Grafik sesuai Filter yang dipilih
function kalkulasiDasbor() {
    if (!dataMaster) return;

    const filterPetugas = document.getElementById('filterPetugas').value;
    const filterPekan = document.getElementById('filterPekan').value;

    let totalKewajiban = 0;
    let totalBerhasil = 0;
    let totalPemasukan = 0;

    // --- LOGIKA HITUNG PERORANGAN ---
    let kewajibanOrang = dataMaster.master_orang.filter(baris => 
        baris.Status === "Aktif" && 
        (filterPetugas === "Semua" || baris.Kolektor === filterPetugas)
    ).length;
    
    let terimaOrangFilter = dataMaster.terima_orang.filter(baris => 
        (filterPetugas === "Semua" || baris["Nama User"] === filterPetugas)
    );
    // Kita anggap satu donatur bayar 1 kali, kita hitung ID Uniknya
    let idUnikOrang = new Set(terimaOrangFilter.map(b => b["Kode Donatur"]));
    let berhasilOrang = idUnikOrang.size;

    // Hitung Uang
    terimaOrangFilter.forEach(baris => { totalPemasukan += Number(baris.Nominal || 0); });

    // --- LOGIKA HITUNG KOTAK ---
    let masterKotakFilter = dataMaster.master_kotak.filter(baris => 
        baris.Status === "Aktif" && 
        (filterPetugas === "Semua" || baris.Kolektor === filterPetugas)
    );
    
    let kewajibanIKP = masterKotakFilter.filter(b => b.Spesifikasi === "IKP").length;
    let kewajibanIIP = masterKotakFilter.filter(b => b.Spesifikasi === "IIP").length;
    
    let terimaKotakFilter = dataMaster.terima_kotak.filter(baris => 
        (filterPetugas === "Semua" || baris["Nama User"] === filterPetugas)
    );
    
    let idUnikIKP = new Set();
    let idUnikIIP = new Set();
    
    terimaKotakFilter.forEach(baris => {
        totalPemasukan += Number(baris.Nominal || 0);
        if (baris["Jenis.1"] === "IKP") idUnikIKP.add(baris["Kode Donatur"]);
        if (baris["Jenis.1"] === "IIP") idUnikIIP.add(baris["Kode Donatur"]);
    });

    let berhasilIKP = idUnikIKP.size;
    let berhasilIIP = idUnikIIP.size;

    // --- REKAP TOTAL ---
    totalKewajiban = kewajibanOrang + kewajibanIKP + kewajibanIIP;
    totalBerhasil = berhasilOrang + berhasilIKP + berhasilIIP;
    let persentase = totalKewajiban === 0 ? 0 : Math.round((totalBerhasil / totalKewajiban) * 100);

    // Update Teks di Layar
    document.getElementById('teksPersentase').innerText = persentase + "%";
    document.getElementById('teksKewajiban').innerText = totalKewajiban;
    document.getElementById('teksBerhasil').innerText = totalBerhasil;
    document.getElementById('teksPemasukan').innerText = "Rp " + totalPemasukan.toLocaleString('id-ID');

    // Update Grafik Visual
    gambarGrafikOrang(berhasilOrang, kewajibanOrang - berhasilOrang);
    gambarGrafikKotak(berhasilIKP, kewajibanIKP, berhasilIIP, kewajibanIIP);
}

// Fungsi Menggambar Grafik Perorangan (Bentuk Donut)
function gambarGrafikOrang(berhasil, sisa) {
    const ctx = document.getElementById('grafikOrang').getContext('2d');
    if (grafikOrang) grafikOrang.destroy(); // Hapus grafik lama jika ada
    
    grafikOrang = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Sudah Bayar', 'Belum'],
            datasets: [{
                data: [berhasil, sisa > 0 ? sisa : 0],
                backgroundColor: ['#2563EB', '#E5E7EB'], // 30% Biru, 60% Abu terang
                borderWidth: 0
            }]
        },
        options: { cutout: '70%', responsive: true }
    });
}

// Fungsi Menggambar Grafik Kotak (Bentuk Batang Samping)
function gambarGrafikKotak(bIKP, tIKP, bIIP, tIIP) {
    const ctx = document.getElementById('grafikKotak').getContext('2d');
    if (grafikKotak) grafikKotak.destroy();
    
    grafikKotak = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Kotak IKP', 'Kotak IIP'],
            datasets: [
                {
                    label: 'Berhasil Ditarik',
                    data: [bIKP, bIIP],
                    backgroundColor: '#2563EB' // Biru
                },
                {
                    label: 'Target Kewajiban',
                    data: [tIKP, tIIP],
                    backgroundColor: '#E5E7EB' // Abu terang
                }
            ]
        },
        options: { indexAxis: 'y', responsive: true }
    });
}

// Deteksi jika Dropdown Filter diubah, langsung hitung ulang!
document.getElementById('filterPetugas').addEventListener('change', kalkulasiDasbor);
document.getElementById('filterPekan').addEventListener('change', kalkulasiDasbor);

// Nyalakan mesinnya!
mulaiAplikasi();
