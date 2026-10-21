import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function localDocumentStoragePlugin() {
  return {
    name: 'local-document-storage-plugin',
    configureServer(server) {
      // 1. Save uploaded document to disk
      server.middlewares.use('/api/save-document', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { carFolder, fileName, fileData, carId, docMetadata } = JSON.parse(body);
              if (carFolder && fileName && fileData) {
                const base64Data = fileData.includes(';base64,') ? fileData.split(';base64,')[1] : fileData;
                const buffer = Buffer.from(base64Data, 'base64');

                const targetDirs = [
                  path.resolve('./public/DOCUMENTI SCANSIONATI', carFolder)
                ];

                targetDirs.forEach(dir => {
                  fs.mkdirSync(dir, { recursive: true });
                  fs.writeFileSync(path.join(dir, fileName), buffer);
                });

                // Also update public/data/cars.json if docMetadata is provided
                try {
                  const carsPath = path.resolve('./public/data/cars.json');
                  if (fs.existsSync(carsPath) && (carId || carFolder)) {
                    const cars = JSON.parse(fs.readFileSync(carsPath, 'utf8'));
                    const targetCar = cars.find(c => String(c.id) === String(carId) || `${c.brand} ${c.model}`.trim().toLowerCase() === carFolder.trim().toLowerCase());
                    if (targetCar && docMetadata) {
                      const docs = Array.isArray(targetCar.documents) ? targetCar.documents : [];
                      const existsIdx = docs.findIndex(d => d.id === docMetadata.id || d.category === docMetadata.category);
                      if (existsIdx >= 0) {
                        docs[existsIdx] = { ...docs[existsIdx], ...docMetadata };
                      } else {
                        docs.push(docMetadata);
                      }
                      targetCar.documents = docs;
                      fs.writeFileSync(carsPath, JSON.stringify(cars, null, 2), 'utf8');
                    }
                  }
                } catch (jsonErr) {
                  console.warn('Could not auto-update cars.json:', jsonErr);
                }

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, fileName, folder: carFolder }));
                return;
              }
            } catch (err) {
              console.error('Error saving document on disk:', err);
            }
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Invalid document payload' }));
          });
        } else {
          res.statusCode = 404;
          res.end();
        }
      });

      // 2. Delete document physically from disk and cars.json
      server.middlewares.use('/api/delete-document', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { carFolder, fileName, carId, docId } = JSON.parse(body);
              if (carFolder && fileName) {
                const targetDirs = [
                  path.resolve('./public/DOCUMENTI SCANSIONATI', carFolder)
                ];

                targetDirs.forEach(dir => {
                  const filePath = path.join(dir, fileName);
                  if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                  }
                });

                // Also remove from public/data/cars.json
                try {
                  const carsPath = path.resolve('./public/data/cars.json');
                  if (fs.existsSync(carsPath)) {
                    const cars = JSON.parse(fs.readFileSync(carsPath, 'utf8'));
                    const targetCar = cars.find(c => String(c.id) === String(carId) || `${c.brand} ${c.model}`.trim().toLowerCase() === carFolder.trim().toLowerCase());
                    if (targetCar && Array.isArray(targetCar.documents)) {
                      targetCar.documents = targetCar.documents.filter(d => d.id !== docId && d.fileName !== fileName);
                      fs.writeFileSync(carsPath, JSON.stringify(cars, null, 2), 'utf8');
                    }
                  }
                } catch (jsonErr) {}

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, deleted: fileName }));
                return;
              }
            } catch (err) {}
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid payload' }));
          });
        } else {
          res.statusCode = 404;
          res.end();
        }
      });

      // 3. Save car image into DOCUMENTI SCANSIONATI/<carFolder>/immagini/<fileName>
      server.middlewares.use('/api/save-car-image', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { carFolder, fileName, fileData } = JSON.parse(body);
              if (carFolder && fileName && fileData) {
                const base64Data = fileData.includes(';base64,') ? fileData.split(';base64,')[1] : fileData;
                const buffer = Buffer.from(base64Data, 'base64');

                const targetDirs = [
                  path.resolve('./public/DOCUMENTI SCANSIONATI', carFolder, 'immagini')
                ];

                targetDirs.forEach(dir => {
                  fs.mkdirSync(dir, { recursive: true });
                  fs.writeFileSync(path.join(dir, fileName), buffer);
                });

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, fileName, folder: carFolder }));
                return;
              }
            } catch (err) {
              console.error('Error saving car image on disk:', err);
            }
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid image payload' }));
          });
        } else {
          res.statusCode = 404;
          res.end();
        }
      });

      // 4. Save entire car (creates DOCUMENTI SCANSIONATI/<carFolder>/immagini, saves photos, updates cars.json)
      server.middlewares.use('/api/save-car', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { car } = JSON.parse(body);
              if (car && car.brand && car.model) {
                const carFolder = `${car.brand} ${car.model}`.trim();
                const targetImgsDirs = [
                  path.resolve('./public/DOCUMENTI SCANSIONATI', carFolder, 'immagini')
                ];
                targetImgsDirs.forEach(dir => fs.mkdirSync(dir, { recursive: true }));

                const updatedImages = [];
                const rawImages = Array.isArray(car.images) ? car.images : [];

                rawImages.forEach((imgData, idx) => {
                  if (typeof imgData === 'string' && imgData.startsWith('data:image/')) {
                    const ext = imgData.startsWith('data:image/png') ? '.png' : '.jpeg';
                    const fileName = `foto_${idx + 1}${ext}`;
                    const base64Data = imgData.split(';base64,')[1] || imgData;
                    const buffer = Buffer.from(base64Data, 'base64');
                    targetImgsDirs.forEach(dir => {
                      fs.writeFileSync(path.join(dir, fileName), buffer);
                    });
                    updatedImages.push(`./DOCUMENTI SCANSIONATI/${carFolder}/immagini/${fileName}`);
                  } else if (typeof imgData === 'string') {
                    updatedImages.push(imgData);
                  }
                });

                let updatedLogo = car.logoImg;
                if (typeof car.logoImg === 'string' && car.logoImg.startsWith('data:image/')) {
                  const ext = car.logoImg.startsWith('data:image/png') ? '.png' : '.jpeg';
                  const logoFileName = `logo${ext}`;
                  const base64Data = car.logoImg.split(';base64,')[1] || car.logoImg;
                  const buffer = Buffer.from(base64Data, 'base64');
                  targetImgsDirs.forEach(dir => {
                    fs.writeFileSync(path.join(dir, logoFileName), buffer);
                  });
                  updatedLogo = `./DOCUMENTI SCANSIONATI/${carFolder}/immagini/${logoFileName}`;
                }

                const finalizedCar = {
                  ...car,
                  images: updatedImages.length > 0 ? updatedImages : car.images,
                  carPhotos: updatedImages.length > 0 ? updatedImages : car.carPhotos,
                  mainPhoto: updatedImages.length > 0 ? updatedImages[0] : (car.mainPhoto || ''),
                  pageImage: updatedImages.length > 0 ? updatedImages[0] : (car.pageImage || ''),
                  logoImg: updatedLogo || car.logoImg
                };

                // Sync to public/data/cars.json
                const carsPath = path.resolve('./public/data/cars.json');
                if (fs.existsSync(carsPath)) {
                  const cars = JSON.parse(fs.readFileSync(carsPath, 'utf8'));
                  const idx = cars.findIndex(c => String(c.id) === String(finalizedCar.id) || `${c.brand} ${c.model}`.trim().toLowerCase() === carFolder.toLowerCase());
                  if (idx >= 0) {
                    cars[idx] = { ...cars[idx], ...finalizedCar };
                  } else {
                    cars.unshift(finalizedCar);
                  }
                  fs.writeFileSync(carsPath, JSON.stringify(cars, null, 2), 'utf8');
                }

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, car: finalizedCar, folder: carFolder }));
                return;
              }
            } catch (err) {
              console.error('Error in /api/save-car:', err);
            }
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid car payload' }));
          });
        } else {
          res.statusCode = 404;
          res.end();
        }
      });

      // 5. Delete car image from disk and update cars.json
      server.middlewares.use('/api/delete-car-image', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { carFolder, fileName, imagePath, carId } = JSON.parse(body);
              let name = fileName;
              if (!name && imagePath) {
                name = path.basename(imagePath);
              }

              let folder = carFolder;
              if (!folder && imagePath && imagePath.includes('DOCUMENTI SCANSIONATI')) {
                const parts = imagePath.split(/DOCUMENTI SCANSIONATI[/\\]/);
                if (parts[1]) {
                  folder = parts[1].split(/[/\\]/)[0];
                }
              }

              if (folder && name) {
                const targetDirs = [
                  path.resolve('./public/DOCUMENTI SCANSIONATI', folder, 'immagini')
                ];
                targetDirs.forEach(dir => {
                  const p = path.join(dir, name);
                  if (fs.existsSync(p)) fs.unlinkSync(p);
                });
              }

              // Also check legacy images/cars directory
              if (imagePath && imagePath.includes('images/cars')) {
                const legacyDirs = [
                  path.resolve('./public/images/cars'),
                  path.resolve('./images/cars')
                ];
                legacyDirs.forEach(dir => {
                  const p = path.join(dir, name);
                  if (fs.existsSync(p)) fs.unlinkSync(p);
                });
              }

              // Update public/data/cars.json to remove deleted photo
              try {
                const carsPath = path.resolve('./public/data/cars.json');
                if (fs.existsSync(carsPath) && (carId || folder)) {
                  const cars = JSON.parse(fs.readFileSync(carsPath, 'utf8'));
                  const targetCar = cars.find(c => String(c.id) === String(carId) || (folder && `${c.brand} ${c.model}`.trim().toLowerCase() === folder.toLowerCase()));
                  if (targetCar && name) {
                    if (Array.isArray(targetCar.images)) {
                      targetCar.images = targetCar.images.filter(img => !img.includes(name));
                    }
                    if (Array.isArray(targetCar.carPhotos)) {
                      targetCar.carPhotos = targetCar.carPhotos.filter(img => !img.includes(name));
                    }
                    if (targetCar.mainPhoto && targetCar.mainPhoto.includes(name)) {
                      targetCar.mainPhoto = (targetCar.images && targetCar.images[0]) || '';
                    }
                    if (targetCar.pageImage && targetCar.pageImage.includes(name)) {
                      targetCar.pageImage = (targetCar.images && targetCar.images[0]) || '';
                    }
                    fs.writeFileSync(carsPath, JSON.stringify(cars, null, 2), 'utf8');
                  }
                }
              } catch (jsonErr) {}

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, deletedImage: name, folder }));
              return;
            } catch (err) {
              console.error('Error deleting car image:', err);
            }
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid payload' }));
          });
        } else {
          res.statusCode = 404;
          res.end();
        }
      });

      // 6. Delete entire car physically (cars.json + entire folder DOCUMENTI SCANSIONATI/<carFolder> including all documents & immagini + legacy images)
      server.middlewares.use('/api/delete-car', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { carId, carFolder } = JSON.parse(body);
              let folderToDelete = carFolder;

              const carsPath = path.resolve('./public/data/cars.json');
              if (fs.existsSync(carsPath)) {
                const cars = JSON.parse(fs.readFileSync(carsPath, 'utf8'));
                if (!folderToDelete && carId) {
                  const found = cars.find(c => String(c.id) === String(carId));
                  if (found) folderToDelete = `${found.brand} ${found.model}`.trim();
                }
                const filtered = cars.filter(c => String(c.id) !== String(carId));
                fs.writeFileSync(carsPath, JSON.stringify(filtered, null, 2), 'utf8');
              }

              // Permanently delete the car folder and its documents/immagini from disk
              if (folderToDelete) {
                const targetBaseDirs = [
                  path.resolve('./public/DOCUMENTI SCANSIONATI')
                ];
                targetBaseDirs.forEach(baseDir => {
                  if (!fs.existsSync(baseDir)) return;
                  const exact = path.join(baseDir, folderToDelete);
                  if (fs.existsSync(exact)) {
                    fs.rmSync(exact, { recursive: true, force: true });
                  } else {
                    const subdirs = fs.readdirSync(baseDir);
                    const match = subdirs.find(s => s.toLowerCase() === folderToDelete.toLowerCase());
                    if (match) {
                      fs.rmSync(path.join(baseDir, match), { recursive: true, force: true });
                    }
                  }
                });
              }

              // Also delete any car photos in public/images/cars/car_<id>_* if present
              if (carId) {
                const carImgDirs = [
                  path.resolve('./public/images/cars'),
                  path.resolve('./images/cars')
                ];
                carImgDirs.forEach(dir => {
                  if (fs.existsSync(dir)) {
                    const files = fs.readdirSync(dir);
                    files.filter(f => f.startsWith(`${carId}_`) || f.startsWith(`${carId}.`)).forEach(f => {
                      try { fs.unlinkSync(path.join(dir, f)); } catch (e) {}
                    });
                  }
                });
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, deletedCarId: carId, deletedFolder: folderToDelete }));
              return;
            } catch (err) {
              console.error('Error deleting car on disk:', err);
            }
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid payload' }));
          });
        } else {
          res.statusCode = 404;
          res.end();
        }
      });

      // 7. Sync full cars list directly to public/data/cars.json
      server.middlewares.use('/api/sync-cars-json', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { cars } = JSON.parse(body);
              if (Array.isArray(cars)) {
                const carsPath = path.resolve('./public/data/cars.json');
                fs.writeFileSync(carsPath, JSON.stringify(cars, null, 2), 'utf8');
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, count: cars.length }));
                return;
              }
            } catch (err) {
              console.error('Error syncing cars.json:', err);
            }
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid cars payload' }));
          });
        } else {
          res.statusCode = 404;
          res.end();
        }
      });

      // 8. Save custom brand logo to public/images/logos/<brand>.png and update cars.json
      server.middlewares.use('/api/save-brand-logo', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { brandName, logoData } = JSON.parse(body);
              if (brandName && logoData) {
                const normName = brandName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
                const isJpeg = logoData.startsWith('data:image/jpeg') || logoData.startsWith('data:image/jpg');
                const ext = isJpeg ? '.jpeg' : '.png';
                const fileName = `${normName}${ext}`;
                const base64Data = logoData.includes(';base64,') ? logoData.split(';base64,')[1] : logoData;
                const buffer = Buffer.from(base64Data, 'base64');

                const logosDir = path.resolve('./public/images/logos');
                if (!fs.existsSync(logosDir)) fs.mkdirSync(logosDir, { recursive: true });
                fs.writeFileSync(path.join(logosDir, fileName), buffer);

                const logoPath = `./images/logos/${fileName}`;

                // Update public/data/cars.json for all cars of this brand
                const carsPath = path.resolve('./public/data/cars.json');
                if (fs.existsSync(carsPath)) {
                  const cars = JSON.parse(fs.readFileSync(carsPath, 'utf8'));
                  let count = 0;
                  cars.forEach(c => {
                    if (c.brand && c.brand.trim().toLowerCase() === brandName.trim().toLowerCase()) {
                      c.logoImg = logoPath;
                      count++;
                    }
                  });
                  if (count > 0) {
                    fs.writeFileSync(carsPath, JSON.stringify(cars, null, 2), 'utf8');
                  }
                }

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, fileName, logoPath }));
                return;
              }
            } catch (err) {
              console.error('Error saving brand logo to disk:', err);
            }
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid brand logo payload' }));
          });
        } else {
          res.statusCode = 404;
          res.end();
        }
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), localDocumentStoragePlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: false
  }
});
