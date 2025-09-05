// script.js (النسخة الكاملة النهائية مع جرس الإشعارات)

document.addEventListener('DOMContentLoaded', () => {
    // 👈 !!! مهم جدًا: ضع رابط الـ API الجديد هنا
    const GOOGLE_SCRIPT_API_URL = 'https://script.google.com/macros/s/AKfycbw0QhJM8YukhfzoySz0ANf1fY3-pkbhluPDOxuL1PuBeQPvSMA4Ypn2pZ9vhu_logkoOQ/exec';

    let loggedInUser = null;
    let notifications = []; // لتخزين الإشعارات

    const DOMElements = {
        authWrapper: document.getElementById('auth-wrapper'), appContainer: document.getElementById('app-container'),
        loginContainer: document.getElementById('login-container'), registerContainer: document.getElementById('register-container'),
        loader: document.getElementById('loader'), views: document.querySelectorAll('.view'),
        loginForm: document.getElementById('login-form'), registerForm: document.getElementById('register-form'),
        permitForm: document.getElementById('permit-form'), observationForm: document.getElementById('observation-form'),
        nearMissForm: document.getElementById('nearmiss-form'), showRegisterLink: document.getElementById('show-register-link'),
        showLoginLink: document.getElementById('show-login-link'), navNewPermit: document.getElementById('nav-new-permit'),
        navClosePermit: document.getElementById('nav-close-permit'), navNewObservation: document.getElementById('nav-new-observation'),
        navCloseObservation: document.getElementById('nav-close-observation'), navNewNearMiss: document.getElementById('nav-new-nearmiss'),
        navCloseNearMiss: document.getElementById('nav-close-nearmiss'), logoutBtn: document.getElementById('logout-btn'),
        loginError: document.getElementById('login-error'), registerMessage: document.getElementById('register-message'),
        usernameDisplay: document.getElementById('username-display'), issuerField: document.getElementById('issuer'),
        permitsList: document.getElementById('permits-list'), obsIssuerField: document.getElementById('obsIssuer'),
        observationsList: document.getElementById('observations-list'), nearMissIssuer: document.getElementById('nearMissIssuer'),
        nearMissesList: document.getElementById('nearmisses-list'),
        notificationBellContainer: document.getElementById('notification-bell-container'),
        notificationCount: document.getElementById('notification-count'),
        notificationPanel: document.getElementById('notification-panel'),
        notificationList: document.getElementById('notification-list'),
    };

    // --- Notification System ---
    function updateNotificationUI() {
        if (notifications.length > 0) {
            DOMElements.notificationCount.textContent = notifications.length;
            DOMElements.notificationCount.classList.remove('hidden');
        } else {
            DOMElements.notificationCount.classList.add('hidden');
        }
        DOMElements.notificationList.innerHTML = '';
        if (notifications.length === 0) {
            DOMElements.notificationList.innerHTML = `<li>لا توجد إشعارات جديدة.</li>`;
            return;
        }
        notifications.forEach(notif => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${notif.icon}</span> <span>${notif.message}</span>`;
            DOMElements.notificationList.appendChild(li);
        });
    }

    async function checkNotifications() {
        if (!loggedInUser) return;
        const data = await apiCall({ action: "getAllOpenItems", username: loggedInUser }, false);
        if (!data.success) return;
        const now = new Date().getTime();
        const EIGHT_HOURS_IN_MS = 8 * 60 * 60 * 1000;
        const THREE_DAYS_IN_MS = 3 * 24 * 60 * 60 * 1000;
        let newNotificationsFound = false;

        if (data.permits) {
            data.permits.forEach(permit => {
                if (now - permit.creationTime > EIGHT_HOURS_IN_MS) {
                    const id = `permit_${permit.id}`;
                    if (!notifications.some(n => n.id === id)) {
                        notifications.push({ id, message: `تنبيه: تصريح #${permit.id} مفتوح لأكثر من 8 ساعات.`, icon: '📝' });
                        newNotificationsFound = true;
                    }
                }
            });
        }
        if (data.observations) {
            data.observations.forEach(obs => {
                if (now - obs.creationTime > THREE_DAYS_IN_MS) {
                    const id = `obs_${obs.id}`;
                    if (!notifications.some(n => n.id === id)) {
                        notifications.push({ id, message: `تنبيه: ملاحظة #${obs.id} مفتوحة لأكثر من 3 أيام.`, icon: '🗒️' });
                        newNotificationsFound = true;
                    }
                }
            });
        }
        if (newNotificationsFound) {
            updateNotificationUI();
        }
    }

    async function apiCall(body, showLoaderFlag = true) {
        if (showLoaderFlag) showLoader(true);
        try {
            const response = await fetch(GOOGLE_SCRIPT_API_URL, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: "follow" });
            if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
            return await response.json();
        } catch (error) {
            console.error('API Call Failed:', error);
            alert(`فشل الاتصال بالخادم: ${error.message}`);
            return { success: false, message: 'فشل الاتصال بالخادم.' };
        } finally {
            if (showLoaderFlag) showLoader(false);
        }
    }

    // --- Event Listeners ---
    DOMElements.loginForm.addEventListener('submit', handleLogin);
    DOMElements.registerForm.addEventListener('submit', handleRegistration);
    DOMElements.permitForm.addEventListener('submit', handleNewPermit);
    DOMElements.observationForm.addEventListener('submit', handleNewObservation);
    DOMElements.nearMissForm.addEventListener('submit', handleNewNearMiss);
    DOMElements.showRegisterLink.addEventListener('click', () => toggleAuthView(false));
    DOMElements.showLoginLink.addEventListener('click', () => toggleAuthView(true));
    DOMElements.navNewPermit.addEventListener('click', () => showView('new-permit-view'));
    DOMElements.navClosePermit.addEventListener('click', () => showView('close-permit-view'));
    DOMElements.navNewObservation.addEventListener('click', () => showView('new-observation-view'));
    DOMElements.navCloseObservation.addEventListener('click', () => showView('close-observation-view'));
    DOMElements.navNewNearMiss.addEventListener('click', () => showView('new-nearmiss-view'));
    DOMElements.navCloseNearMiss.addEventListener('click', () => showView('close-nearmiss-view'));
    DOMElements.logoutBtn.addEventListener('click', handleLogout);
    DOMElements.notificationBellContainer.addEventListener('click', () => { DOMElements.notificationPanel.classList.toggle('active'); });
    DOMElements.permitsList.addEventListener('click', (e) => { if (e.target.classList.contains('close-btn')) { handleClosePermit(e.target.getAttribute('data-permit-id')); } });
    DOMElements.observationsList.addEventListener('click', (e) => { if (e.target.classList.contains('close-btn')) { handleCloseObservation(e.target.getAttribute('data-observation-id')); } });
    DOMElements.nearMissesList.addEventListener('click', (e) => { if (e.target.classList.contains('close-btn')) { handleCloseNearMiss(e.target.getAttribute('data-nearmiss-id')); } });

    // --- Functions ---
    const showLoader = (isLoading) => DOMElements.loader.classList.toggle('hidden', !isLoading);
    const toggleAuthView = (showLogin) => { DOMElements.loginContainer.classList.toggle('hidden', !showLogin); DOMElements.registerContainer.classList.toggle('hidden', showLogin); };

    function showView(viewId) {
        DOMElements.views.forEach(view => view.classList.add('hidden'));
        document.getElementById(viewId).classList.remove('hidden');
        document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
        switch (viewId) {
            case 'new-permit-view': DOMElements.navNewPermit.classList.add('active'); break;
            case 'close-permit-view': DOMElements.navClosePermit.classList.add('active'); loadUserPermits(); break;
            case 'new-observation-view': DOMElements.navNewObservation.classList.add('active'); DOMElements.obsIssuerField.value = `الملاحظ: ${loggedInUser}`; break;
            case 'close-observation-view': DOMElements.navCloseObservation.classList.add('active'); loadUserObservations(); break;
            case 'new-nearmiss-view': DOMElements.navNewNearMiss.classList.add('active'); DOMElements.nearMissIssuer.value = `المُبلغ: ${loggedInUser}`; break;
            case 'close-nearmiss-view': DOMElements.navCloseNearMiss.classList.add('active'); loadUserOpenNearMisses(); break;
        }
    }

    async function handleLogin(e) { e.preventDefault(); DOMElements.loginError.textContent = ''; const data = await apiCall({ action: "login", username: DOMElements.loginForm.elements.username.value, password: DOMElements.loginForm.elements.password.value }); if (data.success) { loggedInUser = data.user; DOMElements.authWrapper.classList.add('hidden'); DOMElements.appContainer.classList.remove('hidden'); DOMElements.notificationBellContainer.style.display = 'flex'; DOMElements.usernameDisplay.textContent = loggedInUser; DOMElements.issuerField.value = `مصدر التصريح: ${loggedInUser}`; showView('new-permit-view'); notifications = []; updateNotificationUI(); setTimeout(checkNotifications, 2000); setInterval(checkNotifications, 15 * 60 * 1000); } else { DOMElements.loginError.textContent = data.message; } }
    async function handleRegistration(e) { e.preventDefault(); const p1 = DOMElements.registerForm.elements['reg-password'].value; const p2 = DOMElements.registerForm.elements['reg-confirm-password'].value; if (p1 !== p2) { DOMElements.registerMessage.textContent = 'كلمتا المرور غير متطابقتين.'; return; } const data = await apiCall({ action: "register", userData: { username: DOMElements.registerForm.elements['reg-username'].value, email: DOMElements.registerForm.elements['reg-email'].value, password: p1 } }); DOMElements.registerMessage.textContent = data.message; if (data.success) { DOMElements.registerForm.reset(); setTimeout(() => toggleAuthView(true), 2000); } }
    async function handleNewPermit(e) { e.preventDefault(); if (!confirm('هل أنت متأكد من إصدار هذا التصريح؟')) return; const data = await apiCall({ action: "createPermit", permitData: { projectName: DOMElements.permitForm.elements.projectName.value, permitType: DOMElements.permitForm.elements.permitType.value, shift: DOMElements.permitForm.elements.shift.value, requester: DOMElements.permitForm.elements.requester.value, siteEngineer: DOMElements.permitForm.elements.siteEngineer.value, subcontractorName: DOMElements.permitForm.elements.subcontractorName.value, workLocation: DOMElements.permitForm.elements.workLocation.value, workersCount: DOMElements.permitForm.elements.workersCount.value, description: DOMElements.permitForm.elements.description.value, issuer: loggedInUser } }); alert(data.message); if (data.success) { DOMElements.permitForm.reset(); DOMElements.issuerField.value = `مصدر التصريح: ${loggedInUser}`; } }
    async function loadUserPermits() { DOMElements.permitsList.innerHTML = '<p>جاري التحميل...</p>'; const data = await apiCall({ action: "getUserPermits", username: loggedInUser }); if (data.success) { DOMElements.permitsList.innerHTML = ''; if (data.permits.length === 0) { DOMElements.permitsList.innerHTML = '<p>لا يوجد تصاريح مفتوحة.</p>'; return; } data.permits.forEach(p => { const card = document.createElement('div'); card.className = 'permit-card'; card.innerHTML = `<h4>${p.projectName} (ID: ${p.id})</h4><p><strong>الموقع:</strong> ${p.location}</p><p><strong>تاريخ الإصدار:</strong> ${p.permitDate}</p><p><strong>الوصف:</strong> ${p.description}</p><button class="btn close-btn" data-permit-id="${p.id}">✅ إغلاق التصريح</button>`; DOMElements.permitsList.appendChild(card); }); } }
    async function handleClosePermit(id) { if (!confirm('هل أنت متأكد من إغلاق هذا التصريح؟')) return; const data = await apiCall({ action: "closePermit", permitId: id, username: loggedInUser }); alert(data.message); if (data.success) { loadUserPermits(); } }
    async function handleNewObservation(e) { e.preventDefault(); if (!confirm('هل أنت متأكد من تسجيل هذه الملاحظة؟')) return; const data = await apiCall({ action: "createObservation", observationData: { projectName: DOMElements.observationForm.elements.obsProjectName.value, location: DOMElements.observationForm.elements.obsLocation.value, observationType: DOMElements.observationForm.elements.obsType.value, description: DOMElements.observationForm.elements.obsDescription.value, correctiveAction: DOMElements.observationForm.elements.obsCorrectiveAction.value, issuer: loggedInUser } }); alert(data.message); if (data.success) { DOMElements.observationForm.reset(); DOMElements.obsIssuerField.value = `الملاحظ: ${loggedInUser}`; } }
    async function loadUserObservations() { DOMElements.observationsList.innerHTML = '<p>جاري التحميل...</p>'; const data = await apiCall({ action: "getUserObservations", username: loggedInUser }); if (data.success) { DOMElements.observationsList.innerHTML = ''; if (data.observations.length === 0) { DOMElements.observationsList.innerHTML = '<p>لا يوجد ملاحظات مفتوحة.</p>'; return; } data.observations.forEach(obs => { const card = document.createElement('div'); card.className = 'observation-card'; card.innerHTML = `<h4>${obs.projectName} (ID: ${obs.id})</h4><p><strong>النوع:</strong> ${obs.type}</p><p><strong>التاريخ:</strong> ${obs.date}</p><p><strong>الوصف:</strong> ${obs.description}</p><button class="btn close-btn" data-observation-id="${obs.id}">✔️ إغلاق الملاحظة</button>`; DOMElements.observationsList.appendChild(card); }); } }
    async function handleCloseObservation(id) { if (!confirm('هل أنت متأكد من إغلاق هذه الملاحظة؟')) return; const data = await apiCall({ action: "closeObservation", observationId: id, username: loggedInUser }); alert(data.message); if (data.success) { loadUserObservations(); } }
    async function handleNewNearMiss(e) { e.preventDefault(); if (!confirm('هل أنت متأكد من تسجيل هذا التقرير؟')) return; const formData = new FormData(DOMElements.nearMissForm); const nearMissData = Object.fromEntries(formData.entries()); nearMissData.issuer = loggedInUser; const data = await apiCall({ action: "createNearMiss", nearMissData }); alert(data.message); if (data.success) { DOMElements.nearMissForm.reset(); DOMElements.nearMissIssuer.value = `المُبلغ: ${loggedInUser}`; } }
    async function loadUserOpenNearMisses() { DOMElements.nearMissesList.innerHTML = '<p>جاري التحميل...</p>'; const data = await apiCall({ action: "getUserNearMisses", username: loggedInUser }); if (data.success && data.nearMisses) { DOMElements.nearMissesList.innerHTML = ''; if (data.nearMisses.length === 0) { DOMElements.nearMissesList.innerHTML = '<p>لا يوجد تقارير مفتوحة.</p>'; return; } data.nearMisses.forEach(item => { const card = document.createElement('div'); card.className = 'nearmiss-card'; card.innerHTML = `<h4>${item.projectName} (ID: ${item.id})</h4><p><strong>التاريخ:</strong> ${item.dateTime}</p><p><strong>النوع:</strong> ${item.type}</p><p><strong>الوصف:</strong> ${item.description}</p><button class="btn close-btn" data-nearmiss-id="${item.id}">❕ إغلاق التقرير</button>`; DOMElements.nearMissesList.appendChild(card); }); } }
    async function handleCloseNearMiss(id) { const closingInfo = prompt("يرجى إدخال الإجراء التصحيحي النهائي لإغلاق هذا التقرير:"); if (closingInfo && closingInfo.trim() !== "") { const data = await apiCall({ action: "closeNearMiss", nearMissId: id, username: loggedInUser, closingInfo }); alert(data.message); if (data.success) loadUserOpenNearMisses(); } else if (closingInfo !== null) { alert("لا يمكن ترك حقل الإجراء التصحيحي فارغًا."); } }
    function handleLogout() { loggedInUser = null; DOMElements.appContainer.classList.add('hidden'); DOMElements.authWrapper.classList.remove('hidden'); DOMElements.notificationBellContainer.style.display = 'none'; toggleAuthView(true); DOMElements.loginForm.reset(); DOMElements.registerForm.reset(); }
});
