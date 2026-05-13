// 1. MASUKKAN LINK JEMBATAN GOOGLE SHEETS ANDA DI BAWAH INI
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw2Dcig9_jLXMp5z2cAjqE5hssYFC02QyrFg4sUaeUG1crik9LwRY54EnVgwIDMwaw/exec";

let dataMaster = null;
let grafikOrang = null;
let grafikKotak = null;
let dataBelumBerdonasi = []; // Menyimpan daftar sisa

// Navigasi & Sidebar
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const btnBuka = document.getElementById('openSidebar');
const btnTutup = document.getElementById('closeSidebar');

const menuDasbor = document.getElementById('menuDasbor');
const menuBelum = document.getElementById('menuBelum');
const areaDasbor = document.getElementById('areaDasbor');
const areaBelum = document.getElementById('areaBelum');

function tutupSidebar() { sidebar.classList.remove('terbuka'); overlay.classList.remove('terbuka'); }
btnBuka.addEventListener('click', () => { sidebar.classList.add('terbuka'); overlay.classList.add('terbuka'); });
btnTutup.addEventListener('click', tutupSidebar);
overlay.addEventListener('click', tutupSidebar);

// Pindah ke Halaman Dasbor
menuDasbor.addEventListener('click', (e) => {
    e.preventDefault();
    areaDasbor.style.display = 'block';
    areaBelum.style.display = 'none';
    menuDasbor.classList.add('aktif');
    menuBelum.classList.remove('aktif');
    tutupSidebar();
});

// Pindah ke Halaman Daftar Belum
menuBelum.addEventListener('click', (e) => {
    e.preventDefault();
    areaDasbor.style.display = 'none';
    areaBelum.style.display = 'block';
    menuBelum.classList.add('aktif');
    menuDasbor.classList.remove('aktif');
    tutupSidebar();
    tampilkanDaftarBelum(); // Panggil fungsi cetak kartu
});

// Mulai Aplikasi
async function mulaiAplikasi() {
    document.getElementById('teksPersentase').innerText = "Loading...";
    menuDasbor.classList.add('aktif');
    try {
        const respons = await fetch(SCRIPT_URL);
        const hasilJson = await respons.json();
        dataMaster = hasilJson.data;
        isiDropdownPetugas();
        kalkulasiDasbor();
    } catch (error) {
        document.getElementById('teksPersentase').innerText = "ERROR";
        alert("Gagal terhubung ke Google Sheets. Pastikan URL sudah benar.");
    }
}

function isiDropdownPetugas() {
    const dropdown = document.getElementById('filterPetugas');
    let daftarPetugas = new Set();
    // Ambil Kolektor dari struktur Master yang baru
    dataMaster.master_orang.forEach(b => { if(b.Kolektor) daftarPetugas.add(String(b.Kolektor).trim()); });
    dataMaster.master_kotak.forEach(b => { if(b.Kolektor) daftarPetugas.add(String(b.Kolektor).trim()); });
    
    daftarPetugas.forEach(nama => {
        let opsi = document.createElement('option'); opsi.value = nama; opsi.text = nama;
        dropdown.appendChild(opsi);
    });
}

