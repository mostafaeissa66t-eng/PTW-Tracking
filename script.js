// script.js (النسخة الكاملة مع إضافة كروت الملاحظات)

document.addEventListener('DOMContentLoaded', () => {
    // 👈 ضع رابط الـ API الجديد هنا بعد عمل Deploy
    const GOOGLE_SCRIPT_API_URL = 'https://script.google.com/macros/s/AKfycbxVCsaa-CWLhHDasNVy7t5y9MdtomoRmcrVmcshb6El3EaRA9DtGI_vUzmR21tQkRFASA/exec';

    let loggedInUser = null;

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
        observationForm: document.getElementById('observation-form'),
        // Buttons & Links
        showRegisterLink: document.getElementById('show-register-link'),
        showLoginLink: document.getElementById('show-login-link'),
        navNewPermit: document.getElementById('nav-new-permit'),
        navClosePermit: document.getElementById('nav-close-permit'),
        navNewObservation: document.getElementById('nav-new-observation'),
        navCloseObservation: document.getElementById('nav-close-observation'),
        logoutBtn: document.getElementById('logout-btn'),
        // Displays & Lists
        loginError: document.getElementById('login-error'),
        registerMessage: document.getElementById('register-message'),
        usernameDisplay: document.getElementById('username-display'),
        issuerField: document.getElementById('issuer'),
        permitsList: document.getElementById('permits-list'),
        obsIssuerField: document.getElementById('obsIssuer'),
        observationsList: document.getElementById('observations-list'),
    };

    async function apiCall(body) {
        showLoader(true);
        try {
            const response = await fetch(GOOGLE_SCRIPT_API_URL, {
                method: 'POST',
                body: JSON.stringify(body),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                redirect: "follow"
            });
            if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
            return await response.json();
        } catch (error) {
            console.error('API Call Failed:', error);
            alert(`فشل الاتصال بالخادم: ${error.message}`);
            return { success: false, message: 'فشل الاتصال بالخادم.' };
        } finally {
            showLoader(false);
        }
    }

    // --- Event Listeners ---
    DOMElements.loginForm.addEventListener('submit', handleLogin);
    DOMElements.registerForm.addEventListener('submit', handleRegistration);
    DOMElements.permitForm.addEventListener('submit', handleNewPermit);
    DOMElements.observationForm.addEventListener('submit', handleNewObservation);
    DOMElements.showRegisterLink.addEventListener('click', () => toggleAuthView(false));
    DOMElements.showLoginLink.addEventListener('click', () => toggleAuthView(true));
    DOMElements.navNewPermit.addEventListener('click', () => showView('new-permit-view'));
    DOMElements.navClosePermit.addEventListener('click', () => showView('close-permit-view'));
    DOMElements.navNewObservation.addEventListener('click', () => showView('new-observation-view'));
    DOMElements.navCloseObservation.addEventListener('click', () => showView('close-observation-view'));
    DOMElements.logoutBtn.addEventListener('click', handleLogout);

    DOMElements.permitsList.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('close-btn')) {
            const permitId = e.target.getAttribute('data-permit-id');
            if (permitId) handleClosePermit(permitId);
        }
    });

    DOMElements.observationsList.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('close-btn')) {
            const observationId = e.target.getAttribute('data-observation-id');
            if (observationId) handleCloseObservation(observationId);
        }
    });

    // --- Utility & View Management ---
    const showLoader = (isLoading) => DOMElements.loader.classList.toggle('hidden', !isLoading);
    const toggleAuthView = (showLogin) => {
        DOMElements.loginContainer.classList.toggle('hidden', !showLogin);
        DOMElements.registerContainer.classList.toggle('hidden', showLogin);
    };

    function showView(viewId) {
        DOMElements.views.forEach(view => view.classList.add('hidden'));
        document.getElementById(viewId).classList.remove('hidden');
        document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));

        switch (viewId) {
            case 'new-permit-view':
                DOMElements.navNewPermit.classList.add('active');
                break;
            case 'close-permit-view':
                DOMElements.navClosePermit.classList.add('active');
                loadUserPermits();
                break;
            case 'new-observation-view':
                DOMElements.navNewObservation.classList.add('active');
                DOMElements.obsIssuerField.value = `الملاحظ: ${loggedInUser}`;
                break;
            case 'close-observation-view':
                DOMElements.navCloseObservation.classList.add('active');
                loadUserObservations();
                break;
        }
    }

    // --- Core Application Logic ---
    async function handleLogin(e) { /* ... same code ... */ }
    async function handleRegistration(e) { /* ... same code ... */ }
    async function handleNewPermit(e) { /* ... same code ... */ }
    async function loadUserPermits() { /* ... same code ... */ }
    async function handleClosePermit(permitId) { /* ... same code ... */ }

    async function handleNewObservation(e) {
        e.preventDefault();
        if (!confirm('هل أنت متأكد من تسجيل هذه الملاحظة؟')) return;

        const data = await apiCall({
            action: "createObservation",
            observationData: {
                projectName: DOMElements.observationForm.elements.obsProjectName.value,
                location: DOMElements.observationForm.elements.obsLocation.value,
                observationType: DOMElements.observationForm.elements.obsType.value,
                description: DOMElements.observationForm.elements.obsDescription.value,
                correctiveAction: DOMElements.observationForm.elements.obsCorrectiveAction.value,
                issuer: loggedInUser
            }
        });

        alert(data.message);
        if (data.success) {
            DOMElements.observationForm.reset();
            DOMElements.obsIssuerField.value = `الملاحظ: ${loggedInUser}`;
        }
    }

    async function loadUserObservations() {
        DOMElements.observationsList.innerHTML = '<p>جاري تحميل الملاحظات...</p>';
        const data = await apiCall({ action: "getUserObservations", username: loggedInUser });
        if (data.success) {
            DOMElements.observationsList.innerHTML = '';
            if (data.observations.length === 0) {
                DOMElements.observationsList.innerHTML = '<p>لا يوجد لديك ملاحظات مفتوحة حالياً.</p>';
                return;
            }
            data.observations.forEach(obs => {
                const card = document.createElement('div');
                card.className = 'observation-card';
                card.innerHTML = `
                    <h4>${obs.projectName} (ID: ${obs.id})</h4>
                    <p><strong>نوع الملاحظة:</strong> ${obs.type}</p>
                    <p><strong>تاريخ التسجيل:</strong> ${obs.date}</p>
                    <p><strong>الوصف:</strong> ${obs.description}</p>
                    <button class="btn close-btn" data-observation-id="${obs.id}">✔️ إغلاق الملاحظة</button>
                `;
                DOMElements.observationsList.appendChild(card);
            });
        } else {
            DOMElements.observationsList.innerHTML = `<p>${data.message}</p>`;
        }
    }

    async function handleCloseObservation(observationId) {
        if (!confirm('هل أنت متأكد من رغبتك في إغلاق هذه الملاحظة؟')) return;
        const data = await apiCall({
            action: "closeObservation",
            observationId: observationId,
            username: loggedInUser
        });
        alert(data.message);
        if (data.success) {
            loadUserObservations();
        }
    }

    function handleLogout() { /* ... same code ... */ }

    // --- (للتسهيل، هنا الأكواد التي لم تتغير) ---
    async function handleLogin(e) { e.preventDefault(); DOMElements.loginError.textContent = ''; const data = await apiCall({ action: "login", username: DOMElements.loginForm.elements.username.value, password: DOMElements.loginForm.elements.password.value }); if (data.success) { loggedInUser = data.user; DOMElements.authWrapper.classList.add('hidden'); DOMElements.appContainer.classList.remove('hidden'); DOMElements.usernameDisplay.textContent = loggedInUser; DOMElements.issuerField.value = `مصدر التصريح: ${loggedInUser}`; showView('new-permit-view'); } else { DOMElements.loginError.textContent = data.message; } }
    async function handleRegistration(e) { e.preventDefault(); const password = DOMElements.registerForm.elements['reg-password'].value; const confirmPassword = DOMElements.registerForm.elements['reg-confirm-password'].value; if (password !== confirmPassword) { DOMElements.registerMessage.textContent = 'كلمتا المرور غير متطابقتين.'; DOMElements.registerMessage.className = 'message error'; return; } const data = await apiCall({ action: "register", userData: { username: DOMElements.registerForm.elements['reg-username'].value, email: DOMElements.registerForm.elements['reg-email'].value, password: password } }); DOMElements.registerMessage.textContent = data.message; DOMElements.registerMessage.className = data.success ? 'message success' : 'message error'; if (data.success) { DOMElements.registerForm.reset(); setTimeout(() => toggleAuthView(true), 2000); } }
    async function handleNewPermit(e) { e.preventDefault(); if (!confirm('هل أنت متأكد من أن جميع البيانات صحيحة؟')) return; const data = await apiCall({ action: "createPermit", permitData: { projectName: DOMElements.permitForm.elements.projectName.value, permitType: DOMElements.permitForm.elements.permitType.value, shift: DOMElements.permitForm.elements.shift.value, requester: DOMElements.permitForm.elements.requester.value, siteEngineer: DOMElements.permitForm.elements.siteEngineer.value, subcontractorName: DOMElements.permitForm.elements.subcontractorName.value, workLocation: DOMElements.permitForm.elements.workLocation.value, workersCount: DOMElements.permitForm.elements.workersCount.value, description: DOMElements.permitForm.elements.description.value, issuer: loggedInUser } }); alert(data.message); if (data.success) { DOMElements.permitForm.reset(); DOMElements.issuerField.value = `مصدر التصريح: ${loggedInUser}`; } }
    async function loadUserPermits() { DOMElements.permitsList.innerHTML = '<p>جاري تحميل التصاريح...</p>'; const data = await apiCall({ action: "getUserPermits", username: loggedInUser }); if (data.success) { DOMElements.permitsList.innerHTML = ''; if (data.permits.length === 0) { DOMElements.permitsList.innerHTML = '<p>لا يوجد لديك تصاريح مفتوحة حالياً.</p>'; return; } data.permits.forEach(p => { const card = document.createElement('div'); card.className = 'permit-card'; card.innerHTML = `<h4>${p.projectName} (ID: ${p.id})</h4><p><strong>الموقع:</strong> ${p.location}</p><p><strong>تاريخ الإصدار:</strong> ${p.permitDate}</p><p><strong>الوصف:</strong> ${p.description}</p><button class="btn close-btn" data-permit-id="${p.id}">✅ إغلاق التصريح</button>`; DOMElements.permitsList.appendChild(card); }); } else { DOMElements.permitsList.innerHTML = `<p>${data.message}</p>`; } }
    async function handleClosePermit(permitId) { if (!confirm('هل أنت متأكد من رغبتك في إغلاق هذا التصريح؟')) return; const data = await apiCall({ action: "closePermit", permitId: permitId, username: loggedInUser }); alert(data.message); if (data.success) { loadUserPermits(); } }
    function handleLogout() { loggedInUser = null; DOMElements.appContainer.classList.add('hidden'); DOMElements.authWrapper.classList.remove('hidden'); toggleAuthView(true); DOMElements.loginForm.reset(); DOMElements.registerForm.reset(); }
});
