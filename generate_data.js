const fs = require('fs');
const path = require('path');

// Years: 2021-2033
const years = [2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033];

// UK-only geography
const GEOGRAPHIES = ['UK'];

// Utility transmission pole segment definitions with market share splits
const segmentTypes = {
  'By Reinforcement Material Type': {
    'Glass Fiber Reinforced Polymer Poles': 0.45,
    'Hybrid Fiber Reinforced Polymer Poles': 0.35,
    'Other Advanced Composite Poles (Carbon Fiber, Basalt Fiber, Aramid Fiber, etc.)': 0.20,
  },
  'By Structure Configuration': {
    'Single-Pole Structures': 0.55,
    'H-Frame Structures': 0.30,
    'Multi-Pole Portal Structures': 0.15,
  },
  'By Support Method': {
    'Self-Supporting Pole Structures': 0.70,
    'Guyed Pole Structures': 0.30,
  },
  'By Pole Line Function': {
    'Tangent Utility Poles': 0.40,
    'Angle Utility Poles': 0.25,
    'Dead-End and Anchor Utility Poles': 0.20,
    'Terminal and Take-Off Utility Poles': 0.15,
  },
  'By High-Voltage Transmission Poles': {
    '69 kV to 230 kV': 0.75,
    'Above 230 kV': 0.25,
  },
  'By Installation Type': {
    'New Transmission Line Construction': 0.60,
    'Transmission Pole Replacement and Retrofit': 0.40,
  },
  'By Operating Environment': {
    'Normal Inland Transmission Corridors': 0.35,
    'Coastal and Corrosion-Prone Transmission Corridors': 0.15,
    'High-Wind and Storm-Prone Transmission Corridors': 0.25,
    'Wildfire-Prone Transmission Corridors': 0.05,
    'Remote and Difficult-Terrain Transmission Corridors': 0.20,
  },
  'By Customer Type': {
    'Transmission System Operators and Transmission Utilities': 0.35,
    'Distribution Network Operators': 0.25,
    'EPC and Grid Infrastructure Contractors': 0.20,
    'Industrial Power Network Owners': 0.10,
    'Government and Public Transmission Agencies': 0.10,
  },
};

// UK base market value (USD Million) for 2021
const ukBaseValue = 185;

// UK market CAGR
const ukGrowthRate = 0.082;

// Segment-specific growth multipliers (relative to UK base CAGR)
const segmentGrowthMultipliers = {
  'By Reinforcement Material Type': {
    'Glass Fiber Reinforced Polymer Poles': 1.08,
    'Hybrid Fiber Reinforced Polymer Poles': 1.12,
    'Other Advanced Composite Poles (Carbon Fiber, Basalt Fiber, Aramid Fiber, etc.)': 1.18,
  },
  'By Structure Configuration': {
    'Single-Pole Structures': 0.98,
    'H-Frame Structures': 1.05,
    'Multi-Pole Portal Structures': 1.10,
  },
  'By Support Method': {
    'Self-Supporting Pole Structures': 1.02,
    'Guyed Pole Structures': 0.95,
  },
  'By Pole Line Function': {
    'Tangent Utility Poles': 0.96,
    'Angle Utility Poles': 1.04,
    'Dead-End and Anchor Utility Poles': 1.06,
    'Terminal and Take-Off Utility Poles': 1.10,
  },
  'By High-Voltage Transmission Poles': {
    '69 kV to 230 kV': 1.05,
    'Above 230 kV': 1.15,
  },
  'By Installation Type': {
    'New Transmission Line Construction': 1.12,
    'Transmission Pole Replacement and Retrofit': 0.92,
  },
  'By Operating Environment': {
    'Normal Inland Transmission Corridors': 0.95,
    'Coastal and Corrosion-Prone Transmission Corridors': 1.08,
    'High-Wind and Storm-Prone Transmission Corridors': 1.10,
    'Wildfire-Prone Transmission Corridors': 1.05,
    'Remote and Difficult-Terrain Transmission Corridors': 1.12,
  },
  'By Customer Type': {
    'Transmission System Operators and Transmission Utilities': 1.02,
    'Distribution Network Operators': 1.06,
    'EPC and Grid Infrastructure Contractors': 1.10,
    'Industrial Power Network Owners': 1.08,
    'Government and Public Transmission Agencies': 1.04,
  },
};

// Volume multiplier: units per USD Million
const volumePerMillionUSD = 520;

// Seeded pseudo-random for reproducibility
let seed = 42;
function seededRandom() {
  seed = (seed * 16807 + 0) % 2147483647;
  return (seed - 1) / 2147483646;
}

function addNoise(value, noiseLevel = 0.03) {
  return value * (1 + (seededRandom() - 0.5) * 2 * noiseLevel);
}

function roundTo1(val) {
  return Math.round(val * 10) / 10;
}

function roundToInt(val) {
  return Math.round(val);
}

function generateTimeSeries(baseValue, growthRate, roundFn) {
  const series = {};
  for (let i = 0; i < years.length; i++) {
    const year = years[i];
    const rawValue = baseValue * Math.pow(1 + growthRate, i);
    series[year] = roundFn(addNoise(rawValue));
  }
  return series;
}

function generateData(isVolume) {
  const data = {};
  const roundFn = isVolume ? roundToInt : roundTo1;
  const multiplier = isVolume ? volumePerMillionUSD : 1;

  for (const geography of GEOGRAPHIES) {
    data[geography] = {};
    const geoBase = ukBaseValue * multiplier;

    for (const [segType, segments] of Object.entries(segmentTypes)) {
      data[geography][segType] = {};
      for (const [segName, share] of Object.entries(segments)) {
        const segGrowth = ukGrowthRate * segmentGrowthMultipliers[segType][segName];
        const shareVariation = 1 + (seededRandom() - 0.5) * 0.08;
        const segBase = geoBase * share * shareVariation;
        data[geography][segType][segName] = generateTimeSeries(segBase, segGrowth, roundFn);
      }
    }
  }

  return data;
}

function buildSegmentationAnalysis() {
  const analysis = { Global: {} };

  for (const [segType, segments] of Object.entries(segmentTypes)) {
    analysis.Global[segType] = {};
    for (const segName of Object.keys(segments)) {
      analysis.Global[segType][segName] = {};
    }
  }

  analysis.Global['By Region'] = {
    UK: {},
  };

  return analysis;
}

// Generate both datasets
seed = 42;
const valueData = generateData(false);
seed = 7777;
const volumeData = generateData(true);
const segmentationAnalysis = buildSegmentationAnalysis();

// Write files
const outDir = path.join(__dirname, 'public', 'data');
fs.writeFileSync(path.join(outDir, 'value.json'), JSON.stringify(valueData, null, 2));
fs.writeFileSync(path.join(outDir, 'volume.json'), JSON.stringify(volumeData, null, 2));
fs.writeFileSync(path.join(outDir, 'segmentation_analysis.json'), JSON.stringify(segmentationAnalysis, null, 2));

console.log('Generated value.json, volume.json, and segmentation_analysis.json successfully');
console.log('Geographies:', Object.keys(valueData));
console.log('Segment types:', Object.keys(valueData.UK));
console.log(
  'Sample - UK, By Reinforcement Material Type:',
  JSON.stringify(valueData.UK['By Reinforcement Material Type'], null, 2)
);
