import { invoke } from '@tauri-apps/api/tauri'

// State management
let currentGroup = null;
let groups = {};  // Changed to object to store group options
let isSpinning = false;
let spinInterval = null;
let currentRotation = 0;
let currentWinner = null;

// DOM Elements
const app = document.getElementById('app');

// Initialize the UI
function initializeUI() {
    app.innerHTML = `
        <div class="container">
            <div class="nav">
                <button onclick="window.handlePageChange('lottery')">抽奖页面</button>
                <button onclick="window.handlePageChange('manage')">管理页面</button>
            </div>
            <div id="lottery" class="page active">
                <div class="group-select-container">
                    <select id="group-select">
                        <option value="">选择抽奖组</option>
                    </select>
                </div>
                <div class="lottery-container">
                    <div id="lottery-circle">
                        <div class="lights"></div>
                        <div id="options-container"></div>
                        <button class="center-button">开始抽奖</button>
                    </div>
                </div>
            </div>
            <div id="manage" class="page">
                <div class="group-container">
                    <h3>抽奖组管理</h3>
                    <div id="group-list"></div>
                    <div style="margin-top: 10px;">
                        <input type="text" id="group-name" placeholder="组名称" class="option-input">
                        <button onclick="window.handleAddGroup()">添加组</button>
                    </div>
                </div>
                <div class="option-group">
                    <h3>选项列表</h3>
                    <div id="options-list"></div>
                    <div style="margin-top: 10px;">
                        <input type="text" id="new-option" placeholder="新选项" class="option-input">
                        <button onclick="window.handleAddOption()">添加选项</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-overlay"></div>
        <div class="winner-modal">
            <h2>🎉 恭喜获奖 🎉</h2>
            <div class="winner-name"></div>
            <button onclick="closeWinnerModal()">确定</button>
        </div>
    `;

    // Add decorative lights
    const lights = document.querySelector('.lights');
    for (let i = 0; i < 20; i++) {
        const light = document.createElement('div');
        light.className = 'light';
        light.style.transform = `rotate(${i * 18}deg) translate(265px)`;
        lights.appendChild(light);
    }

    // Setup event listeners
    setupEventListeners();
    loadOptions();
}

function setupEventListeners() {
    const groupSelect = document.getElementById('group-select');
    const centerButton = document.querySelector('.center-button');

    groupSelect.addEventListener('change', (e) => {
        currentGroup = e.target.value;
        updateLotteryOptions();
    });

    centerButton.addEventListener('click', () => {
        if (!currentGroup || !groups[currentGroup] || groups[currentGroup].length === 0) {
            alert('请先选择抽奖组并确保有可用选项！');
            return;
        }
        if (isSpinning) {
            stopSpinning();
        } else {
            startSpinning();
        }
    });
}

// Load saved options
async function loadOptions() {
    try {
        const savedOptions = await invoke('get_options');
        if (savedOptions && savedOptions.groups) {
            groups = JSON.parse(JSON.stringify(savedOptions.groups));
        } else {
            groups = {}; // Initialize as empty object if no saved data
        }
        updateUI();
    } catch (error) {
        console.error('Error loading options:', error);
        groups = {}; // Initialize as empty object on error
        updateUI();
    }
}

// Save options
async function saveOptions() {
    try {
        await invoke('save_options', {
            options: {
                groups: groups
            }
        });
    } catch (error) {
        console.error('Error saving options:', error);
    }
}

// UI update functions
function updateUI() {
    updateGroupSelect();
    updateGroupList();
    updateOptionsList();
    updateLotteryOptions();
}

function updateGroupSelect() {
    const select = document.getElementById('group-select');
    select.innerHTML = '<option value="">选择抽奖组</option>';
    Object.keys(groups).forEach(group => {
        const option = document.createElement('option');
        option.value = group;
        option.textContent = group;
        select.appendChild(option);
    });
}

function updateGroupList() {
    const groupList = document.getElementById('group-list');
    groupList.innerHTML = '';
    Object.keys(groups).forEach(group => {
        const div = document.createElement('div');
        div.className = 'group-item' + (group === currentGroup ? ' active' : '');
        div.textContent = group;
        
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '删除';
        deleteButton.onclick = () => handleDeleteGroup(group);
        
        const selectButton = document.createElement('button');
        selectButton.textContent = '选择';
        selectButton.onclick = () => handleSelectGroup(group);
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';
        buttonContainer.appendChild(selectButton);
        buttonContainer.appendChild(deleteButton);
        
        div.appendChild(buttonContainer);
        groupList.appendChild(div);
    });
}

function updateOptionsList() {
    const optionsList = document.getElementById('options-list');
    optionsList.innerHTML = '';
    
    if (!currentGroup) {
        optionsList.innerHTML = '<div class="no-group">请先选择一个抽奖组</div>';
        return;
    }

    const options = groups[currentGroup] || [];
    options.forEach((option, index) => {
        const div = document.createElement('div');
        div.className = 'option-item-list';
        div.textContent = option;
        
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '删除';
        deleteButton.onclick = () => handleDeleteOption(index);
        
        div.appendChild(deleteButton);
        optionsList.appendChild(div);
    });
}

