// Dashboard JavaScript - Hydro Power Monitoring System

let charts = {};
let updateInterval;
let currentData = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupNavigation();
    setupLogout();
    startRealTimeUpdates();
    createEfficiencyGauge();
});

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/check');
        const data = await response.json();
        
        if (!data.authenticated) {
            window.location.href = '/login.html';
        } else {
            document.getElementById('username').textContent = data.username;
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/login.html';
    }
}

// Setup navigation
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // Only prevent default for internal navigation (links with data-page)
            const page = link.dataset.page;
            if (!page) {
                // Allow normal navigation for external links (like config.html)
                return;
            }
            
            e.preventDefault();
            
            // Update active link
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Show corresponding page
            document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
            document.getElementById(`${page}-page`).classList.add('active');
            
            // Load page-specific data
            if (page === 'history') {
                loadHistoricalData();
            } else if (page === 'alerts') {
                loadAlerts();
            }
        });
    });
}

// Setup logout
function setupLogout() {
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login.html';
        } catch (error) {
            console.error('Logout failed:', error);
        }
    });
}

// Start real-time updates
function startRealTimeUpdates() {
    updateData();
    updateInterval = setInterval(updateData, 3000); // Update every 3 seconds
}

// Update real-time data
async function updateData() {
    try {
        const response = await fetch('/api/data/current');
        const data = await response.json();
        currentData = data;
        
        // Update electrical parameters
        updateParameter('voltage', data.voltage, 'V', 210, 230);
        updateParameter('current', data.current, 'A', 10, 100);
        updateParameter('power', data.powerOutput, 'kW');
        updateParameter('frequency', data.frequency, 'Hz', 49.5, 50.5);
        updateParameter('load', data.load, '%', 0, 100);
        
        // Update mechanical parameters
        updateParameter('rpm', data.turbineRPM, 'RPM', 500, 1800);
        updateParameter('flowRate', data.waterFlowRate, 'm³/s', 0.5, 10);
        updateParameter('waterHead', data.waterHead, 'm');
        updateParameter('temp', data.generatorTemp, '°C', 0, 80);
        
        // Update efficiency
        document.getElementById('efficiencyValue').textContent = `${data.efficiency}%`;
        document.getElementById('electricalPower').textContent = data.powerOutput;
        document.getElementById('hydraulicPower').textContent = data.hydraulicPower;
        updateEfficiencyGauge(data.efficiency);
        
        // Update status summary
        document.getElementById('efficiencyStatus').textContent = `${data.efficiency}%`;
        document.getElementById('powerStatus').textContent = `${data.powerOutput} kW`;
        
        // Update plant status
        const plantStatus = document.getElementById('plantStatus');
        if (data.efficiency >= 75) {
            plantStatus.textContent = 'OPTIMAL';
            plantStatus.style.color = 'var(--success)';
        } else if (data.efficiency >= 60) {
            plantStatus.textContent = 'OPERATIONAL';
            plantStatus.style.color = 'var(--warning)';
        } else {
            plantStatus.textContent = 'SUBOPTIMAL';
            plantStatus.style.color = 'var(--danger)';
        }
        
        // Update last update time
        document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
        
        // Check for alerts
        checkAlerts();
        
    } catch (error) {
        console.error('Failed to update data:', error);
    }
}

// Update individual parameter
function updateParameter(id, value, unit, min, max) {
    const element = document.getElementById(id);
    const statusElement = document.getElementById(`${id}-status`);
    
    if (element) {
        element.textContent = `${value} ${unit}`;
    }
    
    if (statusElement && min !== undefined && max !== undefined) {
        if (value >= min && value <= max) {
            statusElement.textContent = 'Normal';
            statusElement.className = 'param-status';
        } else if (value > max) {
            statusElement.textContent = 'High';
            statusElement.className = 'param-status danger';
        } else {
            statusElement.textContent = 'Low';
            statusElement.className = 'param-status warning';
        }
    }
}

