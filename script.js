// script.js (النسخة النهائية والمصححة بالكامل)

document.addEventListener('DOMContentLoaded', () => {
    // 👈 !!! مهم جدًا: ضع رابط الـ API الجديد هنا
    const GOOGLE_SCRIPT_API_URL = 'https://script.google.com/macros/s/AKfycbxJtpaLwpgZIf161TjdkKKgWmrw0DxyGLYNkgUX0ORPUGLpg7ezb7xFNmiibf_LU5-3TA/exec';

    let loggedInUser = null;
    let observationsChartInstance = null;
    let permitsChartInstance = null;
    let notifications = [];
    // تم إزالة hazardTimelineChartInstance لأنه تم إزالة الرسم البياني الثالث

    const DOMElements = {
        // عناصر خاصة بـ index.html (التطبيق الداخلي)
        authWrapper: document.getElementById('auth-wrapper'), appContainer: document.getElementById('app-container'),
        loginContainer: document.getElementById('login-container'), registerContainer: document.getElementById('register-container'),
        loader: document.getElementById('loader'), views: document.querySelectorAll('.view'),
        loginForm: document.getElementById('login-form'), registerForm: document.getElementById('register-form'),
        permitForm: document.getElementById('permit-form'), observationForm: document.getElementById('observation-form'),
        nearMissForm: document.getElementById('nearmiss-form'), showRegisterLink: document.getElementById('show-register-link'),
        showLoginLink: document.getElementById('show-login-link'), navDashboard: document.getElementById('nav-dashboard'),
        navNewPermit: document.getElementById('nav-new-permit'), navClosePermit: document.getElementById('nav-close-permit'),
        navNewObservation: document.getElementById('nav-new-observation'), navCloseObservation: document.getElementById('nav-close-observation'),
        navNewNearMiss: document.getElementById('nav-new-nearmiss'), navCloseNearMiss: document.getElementById('nav-close-nearmiss'),
        logoutBtn: document.getElementById('logout-btn'), loginError: document.getElementById('login-error'),
        navNewPublicReport: document.getElementById('nav-new-public-report'),
        registerMessage: document.getElementById('register-message'), usernameDisplay: document.getElementById('username-display'),
        issuerField: document.getElementById('issuer'), permitsList: document.getElementById('permits-list'),
        obsIssuerField: document.getElementById('obsIssuer'), observationsList: document.getElementById('observations-list'),
        nearMissIssuer: document.getElementById('nearMissIssuer'), nearMissesList: document.getElementById('nearmisses-list'),
        notificationBellContainer: document.getElementById('notification-bell-container'),
        notificationCount: document.getElementById('notification-count'),
        notificationPanel: document.getElementById('notification-panel'),
        notificationList: document.getElementById('notification-list'),
        dashboardLoader: document.getElementById('dashboard-loader'),
        dashboardContent: document.getElementById('dashboard-content'),
        kpiTotalPermits: document.getElementById('kpi-total-permits'),
        kpiTotalObservations: document.getElementById('kpi-total-observations'),
        kpiTotalNearMisses: document.getElementById('kpi-total-nearmisses'),
        // ⭐ KPIs الجديدة
        kpiOpenHazards: document.getElementById('kpi-open-hazards'),
        kpiClosedHazards: document.getElementById('kpi-closed-hazards'),
        // تم إزالة hazardTimelineChartCanvas

        // ⭐ العناصر المشتركة (موجودة في PublicReport.html أيضاً)
        publicHazardWrapper: document.getElementById('public-hazard-wrapper'),
        publicHazardForm: document.getElementById('public-hazard-form'),
        publicReportMessage: document.getElementById('public-report-message'),
        publicHazardNameField: document.getElementById('p-hazard-name'),
        publicHazardBackBtn: document.getElementById('p-hazard-back-btn'),
        navCloseHazard: document.getElementById('nav-close-hazard'),
        hazardReportsList: document.getElementById('hazard-reports-list'),

        // ⭐ تمت الإضافة: زر القائمة المنسدلة والقائمة الجانبية
        menuToggle: document.getElementById('menu-toggle'),
        sidebar: document.querySelector('.sidebar')
    };

    // --- الدوال المساعدة العامة ---

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

    function updateNotificationUI() {
        if (notifications.length > 0) { DOMElements.notificationCount.textContent = notifications.length; DOMElements.notificationCount.classList.remove('hidden'); } else { DOMElements.notificationCount.classList.add('hidden'); }
        DOMElements.notificationList.innerHTML = '';
        if (notifications.length === 0) { DOMElements.notificationList.innerHTML = `<li>لا توجد إشعارات جديدة.</li>`; return; }
        notifications.forEach(notif => { const li = document.createElement('li'); li.innerHTML = `<span>${notif.icon}</span> <span>${notif.message}</span>`; DOMElements.notificationList.appendChild(li); });
    }
    async function checkNotifications() {
        if (!loggedInUser) return;
        const data = await apiCall({ action: "getAllOpenItems", username: loggedInUser }, false);
        if (!data.success) return;

        const now = new Date().getTime();
        const EIGHT_HOURS_IN_MS = 8 * 60 * 60 * 1000;
        const THREE_DAYS_IN_MS = 3 * 24 * 60 * 60 * 1000;
        let newNotificationsFound = false;

        notifications = notifications.filter(notif => {
            const [type, id] = notif.id.split('_');
            const isStillOpen = (type === 'permit' && data.permits.some(p => p.id === id)) ||
                (type === 'obs' && data.observations.some(o => o.id === id));
            return isStillOpen;
        });

        if (data.permits) {
            data.permits.forEach(permit => {
                const permitTime = new Date(permit.creationTime).getTime();
                if (now - permitTime > EIGHT_HOURS_IN_MS) {
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
                const obsTime = new Date(obs.creationTime).getTime();
                if (now - obsTime > THREE_DAYS_IN_MS) {
                    const id = `obs_${obs.id}`;
                    if (!notifications.some(n => n.id === id)) {
                        notifications.push({ id, message: `تنبيه: ملاحظة #${obs.id} مفتوحة لأكثر من 3 أيام.`, icon: '🗒️' });
                        newNotificationsFound = true;
                    }
                }
            });
        }
        if (newNotificationsFound || notifications.length !== DOMElements.notificationCount.textContent) {
            updateNotificationUI();
        }
    }
    const showLoader = (isLoading) => DOMElements.loader.classList.toggle('hidden', !isLoading);
    const toggleAuthView = (showLogin) => { DOMElements.loginContainer.classList.toggle('hidden', !showLogin); DOMElements.registerContainer.classList.toggle('hidden', showLogin); };

    // --- وظائف المصادقة ---

    async function handleLogin(e) {
        e.preventDefault(); DOMElements.loginError.textContent = '';
        const data = await apiCall({ action: "login", username: DOMElements.loginForm.elements.username.value, password: DOMElements.loginForm.elements.password.value });
        if (data.success) {
            loggedInUser = data.user;
            DOMElements.authWrapper.classList.add('hidden');
            DOMElements.appContainer.classList.remove('hidden');
            DOMElements.notificationBellContainer.style.display = 'flex';
            DOMElements.usernameDisplay.textContent = loggedInUser;
            showView('dashboard-view');
            notifications = []; updateNotificationUI();
            setTimeout(checkNotifications, 2000);
            setInterval(checkNotifications, 15 * 60 * 1000);
        } else {
            DOMElements.loginError.textContent = data.message;
        }
    }
    async function handleRegistration(e) { e.preventDefault(); const p1 = DOMElements.registerForm.elements['reg-password'].value; const p2 = DOMElements.registerForm.elements['reg-confirm-password'].value; if (p1 !== p2) { DOMElements.registerMessage.textContent = 'كلمتا المرور غير متطابقتين.'; return; } const data = await apiCall({ action: "register", userData: { username: DOMElements.registerForm.elements['reg-username'].value, email: DOMElements.registerForm.elements['reg-email'].value, password: p1 } }); DOMElements.registerMessage.textContent = data.message; if (data.success) { DOMElements.registerForm.reset(); setTimeout(() => toggleAuthView(true), 2000); } }

    function handleLogout() {
        loggedInUser = null;
        DOMElements.appContainer.classList.add('hidden');
        DOMElements.authWrapper.classList.remove('hidden');
        DOMElements.notificationBellContainer.style.display = 'none';
        toggleAuthView(true);
        DOMElements.loginForm.reset();
        DOMElements.registerForm.reset();
    }

    // --------------------------------------------------------------------------------------------------
    // ⭐ وظائف التطبيق الداخلية (index.html)
    // --------------------------------------------------------------------------------------------------

    function showView(viewId) {
        DOMElements.views.forEach(view => view.classList.add('hidden'));
        document.getElementById(viewId).classList.remove('hidden');
        document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
        const activeNav = document.getElementById(`nav-${viewId.split('-')[0]}`);
        if (activeNav) activeNav.classList.add('active');

        if (viewId === 'dashboard-view') loadDashboard();
        else if (viewId === 'close-permit-view') loadUserPermits();
        else if (viewId === 'new-observation-view') DOMElements.obsIssuerField.value = `الملاحظ: ${loggedInUser}`;
        else if (viewId === 'close-observation-view') loadUserObservations();
        else if (viewId === 'new-nearmiss-view') DOMElements.nearMissIssuer.value = `المُبلغ: ${loggedInUser}`;
        else if (viewId === 'close-nearmiss-view') loadUserOpenNearMisses();
        else if (viewId === 'close-hazard-view') loadOpenHazardReports(); // تحميل تقارير الخطورة الإدارية
    }

    async function loadDashboard() {
        DOMElements.dashboardLoader.classList.remove('hidden');
        DOMElements.dashboardContent.classList.add('hidden');

        // ⭐⭐ حل مشكلة Canvas is already in use: تدمير الرسوم البيانية القديمة ⭐⭐
        if (permitsChartInstance) permitsChartInstance.destroy();
        if (observationsChartInstance) observationsChartInstance.destroy();

        permitsChartInstance = null;
        observationsChartInstance = null;
        // ----------------------------------------------------------------------

        const data = await apiCall({ action: "getDashboardData" }, false);

        if (data.success) {
            const d = data.data;

            // ⭐ تحديث الـ KPIs الخمسة
            DOMElements.kpiTotalPermits.textContent = d.kpi.totalPermits;
            DOMElements.kpiTotalObservations.textContent = d.kpi.totalObservations;
            DOMElements.kpiTotalNearMisses.textContent = d.kpi.totalNearMisses;
            DOMElements.kpiOpenHazards.textContent = d.kpi.openHazardReportsCount || 0;
            DOMElements.kpiClosedHazards.textContent = d.kpi.closedHazardReportsCount || 0;

            // 1. حالة التصاريح (Pie Chart)
            const permitCtx = document.getElementById('permitsStatusChart').getContext('2d');
            permitsChartInstance = new Chart(permitCtx, { type: 'pie', data: { labels: ['مفتوح', 'مغلق'], datasets: [{ data: [d.charts.permitsByStatus.Open, d.charts.permitsByStatus.Closed], backgroundColor: ['rgba(255, 159, 64, 0.8)', 'rgba(75, 192, 192, 0.8)'], borderColor: '#fff', borderWidth: 2 }] }, options: { responsive: true, plugins: { legend: { position: 'top' } } } });

            // 2. أنواع الملاحظات (Doughnut Chart)
            const obsCtx = document.getElementById('observationsChart').getContext('2d');
            observationsChartInstance = new Chart(obsCtx, { type: 'doughnut', data: { labels: Object.keys(d.charts.observationsByType), datasets: [{ data: Object.values(d.charts.observationsByType), backgroundColor: ['rgba(255, 99, 132, 0.8)', 'rgba(255, 206, 86, 0.8)', 'rgba(54, 162, 235, 0.8)'], borderColor: '#fff', borderWidth: 2 }] }, options: { responsive: true, plugins: { legend: { position: 'top' } } } });

            // تم حذف منطق الرسم البياني الثالث بالكامل

        }
        DOMElements.dashboardLoader.classList.add('hidden');
        DOMElements.dashboardContent.classList.remove('hidden');
    }

    async function handleNewPermit(e) { e.preventDefault(); if (!confirm('هل أنت متأكد من إصدار هذا التصريح؟')) return; const data = await apiCall({ action: "createPermit", permitData: { projectName: DOMElements.permitForm.elements.projectName.value, permitType: DOMElements.permitForm.elements.permitType.value, shift: DOMElements.permitForm.elements.shift.value, requester: DOMElements.permitForm.elements.requester.value, siteEngineer: DOMElements.permitForm.elements.siteEngineer.value, subcontractorName: DOMElements.permitForm.elements.subcontractorName.value, workLocation: DOMElements.permitForm.elements.workLocation.value, workersCount: DOMElements.permitForm.elements.workersCount.value, description: DOMElements.permitForm.elements.description.value, issuer: loggedInUser } }); alert(data.message); if (data.success) { DOMElements.permitForm.reset(); DOMElements.issuerField.value = `مصدر التصريح: ${loggedInUser}`; } }
    async function loadUserPermits() { DOMElements.permitsList.innerHTML = '<p>جاري التحميل...</p>'; const data = await apiCall({ action: "getUserPermits", username: loggedInUser }); if (data.success) { DOMElements.permitsList.innerHTML = ''; if (data.permits.length === 0) { DOMElements.permitsList.innerHTML = '<p>لا يوجد تصاريح مفتوحة.</p>'; return; } data.permits.forEach(p => { const card = document.createElement('div'); card.className = 'permit-card'; card.innerHTML = `<h4>${p.projectName} (ID: ${p.id})</h4><p><strong>الموقع:</strong> ${p.location}</p><p><strong>تاريخ الإصدار:</strong> ${p.permitDate}</p><p><strong>الوصف:</strong> ${p.description}</p><button class="btn close-btn" data-permit-id="${p.id}">✅ إغلاق التصريح</button>`; DOMElements.permitsList.appendChild(card); }); } }
    async function handleClosePermit(id) { if (!confirm('هل أنت متأكد من إغلاق هذا التصريح؟')) return; const data = await apiCall({ action: "closePermit", permitId: id, username: loggedInUser }); alert(data.message); if (data.success) { loadUserPermits(); } }
    async function handleNewObservation(e) { e.preventDefault(); if (!confirm('هل أنت متأكد من تسجيل هذه الملاحظة؟')) return; const data = await apiCall({ action: "createObservation", observationData: { projectName: DOMElements.observationForm.elements.obsProjectName.value, location: DOMElements.observationForm.elements.obsLocation.value, observationType: DOMElements.observationForm.elements.obsType.value, description: DOMElements.observationForm.elements.obsDescription.value, correctiveAction: DOMElements.observationForm.elements.obsCorrectiveAction.value, issuer: loggedInUser } }); alert(data.message); if (data.success) { DOMElements.observationForm.reset(); DOMElements.obsIssuerField.value = `الملاحظ: ${loggedInUser}`; } }
    async function loadUserObservations() { DOMElements.observationsList.innerHTML = '<p>جاري التحميل...</p>'; const data = await apiCall({ action: "getUserObservations", username: loggedInUser }); if (data.success) { DOMElements.observationsList.innerHTML = ''; if (data.observations.length === 0) { DOMElements.observationsList.innerHTML = '<p>لا يوجد ملاحظات مفتوحة.</p>'; return; } data.observations.forEach(obs => { const card = document.createElement('div'); card.className = 'observation-card'; card.innerHTML = `<h4>${obs.projectName} (ID: ${obs.id})</h4><p><strong>النوع:</strong> ${obs.type}</p><p><strong>التاريخ:</strong> ${obs.date}</p><p><strong>الوصف:</strong> ${obs.description}</p><button class="btn close-btn" data-observation-id="${obs.id}">✔️ إغلاق الملاحظة</button>`; DOMElements.observationsList.appendChild(card); }); } }
    async function handleCloseObservation(id) { if (!confirm('هل أنت متأكد من إغلاق هذه الملاحظة؟')) return; const data = await apiCall({ action: "closeObservation", observationId: id, username: loggedInUser }); alert(data.message); if (data.success) { loadUserObservations(); } }
    async function handleNewNearMiss(e) { e.preventDefault(); if (!confirm('هل أنت متأكد من تسجيل هذا التقرير؟')) return; const formData = new FormData(DOMElements.nearMissForm); const nearMissData = Object.fromEntries(formData.entries()); nearMissData.issuer = loggedInUser; const data = await apiCall({ action: "createNearMiss", nearMissData }); alert(data.message); if (data.success) { DOMElements.nearMissForm.reset(); DOMElements.nearMissIssuer.value = `المُبلغ: ${loggedInUser}`; } }
    async function loadUserOpenNearMisses() { DOMElements.nearMissesList.innerHTML = '<p>جاري التحميل...</p>'; const data = await apiCall({ action: "getUserNearMisses", username: loggedInUser }); if (data.success && data.nearMisses) { DOMElements.nearMissesList.innerHTML = ''; if (data.nearMisses.length === 0) { DOMElements.nearMissesList.innerHTML = '<p>لا يوجد تقارير مفتوحة.</p>'; return; } data.nearMisses.forEach(item => { const card = document.createElement('div'); card.className = 'nearmiss-card'; card.innerHTML = `<h4>${item.projectName} (ID: ${item.id})</h4><p><strong>التاريخ:</strong> ${item.dateTime}</p><p><strong>النوع:</strong> ${item.type}</p><p><strong>الوصف:</strong> ${item.description}</p><button class="btn close-btn" data-nearmiss-id="${item.id}">❕ إغلاق التقرير</button>`; DOMElements.nearMissesList.appendChild(card); }); } }
    async function handleCloseNearMiss(id) { const closingInfo = prompt("يرجى إدخال الإجراء التصحيحي النهائي لإغلاق هذا التقرير:"); if (closingInfo && closingInfo.trim() !== "") { const data = await apiCall({ action: "closeNearMiss", nearMissId: id, username: loggedInUser, closingInfo }); alert(data.message); if (data.success) loadUserOpenNearMisses(); } else if (closingInfo !== null) { alert("لا يمكن ترك حقل الإجراء التصحيحي فارغًا."); } }

    async function loadOpenHazardReports() {
        DOMElements.hazardReportsList.innerHTML = '<p>جاري التحميل...</p>';
        const data = await apiCall({ action: "getHazardReports" });

        if (data.success && data.reports) {
            DOMElements.hazardReportsList.innerHTML = '';
            if (data.reports.length === 0) {
                DOMElements.hazardReportsList.innerHTML = '<p>لا يوجد تقارير خطورة مفتوحة للمراجعة.</p>';
                return;
            }

            data.reports.forEach(report => {
                const card = document.createElement('div');
                card.className = 'permit-card';
                card.innerHTML = `
                    <h4>تقرير خطورة #${report.id} - ${report.hazardType}</h4>
                    <p><strong>المُبلِّغ:</strong> ${report.reporter} (${report.department})</p>
                    <p><strong>التاريخ والموقع:</strong> ${report.date} في ${report.location}</p>
                    <p><strong>الوصف:</strong> ${report.description}</p>
                    ${report.imageUrl ? `<p><a href="${report.imageUrl}" target="_blank">🖼️ عرض الصورة المرفقة</a></p>` : ''}
                    <button class="btn close-btn" data-report-id="${report.id}">✅ إغلاق التقرير</button>
                `;
                DOMElements.hazardReportsList.appendChild(card);
            });
        } else {
            DOMElements.hazardReportsList.innerHTML = `<p>فشل تحميل التقارير: ${data.message}</p>`;
        }
    }

    async function handleCloseHazardReport(id) {
        if (!confirm('هل أنت متأكد من إغلاق تقرير الخطورة هذا؟')) return;
        const data = await apiCall({ action: "closeHazardReport", reportId: id, username: loggedInUser });
        alert(data.message);
        if (data.success) {
            loadOpenHazardReports();
        }
    }

    async function handlePublicHazardReport(e) {
        if (!DOMElements.publicHazardForm) return;

        e.preventDefault();
        DOMElements.publicReportMessage.textContent = '';

        const formData = new FormData(DOMElements.publicHazardForm);
        const reportData = Object.fromEntries(formData.entries());
        let imageBase64 = null;

        const imageFile = formData.get('imageFile');
        if (imageFile && imageFile.size > 0) {
            showLoader(true);
            try {
                const reader = new FileReader();
                imageBase64 = await new Promise((resolve, reject) => {
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = error => reject(error);
                    reader.readAsDataURL(imageFile);
                });
            } catch (error) {
                showLoader(false);
                DOMElements.publicReportMessage.textContent = 'فشل في قراءة ملف الصورة. يرجى المحاولة مرة أخرى.';
                return;
            }
        }
        reportData.imageBase64 = imageBase64;

        const data = await apiCall({ action: "reportHazard", reportData });

        DOMElements.publicReportMessage.textContent = data.message;
        if (data.success) {
            DOMElements.publicHazardForm.reset();
        }
    }


    // --------------------------------------------------------------------------------------------------
    // ⭐ ربط الأحداث (Event Listeners) - المصدر الرئيسي لعمل التطبيق
    // --------------------------------------------------------------------------------------------------

    // 1. ربط نموذج الإبلاغ العام (يعمل إذا وجد العنصر في PublicReport.html أو index.html)
    if (DOMElements.publicHazardForm) {
        DOMElements.publicHazardForm.addEventListener('submit', handlePublicHazardReport);
    }

    // ⭐⭐ الأجزاء الرئيسية للمصادقة والتبديل (تعمل في index.html) ⭐⭐
    if (DOMElements.loginForm) DOMElements.loginForm.addEventListener('submit', handleLogin);
    if (DOMElements.registerForm) DOMElements.registerForm.addEventListener('submit', handleRegistration);
    if (DOMElements.showRegisterLink) DOMElements.showRegisterLink.addEventListener('click', () => toggleAuthView(false));
    if (DOMElements.showLoginLink) DOMElements.showLoginLink.addEventListener('click', () => toggleAuthView(true));
    if (DOMElements.logoutBtn) DOMElements.logoutBtn.addEventListener('click', handleLogout);

    // ⭐⭐ حل مشكلة زر القائمة (Hamburger Menu) ⭐⭐
    if (DOMElements.menuToggle && DOMElements.sidebar) {
        DOMElements.menuToggle.addEventListener('click', () => {
            DOMElements.sidebar.classList.toggle('active');
        });

        // إغلاق القائمة عند النقر على أي رابط داخلها
        DOMElements.sidebar.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    DOMElements.sidebar.classList.remove('active');
                }
            });
        });
    }

    // --------------------------------------------------------------------------------------------------
    // 3. ربط قوائم التنقل والإغلاق (تعمل في index.html)
    // --------------------------------------------------------------------------------------------------

    if (DOMElements.navDashboard) DOMElements.navDashboard.addEventListener('click', () => showView('dashboard-view'));
    if (DOMElements.navNewPermit) DOMElements.navNewPermit.addEventListener('click', () => showView('new-permit-view'));
    if (DOMElements.navClosePermit) DOMElements.navClosePermit.addEventListener('click', () => showView('close-permit-view'));
    if (DOMElements.navNewObservation) DOMElements.navNewObservation.addEventListener('click', () => showView('new-observation-view'));
    if (DOMElements.navCloseObservation) DOMElements.navCloseObservation.addEventListener('click', () => showView('close-observation-view'));
    if (DOMElements.navNewNearMiss) DOMElements.navNewNearMiss.addEventListener('click', () => showView('new-nearmiss-view'));
    if (DOMElements.navCloseNearMiss) DOMElements.navCloseNearMiss.addEventListener('click', () => showView('close-nearmiss-view'));
    if (DOMElements.navCloseHazard) DOMElements.navCloseHazard.addEventListener('click', () => showView('close-hazard-view'));

    if (DOMElements.navNewPublicReport) DOMElements.navNewPublicReport.addEventListener('click', (e) => {
        e.preventDefault();
        window.open('PublicReport.html', '_blank');
    });

    if (DOMElements.permitForm) DOMElements.permitForm.addEventListener('submit', handleNewPermit);
    if (DOMElements.observationForm) DOMElements.observationForm.addEventListener('submit', handleNewObservation);
    if (DOMElements.nearMissForm) DOMElements.nearMissForm.addEventListener('submit', handleNewNearMiss);

    if (DOMElements.notificationBellContainer) DOMElements.notificationBellContainer.addEventListener('click', () => { DOMElements.notificationPanel.classList.toggle('active'); });
    if (DOMElements.permitsList) DOMElements.permitsList.addEventListener('click', (e) => { if (e.target.classList.contains('close-btn')) { handleClosePermit(e.target.getAttribute('data-permit-id')); } });
    if (DOMElements.observationsList) DOMElements.observationsList.addEventListener('click', (e) => { if (e.target.classList.contains('close-btn')) { handleCloseObservation(e.target.getAttribute('data-observation-id')); } });
    if (DOMElements.nearMissesList) DOMElements.nearMissesList.addEventListener('click', (e) => { if (e.target.classList.contains('close-btn')) { handleCloseNearMiss(e.target.getAttribute('data-nearmiss-id')); } });
    if (DOMElements.hazardReportsList) DOMElements.hazardReportsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-btn')) {
            handleCloseHazardReport(e.target.getAttribute('data-report-id'));
        }
    });

    // ⭐ التشغيل الأولي لـ index.html
    if (DOMElements.authWrapper && !loggedInUser) {
        DOMElements.authWrapper.classList.remove('hidden');
    }
});
