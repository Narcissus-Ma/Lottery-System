const { ipcRenderer } = require('electron');

let currentOptions = [];
let currentGroupName = '';
let isSpinning = false;
let currentActiveIndex = -1;
let rotationAngle = 0;

// 重置所有状态
function resetState() {
    currentGroupName = '';
    currentOptions = [];
    
    const groupNameInput = document.getElementById('group-name');
    const newOptionInput = document.getElementById('new-option');
    
    if (groupNameInput && newOptionInput) {
        groupNameInput.value = '';
        newOptionInput.value = '';
        groupNameInput.disabled = false;
        newOptionInput.disabled = true;
    }
    
    renderLotteryCircle([]);
    renderOptionsList();
}

// 更新输入框状态
function updateInputState(hasSelectedGroup = false) {
    const groupNameInput = document.getElementById('group-name');
    const newOptionInput = document.getElementById('new-option');
    
    if (groupNameInput && newOptionInput) {
        groupNameInput.disabled = false;
        newOptionInput.disabled = !hasSelectedGroup;
    }
}

// 页面切换
function showPage(pageId) {
    // 如果正在抽奖，禁止切换页面
    if (isSpinning && pageId === 'manage') {
        alert('抽奖进行中，请等待抽奖结束！');
        return;
    }
    
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
    
    // 切换页面时重新加载数据
    if (pageId === 'manage') {
        resetState();
        updateGroupList();
    }
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
    const replyHandler = (event, groups) => {
        console.log('Received groups:', groups);
        callback(groups || {});
    };
    
    ipcRenderer.removeAllListeners('get-options-reply');
    ipcRenderer.once('get-options-reply', replyHandler);
    ipcRenderer.send('get-options');
}

// 保存组数据并等待完成
async function saveGroupsAsync(groups) {
    return new Promise((resolve) => {
        console.log('Saving groups:', groups);
        
        const replyHandler = (event, response) => {
            console.log('Save response:', response);
            resolve(response === 'success');
        };
        
        ipcRenderer.removeAllListeners('save-options-reply');
        ipcRenderer.once('save-options-reply', replyHandler);
        ipcRenderer.send('save-options', {...groups}); // 发送对象的副本
    });
}

