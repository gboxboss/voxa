// frontend/main.js

/**
 * Global Variables
 */
let agents = [];
let agentOffset = 0;
const agentLimit = 120;
let sortOrder = 'desc'; // Added for sorting

// UI Elements
const createAgentBtn = document.getElementById('create-agent-btn');
const createAgentModal = document.getElementById('create-agent-modal');
const closeCreateModalBtn = document.getElementById('close-create-modal');
const createAgentSubmitBtn = document.getElementById('create-agent-submit-btn');
const agentListDiv = document.getElementById('agent-list');
const noAgentsDiv = document.getElementById('no-agents');
const loadMoreBtn = document.getElementById('load-more-btn');
const notification = document.getElementById('notification');

// After Creation Modal Elements
const afterCreateModal = document.getElementById('after-create-modal');
const closeAfterCreateModalBtn = document.getElementById('close-after-create-modal');
const createdAgentNameSpan = document.getElementById('created-agent-name');
const agentUrlDiv = document.getElementById('agent-url');
const copyAgentUrlBtn = document.getElementById('copy-agent-url-btn');
const goToAgentBtn = document.getElementById('go-to-agent-btn');

// Agent Creation Form Elements
const agentNameInput = document.getElementById('agent-name');
const agentDescriptionInput = document.getElementById('agent-description');
const voiceSelect = document.getElementById('voice-select');
const systemPromptTextarea = document.getElementById('system-prompt');

// Sorting Control Element
const sortOrderBtn = document.getElementById('sort-order-btn');

/**
 * Initialization
 */
document.addEventListener('DOMContentLoaded', () => {
  loadAgents();
});

/**
 * Event Listeners
 */

// Show Create Agent Modal
createAgentBtn.addEventListener('click', () => {
  createAgentModal.classList.add('active');
});

// Close Create Agent Modal
closeCreateModalBtn.addEventListener('click', () => {
  createAgentModal.classList.remove('active');
});

// Create Agent Submit
createAgentSubmitBtn.addEventListener('click', handleCreateAgent);

// Load More Agents
loadMoreBtn.addEventListener('click', () => {
  agentOffset += agentLimit;
  loadAgents();
});

// Close After Creation Modal
closeAfterCreateModalBtn.addEventListener('click', () => {
  afterCreateModal.classList.remove('active');
});

// Sort Order Toggle
if (sortOrderBtn) {
  sortOrderBtn.addEventListener('click', () => {
    // Toggle sortOrder
    sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    // Update sortOrderBtn icon
    sortOrderBtn.textContent = sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward';
    // Reset agents and load from start
    agents = [];
    agentOffset = 0;
    agentListDiv.innerHTML = '';
    loadAgents();
  });
}

/**
 * Functions
 */

// Load Agents from Backend
async function loadAgents() {
  try {
    const response = await fetch(`https://gboxboss.github.io/voxa/backend/api/agents?limit=${agentLimit}&offset=${agentOffset}`);
    const result = await response.json();
    if (response.ok) {
      if (agentOffset === 0) {
        agentListDiv.innerHTML = ''; // Clear existing agents on initial load
      }
      if (result.agents.length === 0 && agentOffset === 0) {
        noAgentsDiv.style.display = 'block';
        agentListDiv.style.display = 'none';
        loadMoreBtn.style.display = 'none';
      } else {
        noAgentsDiv.style.display = 'none';
        agentListDiv.style.display = 'grid';
        
        // **Debugging: Log received agents**
        console.log(`Received ${result.agents.length} agents:`);
        result.agents.forEach(agent => {
          console.log(`Agent: ${agent.name}, Created At: ${agent.created_at}`);
        });

        // Sort agents based on sortOrder
        const sortedAgents = result.agents.sort((a, b) => {
          if (sortOrder === 'asc') {
            return new Date(a.created_at) - new Date(b.created_at);
          } else {
            return new Date(b.created_at) - new Date(a.created_at);
          }
        });

        displayAgents(sortedAgents);
        if (result.agents.length === agentLimit) {
          loadMoreBtn.style.display = 'block';
        } else {
          loadMoreBtn.style.display = 'none';
        }
      }
    } else {
      showNotification(`Error fetching agents: ${result.message}`, 'error');
    }
  } catch (error) {
    showNotification(`Error fetching agents: ${error.message}`, 'error');
  }
}

