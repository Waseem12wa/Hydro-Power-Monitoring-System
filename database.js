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

      // Plant configuration table (user-defined parameters)
      db.run(`CREATE TABLE IF NOT EXISTS plant_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_name TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Custom fields for plant configuration
      db.run(`CREATE TABLE IF NOT EXISTS config_fields (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_id INTEGER,
        field_name TEXT NOT NULL,
        field_value TEXT NOT NULL,
        field_type TEXT NOT NULL,
        FOREIGN KEY (config_id) REFERENCES plant_config(id)
      )`);

      // Simulation settings
      db.run(`CREATE TABLE IF NOT EXISTS simulation_settings (
        id INTEGER PRIMARY KEY,
        is_running BOOLEAN DEFAULT 0,
        interval_seconds INTEGER DEFAULT 3,
        variation_percentage REAL DEFAULT 5.0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (!err) {
          db.run(`INSERT OR IGNORE INTO simulation_settings (id, is_running, interval_seconds) VALUES (1, 0, 3)`);
        }
      });

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
