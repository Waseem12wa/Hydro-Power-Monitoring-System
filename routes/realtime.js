const express = require('express');
const { db } = require('../database');

const router = express.Router();

// Store for latest real-time data
let latestRealData = null;
let lastRealDataTimestamp = null;
const DATA_TIMEOUT = 30000; // 30 seconds - if no data received, fall back to simulation

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// API Key authentication for external devices (PLC, sensors, etc.)
const API_KEY = process.env.PLANT_API_KEY || 'hydro_plant_2026_secure_key';

const requireApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  if (apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Invalid API Key' });
  }
  next();
};

// ==================== RECEIVE REAL-TIME DATA ====================

/**
 * POST /api/realtime/push
 * Endpoint for PLCs, IoT devices, or edge computers to push sensor data
 * 
 * Authentication: X-API-Key header or apiKey query parameter
 * 
 * Example payload:
 * {
 *   "voltage": 410,
 *   "current": 166,
 *   "powerFactor": 0.83,
 *   "frequency": 50.2,
 *   "turbineRPM": 775,
 *   "waterFlowRate": 0.51,
 *   "waterHead": 110,
 *   "generatorTemp": 62.5,
 *   "timestamp": "2026-03-11T10:30:00Z"  // Optional
 * }
 */
router.post('/push', requireApiKey, (req, res) => {
  try {
    const rawData = req.body;
    
    // Validate required fields
    if (!rawData.voltage || !rawData.current) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['voltage', 'current']
      });
    }

    // Process and calculate derived values
    const processedData = processRealTimeData(rawData);
    
    // Store in memory for immediate access
    latestRealData = processedData;
    lastRealDataTimestamp = Date.now();
    
    // Save to database
    saveToDatabase(processedData);
    
    // Check for alerts
    checkAndGenerateAlerts(processedData);
    
    res.json({ 
      success: true, 
      message: 'Data received and processed',
      data: processedData
    });
    
  } catch (error) {
    console.error('Error processing real-time data:', error);
    res.status(500).json({ 
      error: 'Failed to process data', 
      details: error.message 
    });
  }
});

/**
 * GET /api/realtime/current
 * Get current plant data - uses real data if available, otherwise simulates
 */
router.get('/current', requireAuth, (req, res) => {
  const isRealDataAvailable = latestRealData && 
    (Date.now() - lastRealDataTimestamp < DATA_TIMEOUT);
  
  if (isRealDataAvailable) {
    res.json({
      ...latestRealData,
      dataSource: 'real',
      lastUpdate: new Date(lastRealDataTimestamp).toISOString()
    });
  } else {
    // Fall back to simulation
    const simulatedData = generateSimulatedData();
    saveToDatabase(simulatedData);
    checkAndGenerateAlerts(simulatedData);
    
    res.json({
      ...simulatedData,
      dataSource: 'simulated',
      lastUpdate: new Date().toISOString()
    });
  }
});

/**
 * GET /api/realtime/status
 * Check if real-time data connection is active
 */
router.get('/status', requireAuth, (req, res) => {
  const isActive = latestRealData && 
    (Date.now() - lastRealDataTimestamp < DATA_TIMEOUT);
  
  res.json({
    realTimeActive: isActive,
    lastDataReceived: lastRealDataTimestamp ? 
      new Date(lastRealDataTimestamp).toISOString() : null,
    dataAge: lastRealDataTimestamp ? 
      Math.floor((Date.now() - lastRealDataTimestamp) / 1000) : null, // seconds
    mode: isActive ? 'real' : 'simulated'
  });
});

/**
 * POST /api/realtime/config
 * Update plant configuration (Moolia Plant specifications)
 */
router.post('/config', requireAuth, (req, res) => {
  const config = req.body;
  
  db.run(`UPDATE standard_parameters SET
    voltage_min = ?, voltage_max = ?,
    current_min = ?, current_max = ?,
    rpm_min = ?, rpm_max = ?,
    flow_min = ?, flow_max = ?,
    temp_max = ?
    WHERE id = 1`,
    [
      config.voltage_min || 380,
      config.voltage_max || 440,
      config.current_min || 10,
      config.current_max || 200,
      config.rpm_min || 500,
      config.rpm_max || 1000,
      config.flow_min || 0.3,
      config.flow_max || 1.0,
      config.temp_max || 90
    ],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to update configuration' });
      }
      res.json({ success: true, message: 'Configuration updated' });
    }
  );
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Process raw sensor data and calculate derived values
 * Supports three-phase systems like Moolia Plant
 */
