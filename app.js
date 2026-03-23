const app = {
    currentPage: 'home',
    cameraStream: null,
    
    formatName: (input) => {
        let val = input.value.toUpperCase().replace(/[^A-Z ]/g, '');
        if (val.startsWith(' ')) val = val.substring(1);
        let spaceCount = (val.match(/ /g) || []).length;
        if (spaceCount > 2) {
            let parts = val.split(' ');
            val = parts[0] + ' ' + parts[1] + ' ' + parts.slice(2).join('');
        }
        input.value = val;
    },

    formatReg: (input) => {
        input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    },

    formatPassword: (input) => {
        input.value = input.value.replace(/ /g, '');
    },

    toggleRegistrations: async (val) => {
        await storage.updateSettings({ registrationsOpen: val });
        app.showPage('admin');
    },

    toggleUploads: async (val) => {
        await storage.updateSettings({ uploadsOpen: val });
        app.showPage('admin');
    },

    handleResetTeams: async () => {
        if (confirm("DANGER! Are you entirely sure you want to delete ALL registrations? This cannot be undone!")) {
            await storage.deleteAllTeams();
            alert("All registrations have been permanently deleted.");
            app.showPage('admin');
        }
    },

    handleResetEntries: async () => {
        if (confirm("DANGER! Are you entirely sure you want to delete ALL uploaded competition photos? This cannot be undone!")) {
            await storage.deleteAllEntries();
            alert("All submissions have been permanently deleted.");
            app.showPage('admin');
        }
    },

    handleDeleteTeam: async (id) => {
        if (confirm("Are you sure you want to remove this registration permanently?")) {
            await storage.deleteTeam(id);
            app.showPage('admin');
        }
    },

    handleDeleteEntry: async (id) => {
        if (confirm("Are you sure you want to delete this specific competition photo?")) {
            await storage.deleteEntry(id);
            app.showPage('admin');
        }
    },

    showImageModal: (title, src) => {
        const modal = document.createElement('div');
        modal.className = 'glass-card animate';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.backgroundColor = 'rgba(0,0,0,0.85)';
        modal.style.zIndex = '9999';
        modal.style.display = 'flex';
        modal.style.flexDirection = 'column';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.margin = '0';
        modal.style.borderRadius = '0';
        modal.style.border = 'none';
        
        modal.innerHTML = `
            <div style="width: 100%; max-width: 800px; padding: 1rem; position: relative;">
                <button onclick="this.parentElement.parentElement.remove()" style="position: absolute; right: 1rem; top: -2rem; background: none; border: none; color: white; font-size: 2rem; cursor: pointer;">&times;</button>
                <h3 style="color: var(--accent); margin-bottom: 1rem; text-align: center;">${title}</h3>
                <img src="${src}" style="max-width: 100%; max-height: 70vh; display: block; margin: 0 auto; border-radius: 8px; border: 2px solid var(--glass-border);">
                <div style="text-align: center; margin-top: 1rem;">
                    <a href="${src}" download="${title.replace(/ /g, '_')}.jpg" class="btn btn-primary" style="text-decoration: none; display: inline-block;">Download Image</a>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },
    
    init: () => {
        console.log("App Initialized");
        app.showPage('home');
    },

    showPage: async (page) => {
        console.log(`Navigating to page: ${page}`);
        if (app.cameraStream && page !== 'register') {
            app.cameraStream.getTracks().forEach(t => t.stop());
            app.cameraStream = null;
        }
        const appContent = document.getElementById('app-content');
        const loginBtn = document.getElementById('login-nav-btn');
        app.currentPage = page;
        
        // Show login button only on home page
        if (loginBtn) {
            loginBtn.style.display = (page === 'home') ? 'block' : 'none';
        }
        
        try {
            if (page === 'home') {
                appContent.innerHTML = app.renderHome();
            } else if (page === 'register') {
                const settings = await storage.getSettings();
                if (settings.registrationsOpen === false) {
                    appContent.innerHTML = `<div class="glass-card animate" style="text-align: center; max-width: 600px; margin: 4rem auto;"><h2 style="color: var(--error); margin-bottom: 1rem;">Registrations Closed</h2><p style="color: var(--text-muted); margin-bottom: 2rem;">Participant registrations are currently paused by the admin. Please try again later.</p><button class="btn btn-primary" onclick="app.showPage('home')">Back to Home</button></div>`;
                } else {
                    appContent.innerHTML = app.renderRegister();
                    app.initCamera();
                }
            } else if (page === 'login') {
                appContent.innerHTML = app.renderLogin();
            } else if (page === 'admin-login') {
                appContent.innerHTML = app.renderAdminLogin();
            } else if (page === 'admin') {
                if (!sessionStorage.getItem('admin_session')) {
                    console.log("No admin session, redirecting to login");
                    app.showPage('admin-login');
                    return;
                }
                console.log("Admin session active, rendering dashboard...");
                appContent.innerHTML = await app.renderAdmin();
                console.log("Admin dashboard rendered");
            } else if (page === 'portal') {
                const settings = await storage.getSettings();
                if (settings.uploadsOpen === false) {
                    appContent.innerHTML = `<div class="glass-card animate" style="text-align: center; max-width: 600px; margin: 4rem auto;"><h2 style="color: var(--error); margin-bottom: 1rem;">Uploads Closed</h2><p style="color: var(--text-muted); margin-bottom: 2rem;">Competition uploads are currently placed on hold by the admin.</p><button class="btn btn-primary" onclick="app.showPage('home')">Back to Home</button></div>`;
                } else {
                    appContent.innerHTML = await app.renderPortal();
                }
            } else if (page === 'gallery') {
                appContent.innerHTML = await app.renderGallery();
            }
        } catch (error) {
            console.error(`Error displaying page ${page}:`, error);
            appContent.innerHTML = `<div class="glass-card" style="color: var(--error);">Error loading page: ${error.message}</div>`;
        }
        
        window.scrollTo(0, 0);
    },

    renderHome: () => `
        <section id="hero" class="animate" style="text-align: center; padding: 6rem 0;">
            <h1 style="font-size: 3.5rem; margin-bottom: 1.5rem; color: var(--accent);">Nature's Vision <span style="color: var(--text-main);">Competition</span></h1>
            <p style="font-size: 1.25rem; color: var(--text-muted); max-width: 700px; margin: 0 auto 2.5rem;">Unleash your creativity and capture the vibrant spirit of our campus. Join our exclusive college-wide nature photography competition and showcase the breathtaking beauty of our environment through your lens!</p>
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button class="btn btn-primary" onclick="app.showPage('register')">Enrol Team</button>
                <button class="btn btn-secondary" onclick="app.showPage('gallery')">Explore Gallery</button>
                <button class="btn btn-secondary" onclick="app.showPage('login')">Participant Login</button>
            </div>
        </section>
    `,

    renderRegister: () => `
        <div class="glass-card animate" style="max-width: 800px; margin: 2rem auto;">
            <h2 style="text-align: center; font-size: 2rem; margin-bottom: 2rem; color: var(--accent);">Team Enrollment</h2>
            <form id="registration-form" onsubmit="app.handleRegister(event)">
                <div class="form-grid">
                    <div class="form-group">
                        <label>Team Leader Name</label>
                        <input type="text" id="leader-name" required maxlength="50" oninput="app.formatName(this)">
                    </div>
                    <div class="form-group">
                        <label>Team Lead Register No.</label>
                        <input type="text" id="leader-reg" required placeholder="User ID for login" oninput="app.formatReg(this)">
                    </div>
                </div>

                <div class="form-grid">
                    <div class="form-group">
                        <label>Member 1 Name</label>
                        <input type="text" id="m1-name" maxlength="50" oninput="app.formatName(this)" placeholder="Member 1">
                    </div>
                    <div class="form-group">
                        <label>Member 1 Register No.</label>
                        <input type="text" id="m1-reg" oninput="app.formatReg(this)" placeholder="Reg No 1">
                    </div>
                </div>

                <div class="form-grid">
                    <div class="form-group">
                        <label>Member 2 Name</label>
                        <input type="text" id="m2-name" maxlength="50" oninput="app.formatName(this)" placeholder="Member 2">
                    </div>
                    <div class="form-group">
                        <label>Member 2 Register No.</label>
                        <input type="text" id="m2-reg" oninput="app.formatReg(this)" placeholder="Reg No 2">
                    </div>
                </div>

                <div class="form-grid">
                    <div class="form-group">
                        <label>Branch</label>
                        <select id="branch" required>
                            <option value="">Select Branch</option>
                            <option>Civil Engineering</option>
                            <option>Electrical & Electronics Engineering (EEE)</option>
                            <option>Mechanical Engineering</option>
                            <option>Electronics & Communication Engineering (ECE)</option>
                            <option>Computer Science & Engineering (CSE)</option>
                            <option>Information Technology (IT)</option>
                            <option>Electronics & Computer Engineering</option>
                            <option>CSE (Artificial Intelligence)</option>
                            <option>CSE (Data Science)</option>
                            <option>CSE (Cyber Security)</option>
                            <option>AIDS</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Section (Numbers only)</label>
                        <input type="number" id="section" required>
                    </div>
                </div>

                <div class="form-group">
                    <label>Set Password</label>
                    <input type="password" id="reg-password" required oninput="app.formatPassword(this)">
                </div>

                <div class="form-group">
                    <label>Upload Team Lead ID Card (JPEG, <4MB)</label>
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem;">Only the Team Leader's ID is required.</p>
                    <input type="file" id="id-uploads" accept="image/jpeg, image/jpg, .jpeg, .jpg" required>
                </div>

                <div class="form-group">
                    <label>Live Photo of Team Leader</label>
                    <div id="camera-container" style="width: 100%; height: 350px; background: rgba(0,0,0,0.3); border: 2px dashed var(--glass-border); border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; overflow: hidden; position: relative;">
                        <span id="camera-status" style="position: absolute; z-index: 10;">Waiting for camera...</span>
                        <video id="live-video" autoplay playsinline style="width: 100%; height: 100%; object-fit: cover;"></video>
                        <canvas id="live-canvas" style="display: none;"></canvas>
                    </div>
                    <button type="button" class="btn btn-secondary" onclick="app.captureLivePhoto()">Snap Live Photo</button>
                    <input type="hidden" id="live-photo-data" required>
                </div>

                <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Submit for Approval</button>
            </form>
        </div>
    `,

    handleRegister: async (event) => {
        event.preventDefault();
        const files = document.getElementById('id-uploads').files;
        for (let file of files) {
            if (file.type !== 'image/jpeg') {
                alert("Only JPEG images are allowed!");
                return;
            }
            if (file.size > 4 * 1024 * 1024) {
                alert(`File ${file.name} is too large (>4MB)!`);
                return;
            }
        }

        const submitBtn = document.querySelector('#registration-form button[type="submit"]');
        
        const livePhotoData = document.getElementById('live-photo-data').value;
        if (!livePhotoData) {
            alert("Please snap a live photo.");
            return;
        }

        const leaderReg = document.getElementById('leader-reg').value;
        const m1Reg = document.getElementById('m1-reg').value;
        const m2Reg = document.getElementById('m2-reg').value;
        
        const formRegs = [leaderReg, m1Reg, m2Reg].filter(r => r.length > 0);
        const regSet = new Set(formRegs);
        if (regSet.size !== formRegs.length) {
            alert("Error: Leader, Member 1, and Member 2 must all have unique registration numbers.");
            return;
        }

        submitBtn.innerText = "Verifying...";
        submitBtn.disabled = true;

        const allTeams = await storage.getTeams();
        const existingRegs = new Set();
        allTeams.forEach(t => {
            existingRegs.add(t.leaderRegNo);
            if(t.m1Reg) existingRegs.add(t.m1Reg);
            if(t.m2Reg) existingRegs.add(t.m2Reg);
        });
        
        let dupGlobal = formRegs.find(r => existingRegs.has(r));
        if (dupGlobal) {
            alert(`Error: Registration number ${dupGlobal} is already registered in the system!`);
            submitBtn.innerText = "Submit for Approval";
            submitBtn.disabled = false;
            return;
        }

        const idCardData = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(files[0]);
        });

        const team = {
            leaderName: document.getElementById('leader-name').value,
            leaderRegNo: leaderReg,
            m1Name: document.getElementById('m1-name').value,
            m1Reg: m1Reg,
            m2Name: document.getElementById('m2-name').value,
            m2Reg: m2Reg,
            branch: document.getElementById('branch').value,
            section: document.getElementById('section').value,
            password: document.getElementById('reg-password').value,
            livePhoto: livePhotoData,
            idCardPath: idCardData
        };

        submitBtn.innerText = "Sending...";
        await storage.saveTeam(team, files);
        
        submitBtn.innerText = "Sending Completed!";
        submitBtn.style.backgroundColor = "green";
        submitBtn.style.transition = "all 0.5s";
        submitBtn.style.transform = "scale(1.05)";

        setTimeout(() => {
            alert("Registration submitted! Admin will verify your ID cards and live photo.");
            app.showPage('home');
        }, 1500);
    },

    initCamera: async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            app.cameraStream = stream;
            const video = document.getElementById('live-video');
            if (video) {
                video.srcObject = stream;
                document.getElementById('camera-status').style.display = 'none';
            }
        } catch (err) {
            console.error("Camera access denied or error:", err);
            document.getElementById('camera-status').innerText = "Camera access needed!";
        }
    },

    captureLivePhoto: () => {
        const video = document.getElementById('live-video');
        const canvas = document.getElementById('live-canvas');
        if (!video || !video.videoWidth) {
            alert("Camera not ready.");
            return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        let sum = 0;
        
        for(let i = 0; i < data.length; i+=4) {
            sum += (0.299*data[i] + 0.587*data[i+1] + 0.114*data[i+2]);
        }
        let avg = sum / (canvas.width * canvas.height);
        let variance = 0;
        for(let i = 0; i < data.length; i+=4) {
            let lum = (0.299*data[i] + 0.587*data[i+1] + 0.114*data[i+2]);
            variance += Math.pow(lum - avg, 2);
        }
        variance = variance / (canvas.width * canvas.height);

        if (avg < 20 || variance < 50) {
            alert("Invalid photo. Please ensure a person is clearly visible, well-lit, and the camera is not blocked.");
            return;
        }

        document.getElementById('live-photo-data').value = canvas.toDataURL('image/jpeg', 0.8);
        document.getElementById('camera-status').innerText = "Captured!";
        document.getElementById('camera-status').style.display = 'block';
        alert("Live photo captured successfully!");
    },

    renderLogin: () => `
        <div class="glass-card animate" style="max-width: 400px; margin: 4rem auto;">
            <h2 style="text-align: center; font-size: 2rem; margin-bottom: 2rem; color: var(--accent);">Participant Login</h2>
            <form onsubmit="app.handleLogin(event)">
                <div class="form-group">
                    <label>Team Lead Register No.</label>
                    <input type="text" id="login-reg" required>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="login-pass" required>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%;">Access Portal</button>
            </form>
        </div>
    `,

    handleLogin: async (event) => {
        event.preventDefault();
        const regNo = document.getElementById('login-reg').value;
        const pass = document.getElementById('login-pass').value;
        const user = await storage.authenticate(regNo, pass);
        if (user) {
            sessionStorage.setItem('current_team', JSON.stringify(user));
            app.showPage('portal');
        } else {
            alert("Approval pending or invalid credentials.");
        }
    },

    renderAdminLogin: () => `
        <div class="glass-card animate" style="max-width: 400px; margin: 4rem auto;">
            <h2 style="text-align: center; font-size: 2rem; margin-bottom: 2rem; color: var(--nature-brown);">Admin Access</h2>
            <form onsubmit="app.handleAdminLogin(event)">
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" id="admin-user" required>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="admin-pass" required>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%; background: var(--nature-brown);">Login as Staff</button>
            </form>
        </div>
    `,

    handleAdminLogin: async (event) => {
        event.preventDefault();
        const user = document.getElementById('admin-user').value;
        const pass = document.getElementById('admin-pass').value;
        if (await storage.adminLogin(user, pass)) {
            sessionStorage.setItem('admin_session', 'active');
            app.showPage('admin');
        } else {
            alert("Invalid staff credentials.");
        }
    },

    renderAdmin: async () => {
        const teams = await storage.getTeams();
        const sortTeams = (a, b) => {
            if (a.branch < b.branch) return -1;
            if (a.branch > b.branch) return 1;
            return parseInt(a.section || 0) - parseInt(b.section || 0);
        };
        const entries = await storage.getEntries();
        const pendingTeams = teams.filter(t => t.status === 'pending').sort(sortTeams);
        const acceptedTeams = teams.filter(t => t.status === 'approved').sort(sortTeams);
        const settings = await storage.getSettings();
        const regsOpenStr = settings.registrationsOpen !== false;
        const upsOpenStr = settings.uploadsOpen !== false;
        
        return `
            <div class="animate" style="margin: 2rem 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                    <h2 style="font-size: 2rem; color: var(--accent);">Admin Dashboard</h2>
                    <button class="btn btn-secondary" onclick="sessionStorage.clear(); app.showPage('home')">Logout</button>
                </div>

                <div class="glass-card" style="margin-bottom: 2rem; border: 1px solid var(--accent);">
                    <h3 style="margin-bottom: 1.5rem; color: var(--accent);">Platform Controls</h3>
                    <div style="display: flex; gap: 1rem; align-items: center; justify-content: space-between; flex-wrap: wrap;">
                        <div style="display: flex; gap: 1rem;">
                            <button class="btn btn-${regsOpenStr ? 'secondary' : 'primary'}" style="background: ${regsOpenStr ? 'var(--error)' : 'var(--accent)'}; border-color: transparent; color: white;" onclick="app.toggleRegistrations(${!regsOpenStr})">
                                ${regsOpenStr ? 'Disable Registrations' : 'Enable Registrations'}
                            </button>
                            <button class="btn btn-${upsOpenStr ? 'secondary' : 'primary'}" style="background: ${upsOpenStr ? 'var(--error)' : 'var(--accent)'}; border-color: transparent; color: white;" onclick="app.toggleUploads(${!upsOpenStr})">
                                ${upsOpenStr ? 'Disable Uploads' : 'Enable Uploads'}
                            </button>
                        </div>
                        <div style="display: flex; gap: 1rem;">
                            <button class="btn" style="background: var(--error); color: white; border: none;" onclick="app.handleResetTeams()">Reset All Registrations</button>
                            <button class="btn" style="background: var(--error); color: white; border: none;" onclick="app.handleResetEntries()">Reset All Uploads</button>
                        </div>
                    </div>
                </div>

                <div class="glass-card" style="margin-bottom: 2rem;">
                    <h3 style="margin-bottom: 1.5rem;">Pending Registrations</h3>
                    ${pendingTeams.length === 0 ? '<p>No pending registrations.</p>' : `
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="border-bottom: 1px solid var(--glass-border); text-align: left;">
                                        <th style="padding: 1rem;">Branch/Sec</th>
                                        <th style="padding: 1rem;">Lead Info</th>
                                        <th style="padding: 1rem;">Member 1</th>
                                        <th style="padding: 1rem;">Member 2</th>
                                        <th style="padding: 1rem; text-align: center;">Data Viewer</th>
                                        <th style="padding: 1rem; text-align: center;">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${pendingTeams.map(team => `
                                        <tr style="border-bottom: 1px solid var(--glass-border);">
                                            <td style="padding: 1rem;"><strong>${team.branch}</strong><br><small>Sec: ${team.section}</small></td>
                                            <td style="padding: 1rem;"><strong>${team.leaderName}</strong><br><small>${team.leaderRegNo}</small></td>
                                            <td style="padding: 1rem;">${team.m1Name || '<i>N/A</i>'}<br><small>${team.m1Reg || ''}</small></td>
                                            <td style="padding: 1rem;">${team.m2Name || '<i>N/A</i>'}<br><small>${team.m2Reg || ''}</small></td>
                                            <td style="padding: 1rem;">
                                                <button class="btn btn-secondary" style="font-size: 0.8rem; margin-bottom: 0.5rem; width: 100%;" onclick="app.showImageModal('Team Lead ID Card', '${team.idCardPath || 'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?auto=format&fit=crop&w=800'}')">View ID Card</button>
                                                <button class="btn btn-secondary" style="font-size: 0.8rem; width: 100%;" onclick="app.showImageModal('Live Photo', '${team.livePhoto}')">View Live Photo</button>
                                            </td>
                                            <td style="padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
                                                <button class="btn btn-primary" style="background: var(--accent); color: var(--bg-dark); font-size: 0.8rem;" onclick="app.handleApprove('${team.leaderRegNo}')">Accept</button>
                                                <button class="btn btn-secondary" style="color: var(--error); font-size: 0.8rem;" onclick="app.handleReject('${team.id}')">Reject</button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>

                <div class="glass-card" style="margin-bottom: 2rem;">
                    <h3 style="margin-bottom: 1.5rem;">Accepted Teams</h3>
                    ${acceptedTeams.length === 0 ? '<p>No accepted registrations yet.</p>' : `
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="border-bottom: 1px solid var(--glass-border); text-align: left;">
                                        <th style="padding: 1rem;">Branch/Sec</th>
                                        <th style="padding: 1rem;">Lead Info</th>
                                        <th style="padding: 1rem;">Member 1</th>
                                        <th style="padding: 1rem;">Member 2</th>
                                        <th style="padding: 1rem; text-align: center;">Data Viewer</th>
                                        <th style="padding: 1rem; text-align: center;">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${acceptedTeams.map(team => `
                                        <tr style="border-bottom: 1px solid var(--glass-border);">
                                            <td style="padding: 1rem;"><strong>${team.branch}</strong><br><small>Sec: ${team.section}</small></td>
                                            <td style="padding: 1rem;"><strong>${team.leaderName}</strong><br><small>${team.leaderRegNo}</small></td>
                                            <td style="padding: 1rem;">${team.m1Name || '<i>N/A</i>'}<br><small>${team.m1Reg || ''}</small></td>
                                            <td style="padding: 1rem;">${team.m2Name || '<i>N/A</i>'}<br><small>${team.m2Reg || ''}</small></td>
                                            <td style="padding: 1rem;">
                                                <button class="btn btn-secondary" style="font-size: 0.8rem; margin-bottom: 0.5rem; width: 100%;" onclick="app.showImageModal('Team Lead ID Card', '${team.idCardPath || 'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?auto=format&fit=crop&w=800'}')">View ID Card</button>
                                                <button class="btn btn-secondary" style="font-size: 0.8rem; width: 100%;" onclick="app.showImageModal('Live Photo', '${team.livePhoto}')">View Live Photo</button>
                                            </td>
                                            <td style="padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem; align-items: center; justify-content: center; height: 100%;">
                                                <button class="btn btn-secondary" style="background: var(--error); color: white; border: none; font-size: 0.8rem; height: 100%;" onclick="app.handleDeleteTeam('${team.id}')">Remove</button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>

                <div class="glass-card">
                    <h3 style="margin-bottom: 1.5rem;">Competition Submissions</h3>
                    ${entries.length === 0 ? '<p>No competition photos yet.</p>' : `
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem;">
                            ${entries.map(entry => `
                                <div style="background: rgba(0,0,0,0.2); border-radius: 12px; padding: 1rem; border: 1px solid var(--glass-border);">
                                    <img src="${entry.photoPath}" alt="Entry" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 0.5rem; cursor: pointer;" onclick="app.showImageModal('Competition Entry - ${entry.leadName}', '${entry.photoPath}')">
                                    <h4 style="color: var(--accent); margin-top: 0.5rem; margin-bottom: 0;">${entry.leadName}</h4>
                                    <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">Reg No: <strong>${entry.leadRegNo}</strong></p>
                                    <button class="btn btn-secondary" style="width: 100%; font-size: 0.8rem; margin-top: 0.5rem;" onclick="app.showImageModal('EXIF Screenshot - ${entry.leadName}', '${entry.infoPath}')">View EXIF</button>
                                    <button class="btn btn-secondary" style="background: var(--error); color: white; border: none; width: 100%; font-size: 0.8rem; margin-top: 0.5rem;" onclick="app.handleDeleteEntry('${entry.id}')">Delete Photo</button>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>

                <div class="glass-card" style="margin-top: 2rem;">
                    <h3 style="margin-bottom: 1.5rem; color: var(--nature-brown);">Account Settings</h3>
                    <p style="margin-bottom: 1.5rem; font-size: 0.9rem; color: var(--text-muted);">Change your admin login credentials below.</p>
                    <form onsubmit="app.handleUpdateAdmin(event)" style="max-width: 400px;">
                        <div class="form-group">
                            <label>New Admin Username</label>
                            <input type="text" id="new-admin-user" placeholder="Leave blank to keep current">
                        </div>
                        <div class="form-group">
                            <label>New Admin Password</label>
                            <input type="password" id="new-admin-pass" placeholder="Leave blank to keep current">
                        </div>
                        <button type="submit" class="btn btn-primary" style="background: var(--nature-brown);">Update Credentials</button>
                    </form>
                </div>
            </div>
        `;
    },

    handleApprove: async (regNo) => {
        await storage.updateTeam(regNo, { status: 'approved' });
        app.showPage('admin');
    },

    handleReject: async (id) => {
        if (confirm("Are you sure you want to reject and delete this pending registration? This will allow them to re-register.")) {
            await storage.deleteTeam(id);
            app.showPage('admin');
        }
    },

    handleUpdateAdmin: async (event) => {
        event.preventDefault();
        const user = document.getElementById('new-admin-user').value.trim();
        const pass = document.getElementById('new-admin-pass').value.trim();
        
        if (!user && !pass) {
            alert("Please enter a new username or password.");
            return;
        }
        
        if (confirm("Are you sure you want to change the admin credentials? You will need to use these to login next time.")) {
            try {
                await storage.updateAdminConfig(user, pass);
                alert("Admin credentials updated successfully!");
                // Clear fields
                document.getElementById('new-admin-user').value = '';
                document.getElementById('new-admin-pass').value = '';
            } catch (error) {
                alert("Failed to update credentials.");
            }
        }
    },

    renderPortal: async () => {
        const team = JSON.parse(sessionStorage.getItem('current_team'));
        const alreadyUploaded = await storage.hasUploaded(team.leaderRegNo);

        if (alreadyUploaded) {
            return `
                <div class="glass-card animate" style="max-width: 600px; margin: 4rem auto; text-align: center;">
                    <h2 style="color: var(--accent); margin-bottom: 1rem;">Submission Received</h2>
                    <p style="color: var(--text-muted); margin-bottom: 2rem;">You have successfully submitted your masterpiece. Each team is strictly permitted to upload only one time.</p>
                    <button class="btn btn-primary" onclick="app.showPage('home')">Back to Home</button>
                </div>
            `;
        }

        return `
            <div class="glass-card animate" style="max-width: 600px; margin: 4rem auto;">
                <h2 style="text-align: center; color: var(--accent); margin-bottom: 1rem;">Welcome, ${team.leaderName}</h2>
                <p style="text-align: center; color: var(--text-muted); margin-bottom: 2rem;">Upload your nature photo (Mobile Only, <10MB). <strong>This can only be done once.</strong></p>
                
                <form onsubmit="app.handleUpload(event)">
                    <div class="form-group">
                        <label>Nature Competition Photo (Max 10MB)</label>
                        <p style="font-size: 0.8rem; color: var(--error); margin-bottom: 0.5rem; font-weight: 500;">
                            STRICT RULES: The photo must be original. No AI-generated images are allowed. No DSLR or standalone digital cameras allowed (Smartphone cameras ONLY).
                        </p>
                        <input type="file" id="comp-photo" accept="image/*" required>
                    </div>
                    <div class="form-group">
                        <label>Photo Info / EXIF Screenshot (Verification)</label>
                        <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem;">Please upload a screenshot of your image details to prove it was taken on mobile.</p>
                        <input type="file" id="info-screenshot" accept="image/*" required>
                    </div>
                    <div class="form-group">
                        <label>Title</label>
                        <input type="text" id="photo-title" required>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%;">Submit Masterpiece</button>
                </form>
            </div>
        `;
    },

    handleUpload: async (event) => {
        event.preventDefault();
        const team = JSON.parse(sessionStorage.getItem('current_team'));
        
        const alreadyUploaded = await storage.hasUploaded(team.leaderRegNo);
        if (alreadyUploaded) {
            alert("Your team has already uploaded a photo. You cannot upload multiple entries.");
            app.showPage('portal');
            return;
        }

        const submitBtn = document.querySelector('form button[type="submit"]');
        submitBtn.innerText = "Uploading...";
        submitBtn.disabled = true;

        const photoFile = document.getElementById('comp-photo').files[0];
        const infoFile = document.getElementById('info-screenshot').files[0];
        
        if (photoFile.size > 10 * 1024 * 1024) {
            alert("Competition photo must be less than 10MB!");
            submitBtn.innerText = "Submit Masterpiece";
            submitBtn.disabled = false;
            return;
        }
        
        const isCameraOrAI = await new Promise((resolve) => {
            EXIF.getData(photoFile, function() {
                const make = EXIF.getTag(this, "Make") || "";
                const model = EXIF.getTag(this, "Model") || "";
                const software = EXIF.getTag(this, "Software") || "";
                
                const makeLower = String(make).toLowerCase();
                const modelLower = String(model).toLowerCase();
                const softwareLower = String(software).toLowerCase();
                
                const dslrBrands = ['canon', 'nikon', 'sony', 'fujifilm', 'panasonic', 'olympus', 'leica', 'pentax'];
                const isDSLR = dslrBrands.some(brand => makeLower.includes(brand) || modelLower.includes(brand));
                
                const editingSoftware = ['photoshop', 'adobe', 'lightroom', 'midjourney', 'dall-e', 'dalle', 'stable diffusion'];
                const isEditedOrAI = editingSoftware.some(sw => softwareLower.includes(sw));
                
                // Return true if it fails the authenticity check
                resolve(isDSLR || isEditedOrAI);
            });
        });

        if (isCameraOrAI) {
            alert("STRICT RULES VIOLATION: DSLR, digitally modified, or AI-generated images are strictly prohibited! Smartphone authentic original photos ONLY.");
            submitBtn.innerText = "Submit Masterpiece";
            submitBtn.disabled = false;
            return;
        }
        
        const getBase64 = (file) => new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });

        const photoData = await getBase64(photoFile);
        const infoData = await getBase64(infoFile);

        const entry = {
            title: document.getElementById('photo-title').value,
            leadName: team.leaderName,
            leadRegNo: team.leaderRegNo,
            photoPath: photoData,
            infoPath: infoData
        };

        await storage.saveEntry(entry);
        
        submitBtn.innerText = "Upload Complete!";
        submitBtn.style.backgroundColor = "green";

        setTimeout(() => {
            alert("Entry successfully uploaded! Admin will verify the EXIF source.");
            app.showPage('home');
        }, 1500);
    },

    renderGallery: async () => {
        const entries = await storage.getEntries();
        return `
            <div class="animate" style="padding: 4rem 0; text-align: center;">
                <h2 style="font-size: 2.5rem; color: var(--accent); margin-bottom: 2rem;">Competition Gallery</h2>
                ${entries.length === 0 ? '<p style="color: var(--text-muted);">No entries yet. The gallery will be revealed once the judging phase begins.</p>' : `
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; max-width: 1000px; margin: 0 auto;">
                        ${entries.map(entry => `
                            <div class="glass-card" style="padding: 1rem;">
                                <img src="${entry.photoPath}" alt="${entry.title}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 0.75rem;">
                                <h4 style="color: var(--accent); margin-bottom: 0.5rem;">${entry.title}</h4>
                                <p style="font-size: 0.85rem; color: var(--text-muted);">By: ${entry.leadName}</p>
                            </div>
                        `).join('')}
                    </div>
                `}
                <button class="btn btn-primary" style="margin-top: 2rem;" onclick="app.showPage('home')">Back to Home</button>
            </div>
        `;
    }
};

window.onload = app.init;
window.app = app;
