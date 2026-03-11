// Configuration Page JavaScript

let currentConfigId = null;
let configurations = [];

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
    loadConfigurations();
    loadSimulationStatus();
    loadTemplate('moolia'); // Load default template
    
    // Poll for simulation status every 5 seconds
    setInterval(loadSimulationStatus, 5000);
});

// ==================== SIMULATION CONTROL ====================

async function loadSimulationStatus() {
    try {
        const response = await fetch('/api/config/simulation/status');
        const result = await response.json();
        
        if (result.success) {
            const { isRunning, interval, variationPercentage, activeConfigId } = result.data;
            
            updateSimulationUI(isRunning, activeConfigId);
            document.getElementById('simInterval').value = interval;
            document.getElementById('simVariation').value = variationPercentage;
        }
    } catch (error) {
        console.error('Failed to load simulation status:', error);
    }
}

function updateSimulationUI(isRunning, activeConfigId) {
    const statusBadge = document.getElementById('simStatusBadge');
    const statusText = document.getElementById('simStatusText');
    const startBtn = document.getElementById('startSimBtn');
    const stopBtn = document.getElementById('stopSimBtn');
    const statusDot = statusBadge.querySelector('.status-dot');
    
    if (isRunning) {
        statusDot.classList.remove('stopped');
        statusDot.classList.add('running');
        statusText.textContent = 'Running';
        startBtn.disabled = true;
        stopBtn.disabled = false;
    } else {
        statusDot.classList.remove('running');
        statusDot.classList.add('stopped');
        statusText.textContent = 'Stopped';
        startBtn.disabled = false;
        stopBtn.disabled = true;
    }
}

async function startSimulation() {
    const configId = document.getElementById('activeConfig').value;
    
    if (!configId) {
        showToast('Please select a configuration first', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/config/simulation/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ configId: parseInt(configId) })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Simulation started successfully', 'success');
            loadSimulationStatus();
        } else {
            showToast(result.error || 'Failed to start simulation', 'error');
        }
    } catch (error) {
        showToast('Error starting simulation', 'error');
        console.error(error);
    }
}