function processRealTimeData(raw) {
  // Use provided values or defaults
  const voltage = parseFloat(raw.voltage);
  const current = parseFloat(raw.current);
  const powerFactor = parseFloat(raw.powerFactor || 0.85);
  const frequency = parseFloat(raw.frequency || 50);
  
  // For three-phase system: P = √3 × V × I × PF
  const isThreePhase = raw.phases === 3 || voltage > 300; // Assume 3-phase if voltage > 300V
  const powerOutput = isThreePhase 
    ? (Math.sqrt(3) * voltage * current * powerFactor) / 1000  // kW
    : (voltage * current * powerFactor) / 1000;  // kW for single phase
  
  // Mechanical parameters
  const turbineRPM = parseFloat(raw.turbineRPM || 775);
  const waterFlowRate = parseFloat(raw.waterFlowRate || 0.51);
  const waterHead = parseFloat(raw.waterHead || 110);
  const generatorTemp = parseFloat(raw.generatorTemp || 60);
  
  // Calculate hydraulic power: P = ρ × g × Q × H / 1000 (kW)
  const rho = 1000; // density of water kg/m³
  const g = 9.81;   // gravitational acceleration m/s²
  const hydraulicPower = (rho * g * waterFlowRate * waterHead) / 1000;
  
  // Calculate efficiency
  const efficiency = hydraulicPower > 0 
    ? (powerOutput / hydraulicPower) * 100 
    : 0;
  
  // Calculate load percentage (assuming max power capacity)
  const maxPower = parseFloat(raw.ratedPower || 100); // kW
  const load = (powerOutput / maxPower) * 100;
  
  return {
    voltage: parseFloat(voltage.toFixed(2)),
    current: parseFloat(current.toFixed(2)),
    powerFactor: parseFloat(powerFactor.toFixed(2)),
    powerOutput: parseFloat(powerOutput.toFixed(2)),
    frequency: parseFloat(frequency.toFixed(2)),
    load: parseFloat(load.toFixed(2)),
    turbineRPM: parseFloat(turbineRPM.toFixed(0)),
    waterFlowRate: parseFloat(waterFlowRate.toFixed(3)),
    waterHead: parseFloat(waterHead.toFixed(2)),
    generatorTemp: parseFloat(generatorTemp.toFixed(1)),
    efficiency: parseFloat(efficiency.toFixed(2)),
    hydraulicPower: parseFloat(hydraulicPower.toFixed(2)),
    phases: isThreePhase ? 3 : 1,
    turbineType: raw.turbineType || 'Cross Flow Water Turbine'
  };
}

/**
 * Generate simulated data (fallback when no real data)
 */
function generateSimulatedData() {
  const baseVoltage = 220;
  const baseCurrent = 45;
  const baseRPM = 1500;
  const baseFlowRate = 2.5;
  const baseHead = 50;
  
  const voltage = baseVoltage + (Math.random() - 0.5) * 20;
  const current = baseCurrent + (Math.random() - 0.5) * 10;
  const powerFactor = 0.85 + (Math.random() - 0.5) * 0.1;
  const frequency = 50 + (Math.random() - 0.5) * 0.5;
  const turbineRPM = baseRPM + (Math.random() - 0.5) * 100;
  const waterFlowRate = baseFlowRate + (Math.random() - 0.5) * 0.5;
  const waterHead = baseHead + (Math.random() - 0.5) * 5;
  const generatorTemp = 55 + Math.random() * 20;
  
  const powerOutput = (voltage * current * powerFactor) / 1000;
  const hydraulicPower = (1000 * 9.81 * waterFlowRate * waterHead) / 1000;
  const efficiency = (powerOutput / hydraulicPower) * 100;
  const load = (powerOutput / 15) * 100;
  
  return {
    voltage: parseFloat(voltage.toFixed(2)),
    current: parseFloat(current.toFixed(2)),
    powerFactor: parseFloat(powerFactor.toFixed(2)),
    powerOutput: parseFloat(powerOutput.toFixed(2)),
    frequency: parseFloat(frequency.toFixed(2)),
    load: parseFloat(load.toFixed(2)),
    turbineRPM: parseFloat(turbineRPM.toFixed(0)),
    waterFlowRate: parseFloat(waterFlowRate.toFixed(3)),
    waterHead: parseFloat(waterHead.toFixed(2)),
    generatorTemp: parseFloat(generatorTemp.toFixed(1)),
    efficiency: parseFloat(efficiency.toFixed(2)),
    hydraulicPower: parseFloat(hydraulicPower.toFixed(2)),
    phases: 1
  };
}

