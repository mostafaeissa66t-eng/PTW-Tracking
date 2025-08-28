// script.js (النسخة الكاملة والصحيحة لـ Replit)

document.addEventListener('DOMContentLoaded', () => {
    // 👈 ضع رابط الـ API (اللينك بتاع الـ deploy) هنا
    const GOOGLE_SCRIPT_API_URL = 'https://script.google.com/macros/s/AKfycbwWa7LsjekwL7yrzfPcBzesYOEzpVmpaFiJGhcvFD4b9FkTliEJTdpElBm0e5NNVdG8Iw/exec';

    let loggedInUser = null;

    // --- DOM Element Cache ---
    const DOMElements = {
        authWrapper: document.getElementById('auth-wrapper'),
        appContainer: document.getElementById('app-container'),
        loginContainer: document.getElementById('login-container'),
        registerContainer: document.getElementById('register-container'),
        loader: document.getElementById('loader'),
        views: document.querySelectorAll('.view'),
        // Forms
        loginForm: document.getElementById('login-form'),
        registerForm: document.getElementById('register-form'),
        permitForm: document.getElementById('permit-form'),
        // Buttons & Links
        showRegisterLink: document.getElementById('show-register-link'),
        showLoginLink: document.getElementById('show-login-link'),
        navNewPermit: document.getElementById('nav-new-permit'),
        navClosePermit: document.getElementById('nav-close-permit'),
        logoutBtn: document.getElementById('logout-btn'),
        // Displays & Lists
        loginError: document.getElementById('login-error'),
        registerMessage: document.getElementById('register-message'),
        usernameDisplay: document.getElementById('username-display'),
        issuerField: document.getElementById('issuer'),
        permitsList: document.getElementById('permits-list'),
    };

    // --- Generic Fetch Function ---
    async function apiCall(body) {
        showLoader(true);
        try {
            const response = await fetch(GOOGLE_SCRIPT_API_URL, {
                method: 'POST',
                body: JSON.stringify(body),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                redirect: "follow"
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API Call Failed:', error);
            return { success: false, message: 'فشل الاتصال بالخادم.' };
        } finally {
            showLoader(false);
        }
    }

    // --- Event Listeners ---
    DOMElements.loginForm.addEventListener('submit', handleLogin);
    DOMElements.registerForm.addEventListener('submit', handleRegistration);
    DOMElements.permitForm.addEventListener('submit', handleNewPermit);
    DOMElements.showRegisterLink.addEventListener('click', () => toggleAuthView(false));
    DOMElements.showLoginLink.addEventListener('click', () => toggleAuthView(true));
    DOMElements.navNewPermit.addEventListener('click', () => showView('new-permit-view'));
    DOMElements.navClosePermit.addEventListener('click', () => showView('close-permit-view'));
    DOMElements.logoutBtn.addEventListener('click', handleLogout);

    // --- Utility Functions ---
    const showLoader = (isLoading) => DOMElements.loader.classList.toggle('hidden', !isLoading);
    const toggleAuthView = (showLogin) => {
        DOMElements.loginContainer.classList.toggle('hidden', !showLogin);
        DOMElements.registerContainer.classList.toggle('hidden', showLogin);
    };

    // --- View Management ---
    function showView(viewId) {
        DOMElements.views.forEach(view => view.classList.add('hidden'));
        document.getElementById(viewId).classList.remove('hidden');

        document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
        if (viewId === 'new-permit-view') {
            DOMElements.navNewPermit.classList.add('active');
        } else if (viewId === 'close-permit-view') {
            DOMElements.navClosePermit.classList.add('active');
            loadUserPermits();
        }
    }

    // --- Core Application Logic ---
    async function handleLogin(e) {
        e.preventDefault();
        DOMElements.loginError.textContent = '';
        const data = await apiCall({
            action: "login",
            username: DOMElements.loginForm.elements.username.value,
            password: DOMElements.loginForm.elements.password.value
        });

        if (data.success) {
            loggedInUser = data.user;
            DOMElements.authWrapper.classList.add('hidden');
            DOMElements.appContainer.classList.remove('hidden');
            DOMElements.usernameDisplay.textContent = loggedInUser;
            DOMElements.issuerField.value = `مصدر التصريح: ${loggedInUser}`;
            showView('new-permit-view');
        } else {
            DOMElements.loginError.textContent = data.message;
        }
    }

    async function handleRegistration(e) {
        e.preventDefault();
        const password = DOMElements.registerForm.elements['reg-password'].value;
        const confirmPassword = DOMElements.registerForm.elements['reg-confirm-password'].value;
        if (password !== confirmPassword) {
            DOMElements.registerMessage.textContent = 'كلمتا المرور غير متطابقتين.';
            DOMElements.registerMessage.className = 'message error';
            return;
        }

        const data = await apiCall({
            action: "register",
            userData: {
                username: DOMElements.registerForm.elements['reg-username'].value,
                email: DOMElements.registerForm.elements['reg-email'].value,
                password: password
            }
        });

        DOMElements.registerMessage.textContent = data.message;
        DOMElements.registerMessage.className = data.success ? 'message success' : 'message error';
        if (data.success) {
            DOMElements.registerForm.reset();
            setTimeout(() => toggleAuthView(true), 2000);
        }
    }

    async function handleNewPermit(e) {
        e.preventDefault();
        if (!confirm('هل أنت متأكد من أن جميع البيانات صحيحة؟')) return;

        const data = await apiCall({
            action: "createPermit",
            permitData: {
                projectName: DOMElements.permitForm.elements.projectName.value,
                permitType: DOMElements.permitForm.elements.permitType.value,
                shift: DOMElements.permitForm.elements.shift.value,
                requester: DOMElements.permitForm.elements.requester.value,
                siteEngineer: DOMElements.permitForm.elements.siteEngineer.value,
                subcontractorName: DOMElements.permitForm.elements.subcontractorName.value,
                workLocation: DOMElements.permitForm.elements.workLocation.value,
                workersCount: DOMElements.permitForm.elements.workersCount.value,
                description: DOMElements.permitForm.elements.description.value,
                issuer: loggedInUser
            }
        });

        alert(data.message);
        if (data.success) {
            DOMElements.permitForm.reset();
            DOMElements.issuerField.value = `مصدر التصريح: ${loggedInUser}`;
        }
    }

    async function loadUserPermits() {
        DOMElements.permitsList.innerHTML = '<p>جاري تحميل التصاريح...</p>';
        const data = await apiCall({
            action: "getUserPermits",
            username: loggedInUser
        });

        if (data.success) {
            DOMElements.permitsList.innerHTML = '';
            if (data.permits.length === 0) {
                DOMElements.permitsList.innerHTML = '<p>لا يوجد لديك تصاريح مفتوحة حالياً.</p>';
                return;
            }
            data.permits.forEach(p => {
                const card = document.createElement('div');
                card.className = 'permit-card';
                card.innerHTML = `
                    <h4>${p.projectName} (ID: ${p.id})</h4>
                    <p><strong>الموقع:</strong> ${p.location}</p>
                    <p><strong>تاريخ الإصدار:</strong> ${p.permitDate}</p>
                    <p><strong>الوصف:</strong> ${p.description}</p>
                    <button class="btn close-btn" data-permit-id="${p.id}">✅ إغلاق التصريح</button>
                `;
                DOMElements.permitsList.appendChild(card);
            });
        } else {
            DOMElements.permitsList.innerHTML = `<p>${data.message}</p>`;
        }
    }

    // Event delegation for closing permits
    DOMElements.permitsList.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('close-btn')) {
            const permitId = e.target.getAttribute('data-permit-id');
            handleClosePermit(permitId);
        }
    });

    async function handleClosePermit(permitId) {
        if (!confirm('هل أنت متأكد من رغبتك في إغلاق هذا التصريح؟')) return;

        const data = await apiCall({
            action: "closePermit",
            permitId: permitId,
            username: loggedInUser
        });

        alert(data.message);
        if (data.success) {
            loadUserPermits(); // Refresh the list
        }
    }

    function handleLogout() {
        loggedInUser = null;
        DOMElements.appContainer.classList.add('hidden');
        DOMElements.authWrapper.classList.remove('hidden');
        toggleAuthView(true);
        DOMElements.loginForm.reset();
        DOMElements.registerForm.reset();
    }
});