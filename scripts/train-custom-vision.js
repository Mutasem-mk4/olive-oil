const fs = require('fs');
const https = require('https');
const path = require('path');

// ─── Configuration ────────────────────────────────────────────────────────────
const TRAINING_ENDPOINT = 'https://zaytoun-cvtrain-dev.cognitiveservices.azure.com/';
const TRAINING_KEY = process.env.AZURE_CUSTOM_VISION_TRAINING_KEY || '';
const PREDICTION_RESOURCE_ID = '/subscriptions/ed8940be-2bc1-4c77-95a1-64000d0a59b7/resourceGroups/zaytoun-vision-sweden-rg/providers/Microsoft.CognitiveServices/accounts/zaytoun-cvpredict-dev';
const PROJECT_NAME = 'ZaytounVisionModel';
const PUBLISH_NAME = 'ZaytounModel';
const IMAGES_PER_CLASS = 15;
const IMAGE_SIZE = 224;

// ─── BMP Image Generator ──────────────────────────────────────────────────────
function generateBMPBuffer(width, height, getPixel) {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelDataSize = rowSize * height;
  const fileSize = 54 + pixelDataSize;

  const header = Buffer.alloc(54);
  header.write('BM', 0); // Signature
  header.writeUInt32LE(fileSize, 2); // File size
  header.writeUInt32LE(0, 6); // Reserved
  header.writeUInt32LE(54, 10); // Offset

  header.writeUInt32LE(40, 14); // Header size
  header.writeUInt32LE(width, 18); // Width
  header.writeInt32LE(height, 22); // Height
  header.writeUInt16LE(1, 26); // Planes
  header.writeUInt16LE(24, 28); // BPP
  header.writeUInt32LE(0, 30); // Compression
  header.writeUInt32LE(pixelDataSize, 34); // Image size
  header.writeInt32LE(2835, 38); // X pixels/meter
  header.writeInt32LE(2835, 42); // Y pixels/meter
  header.writeUInt32LE(0, 46); // Total colors
  header.writeUInt32LE(0, 50); // Important colors

  const pixelData = Buffer.alloc(pixelDataSize);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = getPixel(x, height - 1 - y, width, height);
      const colOffset = x * 3;
      pixelData[rowOffset + colOffset] = b;     // B
      pixelData[rowOffset + colOffset + 1] = g; // G
      pixelData[rowOffset + colOffset + 2] = r; // R
    }
  }

  return Buffer.concat([header, pixelData]);
}

function randomRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getPixelPure(x, y, width, height) {
  const centerX = width / 2;
  const centerY = height / 2;
  const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
  if (dist > 100) return [0, 0, 0];
  if (dist >= 98 && dist <= 100) return [80, 80, 80];

  const vignette = Math.max(0, 1 - (dist / 120) ** 2);
  const baseColors = [
    [45, 120, 35],
    [65, 130, 25],
    [80, 140, 30],
    [55, 110, 20],
    [70, 125, 40]
  ];
  const color = baseColors[randomRange(0, baseColors.length - 1)];
  let r = color[0] + randomRange(-15, 15);
  let g = color[1] + randomRange(-15, 15);
  let b = color[2] + randomRange(-15, 15);

  r = Math.max(0, Math.min(255, Math.floor(r * vignette)));
  g = Math.max(0, Math.min(255, Math.floor(g * vignette)));
  b = Math.max(0, Math.min(255, Math.floor(b * vignette)));
  return [r, g, b];
}

function getPixelLight(x, y, width, height) {
  const centerX = width / 2;
  const centerY = height / 2;
  const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
  if (dist > 100) return [0, 0, 0];
  if (dist >= 98 && dist <= 100) return [80, 80, 80];

  const vignette = Math.max(0, 1 - (dist / 120) ** 2);
  const baseColors = [
    [140, 150, 50],
    [160, 155, 45],
    [130, 140, 60],
    [150, 145, 55],
    [145, 160, 40]
  ];
  const color = baseColors[randomRange(0, baseColors.length - 1)];
  let r = color[0] + randomRange(-15, 15);
  let g = color[1] + randomRange(-15, 15);
  let b = color[2] + randomRange(-15, 15);

  r = Math.max(0, Math.min(255, Math.floor(r * vignette)));
  g = Math.max(0, Math.min(255, Math.floor(g * vignette)));
  b = Math.max(0, Math.min(255, Math.floor(b * vignette)));
  return [r, g, b];
}

function getPixelHeavy(x, y, width, height) {
  const centerX = width / 2;
  const centerY = height / 2;
  const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
  if (dist > 100) return [0, 0, 0];
  if (dist >= 98 && dist <= 100) return [80, 80, 80];

  const vignette = Math.max(0, 1 - (dist / 120) ** 2);
  const baseColors = [
    [210, 205, 170],
    [220, 215, 180],
    [200, 195, 165],
    [215, 210, 175],
    [225, 220, 190]
  ];
  const color = baseColors[randomRange(0, baseColors.length - 1)];
  let r = color[0] + randomRange(-10, 10);
  let g = color[1] + randomRange(-10, 10);
  let b = color[2] + randomRange(-10, 10);

  r = Math.max(0, Math.min(255, Math.floor(r * vignette)));
  g = Math.max(0, Math.min(255, Math.floor(g * vignette)));
  b = Math.max(0, Math.min(255, Math.floor(b * vignette)));
  return [r, g, b];
}

