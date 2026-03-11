const express = require('express');
const router = express.Router();
const db = require('../database').db;

// ==================== SIMULATION CONTROL ====================

let simulationInterval = null;
let currentConfigId = null;

// Get simulation status
router.get('/simulation/status', (req, res) => {
  db.get('SELECT * FROM simulation_settings WHERE id = 1', (err, settings) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Failed to get simulation status' });
    }
    
    const isRunning = simulationInterval !== null;
    
    res.json({
      success: true,
      data: {
        isRunning,
        interval: settings?.interval_seconds || 3,
        variationPercentage: settings?.variation_percentage || 5.0,
        activeConfigId: currentConfigId
      }
    });
  });
});

// Start simulation
router.post('/simulation/start', (req, res) => {
  const { configId } = req.body;
  
  if (!configId) {
    return res.status(400).json({ success: false, error: 'Configuration ID is required' });
  }
  
  // Get configuration
  db.get('SELECT * FROM plant_config WHERE id = ?', [configId], (err, config) => {
    if (err || !config) {
      return res.status(404).json({ success: false, error: 'Configuration not found' });
    }
    
    // Get config fields
    db.all('SELECT * FROM config_fields WHERE config_id = ?', [configId], (err, fields) => {
      if (err) {
        return res.status(500).json({ success: false, error: 'Failed to load configuration fields' });
      }
      
      // Stop existing simulation if running
      if (simulationInterval) {
        clearInterval(simulationInterval);
      }
      
      currentConfigId = configId;
      
      // Get interval
      db.get('SELECT interval_seconds, variation_percentage FROM simulation_settings WHERE id = 1', 
        (err, settings) => {
          const interval = (settings?.interval_seconds || 3) * 1000;
          const variationPct = settings?.variation_percentage || 5.0;
          
          // Start simulation
          startSimulation(fields, interval, variationPct);
          
          // Update settings
          db.run('UPDATE simulation_settings SET is_running = 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1');
          
          res.json({
            success: true,
            message: 'Simulation started successfully',
            data: { configId, interval: interval / 1000 }
          });
        }
      );
    });
  });
});

// Stop simulation
router.post('/simulation/stop', (req, res) => {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
    currentConfigId = null;
    
    db.run('UPDATE simulation_settings SET is_running = 0, updated_at = CURRENT_TIMESTAMP WHERE id = 1');
    
    res.json({ success: true, message: 'Simulation stopped successfully' });
  } else {
    res.json({ success: true, message: 'No simulation is running' });
  }
});

// Update simulation settings
router.put('/simulation/settings', (req, res) => {
  const { interval, variationPercentage } = req.body;
  
  const updates = [];
  const values = [];
  
  if (interval !== undefined) {
    updates.push('interval_seconds = ?');
    values.push(interval);
  }
  
  if (variationPercentage !== undefined) {
    updates.push('variation_percentage = ?');
    values.push(variationPercentage);
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ success: false, error: 'No settings provided' });
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(1); // WHERE id = 1
  
  const sql = `UPDATE simulation_settings SET ${updates.join(', ')} WHERE id = ?`;
  
  db.run(sql, values, function(err) {
    if (err) {
      return res.status(500).json({ success: false, error: 'Failed to update settings' });
    }
    
    res.json({ success: true, message: 'Settings updated successfully' });
    
    // Restart simulation if running
    if (simulationInterval && currentConfigId) {
      db.get('SELECT * FROM plant_config WHERE id = ?', [currentConfigId], (err, config) => {
        if (config) {
          db.all('SELECT * FROM config_fields WHERE config_id = ?', [currentConfigId], (err, fields) => {
            if (fields) {
              clearInterval(simulationInterval);
              startSimulation(fields, interval * 1000, variationPercentage);
            }
          });
        }
      });
    }
  });
});

// ==================== CONFIGURATION MANAGEMENT ====================

// Get all configurations
router.get('/configurations', (req, res) => {
  db.all('SELECT * FROM plant_config ORDER BY created_at DESC', (err, configs) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Failed to fetch configurations' });
    }
    
    res.json({ success: true, data: configs });
  });
});

// Get configuration by ID with fields
router.get('/configurations/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM plant_config WHERE id = ?', [id], (err, config) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Failed to fetch configuration' });
    }
    
    if (!config) {
      return res.status(404).json({ success: false, error: 'Configuration not found' });
    }
    
    db.all('SELECT * FROM config_fields WHERE config_id = ?', [id], (err, fields) => {
      if (err) {
        return res.status(500).json({ success: false, error: 'Failed to fetch fields' });
      }
      
      res.json({
        success: true,
        data: {
          ...config,
          fields
        }
      });
    });
  });
});