function kalkulasiDasbor() {
    if (!dataMaster) return;
    const filterPetugas = document.getElementById('filterPetugas').value;
    const filterPekan = document.getElementById('filterPekan').value;
    
    // Ubah "Pekan 1" menjadi "1" untuk dicocokkan dengan angka di data Master Anda
    const pekanAngka = filterPekan.replace("Pekan ", ""); 
    
    dataBelumBerdonasi = []; // Kosongkan daftar sisa setiap kali filter berubah

    let totalKewajiban = 0; let totalBerhasil = 0; let totalPemasukan = 0;

    // --- HITUNG ORANG ---
    let masterOrangFilter = dataMaster.master_orang.filter(b => {
        let cocokPetugas = (filterPetugas === "Semua" || b.Kolektor === filterPetugas);
        let cocokPekan = (filterPekan === "Total" || String(b.Pekan) === pekanAngka);
        return cocokPetugas && cocokPekan;
    });

    let terimaOrangFilter = dataMaster.terima_orang.filter(b => {
        return (filterPetugas === "Semua" || b["Nama User"] === filterPetugas);
    });
    
    // Ambil ID dari Laporan Penerimaan
    let idUnikOrang = new Set(terimaOrangFilter.map(b => b["Kode Donatur"]));
    terimaOrangFilter.forEach(b => { totalPemasukan += Number(b.Nominal || 0); });

    // Cek Siapa Orang yang belum (Struktur Baru)
    masterOrangFilter.forEach(b => {
        if (!idUnikOrang.has(b["Nomor Register"])) {
            dataBelumBerdonasi.push({
                nama: b["Nama Donatur"] || "-",
                kategori: b["Jenis Donatur"] || "RUTIN",
                alamat: b.Alamat || "-",
                nominal: b.Nominal ? "Rp " + Number(b.Nominal).toLocaleString('id-ID') : "-",
                hp: b.Hp ? String(b.Hp) : ""
            });
        }
    });

    // --- HITUNG KOTAK ---
    let masterKotakFilter = dataMaster.master_kotak.filter(b => {
        let cocokPetugas = (filterPetugas === "Semua" || b.Kolektor === filterPetugas);
        let cocokPekan = (filterPekan === "Total" || String(b.Pekan) === pekanAngka);
        return cocokPetugas && cocokPekan;
    });

    let terimaKotakFilter = dataMaster.terima_kotak.filter(b => {
        return (filterPetugas === "Semua" || b["Nama User"] === filterPetugas);
    });
    
    let idUnikIKP = new Set(); let idUnikIIP = new Set();
    terimaKotakFilter.forEach(b => {
        totalPemasukan += Number(b.Nominal || 0);
        if (b["Jenis.1"] === "IKP") idUnikIKP.add(b["Kode Donatur"]);
        if (b["Jenis.1"] === "IIP") idUnikIIP.add(b["Kode Donatur"]);
    });

    // Cek Siapa Kotak yang belum (Struktur Baru)
    masterKotakFilter.forEach(b => {
        let isIKP = b.Spesifikasi === "IKP"; let isIIP = b.Spesifikasi === "IIP";
        let sudah = false;
        
        // Pengecekan silang ID Register Master dengan ID Kode Donatur Penerimaan
        if (isIKP && idUnikIKP.has(b["Nomor Register"])) sudah = true;
        if (isIIP && idUnikIIP.has(b["Nomor Register"])) sudah = true;

        if (!sudah) {
            dataBelumBerdonasi.push({
                nama: b["Nama Donatur"] || "-",
                kategori: b.Spesifikasi || "-",
                alamat: b.Alamat || "-",
                nominal: "Kotak Amal",
                hp: b.Hp ? String(b.Hp) : ""
            });
        }
    });

    // Rekapitulasi Akhir
    let kewajibanOrang = masterOrangFilter.length;
    let kewajibanIKP = masterKotakFilter.filter(b => b.Spesifikasi === "IKP").length;
    let kewajibanIIP = masterKotakFilter.filter(b => b.Spesifikasi === "IIP").length;
    
    totalKewajiban = kewajibanOrang + kewajibanIKP + kewajibanIIP;
    
    // Perbaikan Logika Realisasi: Hanya menghitung berhasil JIKA donatur tersebut ada di dalam daftar Kewajiban filter saat ini
    let berhasilOrang = 0; let berhasilIKP = 0; let berhasilIIP = 0;
    
    masterOrangFilter.forEach(b => { if (idUnikOrang.has(b["Nomor Register"])) berhasilOrang++; });
    masterKotakFilter.forEach(b => {
        if (b.Spesifikasi === "IKP" && idUnikIKP.has(b["Nomor Register"])) berhasilIKP++;
        if (b.Spesifikasi === "IIP" && idUnikIIP.has(b["Nomor Register"])) berhasilIIP++;
    });

    totalBerhasil = berhasilOrang + berhasilIKP + berhasilIIP;
    let persentase = totalKewajiban === 0 ? 0 : Math.round((totalBerhasil / totalKewajiban) * 100);

    // Update Layar
    document.getElementById('teksPersentase').innerText = persentase + "%";
    document.getElementById('teksKewajiban').innerText = totalKewajiban;
    document.getElementById('teksBerhasil').innerText = totalBerhasil;
    document.getElementById('teksPemasukan').innerText = "Rp " + totalPemasukan.toLocaleString('id-ID');

    gambarGrafikOrang(berhasilOrang, kewajibanOrang - berhasilOrang);
    gambarGrafikKotak(berhasilIKP, kewajibanIKP, berhasilIIP, kewajibanIIP);
    
    // Perbarui daftar di background
    tampilkanDaftarBelum();
}