/**
 * Save data to database
 */
function saveToDatabase(data) {
  db.run(`INSERT INTO plant_data 
    (voltage, current, power_output, frequency, load_percentage, 
     turbine_rpm, water_flow_rate, water_head, generator_temp, efficiency) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.voltage, data.current, data.powerOutput, data.frequency, 
     data.load, data.turbineRPM, data.waterFlowRate, data.waterHead, 
     data.generatorTemp, data.efficiency]
  );
}

/**
 * Check data against standards and generate alerts
 */
function checkAndGenerateAlerts(data) {
  const alerts = [];
  
  // Voltage alerts
  if (data.voltage > 440) {
    alerts.push({
      type: 'OVER_VOLTAGE',
      message: `Critical Over Voltage: ${data.voltage}V (Max: 440V)`,
      severity: 'CRITICAL'
    });
  } else if (data.voltage > 430) {
    alerts.push({
      type: 'OVER_VOLTAGE',
      message: `High Voltage Warning: ${data.voltage}V (Standard Max: 430V)`,
      severity: 'HIGH'
    });
  }
  
  if (data.voltage < 380) {
    alerts.push({
      type: 'UNDER_VOLTAGE',
      message: `Under Voltage Detected: ${data.voltage}V (Min: 380V)`,
      severity: 'MEDIUM'
    });
  }
  
  // Current alerts
  if (data.current > 200) {
    alerts.push({
      type: 'OVER_CURRENT',
      message: `Over Current Detected: ${data.current}A (Max: 200A)`,
      severity: 'HIGH'
    });
  }
  
  // Turbine speed alerts
  if (data.turbineRPM > 1000) {
    alerts.push({
      type: 'TURBINE_OVERSPEED',
      message: `Turbine Overspeed: ${data.turbineRPM} RPM (Max: 1000 RPM)`,
      severity: 'HIGH'
    });
  }
  
  // Water flow alerts
  if (data.waterFlowRate < 0.3) {
    alerts.push({
      type: 'LOW_WATER_FLOW',
      message: `Low Water Flow: ${data.waterFlowRate} m³/s (Min: 0.3 m³/s)`,
      severity: 'HIGH'
    });
  }
  
  // Temperature alerts
  if (data.generatorTemp > 90) {
    alerts.push({
      type: 'GENERATOR_OVERHEATING',
      message: `Critical Generator Temperature: ${data.generatorTemp}°C (Max: 90°C)`,
      severity: 'CRITICAL'
    });
  } else if (data.generatorTemp > 80) {
    alerts.push({
      type: 'HIGH_TEMPERATURE',
      message: `High Generator Temperature: ${data.generatorTemp}°C (Warning: 80°C)`,
      severity: 'MEDIUM'
    });
  }
  
  // Efficiency alerts
  if (data.efficiency < 70) {
    alerts.push({
      type: 'LOW_EFFICIENCY',
      message: `Low Efficiency: ${data.efficiency}% (Target: >75%)`,
      severity: 'MEDIUM'
    });
  }
  
  // Insert alerts into database
  alerts.forEach(alert => {
    db.run(
      'INSERT INTO alerts (alert_type, message, severity) VALUES (?, ?, ?)',
      [alert.type, alert.message, alert.severity]
    );
  });
}

module.exports = router;
