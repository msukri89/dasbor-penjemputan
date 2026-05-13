// LINK JEMBATAN GOOGLE SHEETS
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw2Dcig9_jLXMp5z2cAjqE5hssYFC02QyrFg4sUaeUG1crik9LwRY54EnVgwIDMwaw/exec";

let dataMaster = null;
let grafikOrang = null;
let grafikKotak = null;
let dataBelumBerdonasi = [];

// Navigasi & Sidebar
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const btnBuka = document.getElementById('openSidebar');
const btnTutup = document.getElementById('closeSidebar');
const menuDasbor = document.getElementById('menuDasbor');
const menuBelum = document.getElementById('menuBelum');
const areaDasbor = document.getElementById('areaDasbor');
const areaBelum = document.getElementById('areaBelum');

function tutupSidebar() { 
    sidebar.classList.remove('terbuka'); 
    overlay.classList.remove('terbuka'); 
}

btnBuka.addEventListener('click', () => { 
    sidebar.classList.add('terbuka'); 
    overlay.classList.add('terbuka'); 
});

btnTutup.addEventListener('click', tutupSidebar);
overlay.addEventListener('click', tutupSidebar);

menuDasbor.addEventListener('click', (e) => {
    e.preventDefault(); 
    areaDasbor.style.display = 'block'; 
    areaBelum.style.display = 'none';
    menuDasbor.classList.add('aktif'); 
    menuBelum.classList.remove('aktif'); 
    tutupSidebar();
});

menuBelum.addEventListener('click', (e) => {
    e.preventDefault(); 
    areaDasbor.style.display = 'none'; 
    areaBelum.style.display = 'block';
    menuBelum.classList.add('aktif'); 
    menuDasbor.classList.remove('aktif'); 
    tutupSidebar();
    tampilkanDaftarBelum();
});

// Mulai Aplikasi
async function mulaiAplikasi() {
    console.log("Memulai aplikasi...");
    document.getElementById('teksPersentase').innerText = "Loading...";
    try {
        const respons = await fetch(SCRIPT_URL);
        const hasilJson = await respons.json();
        dataMaster = hasilJson.data;
        console.log("Data berhasil diterima dari Google Sheets");
        isiDropdownPetugas();
        kalkulasiDasbor();
    } catch (error) {
        console.error("Gagal menarik data:", error);
        document.getElementById('teksPersentase').innerText = "ERROR";
        alert("Gagal terhubung ke Google Sheets. Pastikan koneksi internet stabil.");
    }
}

function isiDropdownPetugas() {
    const dropdown = document.getElementById('filterPetugas');
    let daftarPetugas = new Set();
    dataMaster.master_orang.forEach(b => { if(b.Kolektor) daftarPetugas.add(String(b.Kolektor).trim()); });
    dataMaster.master_kotak.forEach(b => { if(b.Kolektor) daftarPetugas.add(String(b.Kolektor).trim()); });
    
    // Bersihkan dropdown sebelum mengisi
    dropdown.innerHTML = '<option value="Semua">Semua Petugas</option>';
    daftarPetugas.forEach(nama => {
        let opsi = document.createElement('option'); 
        opsi.value = nama; 
        opsi.text = nama; 
        dropdown.appendChild(opsi);
    });
}

// MESIN PENDETEKSI TANGGAL -> PEKAN
function tentukanPekanTransaksi(tglStr) {
    if (!tglStr) return "0";
    let str = String(tglStr);
    let hari = 0;
    
    try {
        if (str.includes('/')) {
            hari = parseInt(str.split('/')[0], 10);
        } else if (str.includes('-')) {
            // Cek jika format YYYY-MM-DD
            let parts = str.split('T')[0].split('-');
            hari = parseInt(parts[parts.length - 1], 10);
        } else {
            let d = new Date(str);
            hari = d.getDate();
        }
    } catch(e) { return "0"; }
    
    if (hari >= 1 && hari <= 7) return "1";
    if (hari >= 8 && hari <= 14) return "2";
    if (hari >= 15 && hari <= 21) return "3";
    if (hari >= 22) return "4";
    return "0";
}

