// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAsM0epDpTfqPaM2vAxO4TJdi8-CoS0q5k",
    authDomain: "bestphotocomp.firebaseapp.com",
    databaseURL: "https://bestphotocomp-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "bestphotocomp",
    storageBucket: "bestphotocomp.firebasestorage.app",
    messagingSenderId: "555094770080",
    appId: "1:555094770080:web:afca5536331b452850e4c5"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const storageBucket = firebase.storage();

const storage = {
    getTeams: async () => {
        try {
            console.log("Fetching teams...");
            const snapshot = await db.ref('teams').once('value');
            console.log("Teams fetched successfully");
            const data = snapshot.val() || {};
            return Object.values(data);
        } catch (error) {
            console.error("Error fetching teams:", error);
            throw error;
        }
    },

    saveTeam: async (team, files) => {
        const newTeamRef = db.ref('teams').push();
        const teamId = newTeamRef.key;
        
        // Upload ID Cards to Firebase Storage (Simulated for brevity in this step)
        // In a real app, you'd use storageBucket.ref(`ids/${teamId}/${file.name}`).put(file)
        
        await newTeamRef.set({
            ...team,
            id: teamId,
            status: 'pending',
            regDate: new Date().toISOString()
        });
        return { success: true };
    },

    updateTeam: async (regId, updates) => {
        // Find the team with this leaderRegNo
        const snapshot = await db.ref('teams').once('value');
        const teams = snapshot.val();
        let firebaseKey = null;
        for (let key in teams) {
            if (teams[key].leaderRegNo === regId) {
                firebaseKey = key;
                break;
            }
        }
        if (firebaseKey) {
            await db.ref(`teams/${firebaseKey}`).update(updates);
        }
    },

    authenticate: async (regNo, password) => {
        const snapshot = await db.ref('teams').once('value');
        const teams = snapshot.val();
        for (let key in teams) {
            if (teams[key].leaderRegNo === regNo && teams[key].password === password) {
                if (teams[key].status === 'approved') return teams[key];
            }
        }
        return null;
    },

    getEntries: async () => {
        try {
            console.log("Fetching entries...");
            const snapshot = await db.ref('entries').once('value');
            console.log("Entries fetched successfully");
            const data = snapshot.val() || {};
            return Object.values(data);
        } catch (error) {
            console.error("Error fetching entries:", error);
            throw error;
        }
    },

    saveEntry: async (entry) => {
        const newEntryRef = db.ref('entries').push();
        
        await newEntryRef.set({
            ...entry,
            id: newEntryRef.key,
            timestamp: new Date().toISOString()
        });
    },

    adminLogin: async (username, password) => {
        try {
            const snapshot = await db.ref('admin_config').once('value');
            const config = snapshot.val();
            
            // Default credentials if not set in Firebase
            const defaultUser = 'admin';
            const defaultPass = 'nature2026';
            
            if (!config) {
                return username === defaultUser && password === defaultPass;
            }
            
            return username === config.username && password === config.password;
        } catch (error) {
            console.error("Error during admin login:", error);
            return username === 'admin' && password === 'nature2026';
        }
    },

    updateAdminConfig: async (username, password) => {
        try {
            const snapshot = await db.ref('admin_config').once('value');
            const currentConfig = snapshot.val() || { username: 'admin', password: 'nature2026' };
            
            const updates = { updatedAt: new Date().toISOString() };
            if (username) updates.username = username;
            if (password) updates.password = password;

            await db.ref('admin_config').set({
                ...currentConfig,
                ...updates
            });
            return { success: true };
        } catch (error) {
            console.error("Error updating admin config:", error);
            throw error;
        }
    },

    getSettings: async () => {
        try {
            const snapshot = await db.ref('app_settings').once('value');
            const data = snapshot.val();
            if (!data) return { registrationsOpen: true, uploadsOpen: true };
            return data;
        } catch (error) {
            console.error("Error fetching settings:", error);
            return { registrationsOpen: true, uploadsOpen: true };
        }
    },

    updateSettings: async (updates) => {
        try {
            await db.ref('app_settings').update(updates);
            return { success: true };
        } catch (error) {
            console.error("Error updating settings:", error);
            throw error;
        }
    },

    deleteTeam: async (id) => {
        try {
            await db.ref(`teams/${id}`).remove();
        } catch (error) {
            console.error("Error deleting team:", error);
            throw error;
        }
    },

    deleteEntry: async (id) => {
        try {
            await db.ref(`entries/${id}`).remove();
        } catch (error) {
            console.error("Error deleting entry:", error);
            throw error;
        }
    },

    deleteAllTeams: async () => {
        try {
            await db.ref('teams').remove();
        } catch (error) {
            console.error("Error deleting all teams:", error);
            throw error;
        }
    },

    deleteAllEntries: async () => {
        try {
            await db.ref('entries').remove();
        } catch (error) {
            console.error("Error deleting all entries:", error);
            throw error;
        }
    },

    hasUploaded: async (regNo) => {
        try {
            const entries = await storage.getEntries();
            return entries.some(e => e.leadRegNo === regNo);
        } catch (error) {
            console.error("Error checking uploads:", error);
            return false;
        }
    }
};

window.storage = storage;