// Fungsi Cetak Kartu "Belum Berdonasi" ke Layar
function tampilkanDaftarBelum() {
    const wadah = document.getElementById('wadahDaftarBelum');
    wadah.innerHTML = ""; // Bersihkan layar

    if (dataBelumBerdonasi.length === 0) {
        wadah.innerHTML = "<p style='text-align:center; color:#9CA3AF; margin-top:20px;'>Semua donatur pada periode/petugas ini sudah berdonasi. Hebat!</p>";
        return;
    }

    dataBelumBerdonasi.forEach(donatur => {
        // Bersihkan nomor HP agar bisa dipakai link WhatsApp
        let noHp = donatur.hp.replace(/[^0-9]/g, '');
        if (noHp.startsWith('0')) noHp = '62' + noHp.substring(1); 
        let linkWa = noHp ? `https://wa.me/${noHp}` : '#';

        let htmlKartu = `
            <div class="kartu-belum">
                <div class="info-teks">
                    <h4>${donatur.nama} <span class="badge">${donatur.kategori}</span></h4>
                    <p class="alamat-teks"><i class="fas fa-map-marker-alt"></i> ${donatur.alamat}</p>
                    <p class="nominal-teks">${donatur.nominal}</p>
                </div>
                <a href="${linkWa}" target="_blank" class="btn-wa" ${noHp === '' ? 'style="background:#ccc; pointer-events:none;"' : ''}>
                    <i class="fab fa-whatsapp"></i>
                </a>
            </div>
        `;
        wadah.innerHTML += htmlKartu;
    });
}

// Fungsi Grafik
function gambarGrafikOrang(berhasil, sisa) {
    const ctx = document.getElementById('grafikOrang').getContext('2d');
    if (grafikOrang) grafikOrang.destroy();
    grafikOrang = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: ['Sudah', 'Belum'], datasets: [{ data: [berhasil, sisa > 0 ? sisa : 0], backgroundColor: ['#2563EB', '#E5E7EB'], borderWidth: 0 }] },
        options: { cutout: '70%', responsive: true }
    });
}
function gambarGrafikKotak(bIKP, tIKP, bIIP, tIIP) {
    const ctx = document.getElementById('grafikKotak').getContext('2d');
    if (grafikKotak) grafikKotak.destroy();
    grafikKotak = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['IKP', 'IIP'],
            datasets: [
                { label: 'Berhasil', data: [bIKP, bIIP], backgroundColor: '#2563EB' },
                { label: 'Target', data: [tIKP, tIIP], backgroundColor: '#E5E7EB' }
            ]
        },
        options: { indexAxis: 'y', responsive: true }
    });
}

document.getElementById('filterPetugas').addEventListener('change', kalkulasiDasbor);
document.getElementById('filterPekan').addEventListener('change', kalkulasiDasbor);

mulaiAplikasi();
