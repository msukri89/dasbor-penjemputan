const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw2Dcig9_jLXMp5z2cAjqE5hssYFC02QyrFg4sUaeUG1crik9LwRY54EnVgwIDMwaw/exec";

let dataMaster = null;
let grafikUtama = null;
let dataBelumBerdonasi = []; 

// Navigasi
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

// Mulai Aplikasi
async function mulaiAplikasi() {
    try {
        const respons = await fetch(SCRIPT_URL);
        const hasilJson = await respons.json();
        dataMaster = hasilJson.data;
        isiDropdownPetugas();
        kalkulasiDasbor();
    } catch (error) {
        console.error(error);
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
    let totalPemasukan = 0;

    // Rutin
    let mR = dataMaster.master_orang.filter(b => (filterPetugas === "Semua" || b.Kolektor === filterPetugas) && (filterPekan === "Total" || String(b.Pekan) === pekanAngka));
    let tR = dataMaster.terima_orang.filter(b => (filterPetugas === "Semua" || b["Nama User"] === filterPetugas) && (filterPekan === "Total" || tentukanPekanTransaksi(b.Tanggal) === pekanAngka));
    let idR = new Set(tR.map(b => String(b["Kode Donatur"]).trim()));
    tR.forEach(b => totalPemasukan += Number(b.Nominal || 0));

    // Kotak
    let mK = dataMaster.master_kotak.filter(b => (filterPetugas === "Semua" || b.Kolektor === filterPetugas) && (filterPekan === "Total" || String(b.Pekan) === pekanAngka));
    let tK = dataMaster.terima_kotak.filter(b => (filterPetugas === "Semua" || b["Nama User"] === filterPetugas) && (filterPekan === "Total" || tentukanPekanTransaksi(b.Tanggal) === pekanAngka));

    let idIKP = new Set(), idIIP = new Set();
    tK.forEach(b => {
        totalPemasukan += Number(b.Nominal || 0);
        let sp = String(b.Spesifikasi).toUpperCase();
        if (sp === "IKP") idIKP.add(String(b["Kode Donatur"]).trim());
        if (sp === "IIP") idIIP.add(String(b["Kode Donatur"]).trim());
    });

    // Belum Berdonasi
    mR.forEach(b => {
        if (!idR.has(String(b["Nomor Register"]).trim())) {
            dataBelumBerdonasi.push({ nama: b["Nama Donatur"], kategori: "RUTIN", alamat: b.Alamat, hp: b.Hp, badge: 'badge-rutin' });
        }
    });
    mK.forEach(b => {
        let idReg = String(b["Nomor Register"]).trim();
        let jenis = String(b.Spesifikasi).toUpperCase();
        let sudah = (jenis === "IKP" && idIKP.has(idReg)) || (jenis === "IIP" && idIIP.has(idReg));
        if (!sudah) {
            dataBelumBerdonasi.push({ nama: b["Nama Donatur"], kategori: jenis, alamat: b.Alamat, hp: b.Hp, badge: jenis === 'IKP' ? 'badge-ikp' : 'badge-iip' });
        }
    });

    let bR = mR.filter(b => idR.has(String(b["Nomor Register"]).trim())).length;
    let bIKP = mK.filter(b => b.Spesifikasi === "IKP" && idIKP.has(String(b["Nomor Register"]).trim())).length;
    let bIIP = mK.filter(b => b.Spesifikasi === "IIP" && idIIP.has(String(b["Nomor Register"]).trim())).length;
    
    let kR = mR.length, kIKP = mK.filter(b => b.Spesifikasi === "IKP").length, kIIP = mK.filter(b => b.Spesifikasi === "IIP").length;

    document.getElementById('teksPersentase').innerText = Math.round(((bR+bIKP+bIIP)/(kR+kIKP+kIIP || 1))*100) + "%";
    document.getElementById('teksKewajiban').innerText = kR + kIKP + kIIP;
    document.getElementById('teksBerhasil').innerText = bR + bIKP + bIIP;
    document.getElementById('teksPemasukan').innerText = "Rp " + totalPemasukan.toLocaleString('id-ID');

    renderGrafikStacked(bR, kR, bIKP, kIKP, bIIP, kIIP);
}

function tampilkanDaftarBelum() {
    const wadah = document.getElementById('wadahDaftarBelum');
    const filterJenis = document.getElementById('filterJenisDonatur').value;
    wadah.innerHTML = ""; 
    let dataF = (filterJenis === "Semua") ? dataBelumBerdonasi : dataBelumBerdonasi.filter(d => d.kategori === filterJenis);
    dataF.forEach(donatur => {
        let noHp = String(donatur.hp || "").replace(/[^0-9]/g, '');
        if (noHp.startsWith('0')) noHp = '62' + noHp.substring(1); 
        let warnaB = donatur.kategori === 'RUTIN' ? '#2E5B72' : (donatur.kategori === 'IKP' ? '#B2C330' : '#4FB0C6');
        wadah.innerHTML += `
            <div class="kartu-belum" style="border-left: 5px solid ${warnaB}">
                <div class="info-teks">
                    <h4>${donatur.nama} <span class="badge ${donatur.badge}">${donatur.kategori}</span></h4>
                    <p class="alamat-teks">${donatur.alamat}</p>
                </div>
                <a href="${noHp ? 'https://wa.me/'+noHp : '#'}" target="_blank" class="btn-wa"><i class="fab fa-whatsapp"></i></a>
            </div>`;
    });
}

function renderGrafikStacked(bR, kR, bIKP, kIKP, bIIP, kIIP) {
    const ctx = document.getElementById('grafikUtama').getContext('2d');
    if (grafikUtama) grafikUtama.destroy();
    
    grafikUtama = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Rutin', 'IKP', 'IIP'],
            datasets: [
                {
                    label: 'Berhasil',
                    data: [bR, bIKP, bIIP],
                    backgroundColor: ['#2E5B72', '#B2C330', '#4FB0C6'],
                    borderWidth: 2,
                    borderColor: '#FFFFFF'
                },
                {
                    label: 'Sisa',
                    data: [kR - bR, kIKP - bIKP, kIIP - bIIP],
                    backgroundColor: '#E5E7EB',
                    borderWidth: 2,
                    borderColor: '#FFFFFF'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
            plugins: { legend: { display: false } }
        }
    });
}

document.getElementById('filterPetugas').addEventListener('change', kalkulasiDasbor);
document.getElementById('filterPekan').addEventListener('change', kalkulasiDasbor);
document.getElementById('filterJenisDonatur').addEventListener('change', tampilkanDaftarBelum);
mulaiAplikasi();