// ─── API Client Helper ────────────────────────────────────────────────────────
function apiRequest(method, urlStr, headers, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const options = {
      method: method,
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: headers,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data ? JSON.parse(data) : null);
        } else {
          reject(new Error(`Request failed with status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (err) => { reject(err); });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

// ─── Main Pipeline ────────────────────────────────────────────────────────────
async function run() {
  console.log('============================================================');
  console.log('🤖 Zaytoun Vision — Custom Vision AI Training Automation');
  console.log('============================================================');

  const headers = {
    'Training-Key': TRAINING_KEY,
    'Content-Type': 'application/json'
  };

  try {
    // 1. Create Project
    console.log('1. Creating Custom Vision Project...');
    const createUrl = `${TRAINING_ENDPOINT}customvision/v3.0/training/projects?name=${encodeURIComponent(PROJECT_NAME)}&classificationType=Multiclass`;
    const project = await apiRequest('POST', createUrl, headers);
    const projectId = project.id;
    console.log(`   ui ID: ${projectId}`);

    // 2. Create Tags
    console.log('2. Creating tags...');
    const tags = ['pure_evoo', 'light_adulteration', 'heavy_adulteration'];
    const tagIds = {};
    for (const tag of tags) {
      const tagUrl = `${TRAINING_ENDPOINT}customvision/v3.0/training/projects/${projectId}/tags?name=${tag}`;
      const res = await apiRequest('POST', tagUrl, headers);
      tagIds[tag] = res.id;
      console.log(`   ✅ Created tag '${tag}' -> ID: ${res.id}`);
    }

    // 3. Generate and Upload Images
    console.log('3. Generating and uploading synthetic images...');
    const classes = [
      { name: 'pure_evoo', generator: getPixelPure },
      { name: 'light_adulteration', generator: getPixelLight },
      { name: 'heavy_adulteration', generator: getPixelHeavy }
    ];

    for (const cls of classes) {
      console.log(`   Uploading ${IMAGES_PER_CLASS} images for '${cls.name}'...`);
      const tagId = tagIds[cls.name];
      for (let i = 0; i < IMAGES_PER_CLASS; i++) {
        // Generate BMP buffer in memory
        const buffer = generateBMPBuffer(IMAGE_SIZE, IMAGE_SIZE, cls.generator);

        // Upload directly
        const uploadUrl = `${TRAINING_ENDPOINT}customvision/v3.0/training/projects/${projectId}/images?tagIds=${tagId}`;
        const uploadHeaders = {
          'Training-Key': TRAINING_KEY,
          'Content-Type': 'application/octet-stream'
        };
        await apiRequest('POST', uploadUrl, uploadHeaders, buffer);
      }
      console.log(`   ✅ Uploaded images for '${cls.name}'`);
    }

    // 4. Trigger Training
    console.log('4. Submitting model training job...');
    const trainUrl = `${TRAINING_ENDPOINT}customvision/v3.0/training/projects/${projectId}/train`;
    const iteration = await apiRequest('POST', trainUrl, headers);
    const iterationId = iteration.id;
    console.log(`   ✅ Training job submitted. Iteration ID: ${iterationId}`);

    // 5. Poll Training Status
    console.log('5. Waiting for training to complete (polling)...');
    let completed = false;
    while (!completed) {
      await new Promise(r => setTimeout(r, 4000));
      const statusUrl = `${TRAINING_ENDPOINT}customvision/v3.0/training/projects/${projectId}/iterations/${iterationId}`;
      const statusRes = await apiRequest('GET', statusUrl, headers);
      console.log(`   Current Status: ${statusRes.status}`);
      if (statusRes.status === 'Completed') {
        completed = true;
      } else if (statusRes.status === 'Failed') {
        throw new Error('Training job failed on Azure.');
      }
    }
    console.log('   ✅ Model training complete!');

    // 6. Publish Model
    console.log('6. Publishing trained model to prediction account...');
    const publishUrl = `${TRAINING_ENDPOINT}customvision/v3.0/training/projects/${projectId}/predictions/publishediterations/${PUBLISH_NAME}?iterationId=${iterationId}&predictionId=${encodeURIComponent(PREDICTION_RESOURCE_ID)}`;
    await apiRequest('POST', publishUrl, headers);
    console.log('   ✅ Model successfully published!');

    console.log('\n============================================================');
    console.log('🎉 SUCCESS! Azure Custom Vision Model is Active!');
    console.log('============================================================');
    console.log(`PROJECT_ID: ${projectId}`);
    console.log(`PUBLISH_NAME: ${PUBLISH_NAME}`);
    console.log('============================================================');

  } catch (error) {
    console.error('❌ Error during training pipeline:', error.message);
    process.exit(1);
  }
}

run();