function kalkulasiDasbor() {
    if (!dataMaster) return;
    const filterPetugas = document.getElementById('filterPetugas').value;
    const filterPekan = document.getElementById('filterPekan').value;
    const pekanAngka = filterPekan.replace("Pekan ", ""); 
    
    dataBelumBerdonasi = [];
    let totalKewajiban = 0; 
    let totalBerhasil = 0; 
    let totalPemasukan = 0;

    // --- HITUNG ORANG ---
    let masterOrangFilter = dataMaster.master_orang.filter(b => {
        let cocokPetugas = (filterPetugas === "Semua" || String(b.Kolektor).trim() === filterPetugas);
        let cocokPekan = (filterPekan === "Total" || String(b.Pekan).trim() === pekanAngka);
        return cocokPetugas && cocokPekan;
    });

    let terimaOrangFilter = dataMaster.terima_orang.filter(b => {
        let cocokPetugas = (filterPetugas === "Semua" || String(b["Nama User"]).trim() === filterPetugas);
        let pekanTrx = tentukanPekanTransaksi(b.Tanggal);
        let cocokPekanTrx = (filterPekan === "Total" || pekanTrx === pekanAngka);
        return cocokPetugas && cocokPekanTrx;
    });
    
    let idUnikOrang = new Set(terimaOrangFilter.map(b => String(b["Kode Donatur"]).trim()));
    terimaOrangFilter.forEach(b => { totalPemasukan += Number(b.Nominal || 0); });

    masterOrangFilter.forEach(b => {
        let idReg = String(b["Nomor Register"]).trim();
        if (!idUnikOrang.has(idReg)) {
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
        let cocokPetugas = (filterPetugas === "Semua" || String(b.Kolektor).trim() === filterPetugas);
        let cocokPekan = (filterPekan === "Total" || String(b.Pekan).trim() === pekanAngka);
        return cocokPetugas && cocokPekan;
    });

    let terimaKotakFilter = dataMaster.terima_kotak.filter(b => {
        let cocokPetugas = (filterPetugas === "Semua" || String(b["Nama User"]).trim() === filterPetugas);
        let pekanTrx = tentukanPekanTransaksi(b.Tanggal);
        let cocokPekanTrx = (filterPekan === "Total" || pekanTrx === pekanAngka);
        return cocokPetugas && cocokPekanTrx;
    });
    
    let idUnikIKP = new Set(); 
    let idUnikIIP = new Set();
    terimaKotakFilter.forEach(b => {
        totalPemasukan += Number(b.Nominal || 0);
        let id = String(b["Kode Donatur"]).trim();
        if (b["Jenis.1"] === "IKP") idUnikIKP.add(id);
        if (b["Jenis.1"] === "IIP") idUnikIIP.add(id);
    });

    masterKotakFilter.forEach(b => {
        let idReg = String(b["Nomor Register"]).trim();
        let isIKP = b.Spesifikasi === "IKP"; 
        let isIIP = b.Spesifikasi === "IIP";
        let sudah = false;
        if (isIKP && idUnikIKP.has(idReg)) sudah = true;
        if (isIIP && idUnikIIP.has(idReg)) sudah = true;

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

    let kewajibanOrang = masterOrangFilter.length;
    let kewajibanIKP = masterKotakFilter.filter(b => b.Spesifikasi === "IKP").length;
    let kewajibanIIP = masterKotakFilter.filter(b => b.Spesifikasi === "IIP").length;
    
    totalKewajiban = kewajibanOrang + kewajibanIKP + kewajibanIIP;
    
    let berhasilOrang = 0; 
    let berhasilIKP = 0; 
    let berhasilIIP = 0;
    
    masterOrangFilter.forEach(b => { if (idUnikOrang.has(String(b["Nomor Register"]).trim())) berhasilOrang++; });
    masterKotakFilter.forEach(b => {
        let id = String(b["Nomor Register"]).trim();
        if (b.Spesifikasi === "IKP" && idUnikIKP.has(id)) berhasilIKP++;
        if (b.Spesifikasi === "IIP" && idUnikIIP.has(id)) berhasilIIP++;
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
}

function tampilkanDaftarBelum() {
    const wadah = document.getElementById('wadahDaftarBelum');
    if (!wadah) return;
    wadah.innerHTML = ""; 

    if (dataBelumBerdonasi.length === 0) {
        wadah.innerHTML = "<p style='text-align:center; color:#9CA3AF; margin-top:20px;'>Semua donatur pada periode/petugas ini sudah berdonasi. Hebat!</p>";
        return;
    }

    dataBelumBerdonasi.forEach(donatur => {
        let noHp = String(donatur.hp).replace(/[^0-9]/g, '');
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

function gambarGrafikOrang(berhasil, sisa) {
    const ctx = document.getElementById('grafikOrang').getContext('2d');
    if (grafikOrang) grafikOrang.destroy();
    grafikOrang = new Chart(ctx, {
        type: 'doughnut',
        data: { 
            labels: ['Sudah', 'Belum'], 
            datasets: [{ 
                data: [berhasil, sisa > 0 ? sisa : 0], 
                backgroundColor: ['#2563EB', '#E5E7EB'], 
                borderWidth: 0 
            }] 
        },
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

// Jalankan aplikasi
mulaiAplikasi();
