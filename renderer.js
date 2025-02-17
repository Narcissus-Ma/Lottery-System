const { ipcRenderer } = require('electron');

let currentOptions = [];
let currentGroupName = '';
let isSpinning = false;
let currentActiveIndex = -1;
let rotationAngle = 0;

// 页面切换
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

// 创建装饰灯
function createLights() {
    const lights = document.querySelector('.lights');
    const totalLights = 24;
    for (let i = 0; i < totalLights; i++) {
        const light = document.createElement('div');
        light.className = 'light';
        const angle = (i / totalLights) * 2 * Math.PI;
        const radius = 265;
        const x = radius * Math.cos(angle) + 265;
        const y = radius * Math.sin(angle) + 265;
        light.style.left = `${x}px`;
        light.style.top = `${y}px`;
        light.style.animationDelay = `${i * 0.1}s`;
        lights.appendChild(light);
    }
}

// 获取所有组
function getGroups(callback) {
    ipcRenderer.send('get-options');
    ipcRenderer.once('get-options-reply', (event, groups) => {
        callback(groups || {});
    });
}

// 保存组数据
function saveGroups(groups) {
    ipcRenderer.send('save-options', groups);
}

// 渲染抽奖圆盘
function renderLotteryCircle(options) {
    const container = document.getElementById('lottery-circle');
    const existingItems = container.querySelectorAll('.option-item');
    existingItems.forEach(item => item.remove());
    
    const totalOptions = options.length;
    const angleStep = 360 / totalOptions;
    const colors = ['#FF4136', '#FF851B', '#FFDC00', '#2ECC40', '#0074D9', '#B10DC9'];
    
    options.forEach((option, index) => {
        const slice = document.createElement('div');
        slice.className = 'option-item';
        slice.dataset.index = index;
        
        // 计算旋转角度
        const angle = index * angleStep;
        
        // 设置扇形样式
        slice.style.setProperty('--rotation', `${angle}deg`);
        slice.style.transform = `rotate(${angle}deg)`;
        slice.style.backgroundColor = colors[index % colors.length];
        
        // 添加文字
        const text = document.createElement('span');
        text.textContent = option;
        // 文字旋转角度需要考虑扇形的中心线
        const textAngle = -angle - (angleStep / 2);
        text.style.transform = `rotate(${textAngle}deg) translateX(-50%)`;
        
        slice.appendChild(text);
        container.appendChild(slice);
    });
}

// 开始抽奖
function startLottery() {
    if (isSpinning || currentOptions.length === 0) return;
    
    const startBtn = document.querySelector('.center-button');
    startBtn.disabled = true;
    isSpinning = true;

    const items = document.querySelectorAll('.option-item');
    const totalOptions = items.length;
    let currentIndex = 0;
    let speed = 50; // 初始速度
    let rounds = 0; // 当前圈数
    const minRounds = 3; // 最少圈数
    const finalIndex = Math.floor(Math.random() * totalOptions); // 最终停止位置
    
    // 移除之前的获奖效果
    items.forEach(item => {
        item.classList.remove('winner');
        item.classList.remove('active');
    });
    
    function highlight() {
        // 移除所有高亮
        items.forEach(item => {
            item.classList.remove('active');
        });
        
        // 高亮当前项
        items[currentIndex].classList.add('active');
        
        // 计算下一个位置
        currentIndex = (currentIndex + 1) % totalOptions;
        
        // 如果完成一圈，增加圈数计数
        if (currentIndex === 0) {
            rounds++;
        }
        
        // 判断是否继续
        if (rounds < minRounds || (rounds === minRounds && currentIndex !== finalIndex)) {
            // 逐渐增加间隔时间，造成减速效果
            speed = speed + (rounds * 15);
            setTimeout(highlight, speed);
        } else {
            // 停止动画
            isSpinning = false;
            startBtn.disabled = false;
            currentActiveIndex = finalIndex;
            
            // 添加获奖特效
            items.forEach(item => item.classList.remove('active'));
            items[finalIndex].classList.add('winner');
            
            // 显示获奖提示
            setTimeout(() => {
                alert(`恭喜获得：${currentOptions[finalIndex]}`);
            }, 500);
        }
    }
    
    // 开始动画
    highlight();
}