// Create new configuration
router.post('/configurations', (req, res) => {
  const { configName, fields } = req.body;
  
  if (!configName || !fields || !Array.isArray(fields)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Configuration name and fields array are required' 
    });
  }
  
  // Deactivate all other configs
  db.run('UPDATE plant_config SET is_active = 0', (err) => {
    // Insert new config
    db.run(
      'INSERT INTO plant_config (config_name, is_active) VALUES (?, 1)',
      [configName],
      function(err) {
        if (err) {
          return res.status(500).json({ success: false, error: 'Failed to create configuration' });
        }
        
        const configId = this.lastID;
        
        // Insert fields
        const stmt = db.prepare('INSERT INTO config_fields (config_id, field_name, field_value, field_type) VALUES (?, ?, ?, ?)');
        
        fields.forEach(field => {
          stmt.run(configId, field.name, field.value, field.type);
        });
        
        stmt.finalize((err) => {
          if (err) {
            return res.status(500).json({ success: false, error: 'Failed to save fields' });
          }
          
          res.json({
            success: true,
            message: 'Configuration created successfully',
            data: { id: configId, configName }
          });
        });
      }
    );
  });
});

// Update configuration
router.put('/configurations/:id', (req, res) => {
  const { id } = req.params;
  const { configName, fields } = req.body;
  
  if (!configName || !fields || !Array.isArray(fields)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Configuration name and fields array are required' 
    });
  }
  
  db.run(
    'UPDATE plant_config SET config_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [configName, id],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, error: 'Failed to update configuration' });
      }
      
      // Delete old fields
      db.run('DELETE FROM config_fields WHERE config_id = ?', [id], (err) => {
        if (err) {
          return res.status(500).json({ success: false, error: 'Failed to delete old fields' });
        }
        
        // Insert new fields
        const stmt = db.prepare('INSERT INTO config_fields (config_id, field_name, field_value, field_type) VALUES (?, ?, ?, ?)');
        
        fields.forEach(field => {
          stmt.run(id, field.name, field.value, field.type);
        });
        
        stmt.finalize((err) => {
          if (err) {
            return res.status(500).json({ success: false, error: 'Failed to save fields' });
          }
          
          res.json({ success: true, message: 'Configuration updated successfully' });
        });
      });
    }
  );
});

// Delete configuration
router.delete('/configurations/:id', (req, res) => {
  const { id } = req.params;
  
  // Stop simulation if this config is active
  if (currentConfigId == id && simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
    currentConfigId = null;
  }
  
  db.run('DELETE FROM config_fields WHERE config_id = ?', [id], (err) => {
    db.run('DELETE FROM plant_config WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ success: false, error: 'Failed to delete configuration' });
      }
      
      res.json({ success: true, message: 'Configuration deleted successfully' });
    });
  });
});

// Set active configuration
router.put('/configurations/:id/activate', (req, res) => {
  const { id } = req.params;
  
  db.run('UPDATE plant_config SET is_active = 0', (err) => {
    db.run('UPDATE plant_config SET is_active = 1 WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ success: false, error: 'Failed to activate configuration' });
      }
      
      res.json({ success: true, message: 'Configuration activated successfully' });
    });
  });
});

// ==================== SIMULATION LOGIC ====================

function startSimulation(fields, intervalMs, variationPct) {
  const baseValues = {};
  
  // Convert fields to base values object
  fields.forEach(field => {
    baseValues[field.field_name] = parseFloat(field.field_value) || field.field_value;
  });
  
  simulationInterval = setInterval(() => {
    const data = generateSimulatedData(baseValues, variationPct);
    
    // Save to database
    saveSimulatedData(data);
    
  }, intervalMs);
}

function generateSimulatedData(baseValues, variationPct) {
  const data = { timestamp: new Date().toISOString() };
  
  Object.keys(baseValues).forEach(key => {
    const baseValue = baseValues[key];
    
    // Check if it's a number
    if (typeof baseValue === 'number' && !isNaN(baseValue)) {
      // Add random variation
      const variation = (Math.random() - 0.5) * 2 * (variationPct / 100);
      data[key] = baseValue * (1 + variation);
    } else {
      // Keep string values as-is
      data[key] = baseValue;
    }
  });
  
  // Calculate derived values if base electrical parameters exist
  if (data.voltage && data.current) {
    const powerFactor = data.powerFactor || data.power_factor || 0.85;
    const phases = data.phases || 1;
    
    // Calculate power output
    if (phases === 3) {
      data.powerOutput = Math.sqrt(3) * data.voltage * data.current * powerFactor / 1000;
    } else {
      data.powerOutput = data.voltage * data.current * powerFactor / 1000;
    }
    
    // Calculate efficiency if flow and head are available
    if (data.waterFlowRate && data.waterHead) {
      const hydraulicPower = 9.81 * data.waterFlowRate * data.waterHead / 1000;
      data.efficiency = (data.powerOutput / hydraulicPower) * 100;
    }
  }
  
  return data;
}

function saveSimulatedData(data) {
  // Save to plant_data table
  const sql = `INSERT INTO plant_data (
    voltage, current, power_output, frequency, 
    turbine_rpm, water_flow_rate, water_head, 
    generator_temp, efficiency
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
  db.run(sql, [
    data.voltage || null,
    data.current || null,
    data.powerOutput || null,
    data.frequency || null,
    data.turbineRPM || data.turbine_rpm || null,
    data.waterFlowRate || data.water_flow_rate || null,
    data.waterHead || data.water_head || null,
    data.generatorTemp || data.generator_temp || null,
    data.efficiency || null
  ]);
}

module.exports = router;
