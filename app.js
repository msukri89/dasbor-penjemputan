const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw2Dcig9_jLXMp5z2cAjqE5hssYFC02QyrFg4sUaeUG1crik9LwRY54EnVgwIDMwaw/exec";

let dataMaster = null;
let grafikUtama = null;
let grafikInsidental = null;
let dataBelumBerdonasi = []; 

// --- FUNGSI NAVIGASI ---
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

menuDasbor.addEventListener('click', (e) => {
    e.preventDefault(); areaDasbor.style.display = 'block'; areaBelum.style.display = 'none';
    menuDasbor.classList.add('aktif'); menuBelum.classList.remove('aktif'); tutupSidebar();
});

menuBelum.addEventListener('click', (e) => {
    e.preventDefault(); areaDasbor.style.display = 'none'; areaBelum.style.display = 'block';
    menuBelum.classList.add('aktif'); menuDasbor.classList.remove('aktif'); tutupSidebar();
    tampilkanDaftarBelum();
});

async function mulaiAplikasi() {
    try {
        const respons = await fetch(SCRIPT_URL);
        const hasilJson = await respons.json();
        dataMaster = hasilJson.data;
        isiDropdownPetugas();
        kalkulasiDasbor();
    } catch (error) {
        document.getElementById('teksPersentase').innerText = "ERR";
    }
}

function isiDropdownPetugas() {
    const dropdown = document.getElementById('filterPetugas');
    let daftarPetugas = new Set();
    dataMaster.master_orang.forEach(b => { if(b.Kolektor) daftarPetugas.add(String(b.Kolektor).trim()); });
    dataMaster.master_kotak.forEach(b => { if(b.Kolektor) daftarPetugas.add(String(b.Kolektor).trim()); });
    dropdown.innerHTML = '<option value="Semua">Semua Petugas</option>';
    daftarPetugas.forEach(nama => {
        let opsi = document.createElement('option'); opsi.value = nama; opsi.text = nama; dropdown.appendChild(opsi);
    });
}

function tentukanPekanTransaksi(tglStr) {
    if (!tglStr) return "0";
    let str = String(tglStr);
    let hari = 0;
    try {
        if (str.includes('/')) { hari = parseInt(str.split('/')[0], 10); } 
        else if (str.includes('-')) { hari = parseInt(str.split('T')[0].split('-')[2], 10); } 
        else { let d = new Date(str); hari = d.getDate(); }
    } catch(e) { return "0"; }
    return (hari >= 1 && hari <= 7) ? "1" : (hari >= 8 && hari <= 14) ? "2" : (hari >= 15 && hari <= 21) ? "3" : (hari >= 22) ? "4" : "0";
}

function kalkulasiDasbor() {
    if (!dataMaster) return;
    const filterPetugas = document.getElementById('filterPetugas').value;
    const filterPekan = document.getElementById('filterPekan').value;
    const pekanAngka = filterPekan.replace("Pekan ", ""); 
    
    dataBelumBerdonasi = [];
    let totalPemasukan = 0;
    let bR = 0, bIKP = 0, bIIP = 0, bInsidental = 0;

    // --- 1. PROSES TERIMA_ORANG & TERIMA_KOTAK ---
    // Kita gabung pengecekan ID Berhasil
    let idRutinBerhasil = new Set();
    let idIKPBerhasil = new Set();
    let idIIPBerhasil = new Set();

    // Proses Transaksi Orang
    dataMaster.terima_orang.filter(b => 
        (filterPetugas === "Semua" || String(b["Nama User"]).trim() === filterPetugas) && 
        (filterPekan === "Total" || tentukanPekanTransaksi(b.Tanggal) === pekanAngka)
    ).forEach(b => {
        totalPemasukan += Number(b.Nominal || 0);
        let sp = String(b["Spesifikasi"] || "").toUpperCase(); // GUNAKAN SPESIFIKASI
        if (sp.includes("RUTIN")) {
            idRutinBerhasil.add(String(b["Kode Donatur"]).trim());
        } else if (sp.includes("INSIDEN")) {
            bInsidental++;
        }
    });

    // Proses Transaksi Kotak
    dataMaster.terima_kotak.filter(b => 
        (filterPetugas === "Semua" || String(b["Nama User"]).trim() === filterPetugas) && 
        (filterPekan === "Total" || tentukanPekanTransaksi(b.Tanggal) === pekanAngka)
    ).forEach(b => {
        totalPemasukan += Number(b.Nominal || 0);
        let sp = String(b["Spesifikasi"] || "").toUpperCase(); // GUNAKAN SPESIFIKASI
        if (sp.includes("IKP")) idIKPBerhasil.add(String(b["Kode Donatur"]).trim());
        if (sp.includes("IIP")) idIIPBerhasil.add(String(b["Kode Donatur"]).trim());
    });

    bR = idRutinBerhasil.size;
    bIKP = idIKPBerhasil.size;
    bIIP = idIIPBerhasil.size;

    // --- 2. MASTER DATA (KEWAJIBAN) ---
    let mR = dataMaster.master_orang.filter(b => (filterPetugas === "Semua" || String(b.Kolektor).trim() === filterPetugas) && (filterPekan === "Total" || String(b.Pekan).trim() === pekanAngka));
    let mK = dataMaster.master_kotak.filter(b => (filterPetugas === "Semua" || String(b.Kolektor).trim() === filterPetugas) && (filterPekan === "Total" || String(b.Pekan).trim() === pekanAngka));
    
    let kR = mR.length;
    let kIKP = mK.filter(b => String(b["Spesifikasi"] || "").toUpperCase().includes("IKP")).length;
    let kIIP = mK.filter(b => String(b["Spesifikasi"] || "").toUpperCase().includes("IIP")).length;

    // --- 3. LIST BELUM BERDONASI ---
    mR.forEach(b => {
        if (!idRutinBerhasil.has(String(b["Nomor Register"]).trim())) {
            dataBelumBerdonasi.push({ nama: b["Nama Donatur"], kategori: "RUTIN", alamat: b.Alamat, hp: b.Hp, badge: 'badge-rutin' });
        }
    });
    mK.forEach(b => {
        let idReg = String(b["Nomor Register"]).trim();
        let sp = String(b["Spesifikasi"] || "").toUpperCase();
        let sudah = (sp.includes("IKP") && idIKPBerhasil.has(idReg)) || (sp.includes("IIP") && idIIPBerhasil.has(idReg));
        if (!sudah) {
            let label = sp.includes("IKP") ? "IKP" : "IIP";
            dataBelumBerdonasi.push({ nama: b["Nama Donatur"], kategori: label, alamat: b.Alamat, hp: b.Hp, badge: label === 'IKP' ? 'badge-ikp' : 'badge-iip' });
        }
    });

    // --- 4. UPDATE UI ---
    let totalK = kR + kIKP + kIIP;
    let totalB = bR + bIKP + bIIP + bInsidental;
    let persentase = totalK > 0 ? Math.round(((bR + bIKP + bIIP) / totalK) * 100) : 0;

    document.getElementById('teksPersentase').innerText = persentase + "%";
    document.getElementById('teksKewajiban').innerText = totalK;
    document.getElementById('teksBerhasil').innerText = totalB;
    document.getElementById('teksPemasukan').innerText = "Rp " + totalPemasukan.toLocaleString('id-ID');

    renderGrafikStacked(bR, kR, bIKP, kIKP, bIIP, kIIP);
    renderGrafikInsidental(bInsidental);
}