// Display Agents in the UI
function displayAgents(agentArray) {
  agentArray.forEach((agent) => {
    const agentCard = document.createElement('div');
    agentCard.className = 'agent-card';

    // Random Background Color for Avatar
    const colors = ['#6366f1', '#4f46e5', '#7c3aed', '#cb32e5', '#e75480', '#da4167', '#f5a623', '#00afa0'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    // Agent Avatar
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'avatar';
    avatarDiv.style.background = randomColor;
    const avatarIcon = document.createElement('span');
    avatarIcon.className = 'material-icons-round';
    avatarIcon.textContent = 'support_agent';
    avatarDiv.appendChild(avatarIcon);

    // Agent Name
    const nameDiv = document.createElement('div');
    nameDiv.className = 'name';
    nameDiv.textContent = agent.name;

    // Agent Description
    const descriptionDiv = document.createElement('div');
    descriptionDiv.className = 'description';
    descriptionDiv.textContent = agent.description || 'No description provided.';

    agentCard.appendChild(avatarDiv);
    agentCard.appendChild(nameDiv);
    agentCard.appendChild(descriptionDiv);

    agentCard.addEventListener('click', () => {
      // Navigate to agent's page with referrer
      window.location.href = `/agent?ref=${agent.name}`;
    });

    agentListDiv.appendChild(agentCard);
  });
}

// Handle Create Agent
async function handleCreateAgent() {
  const name = agentNameInput.value.trim();
  const description = agentDescriptionInput.value.trim();
  const voice = voiceSelect.value;
  const systemPrompt = systemPromptTextarea.value.trim();

  // Validate Agent Name (no spaces or special characters)
  const nameValid = /^[a-zA-Z0-9_-]+$/.test(name);
  if (!nameValid) {
    showNotification('Agent name contains invalid characters or spaces. Please use only letters, numbers, underscores, or hyphens.', 'error');
    return;
  }

  if (!name || !description || !voice || !systemPrompt) {
    showNotification('Please fill in all required fields.', 'error');
    return;
  }

  // Send POST request to create agent
  try {
    const agentData = {
      name,
      description, // Changed from short_description to description
      system_prompt: systemPrompt,
      voice_name: voice,
      icon: '', // Add a default icon or allow user to specify
    };

    const response = await fetch('https://gboxboss.github.io/voxa/backend/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agentData),
    });

    const result = await response.json();

    if (response.status === 201) {
      showNotification('AI Agent created successfully!', 'success');
      // Close Create Agent Modal
      createAgentModal.classList.remove('active');
      // Show After Creation Modal
      displayAfterCreationModal(result.agent);
      // Reset the form
      agentNameInput.value = '';
      agentDescriptionInput.value = '';
      voiceSelect.value = '';
      systemPromptTextarea.value = '';
      // Reload agents
      agentOffset = 0;
      agents = [];
      loadAgents();
    } else {
      showNotification(result.message || 'An error occurred.', 'error');
    }
  } catch (error) {
    showNotification(`Error creating agent: ${error.message}`, 'error');
  }
}

// Show After Creation Modal
function displayAfterCreationModal(agent) {
  createdAgentNameSpan.textContent = agent.name;
  const agentUrl = `${window.location.origin}/agent?ref=${agent.name}`;
  agentUrlDiv.textContent = agentUrl;

  // Copy Agent URL
  copyAgentUrlBtn.onclick = () => {
    navigator.clipboard.writeText(agentUrl).then(() => {
      showNotification('Agent URL copied to clipboard!', 'success');
    }).catch((err) => {
      showNotification('Failed to copy URL.', 'error');
    });
  };

  // Go to Agent
  goToAgentBtn.onclick = () => {
    window.location.href = `/agent?ref=${agent.name}`;
  };

  afterCreateModal.classList.add('active');
}

// Show Notification
function showNotification(message, type) {
  if (!notification) return;
  notification.textContent = message;
  notification.style.display = 'block';
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.padding = '15px 20px';
  notification.style.backgroundColor = type === 'success' ? '#4caf50' : '#f44336';
  notification.style.color = '#fff';
  notification.style.borderRadius = '5px';
  notification.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
  notification.style.zIndex = '1000';

  setTimeout(() => {
    notification.style.display = 'none';
  }, 5000);
}