// Create efficiency gauge
function createEfficiencyGauge() {
    const ctx = document.getElementById('efficiencyGauge').getContext('2d');
    
    charts.efficiencyGauge = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Efficiency', 'Loss'],
            datasets: [{
                data: [0, 100],
                backgroundColor: ['#00aa66', '#333'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '75%',
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            }
        }
    });
}

// Update efficiency gauge
function updateEfficiencyGauge(efficiency) {
    if (charts.efficiencyGauge) {
        charts.efficiencyGauge.data.datasets[0].data = [efficiency, 100 - efficiency];
        
        // Change color based on efficiency
        if (efficiency >= 75) {
            charts.efficiencyGauge.data.datasets[0].backgroundColor[0] = '#00ff88';
        } else if (efficiency >= 60) {
            charts.efficiencyGauge.data.datasets[0].backgroundColor[0] = '#ffd43b';
        } else {
            charts.efficiencyGauge.data.datasets[0].backgroundColor[0] = '#ff6b6b';
        }
        
        charts.efficiencyGauge.update('none');
    }
}

// Load historical data and create charts
async function loadHistoricalData() {
    try {
        const hours = document.getElementById('timeRange').value;
        const response = await fetch(`/api/data/history?hours=${hours}`);
        const data = await response.json();
        
        if (data.length === 0) {
            return;
        }
        
        // Reverse data to show oldest to newest
        data.reverse();
        
        const labels = data.map(d => new Date(d.timestamp).toLocaleTimeString());
        
        // Voltage Chart
        createOrUpdateChart('voltageChart', 'Voltage (V)', labels, 
            data.map(d => d.voltage), '#0066cc');
        
        // Power Chart
        createOrUpdateChart('powerChart', 'Power Output (kW)', labels,
            data.map(d => d.power_output), '#00aa66');
        
        // RPM Chart
        createOrUpdateChart('rpmChart', 'Turbine RPM', labels,
            data.map(d => d.turbine_rpm), '#4dabf7');
        
        // Efficiency Chart
        createOrUpdateChart('efficiencyChart', 'Efficiency (%)', labels,
            data.map(d => d.efficiency), '#00ff88');
        
    } catch (error) {
        console.error('Failed to load historical data:', error);
    }
}

// Create or update chart
function createOrUpdateChart(canvasId, label, labels, data, color) {
    const ctx = document.getElementById(canvasId);
    
    if (!ctx) return;
    
    if (charts[canvasId]) {
        charts[canvasId].data.labels = labels;
        charts[canvasId].data.datasets[0].data = data;
        charts[canvasId].update();
    } else {
        charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: data,
                    borderColor: color,
                    backgroundColor: color + '33',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        labels: { color: '#ffffff' }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#a0aec0' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    y: {
                        ticks: { color: '#a0aec0' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                }
            }
        });
    }
}

// Check and display alerts
async function checkAlerts() {
    try {
        const response = await fetch('/api/data/alerts');
        const alerts = await response.json();
        
        const alertCount = document.getElementById('alertCount');
        alertCount.textContent = alerts.length;
        
        if (alerts.length > 0) {
            alertCount.style.color = 'var(--danger)';
            
            // Show alert banner with most critical alert
            const banner = document.getElementById('alertBanner');
            const criticalAlert = alerts.find(a => a.severity === 'CRITICAL') || alerts[0];
            banner.innerHTML = `
                <strong>⚠️ ${criticalAlert.severity}:</strong> ${criticalAlert.message}
                <br><small>${new Date(criticalAlert.timestamp).toLocaleString()}</small>
            `;
            banner.style.display = 'block';
        } else {
            alertCount.style.color = 'var(--success)';
            document.getElementById('alertBanner').style.display = 'none';
        }
    } catch (error) {
        console.error('Failed to check alerts:', error);
    }
}

