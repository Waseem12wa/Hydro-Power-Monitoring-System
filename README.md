# 🌊 Hydro Power Monitoring System

A comprehensive **AI-powered monitoring and performance analysis tool** for micro hydro power plants with **web-based configuration**, real-time data tracking, predictive analytics, and intelligent fault detection.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)
![AI](https://img.shields.io/badge/AI-Groq%20API-orange.svg)

## 🚀 Key Features

- ⚙️ **Web-Based Configuration** - Configure plant parameters from your browser (no coding required!)
- ⚡ **Real-time Monitoring** - Track electrical and mechanical parameters with live updates
- 🤖 **AI-Powered Analytics** - Advanced predictive insights using Groq AI (3 specialized models)
- 📊 **Historical Data Visualization** - Interactive graphs with Chart.js for trend analysis
- 🚨 **Intelligent Alert System** - Automatic fault detection with severity-based notifications
- 🎮 **Simulation Control** - Start/stop data simulation with one click from the web interface
- 🔐 **Secure Authentication** - Session-based login with bcrypt password hashing
- 💾 **Persistent Storage** - Complete SQLite database for data history and analytics

---

## ⚡ NEW: Web-Based Configuration System

**The easiest way to configure your hydro power plant monitoring!**

### 🎯 What You Can Do
- ✅ **Visual Configuration Editor** - Add/edit sensor parameters from your browser
- ✅ **One-Click Simulation** - Start/stop data generation instantly
- ✅ **Multiple Configurations** - Save different setups for different plants or operating modes
- ✅ **Quick Templates** - Pre-configured templates (Basic Electrical, Hydro Power Full, Moolia Plant)
- ✅ **Custom Fields** - Add ANY sensor type (voltage, temperature, pressure, vibration, custom metrics)
- ✅ **Real-time Control** - Adjust update intervals (1-60 seconds) and variation percentages (0-20%)

### 🚀 Quick Start

1. **Start the server**
   ```bash
   npm start
   ```
   Or double-click `START.bat` on Windows

2. **Login** at `http://localhost:3000`
   - Username: `admin`
   - Password: `admin123`

3. **Go to Configuration Page**
   - Click "⚙️ Configuration" in the navigation bar

4. **Create Your First Configuration**
   - Click "🚀 Quick Create Moolia Plant" button
   - OR load a template (Basic/Hydro/Moolia)
   - OR add custom fields manually

5. **Start Simulation**
   - Click "Save & Start" button
   - Watch live data on the Dashboard!

### 📝 Pre-Built Templates

| Template | Parameters | Use Case |
|----------|------------|----------|
| **Basic Electrical** | Voltage, Current, Frequency, Power Factor | Simple electrical monitoring |
| **Hydro Power (Full)** | Voltage, Current, PF, RPM, Flow Rate, Water Head, Temperature | Complete hydro plant monitoring |
| **Moolia Plant** | 410V, 166A, 0.83 PF, 3-phase, 775 RPM, 0.51 m³/s, 110 ft head | Pre-configured for Moolia Plant specs |

---

## 🧠 AI Models Integration

This system leverages **Groq API** with three specialized large language models:

| Model | Purpose | Use Case |
|-------|---------|----------|
| **llama-3.3-70b-versatile** | Complex Analysis | Long-term performance predictions & comprehensive insights |
| **llama-3.1-8b-instant** | Real-time Detection | Fast anomaly detection & instant alerts |
| **gemma2-9b-it** | Quick Analysis | Efficiency recommendations & rapid diagnostics |

---

## 📊 Monitored Parameters

### Electrical Parameters
- **Voltage** (210-230V standard range)
- **Current** (10-100A standard range)
- **Power Output** (kW)
- **Frequency** (49.5-50.5 Hz)
- **Load Percentage** (0-100%)

### Mechanical & Hydraulic Parameters
- **Turbine Speed** (500-1800 RPM)
- **Water Flow Rate** (0.5-10 m³/s)
- **Water Head** (meters)
- **Generator Temperature** (0-80°C safe range)

### Calculated Metrics
- **Efficiency** = (Electrical Power / Hydraulic Power) × 100%
- **Hydraulic Power** = ρ × g × Q × H × 9.81/1000

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Node.js, Express.js |
| **Database** | SQLite3 |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| **AI/ML** | Groq API (LLaMA 3.3, LLaMA 3.1, Gemma 2) |
| **Visualization** | Chart.js |
| **Authentication** | express-session, bcryptjs |
| **HTTP Client** | Axios |

---

## 📦 Installation & Setup

### Prerequisites
- Node.js (v14.0.0 or higher)
- npm (v6.0.0 or higher)
- Groq API key ([Get one free here](https://console.groq.com))

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/Waseem12wa/Hydro-Power-Monitoring-System.git
   cd Hydro-Power-Monitoring-System
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   SESSION_SECRET=your_secure_random_string_here
   PORT=3000
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Access the application**
   - Open browser: `http://localhost:3000`
   - Login: `admin` / `admin123`
   - Click "⚙️ Configuration" to set up your plant
   - Click "🚀 Quick Create Moolia Plant" for instant setup
   - View live data on Dashboard!

---

## 🌐 Deployment on Render

### Deploy to Render (Recommended)

1. Push your code to GitHub (this repository)

2. Create a new **Web Service** on [Render](https://render.com)

3. Connect your GitHub repository

4. Configure the service:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `GROQ_API_KEY` = Your Groq API key
     - `SESSION_SECRET` = Random secure string
     - `PORT` = 3000 (or Render's default)

5. Deploy! Render will automatically build and start your application.

### Environment Variables for Production

```env
GROQ_API_KEY=gsk_your_actual_groq_api_key
SESSION_SECRET=use_a_strong_random_secret_here
PORT=3000
NODE_ENV=production
```

---

## 📸 Screenshots

### Dashboard Overview
Real-time monitoring of all plant parameters with live efficiency gauge.

### AI Insights Panel
- **Performance Prediction** - 24-hour forecast with optimization tips
- **Anomaly Detection** - Real-time deviation alerts with severity levels
- **Comprehensive Analysis** - Overall plant health and maintenance recommendations

### Historical Data
Interactive charts showing voltage, power output, turbine RPM, and efficiency trends.

---

## 🏗️ Project Structure

```
Hydro-Power-Monitoring-System/
├── server.js              # Main Express server
├── database.js            # SQLite database setup & queries
├── package.json           # Dependencies & scripts
├── .env                   # Environment variables (not in repo)
├── .env.example          # Example environment configuration
├── START.bat             # Quick start script for Windows
├── README.md             # Complete documentation
├── routes/
│   ├── auth.js           # Authentication endpoints
│   ├── data.js           # Real-time data & historical queries
│   ├── ai.js             # Groq AI integration endpoints
│   └── config.js         # Configuration & simulation management API
└── public/
    ├── login.html        # Login page
    ├── dashboard.html    # Main dashboard interface
    ├── config.html       # Configuration & simulation control page
    ├── css/
    │   ├── style.css     # Professional hydropower theme
    │   └── config.css    # Configuration page styles
    └── js/
        ├── dashboard.js  # Dashboard logic & AI display
        └── config.js     # Configuration page logic & simulation control
```

---

## 🎨 Design Philosophy

The application features a **professional hydropower-themed design**:

- 🌊 **Color Scheme**: Deep blue and vibrant green (water + renewable energy)
- ⚡ **Responsive Layout**: Optimized for desktop and tablet devices
- 📱 **Real-time Updates**: Live parameter cards with color-coded status
- 🎯 **User Experience**: Intuitive navigation with smooth animations
- 🔔 **Alert System**: Prominent banners for critical notifications
- ⚙️ **Web-Based Config**: Visual editor for easy plant setup

---

## 🌐 Deployment on Render

1. Push your code to GitHub
2. Create a new **Web Service** on [Render](https://render.com)
3. Connect your GitHub repository
4. Configure the service:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**: `GROQ_API_KEY`, `SESSION_SECRET`, `PORT`
5. Deploy!

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is licensed under the **MIT License** - see the LICENSE file for details.

---

## 👨‍💻 Author

**Waseem**  
GitHub: [@Waseem12wa](https://github.com/Waseem12wa)

---

## 🙏 Acknowledgments

- **Groq** - For providing fast AI inference API
- **Chart.js** - For beautiful data visualization
- **Express.js** - For robust backend framework
- **SQLite** - For lightweight, reliable database

---

## 📞 Support

If you encounter any issues or have questions, please [open an issue](https://github.com/Waseem12wa/Hydro-Power-Monitoring-System/issues) on GitHub.

---

<div align="center">
  <strong>⭐ Star this repository if you find it useful!</strong>
</div>