function updateLotteryOptions() {
    const container = document.getElementById('options-container');
    container.innerHTML = '';
    if (!currentGroup || !groups[currentGroup] || groups[currentGroup].length === 0) return;

    const options = groups[currentGroup];
    const angleStep = 360 / options.length;
    
    // Define vibrant colors for sectors
    const colors = [
        '#FF6B6B', // Red
        '#4ECDC4', // Turquoise
        '#45B7D1', // Blue
        '#96CEB4', // Mint
        '#FFEEAD', // Yellow
        '#D4A5A5', // Pink
        '#9B59B6', // Purple
        '#3498DB', // Blue
        '#E67E22', // Orange
        '#2ECC71', // Green
    ];
    
    options.forEach((option, index) => {
        const item = document.createElement('div');
        item.className = 'option-item';
        const sectorRotation = index * angleStep;
        item.style.transform = `rotate(${sectorRotation}deg)`;
        
        // Apply color with gradient
        const colorIndex = index % colors.length;
        const color = colors[colorIndex];
        item.style.background = `linear-gradient(90deg, ${color}99, ${color}66)`;
        
        const span = document.createElement('span');
        span.textContent = option;
        span.style.transform = `rotate(${-sectorRotation}deg)`;
        
        item.appendChild(span);
        container.appendChild(item);
    });
}

function startSpinning() {
    if (isSpinning) return;
    
    isSpinning = true;
    const centerButton = document.querySelector('.center-button');
    centerButton.textContent = '停止';
    
    const totalRotations = 8; // Increased rotations for more dramatic effect
    const duration = 5000;
    const startRotation = currentRotation;
    const targetRotation = startRotation + (360 * totalRotations) + Math.random() * 360;
    
    const startTime = performance.now();
    
    function spin(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Using a custom easing function for more realistic spinning
        const easeOut = t => {
            const c4 = (2 * Math.PI) / 3;
            return t === 1 ? 1 : 1 - Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4);
        };
        
        currentRotation = startRotation + (targetRotation - startRotation) * easeOut(progress);
        document.getElementById('options-container').style.transform = `rotate(${currentRotation}deg)`;
        
        if (progress < 1) {
            spinInterval = requestAnimationFrame(spin);
        } else {
            stopSpinning();
        }
    }
    
    spinInterval = requestAnimationFrame(spin);
}

function stopSpinning() {
    if (!isSpinning) return;
    
    isSpinning = false;
    const centerButton = document.querySelector('.center-button');
    centerButton.textContent = '开始抽奖';
    
    if (spinInterval) {
        cancelAnimationFrame(spinInterval);
        spinInterval = null;
    }
    
    const options = groups[currentGroup];
    const normalizedRotation = ((currentRotation % 360) + 360) % 360;
    const winnerIndex = Math.floor((360 - normalizedRotation) / (360 / options.length));
    currentWinner = options[winnerIndex];
    
    // Remove previous winner class
    document.querySelectorAll('.option-item').forEach(item => {
        item.classList.remove('winner');
    });
    
    // Add winner class to the winning option
    const optionItems = document.querySelectorAll('.option-item');
    optionItems[winnerIndex].classList.add('winner');
    
    // Show winner modal
    showWinnerModal(currentWinner);
}

function showWinnerModal(winner) {
    const modal = document.querySelector('.winner-modal');
    const overlay = document.querySelector('.modal-overlay');
    const winnerName = modal.querySelector('.winner-name');
    
    winnerName.textContent = winner;
    
    modal.classList.add('show');
    overlay.classList.add('show');
}

window.closeWinnerModal = function() {
    const modal = document.querySelector('.winner-modal');
    const overlay = document.querySelector('.modal-overlay');
    
    modal.classList.remove('show');
    overlay.classList.remove('show');
};

// Global event handlers
window.handlePageChange = function(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
};

window.handleAddGroup = function() {
    const input = document.getElementById('group-name');
    const groupName = input.value.trim();
    if (groupName) {
        if (!groups[groupName]) {
            groups[groupName] = [];
            input.value = '';
            currentGroup = groupName; // Automatically select the new group
            updateUI();
            saveOptions();
        } else {
            alert('该组名已存在！');
        }
    }
};

window.handleSelectGroup = function(groupName) {
    currentGroup = groupName;
    updateUI();
};

window.handleDeleteGroup = function(groupName) {
    if (confirm(`确定要删除抽奖组 "${groupName}" 吗？`)) {
        delete groups[groupName];
        if (currentGroup === groupName) {
            currentGroup = null;
        }
        updateUI();
        saveOptions();
    }
};

window.handleAddOption = function() {
    if (!currentGroup) {
        alert('请先选择一个抽奖组！');
        return;
    }
    
    const input = document.getElementById('new-option');
    const optionText = input.value.trim();
    if (optionText) {
        if (!Array.isArray(groups[currentGroup])) {
            groups[currentGroup] = []; // Initialize as array if not already
        }
        if (!groups[currentGroup].includes(optionText)) {
            groups[currentGroup].push(optionText);
            input.value = '';
            updateUI();
            saveOptions();
        } else {
            alert('该选项已存在！');
        }
    }
};

window.handleDeleteOption = function(index) {
    if (currentGroup && groups[currentGroup]) {
        groups[currentGroup].splice(index, 1);
        updateUI();
        saveOptions();
    }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    initializeUI();
    await loadOptions(); // Make sure to wait for options to load
}); 