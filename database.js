const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'hydropower.db');
const db = new sqlite3.Database(dbPath);

const initialize = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Plant data table
      db.run(`CREATE TABLE IF NOT EXISTS plant_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        voltage REAL,
        current REAL,
        power_output REAL,
        frequency REAL,
        load_percentage REAL,
        turbine_rpm REAL,
        water_flow_rate REAL,
        water_head REAL,
        generator_temp REAL,
        efficiency REAL
      )`);

      // Alerts table
      db.run(`CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        alert_type TEXT,
        message TEXT,
        severity TEXT,
        resolved BOOLEAN DEFAULT 0
      )`);

      // Standard parameters table
      db.run(`CREATE TABLE IF NOT EXISTS standard_parameters (
        id INTEGER PRIMARY KEY,
        voltage_min REAL,
        voltage_max REAL,
        current_min REAL,
        current_max REAL,
        turbine_rpm_min REAL,
        turbine_rpm_max REAL,
        water_flow_min REAL,
        water_flow_max REAL,
        generator_temp_max REAL,
        efficiency_min REAL
      )`, (err) => {
        if (err) {
          reject(err);
        } else {
          // Insert default standard parameters
          db.run(`INSERT OR REPLACE INTO standard_parameters VALUES (
            1, 210, 230, 10, 100, 500, 1800, 0.5, 10, 80, 75
          )`);

          // Create default admin user
          const hashedPassword = bcrypt.hashSync('admin123', 10);
          db.run(`INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)`, 
            ['admin', hashedPassword], (err) => {
              if (err) reject(err);
              else {
                console.log('✅ Database initialized successfully');
                resolve();
              }
            }
          );
        }
      });
    });
  });
};

module.exports = {
  db,
  initialize
};