async function stopSimulation() {
    try {
        const response = await fetch('/api/config/simulation/stop', {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Simulation stopped', 'info');
            loadSimulationStatus();
        }
    } catch (error) {
        showToast('Error stopping simulation', 'error');
        console.error(error);
    }
}

async function updateSettings() {
    const interval = parseInt(document.getElementById('simInterval').value);
    const variation = parseFloat(document.getElementById('simVariation').value);
    
    try {
        const response = await fetch('/api/config/simulation/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                interval, 
                variationPercentage: variation 
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Settings updated successfully', 'success');
        } else {
            showToast(result.error || 'Failed to update settings', 'error');
        }
    } catch (error) {
        showToast('Error updating settings', 'error');
        console.error(error);
    }
}

// ==================== CONFIGURATION MANAGEMENT ====================

async function loadConfigurations() {
    try {
        const response = await fetch('/api/config/configurations');
        const result = await response.json();
        
        if (result.success) {
            configurations = result.data;
            renderConfigurationList();
            updateConfigSelect();
        }
    } catch (error) {
        console.error('Failed to load configurations:', error);
        document.getElementById('configList').innerHTML = 
            '<div class="loading">Failed to load configurations</div>';
    }
}

function renderConfigurationList() {
    const container = document.getElementById('configList');
    
    if (configurations.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📝</div>
                <h3 style="color: #4dabf7; margin-bottom: 1rem;">No Configurations Yet</h3>
                <p style="color: #a0aec0; margin-bottom: 1.5rem;">Create your first plant configuration to get started!</p>
                <button class="btn btn-success" onclick="quickCreateMooliaPlant()" style="margin-right: 0.5rem;">
                    <i class="fas fa-rocket"></i> Quick Create Moolia Plant
                </button>
                <button class="btn btn-primary" onclick="scrollToEditor()">
                    <i class="fas fa-plus"></i> Create Custom Configuration
                </button>
                <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(77, 171, 247, 0.1); border-radius: 8px; border-left: 4px solid #4dabf7;">
                    <p style="font-size: 0.9rem; color: #cbd5e0;">
                        <strong>💡 Tip:</strong> Use "Quick Create" to instantly create and start the Moolia Plant configuration (410V, 166A, 0.83 PF),
                        or scroll down to create a custom configuration with your own sensor fields.
                    </p>
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = configurations.map(config => `
        <div class="config-item ${config.is_active ? 'active' : ''}">
            <div class="config-info">
                <div class="config-name">
                    ${config.config_name}
                    ${config.is_active ? '<span style="color: #48bb78;">● Active</span>' : ''}
                </div>
                <div class="config-meta">
                    <span><i class="fas fa-calendar"></i> ${new Date(config.created_at).toLocaleDateString()}</span>
                    <span><i class="fas fa-clock"></i> ${new Date(config.updated_at).toLocaleTimeString()}</span>
                </div>
            </div>
            <div class="config-actions">
                <button class="icon-btn edit" onclick="editConfiguration(${config.id})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                ${!config.is_active ? `
                    <button class="icon-btn activate" onclick="activateConfiguration(${config.id})" title="Set Active">
                        <i class="fas fa-check"></i>
                    </button>
                ` : ''}
                <button class="icon-btn delete" onclick="deleteConfiguration(${config.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function updateConfigSelect() {
    const select = document.getElementById('activeConfig');
    
    if (configurations.length === 0) {
        select.innerHTML = '<option value="">⚠️ No configurations - Create one below first!</option>';
    } else {
        select.innerHTML = '<option value="">Select a configuration...</option>' +
            configurations.map(config => 
                `<option value="${config.id}">${config.config_name}</option>`
            ).join('');
    }
}

async function editConfiguration(id) {
    try {
        const response = await fetch(`/api/config/configurations/${id}`);
        const result = await response.json();
        
        if (result.success) {
            currentConfigId = id;
            const config = result.data;
            
            document.getElementById('configName').value = config.config_name;
            
            // Load fields
            const container = document.getElementById('fieldsContainer');
            container.innerHTML = '';
            
            config.fields.forEach(field => {
                addField(field.field_name, field.field_value, field.field_type);
            });
            
            // Scroll to editor
            document.querySelector('.editor-section').scrollIntoView({ behavior: 'smooth' });
            showToast('Configuration loaded for editing', 'info');
        }
    } catch (error) {
        showToast('Error loading configuration', 'error');
        console.error(error);
    }
}

async function deleteConfiguration(id) {
    if (!confirm('Are you sure you want to delete this configuration?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/config/configurations/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Configuration deleted', 'success');
            loadConfigurations();
        } else {
            showToast(result.error || 'Failed to delete configuration', 'error');
        }
    } catch (error) {
        showToast('Error deleting configuration', 'error');
        console.error(error);
    }
}

async function activateConfiguration(id) {
    try {
        const response = await fetch(`/api/config/configurations/${id}/activate`, {
            method: 'PUT'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Configuration activated', 'success');
            loadConfigurations();
        } else {
            showToast(result.error || 'Failed to activate configuration', 'error');
        }
    } catch (error) {
        showToast('Error activating configuration', 'error');
        console.error(error);
    }
}

async function saveConfiguration() {
    const configName = document.getElementById('configName').value.trim();
    
    if (!configName) {
        showToast('Please enter a configuration name', 'error');
        return;
    }
    
    const fields = collectFields();
    
    if (fields.length === 0) {
        showToast('Please add at least one field', 'error');
        return;
    }
    
    try {
        const url = currentConfigId 
            ? `/api/config/configurations/${currentConfigId}`
            : '/api/config/configurations';
        
        const method = currentConfigId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ configName, fields })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(
                currentConfigId ? 'Configuration updated' : 'Configuration created', 
                'success'
            );
            loadConfigurations();
            resetEditor();
        } else {
            showToast(result.error || 'Failed to save configuration', 'error');
        }
    } catch (error) {
        showToast('Error saving configuration', 'error');
        console.error(error);
    }
}

async function saveAndStart() {
    await saveConfiguration();
    
    setTimeout(async () => {
        await loadConfigurations();
        
        const lastConfig = configurations[0];
        if (lastConfig) {
            document.getElementById('activeConfig').value = lastConfig.id;
            await startSimulation();
        }
    }, 1000);
}

function resetEditor() {
    currentConfigId = null;
    document.getElementById('configName').value = '';
    clearFields();
    loadTemplate('moolia');
}

// ==================== FIELD MANAGEMENT ====================

function addField(name = '', value = '', type = 'number') {
    const container = document.getElementById('fieldsContainer');
    const fieldId = Date.now();
    
    const fieldRow = document.createElement('div');
    fieldRow.className = 'field-row';
    fieldRow.dataset.fieldId = fieldId;
    
    fieldRow.innerHTML = `
        <div class="field-group">
            <label>Field Name</label>
            <input type="text" class="field-input field-name" 
                   placeholder="e.g., voltage" value="${name}">
        </div>
        <div class="field-group">
            <label>Value</label>
            <input type="text" class="field-input field-value" 
                   placeholder="e.g., 410" value="${value}">
        </div>
        <div class="field-group">
            <label>Type</label>
            <select class="field-input field-type">
                <option value="number" ${type === 'number' ? 'selected' : ''}>Number</option>
                <option value="text" ${type === 'text' ? 'selected' : ''}>Text</option>
            </select>
        </div>
        <button class="remove-field-btn" onclick="removeField(${fieldId})" title="Remove">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(fieldRow);
}

function removeField(fieldId) {
    const fieldRow = document.querySelector(`[data-field-id="${fieldId}"]`);
    if (fieldRow) {
        fieldRow.remove();
    }
}

function collectFields() {
    const fields = [];
    const fieldRows = document.querySelectorAll('.field-row');
    
    fieldRows.forEach(row => {
        const name = row.querySelector('.field-name').value.trim();
        const value = row.querySelector('.field-value').value.trim();
        const type = row.querySelector('.field-type').value;
        
        if (name && value) {
            fields.push({ name, value, type });
        }
    });
    
    return fields;
}

function clearFields() {
    document.getElementById('fieldsContainer').innerHTML = '';
}

// ==================== TEMPLATES ====================

function loadTemplate(templateName) {
    clearFields();
    
    const templates = {
        basic: [
            { name: 'voltage', value: '220', type: 'number' },
            { name: 'current', value: '50', type: 'number' },
            { name: 'frequency', value: '50', type: 'number' },
            { name: 'powerFactor', value: '0.85', type: 'number' }
        ],
        hydro: [
            { name: 'voltage', value: '220', type: 'number' },
            { name: 'current', value: '100', type: 'number' },
            { name: 'powerFactor', value: '0.85', type: 'number' },
            { name: 'frequency', value: '50', type: 'number' },
            { name: 'turbineRPM', value: '1500', type: 'number' },
            { name: 'waterFlowRate', value: '1.5', type: 'number' },
            { name: 'waterHead', value: '50', type: 'number' },
            { name: 'generatorTemp', value: '55', type: 'number' },
            { name: 'phases', value: '3', type: 'number' }
        ],
        moolia: [
            { name: 'voltage', value: '410', type: 'number' },
            { name: 'current', value: '166', type: 'number' },
            { name: 'powerFactor', value: '0.83', type: 'number' },
            { name: 'frequency', value: '50', type: 'number' },
            { name: 'turbineRPM', value: '775', type: 'number' },
            { name: 'waterFlowRate', value: '0.51', type: 'number' },
            { name: 'waterHead', value: '110', type: 'number' },
            { name: 'generatorTemp', value: '62', type: 'number' },
            { name: 'phases', value: '3', type: 'number' },
            { name: 'turbineType', value: 'Cross Flow Water Turbine', type: 'text' },
            { name: 'ratedPower', value: '100', type: 'number' }
        ]
    };
    
    const template = templates[templateName];
    
    if (template) {
        template.forEach(field => {
            addField(field.name, field.value, field.type);
        });
        
        showToast(`${templateName.charAt(0).toUpperCase() + templateName.slice(1)} template loaded`, 'info');
    }
}

// ==================== UTILITIES ====================

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function showNewConfigModal() {
    resetEditor();
    document.querySelector('.editor-section').scrollIntoView({ behavior: 'smooth' });
}

async function quickCreateMooliaPlant() {
    // Set configuration name
    document.getElementById('configName').value = 'Moolia Plant Configuration';
    
    // Load Moolia template
    loadTemplate('moolia');
    
    // Show loading message
    showToast('Creating Moolia Plant configuration...', 'info');
    
    // Wait a bit for template to load
    setTimeout(async () => {
        // Save and start
        await saveConfiguration();
        
        // After save, wait for configs to reload
        setTimeout(async () => {
            await loadConfigurations();
            
            // Select the newly created config and start
            if (configurations.length > 0) {
                const newConfig = configurations[0];
                document.getElementById('activeConfig').value = newConfig.id;
                await startSimulation();
                showToast('✅ Moolia Plant ready! Check Dashboard for live data', 'success');
            }
        }, 1000);
    }, 500);
}

function scrollToEditor() {
    document.querySelector('.editor-section').scrollIntoView({ behavior: 'smooth' });
    showToast('Create your custom configuration below', 'info');
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        fetch('/api/auth/logout', { method: 'POST' })
            .then(() => {
                window.location.href = '/login.html';
            });
    }
}
