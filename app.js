const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw2Dcig9_jLXMp5z2cAjqE5hssYFC02QyrFg4sUaeUG1crik9LwRY54EnVgwIDMwaw/exec";

let dataMaster = null;
let grafikUtama = null;
let grafikInsidental = null;
let dataBelumBerdonasi = []; 

// Navigasi (Sama seperti sebelumnya)
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

    // Filter Terima Orang (Termasuk Insidental)
    let tOrangFilter = dataMaster.terima_orang.filter(b => 
        (filterPetugas === "Semua" || String(b["Nama User"]).trim() === filterPetugas) && 
        (filterPekan === "Total" || tentukanPekanTransaksi(b.Tanggal) === pekanAngka)
    );
    
    // Hitung Pemasukan & ID Berhasil
    let idRutinBerhasil = new Set();
    let jumlahInsidental = 0;

    tOrangFilter.forEach(b => {
        totalPemasukan += Number(b.Nominal || 0);
        let jenis = String(b["Jenis Donatur"] || "").toUpperCase();
        if (jenis.includes("RUTIN")) {
            idRutinBerhasil.add(String(b["Kode Donatur"]).trim());
        } else {
            jumlahInsidental++; // Hitung transaksi Insidental
        }
    });

    // Filter Master Rutin
    let mRutinFilter = dataMaster.master_orang.filter(b => 
        (filterPetugas === "Semua" || String(b.Kolektor).trim() === filterPetugas) && 
        (filterPekan === "Total" || String(b.Pekan).trim() === pekanAngka)
    );

    // Filter Kotak
    let mKotakFilter = dataMaster.master_kotak.filter(b => 
        (filterPetugas === "Semua" || String(b.Kolektor).trim() === filterPetugas) && 
        (filterPekan === "Total" || String(b.Pekan).trim() === pekanAngka)
    );
    let tKotakFilter = dataMaster.terima_kotak.filter(b => 
        (filterPetugas === "Semua" || String(b["Nama User"]).trim() === filterPetugas) && 
        (filterPekan === "Total" || tentukanPekanTransaksi(b.Tanggal) === pekanAngka)
    );

    let idIKP = new Set(), idIIP = new Set();
    tKotakFilter.forEach(b => {
        totalPemasukan += Number(b.Nominal || 0);
        let sp = String(b.Spesifikasi || "").toUpperCase();
        if (sp === "IKP") idIKP.add(String(b["Kode Donatur"]).trim());
        if (sp === "IIP") idIIP.add(String(b["Kode Donatur"]).trim());
    });

    // List Belum Berdonasi
    mRutinFilter.forEach(b => { if (!idRutinBerhasil.has(String(b["Nomor Register"]).trim())) dataBelumBerdonasi.push({ nama: b["Nama Donatur"], kategori: "RUTIN", alamat: b.Alamat, hp: b.Hp, badge: 'badge-rutin' }); });
    mKotakFilter.forEach(b => {
        let idReg = String(b["Nomor Register"]).trim();
        let jenis = String(b.Spesifikasi || "").toUpperCase();
        let sudah = (jenis === "IKP" && idIKP.has(idReg)) || (jenis === "IIP" && idIIP.has(idReg));
        if (!sudah) dataBelumBerdonasi.push({ nama: b["Nama Donatur"], kategori: jenis, alamat: b.Alamat, hp: b.Hp, badge: jenis === 'IKP' ? 'badge-ikp' : 'badge-iip' });
    });

    // Angka Berhasil (Sekarang Termasuk Insidental)
    let bR = idRutinBerhasil.size;
    let bIKP = idIKP.size;
    let bIIP = idIIP.size;
    
    let totalBerhasilRiil = bR + bIKP + bIIP + jumlahInsidental; // INI KUNCI PERBAIKANNYA
    let totalKewajiban = mRutinFilter.length + mKotakFilter.length;

    document.getElementById('teksPersentase').innerText = totalKewajiban > 0 ? Math.round((totalBerhasilRiil / totalKewajiban) * 100) + "%" : "0%";
    document.getElementById('teksKewajiban').innerText = totalKewajiban;
    document.getElementById('teksBerhasil').innerText = totalBerhasilRiil;
    document.getElementById('teksPemasukan').innerText = "Rp " + totalPemasukan.toLocaleString('id-ID');

    renderGrafikStacked(bR, mRutinFilter.length, bIKP, mKotakFilter.filter(b=>b.Spesifikasi==="IKP").length, bIIP, mKotakFilter.filter(b=>b.Spesifikasi==="IIP").length);
    renderGrafikInsidental(jumlahInsidental);
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
                { label: 'Sisa', data: [Math.max(0, kR - bR), Math.max(0, kIKP - bIKP), Math.max(0, kIIP - bIIP)], backgroundColor: '#E5E7EB', borderWidth: 2, borderColor: '#FFFFFF' }
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
                backgroundColor: ['#2E5B72'], // Menggunakan Biru Petrol agar elegan
                borderWidth: 2,
                borderColor: '#FFFFFF',
                barThickness: 50
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
        let pesan = `Assalamu'alaikum Warahmatullah, Bapak/Ibu *${donatur.nama}*. Mohon maaf mengganggu waktunya, kami dari petugas LAZ Sidogiri bermaksud untuk melakukan penjemputan donasi. Apakah ada waktu luang hari ini? Jazakumullah Khairan.`;
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
