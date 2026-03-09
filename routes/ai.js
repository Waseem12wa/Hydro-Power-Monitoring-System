const express = require('express');
const axios = require('axios');
const { db } = require('../database');

const router = express.Router();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// AI Models Configuration - Updated to latest supported models
const AI_MODELS = {
  performance: 'llama-3.3-70b-versatile',      // For complex performance analysis
  anomaly: 'llama-3.1-8b-instant',             // For real-time anomaly detection
  efficiency: 'gemma2-9b-it'                   // For quick efficiency analysis
};

// Get performance prediction using AI
router.get('/predict-performance', requireAuth, async (req, res) => {
  try {
    // Get recent historical data
    const historicalData = await getRecentData(100);
    
    const prompt = `You are an expert hydropower engineer analyzing plant performance data.

Recent Plant Data Summary:
- Average Voltage: ${calculateAverage(historicalData, 'voltage').toFixed(2)}V
- Average Current: ${calculateAverage(historicalData, 'current').toFixed(2)}A
- Average Power Output: ${calculateAverage(historicalData, 'power_output').toFixed(2)} kW
- Average Turbine RPM: ${calculateAverage(historicalData, 'turbine_rpm').toFixed(0)}
- Average Water Flow Rate: ${calculateAverage(historicalData, 'water_flow_rate').toFixed(3)} m³/s
- Average Efficiency: ${calculateAverage(historicalData, 'efficiency').toFixed(2)}%
- Average Generator Temperature: ${calculateAverage(historicalData, 'generator_temp').toFixed(1)}°C

Based on this data, provide:
1. Performance trend prediction for the next 24 hours
2. Potential issues that may arise
3. Maintenance recommendations
4. Efficiency optimization suggestions

Provide your response in JSON format with these exact keys:
{
  "prediction": "detailed prediction text",
  "potential_issues": ["issue 1", "issue 2", "issue 3"],
  "maintenance_recommendations": ["recommendation 1", "recommendation 2"],
  "optimization_tips": ["tip 1", "tip 2", "tip 3"]
}`;

    const response = await callGroqAPI(AI_MODELS.performance, prompt);
    
    res.json({
      model: AI_MODELS.performance,
      analysis: response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('AI Prediction Error:', error.message);
    res.status(500).json({ error: 'Failed to generate prediction', details: error.message });
  }
});

// Get anomaly detection using AI
router.post('/detect-anomaly', requireAuth, async (req, res) => {
  try {
    const currentData = req.body.data;
    const historicalData = await getRecentData(200);
    
    const prompt = `You are an AI system monitoring a micro hydro power plant for anomalies.

Current Real-Time Data:
- Voltage: ${currentData.voltage}V (Standard: 210-230V)
- Current: ${currentData.current}A (Standard: 10-100A)
- Power Output: ${currentData.powerOutput} kW
- Frequency: ${currentData.frequency} Hz (Standard: 49.5-50.5 Hz)
- Turbine RPM: ${currentData.turbineRPM} (Standard: 500-1800 RPM)
- Water Flow Rate: ${currentData.waterFlowRate} m³/s (Standard: 0.5-10 m³/s)
- Water Head: ${currentData.waterHead} m
- Generator Temperature: ${currentData.generatorTemp}°C (Standard Max: 80°C)
- Efficiency: ${currentData.efficiency}%

Historical Average (Last 200 readings):
- Avg Voltage: ${calculateAverage(historicalData, 'voltage').toFixed(2)}V
- Avg Turbine RPM: ${calculateAverage(historicalData, 'turbine_rpm').toFixed(0)}
- Avg Efficiency: ${calculateAverage(historicalData, 'efficiency').toFixed(2)}%
- Avg Temperature: ${calculateAverage(historicalData, 'generator_temp').toFixed(1)}°C

Analyze if there are any anomalies in the current data compared to historical patterns and standard operating values. Provide your response in JSON format with these exact keys:
{
  "has_anomaly": true or false,
  "anomalies": ["anomaly 1 description", "anomaly 2 description"],
  "severity": "LOW/MEDIUM/HIGH/CRITICAL",
  "recommended_action": "specific action to take"
}`;

    const response = await callGroqAPI(AI_MODELS.anomaly, prompt);
    
    res.json({
      model: AI_MODELS.anomaly,
      analysis: response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Anomaly Detection Error:', error.message);
    res.status(500).json({ error: 'Failed to detect anomalies', details: error.message });
  }
});

// Get efficiency analysis using AI
router.post('/analyze-efficiency', requireAuth, async (req, res) => {
  try {
    const currentData = req.body.data;
    
    const prompt = `You are a hydropower efficiency expert analyzing plant performance.

Current Plant Status:
- Electrical Power Output: ${currentData.powerOutput} kW
- Hydraulic Power Input: ${currentData.hydraulicPower} kW
- Current Efficiency: ${currentData.efficiency}%
- Water Flow Rate: ${currentData.waterFlowRate} m³/s
- Water Head: ${currentData.waterHead} m
- Turbine RPM: ${currentData.turbineRPM}

Standard Efficiency Target: 75% or higher
these exact keys:
{
  "efficiency_status": "GOOD/ACCEPTABLE/POOR",
  "factors": "description of factors affecting efficiency",
  "recommendations": ["tip 1", "tip 2", "tip 3", "tip 4", "tip 5"]
}
Provide a quick analysis:
1. Is the current efficiency acceptable?
2. What factors might be reducing efficiency?
3. Quick actionable recommendations to improve efficiency

Respond in JSON format with keys: efficiency_status (GOOD/ACCEPTABLE/POOR), factors, recommendations (array of 3-5 quick tips)`;

    const response = await callGroqAPI(AI_MODELS.efficiency, prompt);
    
    res.json({
      model: AI_MODELS.efficiency,
      analysis: response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Efficiency Analysis Error:', error.message);
    res.status(500).json({ error: 'Failed to analyze efficiency', details: error.message });
  }
});

// Get comprehensive AI insights (uses all 3 models)
router.get('/comprehensive-analysis', requireAuth, async (req, res) => {
  try {
    const historicalData = await getRecentData(100);
    const currentData = historicalData[0]; // Most recent data
    
    const prompt = `You are an expert AI system for hydropower plant management, providing comprehensive analysis.

Plant Overview:
- Current Power Output: ${currentData.power_output} kW
- Current Efficiency: ${currentData.efficiency}%
- Current Turbine RPM: ${currentData.turbine_rpm}
- Current Generator Temperature: ${currentData.generator_temp}°C
- Average Efficiency (Last 100 readings): ${calculateAverage(historicalData, 'efficiency').toFixed(2)}%

Provide a comprehensive analysis covering:
1. Overall plant health status (EXCELLENT/GOOD/FAIR/POOR)
2. Top 3 peJSON format with these exact keys:
{
  "overall_health": "EXCELLENT/GOOD/FAIR/POOR",
  "performance_insights": ["insight 1", "insight 2", "insight 3"],
  "predicted_performance_trend": "IMPROVING/STABLE/DECLINING",
  "priority_maintenance_actions": ["action 1", "action 2", "action 3"],
  "energy_production_forecast": "forecast description"
}
3. Predicted performance trend (IMPROVING/STABLE/DECLINING)
4. Priority maintenance actions
5. Energy production forecast for next 7 days

Respond in clear JSON format.`;

    const response = await callGroqAPI(AI_MODELS.performance, prompt);
    
    res.json({
      model: AI_MODELS.performance,
      analysis: response,
      data_points_analyzed: historicalData.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Comprehensive Analysis Error:', error.message);
    res.status(500).json({ error: 'Failed to generate comprehensive analysis', details: error.message });
  }
});

// Helper function to call Groq API
async function callGroqAPI(model, prompt) {
  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert AI assistant specializing in hydropower plant monitoring and analysis. Always provide accurate, actionable insights in JSON format when requested.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    let content = response.data.choices[0].message.content.trim();
    
    // Remove markdown code blocks if present
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Try to parse as JSON
    try {
      return JSON.parse(content);
    } catch (parseError) {
      // Try to extract JSON from text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
          return { text: content };
        }
      }
      return { text: content };
    }
  } catch (error) {
    throw new Error(`Groq API Error: ${error.response?.data?.error?.message || error.message}`);
  }
}

// Helper function to get recent data from database
function getRecentData(limit) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM plant_data ORDER BY timestamp DESC LIMIT ?`,
      [limit],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

// Helper function to calculate average
function calculateAverage(data, field) {
  if (data.length === 0) return 0;
  const sum = data.reduce((acc, item) => acc + (item[field] || 0), 0);
  return sum / data.length;
}

module.exports = router;
