let chart = null;

if (!localStorage.getItem('token')) {
    window.location.href = 'index.html';
}

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
    };
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

async function fetchSummary() {
    const res = await fetch('/api/expenses/summary', { headers: getHeaders() });
    if (res.status === 401) logout();
    const data = await res.json();
    updateChart(data);
    
    const total = Object.values(data).reduce((a, b) => a + b, 0);
    document.getElementById('totalSpent').innerText = total.toFixed(2);
    checkBudget(total);
}

async function checkBudget(total) {
    const res = await fetch('/api/budget', { headers: getHeaders() });
    const budget = await res.json();
    document.getElementById('displayLimit').innerText = budget.monthlyLimit || 0;
    
    const warning = document.getElementById('budget-warning');
    if (budget.monthlyLimit > 0 && total > budget.monthlyLimit) {
        warning.style.display = 'block';
    } else {
        warning.style.display = 'none';
    }
}

function updateChart(data) {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    const categories = Object.keys(data);
    const amounts = Object.values(data);

    if (chart) chart.destroy();
    
    if (categories.length === 0) return;

    chart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: categories,
            datasets: [{
                data: amounts,
                backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#6366f1']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

async function addExpense() {
    const amount = document.getElementById('amount').value;
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;
    const description = document.getElementById('desc').value;

    if (!amount || !date) return alert('Please fill in amount and date');

    const expense = { amount, category, date, description };
    
    await fetch('/api/expenses', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(expense)
    });
    
    document.getElementById('amount').value = '';
    document.getElementById('desc').value = '';
    loadData();
}

async function loadData() {
    const res = await fetch('/api/expenses', { headers: getHeaders() });
    const expenses = await res.json();
    const tbody = document.querySelector('#expenseTable tbody');
    
    tbody.innerHTML = expenses.sort((a,b) => new Date(b.date) - new Date(a.date)).map(e => `
        <tr>
            <td>${e.date}</td>
            <td>${e.category}</td>
            <td>$${e.amount}</td>
            <td><button class="delete-btn" onclick="deleteExpense(${e.id})">Delete</button></td>
        </tr>
    `).join('');
    
    fetchSummary();
}

async function deleteExpense(id) {
    if (!confirm('Are you sure?')) return;
    await fetch('/api/expenses/' + id, {
        method: 'DELETE',
        headers: getHeaders()
    });
    loadData();
}

async function updateBudget() {
    const limit = document.getElementById('monthlyLimit').value;
    await fetch('/api/budget', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ monthlyLimit: limit })
    });
    loadData();
}

// Initial Load
document.getElementById('date').valueAsDate = new Date();
loadData();