function renderGrafikStacked(bR, kR, bIKP, kIKP, bIIP, kIIP) {
    const ctx = document.getElementById('grafikUtama').getContext('2d');
    if (grafikUtama) grafikUtama.destroy();
    grafikUtama = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Rutin', 'IKP', 'IIP'],
            datasets: [
                { label: 'Berhasil', data: [bR, bIKP, bIIP], backgroundColor: ['#2E5B72', '#B2C330', '#4FB0C6'], borderWidth: 2, borderColor: '#FFFFFF' },
                { label: 'Sisa', data: [Math.max(0, kR-bR), Math.max(0, kIKP-bIKP), Math.max(0, kIIP-bIIP)], backgroundColor: '#E5E7EB', borderWidth: 2, borderColor: '#FFFFFF' }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
            plugins: { legend: { display: false } }
        }
    });
}

function renderGrafikInsidental(jumlah) {
    const ctx = document.getElementById('grafikInsidental').getContext('2d');
    if (grafikInsidental) grafikInsidental.destroy();
    grafikInsidental = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Insidental'],
            datasets: [{
                data: [jumlah],
                backgroundColor: ['#2E5B72'],
                borderWidth: 2,
                borderColor: '#FFFFFF',
                barThickness: 40
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } },
            plugins: { legend: { display: false } }
        }
    });
}

function tampilkanDaftarBelum() {
    const wadah = document.getElementById('wadahDaftarBelum');
    const filterJenis = document.getElementById('filterJenisDonatur').value;
    wadah.innerHTML = ""; 
    let dataF = (filterJenis === "Semua") ? dataBelumBerdonasi : dataBelumBerdonasi.filter(d => d.kategori === filterJenis);
    dataF.forEach(donatur => {
        let noHp = String(donatur.hp || "").replace(/[^0-9]/g, '');
        if (noHp.startsWith('0')) noHp = '62' + noHp.substring(1); 
        let pesan = `_Assalamu'alaikum Warahmatullah_

Bapak/Ibu *${donatur.nama}*.

Mohon maaf mengganggu waktunya, kami dari petugas LAZ Sidogiri bermaksud untuk melakukan penjemputan donasi.

Apakah ada waktu luang hari ini?

_Jazakumullah Khairan._`;
        let linkWa = noHp ? `https://wa.me/${noHp}?text=${encodeURIComponent(pesan)}` : '#';
        let warnaB = donatur.kategori === 'RUTIN' ? '#2E5B72' : (donatur.kategori === 'IKP' ? '#B2C330' : '#4FB0C6');
        wadah.innerHTML += `
            <div class="kartu-belum" style="border-left: 5px solid ${warnaB}">
                <div class="info-teks">
                    <h4>${donatur.nama} <span class="badge ${donatur.badge}">${donatur.kategori}</span></h4>
                    <p class="alamat-teks">${donatur.alamat}</p>
                </div>
                <a href="${linkWa}" target="_blank" class="btn-wa"><i class="fab fa-whatsapp"></i></a>
            </div>`;
    });
}

document.getElementById('filterPetugas').addEventListener('change', kalkulasiDasbor);
document.getElementById('filterPekan').addEventListener('change', kalkulasiDasbor);
document.getElementById('filterJenisDonatur').addEventListener('change', tampilkanDaftarBelum);
mulaiAplikasi();
