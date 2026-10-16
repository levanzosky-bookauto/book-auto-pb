import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const docsDir = path.join(projectRoot, 'DOCUMENTI SCANSIONATI');
const carsJsonPath = path.join(projectRoot, 'public', 'data', 'cars.json');

console.log('🔍 Avvio scansione cartella "DOCUMENTI SCANSIONATI"...');

if (!fs.existsSync(docsDir)) {
  console.log('⚠️ Cartella "DOCUMENTI SCANSIONATI" non trovata. Creazione in corso...');
  fs.mkdirSync(docsDir, { recursive: true });
}

let cars = [];
try {
  cars = JSON.parse(fs.readFileSync(carsJsonPath, 'utf-8'));
} catch (e) {
  console.error('❌ Errore lettura cars.json:', e);
  process.exit(1);
}

const clean = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/gi, '');

function detectCategory(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('librett') || n.includes('circolaz') || n.includes('carta')) return 'libretto';
  if (n.includes('assicuraz') || n.includes('polizz') || n.includes('rca')) return 'assicurazione';
  if (n.includes('bollo') || n.includes('tassa') || n.includes('f24') || n.includes('ricevuta')) return 'bollo';
  if (n.includes('revis') || n.includes('collaudo')) return 'revisione';
  if (n.includes('tagliand') || n.includes('service') || n.includes('fattura')) return 'tagliando';
  return 'altro';
}

const entries = fs.readdirSync(docsDir, { withFileTypes: true });
let importedFilesCount = 0;
let updatedCarsCount = 0;

for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  const folderName = entry.name;
  if (folderName.startsWith('.')) continue;

  const carDirPath = path.join(docsDir, folderName);
  const files = fs.readdirSync(carDirPath).filter(f => !f.startsWith('.') && /\.(pdf|jpg|jpeg|png|webp|heic)$/i.test(f));

  if (files.length === 0) continue;

  // Find car by folder name
  const cleanFolder = clean(folderName);
  let targetCar = cars.find(c => {
    const combined = clean(`${c.brand} ${c.model}`);
    return combined === cleanFolder || (cleanFolder.includes(clean(c.brand)) && cleanFolder.includes(clean(c.model)));
  });

  if (!targetCar) {
    // Configure new car from folder name
    const parts = folderName.split(' ');
    const brand = parts[0] || 'Altro';
    const model = parts.slice(1).join(' ') || folderName;
    const maxPage = cars.reduce((m, c) => Math.max(m, Number(c.page) || 0), 0);

    targetCar = {
      id: `car_imported_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      page: maxPage + 1,
      brand,
      model,
      immatricolazione: '',
      chassis: '',
      cilindrata: '',
      horsepower: '',
      esemplari: '',
      images: [],
      pageImage: '',
      mainPhoto: '',
      logoImg: '',
      carPhotos: [],
      isFavorite: false,
      notes: `Vettura configurata automaticamente da cartella scansioni "${folderName}"`,
      documents: []
    };
    cars.push(targetCar);
    console.log(`✨ Nuova vettura configurata dal nome cartella: "${brand} ${model}"`);
  }

  targetCar.documents = Array.isArray(targetCar.documents) ? targetCar.documents : [];
  let carChanged = false;

  for (const fileName of files) {
    const filePath = path.join(carDirPath, fileName);
    const fileStat = fs.statSync(filePath);
    const category = detectCategory(fileName);
    const ext = path.extname(fileName).toLowerCase();
    const mimeType = ext === '.pdf' ? 'application/pdf' : `image/${ext.replace('.', '')}`;
    
    // Read file as base64 data URL
    const fileBuf = fs.readFileSync(filePath);
    const base64 = `data:${mimeType};base64,${fileBuf.toString('base64')}`;

    const newDoc = {
      id: `doc_cli_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      category,
      title: `${category.toUpperCase()} — ${targetCar.brand} ${targetCar.model}`,
      fileName: `${targetCar.brand} ${targetCar.model} - ${category}${ext}`,
      fileType: mimeType,
      fileData: base64,
      dataUrl: base64,
      date: new Date().toISOString().slice(0, 10),
      fileSizeKb: Math.round(fileStat.size / 1024),
      notes: `Importato da file locale "${fileName}"`
    };

    // Auto-replace previous version of same category
    targetCar.documents = [newDoc, ...targetCar.documents.filter(d => d.category !== category)];
    importedFilesCount++;
    carChanged = true;
  }

  if (carChanged) {
    updatedCarsCount++;
  }
}

// Write back to cars.json
fs.writeFileSync(carsJsonPath, JSON.stringify(cars, null, 2));

console.log(`\n🎉 Completato!`);
console.log(`📄 File importati: ${importedFilesCount}`);
console.log(`🚗 Vetture aggiornate: ${updatedCarsCount}`);
console.log(`💾 Aggiornato ${carsJsonPath}`);