// Load alerts page
async function loadAlerts() {
    try {
        const response = await fetch('/api/data/alerts');
        const alerts = await response.json();
        
        const container = document.getElementById('alertsContainer');
        
        if (alerts.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    <h3>✅ No Active Alerts</h3>
                    <p>All systems operating normally</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = alerts.map(alert => `
            <div class="alert-item ${alert.severity.toLowerCase()}">
                <div class="alert-content">
                    <h4>${alert.alert_type.replace(/_/g, ' ')}</h4>
                    <p>${alert.message}</p>
                    <div class="alert-time">${new Date(alert.timestamp).toLocaleString()}</div>
                </div>
                <button class="btn-resolve" onclick="resolveAlert(${alert.id})">Resolve</button>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Failed to load alerts:', error);
    }
}

// Resolve alert
async function resolveAlert(alertId) {
    try {
        await fetch(`/api/data/alerts/${alertId}/resolve`, { method: 'POST' });
        loadAlerts();
        checkAlerts();
    } catch (error) {
        console.error('Failed to resolve alert:', error);
    }
}

// ==================== AI FUNCTIONS ====================

// Analyze efficiency
async function analyzeEfficiency(button) {
    if (!currentData) {
        alert('No current data available');
        return;
    }
    
    button.classList.add('loading');
    showAILoading('Analyzing efficiency with AI...', 'Using gemma2-9b-it model for quick insights');
    
    try {
        const response = await fetch('/api/ai/analyze-efficiency', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: currentData })
        });
        
        const result = await response.json();
        displayAIResult('Efficiency Analysis', result, 'efficiency');
        
    } catch (error) {
        console.error('AI analysis failed:', error);
        showAIError('Failed to analyze efficiency: ' + error.message);
    } finally {
        button.classList.remove('loading');
    }
}

// Get performance prediction
async function getPerformancePrediction(button) {
    button.classList.add('loading');
    showAILoading('Generating performance prediction with AI...', 'Using llama-3.3-70b-versatile for complex analysis');
    
    try {
        const response = await fetch('/api/ai/predict-performance');
        const result = await response.json();
        displayAIResult('Performance Prediction', result, 'prediction');
        
    } catch (error) {
        console.error('Prediction failed:', error);
        showAIError('Failed to generate prediction: ' + error.message);
    } finally {
        button.classList.remove('loading');
    }
}

// Detect anomalies
async function detectAnomalies(button) {
    if (!currentData) {
        alert('No current data available');
        return;
    }
    
    button.classList.add('loading');
    showAILoading('Detecting anomalies with AI...', 'Using llama-3.1-8b-instant for real-time detection');
    
    try {
        const response = await fetch('/api/ai/detect-anomaly', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: currentData })
        });
        
        const result = await response.json();
        displayAIResult('Anomaly Detection', result, 'anomaly');
        
    } catch (error) {
        console.error('Anomaly detection failed:', error);
        showAIError('Failed to detect anomalies: ' + error.message);
    } finally {
        button.classList.remove('loading');
    }
}

// Get comprehensive analysis
async function getComprehensiveAnalysis(button) {
    button.classList.add('loading');
    showAILoading('Generating comprehensive analysis with AI...', 'Using llama-3.3-70b-versatile for detailed insights');
    
    try {
        const response = await fetch('/api/ai/comprehensive-analysis');
        const result = await response.json();
        displayAIResult('Comprehensive Analysis', result, 'comprehensive');
        
    } catch (error) {
        console.error('Analysis failed:', error);
        showAIError('Failed to generate analysis: ' + error.message);
    } finally {
        button.classList.remove('loading');
    }
}

// Show AI loading animation
function showAILoading(message, subtext = '') {
    const container = document.getElementById('aiResultsContainer');
    container.innerHTML = `
        <div class="ai-loading">
            <div class="ai-loading-spinner"></div>
            <div class="ai-loading-text">${message}</div>
            <div class="ai-loading-subtext">${subtext}</div>
        </div>
    `;
}

// Show AI error
function showAIError(message) {
    const container = document.getElementById('aiResultsContainer');
    container.innerHTML = `
        <div class="ai-result-item" style="border-left-color: var(--danger); background: rgba(255, 107, 107, 0.1);">
            <h3 style="color: var(--danger);">❌ Error</h3>
            <p>${message}</p>
        </div>
    `;
}

// Display AI result with proper formatting
function displayAIResult(title, result, type) {
    const container = document.getElementById('aiResultsContainer');
    
    // Check for errors first
    if (result.error) {
        showAIError(result.error + (result.details ? '<br><small>' + result.details + '</small>' : ''));
        return;
    }
    
    let analysis = result.analysis;
    
    // If analysis is wrapped in a 'text' field, try to extract JSON from it
    if (analysis && typeof analysis === 'object' && analysis.text && typeof analysis.text === 'string') {
        try {
            // Try to parse the text as JSON
            const jsonMatch = analysis.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                analysis = JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            // If parsing fails, keep the original
            console.log('Could not parse nested JSON, using original');
        }
    }
    
    let formattedHTML = '';
    
    // Format based on type
    if (type === 'efficiency') {
        formattedHTML = formatEfficiencyAnalysis(analysis);
    } else if (type === 'prediction') {
        formattedHTML = formatPredictionAnalysis(analysis);
    } else if (type === 'anomaly') {
        formattedHTML = formatAnomalyAnalysis(analysis);
    } else if (type === 'comprehensive') {
        formattedHTML = formatComprehensiveAnalysis(analysis);
    } else {
        formattedHTML = formatGenericAnalysis(analysis);
    }
    
    container.innerHTML = `
        <div class="ai-result-item">
            <h3>🤖 ${title}</h3>
            <div class="meta-info">
                <span><strong>Model:</strong> ${result.model || 'Unknown'}</span>
                <span><strong>Timestamp:</strong> ${new Date(result.timestamp).toLocaleString()}</span>
                ${result.data_points_analyzed ? `<span><strong>Data Points:</strong> ${result.data_points_analyzed}</span>` : ''}
            </div>
            ${formattedHTML}
        </div>
    `;
}

// Format efficiency analysis
function formatEfficiencyAnalysis(data) {
    if (typeof data === 'string') {
        const formatted = data.replace(/\\n\\n/g, '</p><p>').replace(/\\n/g, '<br>');
        return `<p>${formatted}</p>`;
    }
    
    let html = '';
    
    if (data.efficiency_status) {
        const statusColor = data.efficiency_status === 'GOOD' ? 'var(--success)' : 
                           data.efficiency_status === 'ACCEPTABLE' ? 'var(--warning)' : 'var(--danger)';
        html += `<h4>⚡ Status: <span style="color: ${statusColor}">${data.efficiency_status}</span></h4>`;
    }
    
    if (data.factors) {
        const factorsText = typeof data.factors === 'string' ? 
            data.factors.replace(/\\n\\n/g, '</p><p>').replace(/\\n/g, '<br>') : data.factors;
        html += `<h4>📋 Factors Affecting Efficiency</h4><p>${factorsText}</p>`;
    }
    
    if (data.recommendations) {
        html += `<h4>💡 Recommendations</h4>`;
        if (Array.isArray(data.recommendations)) {
            html += `<ul>`;
            data.recommendations.forEach(rec => html += `<li>${rec}</li>`);
            html += `</ul>`;
        } else if (typeof data.recommendations === 'string') {
            const recText = data.recommendations.replace(/\\n/g, '<br>');
            html += `<p>${recText}</p>`;
        }
    }
    
    return html || `<div style="white-space: pre-wrap;">${JSON.stringify(data, null, 2)}</div>`;
}

// Format prediction analysis
function formatPredictionAnalysis(data) {
    if (typeof data === 'string') {
        // Convert escaped newlines to actual line breaks
        const formatted = data.replace(/\\n\\n/g, '</p><p>').replace(/\\n/g, '<br>');
        return `<p>${formatted}</p>`;
    }
    
    let html = '';
    
    if (data.prediction) {
        const predictionText = data.prediction.replace(/\\n\\n/g, '</p><p>').replace(/\\n/g, '<br>');
        html += `<h4>📊 24-Hour Prediction</h4><p>${predictionText}</p>`;
    }
    
    if (data.potential_issues) {
        html += `<h4>⚠️ Potential Issues</h4>`;
        if (Array.isArray(data.potential_issues)) {
            html += `<ul>`;
            data.potential_issues.forEach(issue => html += `<li>${issue}</li>`);
            html += `</ul>`;
        } else if (typeof data.potential_issues === 'string') {
            const issuesText = data.potential_issues.replace(/\\n/g, '<br>');
            html += `<p>${issuesText}</p>`;
        }
    }
    
    if (data.maintenance_recommendations) {
        html += `<h4>🔧 Maintenance Recommendations</h4>`;
        if (Array.isArray(data.maintenance_recommendations)) {
            html += `<ul>`;
            data.maintenance_recommendations.forEach(rec => html += `<li>${rec}</li>`);
            html += `</ul>`;
        } else if (typeof data.maintenance_recommendations === 'string') {
            const maintenanceText = data.maintenance_recommendations.replace(/\\n/g, '<br>');
            html += `<p>${maintenanceText}</p>`;
        }
    }
    
    if (data.optimization_tips) {
        html += `<h4>💡 Optimization Tips</h4>`;
        if (Array.isArray(data.optimization_tips)) {
            html += `<ul>`;
            data.optimization_tips.forEach(tip => html += `<li>${tip}</li>`);
            html += `</ul>`;
        } else if (typeof data.optimization_tips === 'string') {
            const tipsText = data.optimization_tips.replace(/\\n/g, '<br>');
            html += `<p>${tipsText}</p>`;
        }
    }
    
    return html || `<div style="white-space: pre-wrap;">${JSON.stringify(data, null, 2)}</div>`;
}

// Format anomaly analysis
function formatAnomalyAnalysis(data) {
    if (typeof data === 'string') {
        const formatted = data.replace(/\\n\\n/g, '</p><p>').replace(/\\n/g, '<br>');
        return `<p>${formatted}</p>`;
    }
    
    let html = '';
    
    if (data.has_anomaly !== undefined) {
        const statusIcon = data.has_anomaly ? '🚨' : '✅';
        const statusText = data.has_anomaly ? 'Anomalies Detected' : 'No Anomalies Detected';
        const statusColor = data.has_anomaly ? 'var(--danger)' : 'var(--success)';
        html += `<h4>${statusIcon} <span style="color: ${statusColor}">${statusText}</span></h4>`;
    }
    
    if (data.severity) {
        const severityColor = data.severity === 'CRITICAL' ? 'var(--danger)' : 
                             data.severity === 'HIGH' ? '#ff9800' : 
                             data.severity === 'MEDIUM' ? 'var(--warning)' : 'var(--primary-blue)';
        html += `<p><strong>⚠️ Severity Level:</strong> <span style="color: ${severityColor}; font-weight: bold;">${data.severity}</span></p>`;
    }
    
    if (data.anomalies) {
        html += `<h4>🔍 Detected Anomalies</h4>`;
        if (Array.isArray(data.anomalies) && data.anomalies.length > 0) {
            html += `<ul>`;
            data.anomalies.forEach(anomaly => html += `<li>${anomaly}</li>`);
            html += `</ul>`;
        } else if (typeof data.anomalies === 'string') {
            const anomaliesText = data.anomalies.replace(/\\n/g, '<br>');
            html += `<p>${anomaliesText}</p>`;
        }
    }
    
    if (data.recommended_action) {
        const actionText = typeof data.recommended_action === 'string' ? 
            data.recommended_action.replace(/\\n/g, '<br>') : data.recommended_action;
        html += `<h4>🎯 Recommended Action</h4><p>${actionText}</p>`;
    }
    
    return html || `<div style="white-space: pre-wrap;">${JSON.stringify(data, null, 2)}</div>`;
}

// Format comprehensive analysis
function formatComprehensiveAnalysis(data) {
    if (typeof data === 'string') {
        const formatted = data.replace(/\\n\\n/g, '</p><p>').replace(/\\n/g, '<br>');
        return `<p>${formatted}</p>`;
    }
    
    let html = '';
    
    if (data.overall_health) {
        const healthColor = data.overall_health === 'EXCELLENT' ? 'var(--success)' : 
                           data.overall_health === 'GOOD' ? 'var(--light-blue)' : 
                           data.overall_health === 'FAIR' ? 'var(--warning)' : 'var(--danger)';
        html += `<h4>🏥 Overall Plant Health: <span style="color: ${healthColor}; font-weight: bold; font-size: 1.2em;">${data.overall_health}</span></h4>`;
    }
    
    if (data.performance_insights) {
        html += `<h4>📊 Performance Insights</h4>`;
        if (Array.isArray(data.performance_insights)) {
            html += `<ul>`;
            data.performance_insights.forEach(insight => html += `<li>${insight}</li>`);
            html += `</ul>`;
        } else if (typeof data.performance_insights === 'string') {
            const insightsText = data.performance_insights.replace(/\\n/g, '<br>');
            html += `<p>${insightsText}</p>`;
        }
    }
    
    if (data.predicted_performance_trend) {
        const trendIcon = data.predicted_performance_trend === 'IMPROVING' ? '📈' : 
                         data.predicted_performance_trend === 'DECLINING' ? '📉' : '📊';
        html += `<h4>${trendIcon} Performance Trend: <span style="color: var(--primary-blue);">${data.predicted_performance_trend}</span></h4>`;
    }
    
    if (data.priority_maintenance_actions) {
        html += `<h4>🔧 Priority Maintenance Actions</h4>`;
        if (Array.isArray(data.priority_maintenance_actions)) {
            html += `<ul>`;
            data.priority_maintenance_actions.forEach(action => html += `<li>${action}</li>`);
            html += `</ul>`;
        } else if (typeof data.priority_maintenance_actions === 'string') {
            const actionsText = data.priority_maintenance_actions.replace(/\\n/g, '<br>');
            html += `<p>${actionsText}</p>`;
        }
    }
    
    if (data.energy_production_forecast) {
        const forecastText = typeof data.energy_production_forecast === 'string' ? 
            data.energy_production_forecast.replace(/\\n/g, '<br>') : data.energy_production_forecast;
        html += `<h4>⚡ Energy Production Forecast (7 Days)</h4><p>${forecastText}</p>`;
    }
    
    return html || `<div style="white-space: pre-wrap;">${JSON.stringify(data, null, 2)}</div>`;
}

// Format generic analysis (fallback)
function formatGenericAnalysis(data) {
    if (typeof data === 'string') return `<p>${data}</p>`;
    
    if (typeof data === 'object') {
        let html = '';
        for (const [key, value] of Object.entries(data)) {
            const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            html += `<h4>${formattedKey}</h4>`;
            
            if (Array.isArray(value)) {
                html += `<ul>`;
                value.forEach(item => html += `<li>${item}</li>`);
                html += `</ul>`;
            } else if (typeof value === 'object') {
                html += `<p>${JSON.stringify(value, null, 2)}</p>`;
            } else {
                html += `<p>${value}</p>`;
            }
        }
        return html;
    }
    
    return `<p>${String(data)}</p>`;
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
});
