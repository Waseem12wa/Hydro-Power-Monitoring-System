const express = require('express');
const { db } = require('../database');

const router = express.Router();

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Get current plant data (simulated real-time)
router.get('/current', requireAuth, (req, res) => {
  // Generate realistic simulated data
  const data = generatePlantData();
  
  // Save to database
  db.run(`INSERT INTO plant_data 
    (voltage, current, power_output, frequency, load_percentage, 
     turbine_rpm, water_flow_rate, water_head, generator_temp, efficiency) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.voltage, data.current, data.powerOutput, data.frequency, 
     data.load, data.turbineRPM, data.waterFlowRate, data.waterHead, 
     data.generatorTemp, data.efficiency]
  );

  // Check for alerts
  checkAndGenerateAlerts(data);

  res.json(data);
});

// Get historical data
router.get('/history', requireAuth, (req, res) => {
  const hours = req.query.hours || 24;
  const query = `
    SELECT * FROM plant_data 
    WHERE timestamp >= datetime('now', '-${hours} hours')
    ORDER BY timestamp DESC
    LIMIT 1000
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get standard parameters
router.get('/standards', requireAuth, (req, res) => {
  db.get('SELECT * FROM standard_parameters WHERE id = 1', [], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(row);
  });
});

// Get active alerts
router.get('/alerts', requireAuth, (req, res) => {
  db.all(`SELECT * FROM alerts WHERE resolved = 0 ORDER BY timestamp DESC LIMIT 50`, 
    [], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

// Resolve alert
router.post('/alerts/:id/resolve', requireAuth, (req, res) => {
  db.run('UPDATE alerts SET resolved = 1 WHERE id = ?', [req.params.id], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true });
  });
});

// Helper function to generate realistic plant data
function generatePlantData() {
  const baseVoltage = 220;
  const baseCurrent = 45;
  const baseRPM = 1500;
  const baseFlowRate = 2.5;
  const baseHead = 50;
  
  // Add realistic variations
  const voltage = baseVoltage + (Math.random() - 0.5) * 20;
  const current = baseCurrent + (Math.random() - 0.5) * 10;
  const frequency = 50 + (Math.random() - 0.5) * 0.5;
  const turbineRPM = baseRPM + (Math.random() - 0.5) * 100;
  const waterFlowRate = baseFlowRate + (Math.random() - 0.5) * 0.5;
  const waterHead = baseHead + (Math.random() - 0.5) * 5;
  const generatorTemp = 55 + Math.random() * 20;
  
  // Calculate power output (P = V * I)
  const powerOutput = (voltage * current) / 1000; // in kW
  
  // Calculate hydraulic power (P = ρ * g * Q * H)
  const rho = 1000; // density of water kg/m³
  const g = 9.81; // gravitational acceleration m/s²
  const hydraulicPower = (rho * g * waterFlowRate * waterHead) / 1000; // in kW
  
  // Calculate efficiency
  const efficiency = (powerOutput / hydraulicPower) * 100;
  
  // Calculate load percentage
  const maxPower = 15; // kW
  const load = (powerOutput / maxPower) * 100;
  
  return {
    voltage: parseFloat(voltage.toFixed(2)),
    current: parseFloat(current.toFixed(2)),
    powerOutput: parseFloat(powerOutput.toFixed(2)),
    frequency: parseFloat(frequency.toFixed(2)),
    load: parseFloat(load.toFixed(2)),
    turbineRPM: parseFloat(turbineRPM.toFixed(0)),
    waterFlowRate: parseFloat(waterFlowRate.toFixed(3)),
    waterHead: parseFloat(waterHead.toFixed(2)),
    generatorTemp: parseFloat(generatorTemp.toFixed(1)),
    efficiency: parseFloat(efficiency.toFixed(2)),
    hydraulicPower: parseFloat(hydraulicPower.toFixed(2))
  };
}

// Helper function to check and generate alerts
function checkAndGenerateAlerts(data) {
  const alerts = [];
  
  if (data.voltage > 230) {
    alerts.push({
      type: 'OVER_VOLTAGE',
      message: `Over Voltage Detected: ${data.voltage}V (Standard Max: 230V)`,
      severity: 'HIGH'
    });
  }
  
  if (data.voltage < 210) {
    alerts.push({
      type: 'UNDER_VOLTAGE',
      message: `Under Voltage Detected: ${data.voltage}V (Standard Min: 210V)`,
      severity: 'MEDIUM'
    });
  }
  
  if (data.turbineRPM > 1800) {
    alerts.push({
      type: 'TURBINE_OVERSPEED',
      message: `Turbine Overspeed Detected: ${data.turbineRPM} RPM (Standard Max: 1800 RPM)`,
      severity: 'HIGH'
    });
  }
  
  if (data.waterFlowRate < 0.5) {
    alerts.push({
      type: 'LOW_WATER_FLOW',
      message: `Low Water Flow Detected: ${data.waterFlowRate} m³/s (Standard Min: 0.5 m³/s)`,
      severity: 'HIGH'
    });
  }
  
  if (data.generatorTemp > 80) {
    alerts.push({
      type: 'GENERATOR_OVERHEATING',
      message: `Generator Overheating: ${data.generatorTemp}°C (Standard Max: 80°C)`,
      severity: 'CRITICAL'
    });
  }
  
  if (data.efficiency < 75) {
    alerts.push({
      type: 'LOW_EFFICIENCY',
      message: `Low Efficiency Detected: ${data.efficiency}% (Standard Min: 75%)`,
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