// 加载选项组
function loadGroup(groupName) {
    if (!groupName) {
        currentGroupName = '';
        currentOptions = [];
        renderLotteryCircle([]);
        renderOptionsList();
        return;
    }
    
    currentGroupName = groupName;
    getGroups(groups => {
        currentOptions = groups[groupName] || [];
        renderLotteryCircle(currentOptions);
        renderOptionsList();
        updateGroupList();
    });
}

// 添加新组
function addGroup() {
    const groupName = document.getElementById('group-name').value.trim();
    if (!groupName) return;
    
    getGroups(groups => {
        if (groups[groupName]) {
            alert('该组名已存在！');
            return;
        }
        
        groups[groupName] = [];
        saveGroups(groups);
        document.getElementById('group-name').value = '';
        
        // 更新当前组
        currentGroupName = groupName;
        currentOptions = [];
        
        // 更新界面
        updateGroupList();
        renderLotteryCircle([]);
        renderOptionsList();
    });
}

// 添加选项
function addOption() {
    if (!currentGroupName) {
        alert('请先选择一个组！');
        return;
    }
    
    const optionInput = document.getElementById('new-option');
    const optionText = optionInput.value.trim();
    if (!optionText) return;
    
    getGroups(groups => {
        if (!groups[currentGroupName]) {
            groups[currentGroupName] = [];
        }
        
        if (groups[currentGroupName].includes(optionText)) {
            alert('该选项已存在！');
            return;
        }
        
        groups[currentGroupName].push(optionText);
        saveGroups(groups);
        
        currentOptions = groups[currentGroupName];
        renderLotteryCircle(currentOptions);
        renderOptionsList();
        optionInput.value = '';
    });
}

// 删除选项
function deleteOption(index) {
    if (!currentGroupName) return;
    
    getGroups(groups => {
        groups[currentGroupName].splice(index, 1);
        saveGroups(groups);
        
        currentOptions = groups[currentGroupName];
        renderLotteryCircle(currentOptions);
        renderOptionsList();
    });
}

// 渲染选项列表
function renderOptionsList() {
    const container = document.getElementById('options-list');
    container.innerHTML = '';
    
    currentOptions.forEach((option, index) => {
        const div = document.createElement('div');
        div.style.margin = '5px 0';
        div.innerHTML = `
            <span>${option}</span>
            <button onclick="deleteOption(${index})" style="margin-left: 10px">删除</button>
        `;
        container.appendChild(div);
    });
}

// 更新组列表
function updateGroupList() {
    getGroups(groups => {
        const container = document.getElementById('group-list');
        const select = document.getElementById('group-select');
        
        // 更新管理页面的组列表
        container.innerHTML = '<h3>选项组列表</h3>';
        Object.keys(groups).forEach(groupName => {
            const div = document.createElement('div');
            div.className = `group-item${groupName === currentGroupName ? ' active' : ''}`;
            div.onclick = () => loadGroup(groupName);
            div.innerHTML = `
                <span>${groupName}</span>
                <button onclick="event.stopPropagation(); deleteGroup('${groupName}')" style="float: right">删除</button>
            `;
            container.appendChild(div);
        });
        
        // 更新抽奖页面的组选择下拉框
        select.innerHTML = '<option value="">选择抽奖组</option>';
        Object.keys(groups).forEach(groupName => {
            const option = document.createElement('option');
            option.value = groupName;
            option.textContent = groupName;
            if (groupName === currentGroupName) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    });
}

// 删除组
function deleteGroup(groupName) {
    if (!confirm(`确定要删除组"${groupName}"吗？`)) {
        return;
    }
    
    getGroups(groups => {
        delete groups[groupName];
        saveGroups(groups);
        
        if (currentGroupName === groupName) {
            currentGroupName = '';
            currentOptions = [];
            renderLotteryCircle([]);
        }
        
        updateGroupList();
        renderOptionsList();
    });
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    createLights();
    updateGroupList();
}); 