// 渲染抽奖圆盘
function renderLotteryCircle(options) {
    const container = document.getElementById('lottery-circle');
    const existingItems = container.querySelectorAll('.option-item');
    existingItems.forEach(item => item.remove());
    
    if (options.length === 0) return;
    
    const totalOptions = options.length;
    const angleStep = 360 / totalOptions;
    const colors = ['#FF4136', '#FF851B', '#FFDC00', '#2ECC40', '#0074D9', '#B10DC9'];
    
    options.forEach((option, index) => {
        const slice = document.createElement('div');
        slice.className = 'option-item';
        slice.dataset.index = index;
        
        // 计算旋转角度
        const startAngle = index * angleStep;
        
        // 设置扇形样式
        slice.style.cssText = `
            position: absolute;
            width: 50%;
            height: 50%;
            transform-origin: 100% 100%;
            transform: rotate(${startAngle}deg) skewY(${90 - angleStep}deg);
            background-color: ${colors[index % colors.length]};
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        // 添加文字容器
        const textContainer = document.createElement('div');
        textContainer.style.cssText = `
            position: absolute;
            left: 30%;
            transform: rotate(${-startAngle - angleStep/2}deg) translateY(-50%);
            transform-origin: 0 50%;
            text-align: center;
            color: white;
            font-weight: bold;
            font-size: 16px;
            white-space: nowrap;
            background: rgba(0, 0, 0, 0.5);
            padding: 5px 15px;
            border-radius: 15px;
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
        `;
        textContainer.textContent = option;
        
        slice.appendChild(textContainer);
        container.appendChild(slice);
    });
    
    // 添加中心点装饰
    const centerPoint = document.createElement('div');
    centerPoint.style.cssText = `
        position: absolute;
        width: 20px;
        height: 20px;
        background: #FFD700;
        border-radius: 50%;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 2;
    `;
    container.appendChild(centerPoint);
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
    let speed = 50;
    let rounds = 0;
    const minRounds = 3;
    const finalIndex = Math.floor(Math.random() * totalOptions);
    
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
                // 重新获取组数据以确保状态同步
                getGroups(groups => {
                    if (groups[currentGroupName]) {
                        currentOptions = groups[currentGroupName];
                        renderLotteryCircle(currentOptions);
                    }
                });
            }, 500);
        }
    }
    
    // 开始动画
    highlight();
}

// 加载选项组
function loadGroup(groupName) {
    console.log('Loading group:', groupName);
    if (!groupName) {
        resetState();
        return;
    }
    
    getGroups(groups => {
        if (!groups[groupName]) {
            console.error('Group not found:', groupName);
            resetState();
            return;
        }
        
        // 更新当前组状态
        currentGroupName = groupName;
        currentOptions = groups[groupName] || [];
        
        // 更新输入框状态
        updateInputState(true);
        
        // 更新组列表中的活动状态
        document.querySelectorAll('.group-item').forEach(item => {
            item.classList.remove('active');
            if (item.querySelector('span').textContent === groupName) {
                item.classList.add('active');
            }
        });
        
        console.log('Loaded options:', currentOptions);
        renderLotteryCircle(currentOptions);
        renderOptionsList();
    });
}

// 更新组列表
function updateGroupList() {
    getGroups(groups => {
        console.log('Updating group list with groups:', groups);
        const container = document.getElementById('group-list');
        const select = document.getElementById('group-select');
        
        // 更新管理页面的组列表
        container.innerHTML = '<h3>选项组列表</h3>';
        
        // 如果没有组，显示提示信息
        if (!groups || Object.keys(groups).length === 0) {
            const div = document.createElement('div');
            div.style.padding = '10px';
            div.style.color = '#666';
            div.textContent = '暂无抽奖组，请添加新组';
            container.appendChild(div);
            
            // 更新抽奖页面的组选择下拉框
            select.innerHTML = '<option value="">选择抽奖组</option>';
            
            // 重置状态
            resetState();
            return;
        }
        
        // 如果当前组不存在于groups中，重置状态
        if (currentGroupName && !groups[currentGroupName]) {
            resetState();
        }
        
        Object.keys(groups).forEach(groupName => {
            const div = document.createElement('div');
            div.className = `group-item${groupName === currentGroupName ? ' active' : ''}`;
            div.style.cursor = 'pointer';
            
            // 创建组名span
            const span = document.createElement('span');
            span.textContent = groupName;
            span.style.display = 'inline-block';
            span.style.width = 'calc(100% - 60px)';  // 为删除按钮留出空间
            div.appendChild(span);
            
            // 创建删除按钮
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '删除';
            deleteBtn.style.float = 'right';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteGroup(groupName);
            };
            div.appendChild(deleteBtn);
            
            // 为整个div添加点击事件
            div.onclick = () => {
                loadGroup(groupName);
            };
            
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

// 添加新组
async function addGroup() {
    const groupNameInput = document.getElementById('group-name');
    const groupName = groupNameInput.value.trim();
    if (!groupName) {
        alert('请输入组名！');
        updateInputState(false);
        return;
    }
    
    try {
        const groups = await new Promise(resolve => getGroups(resolve));
        console.log('Current groups before adding:', groups);
        
        if (groups[groupName]) {
            alert('该组名已存在！');
            return;
        }
        
        const newGroups = {...groups, [groupName]: []};
        
        // 保存数据
        const success = await saveGroupsAsync(newGroups);
        if (!success) {
            alert('保存失败，请重试！');
            return;
        }
        
        // 更新当前组
        currentGroupName = groupName;
        currentOptions = [];
        
        // 清空输入框并更新状态
        groupNameInput.value = '';
        updateInputState(true);
        
        console.log('Group added:', groupName);
        
        // 更新界面
        renderLotteryCircle([]);
        renderOptionsList();
        updateGroupList();
    } catch (error) {
        console.error('Error adding group:', error);
        alert('添加组时出错，请重试！');
    }
}

// 添加选项
async function addOption() {
    if (!currentGroupName) {
        alert('请先选择一个组！');
        return;
    }
    
    const optionInput = document.getElementById('new-option');
    const optionText = optionInput.value.trim();
    if (!optionText) return;
    
    getGroups(async (groups) => {
        console.log('Current groups before adding option:', groups);
        if (!groups[currentGroupName]) {
            groups[currentGroupName] = [];
        }
        
        if (groups[currentGroupName].includes(optionText)) {
            alert('该选项已存在！');
            return;
        }
        
        groups[currentGroupName].push(optionText);
        console.log('Updated groups after adding option:', groups);
        
        // 保存数据
        const success = await saveGroupsAsync(groups);
        if (!success) {
            alert('保存失败，请重试！');
            return;
        }
        
        // 更新本地状态
        currentOptions = groups[currentGroupName];
        
        // 清空输入框
        optionInput.value = '';
        
        // 更新界面
        renderLotteryCircle(currentOptions);
        renderOptionsList();
    });
}

// 删除选项
async function deleteOption(index) {
    if (!currentGroupName) return;
    
    getGroups(async (groups) => {
        groups[currentGroupName].splice(index, 1);
        
        // 保存数据
        const success = await saveGroupsAsync(groups);
        if (!success) {
            alert('删除失败，请重试！');
            return;
        }
        
        // 更新本地状态
        currentOptions = groups[currentGroupName];
        
        // 更新界面
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

// 删除组
async function deleteGroup(groupName) {
    if (!confirm(`确定要删除组"${groupName}"吗？`)) {
        return;
    }
    
    try {
        const groups = await new Promise(resolve => getGroups(resolve));
        console.log('Deleting group:', groupName);
        
        if (!groups[groupName]) {
            console.error('Group not found:', groupName);
            resetState();
            updateGroupList();
            return;
        }
        
        const newGroups = {...groups};
        delete newGroups[groupName];
        
        // 保存数据
        const success = await saveGroupsAsync(newGroups);
        if (!success) {
            alert('删除失败，请重试！');
            return;
        }
        
        console.log('Groups after deletion:', newGroups);
        
        // 如果删除的是当前选中的组，重置状态
        if (groupName === currentGroupName) {
            resetState();
        }
        
        updateGroupList();
    } catch (error) {
        console.error('Error deleting group:', error);
        alert('删除组时出错，请重试！');
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 移除所有可能存在的IPC监听器
    ipcRenderer.removeAllListeners('get-options-reply');
    ipcRenderer.removeAllListeners('save-options-reply');
    
    // 创建装饰灯
    createLights();
    
    // 初始化状态
    resetState();
    
    // 初始化数据
    updateGroupList();
    
    // 监听抽奖状态变化，更新导航按钮状态
    const navButtons = document.querySelectorAll('.nav button');
    setInterval(() => {
        navButtons.forEach(button => {
            if (button.textContent === '管理页面') {
                button.disabled = isSpinning;
            }
        });
    }, 100);
}); 