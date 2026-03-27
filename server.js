const path = require('path');

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');

// Load environment from dummy's own .env
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json());

// Serve static UI
app.use(express.static(path.join(__dirname, 'public')));

// Inline Student model (standalone, tidak bergantung pada folder backend)
const StudentSchema = new mongoose.Schema({
    studentId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
    active: { type: Boolean, default: true },
    claimedBy: { type: String, default: null },
    claimedByNormalized: { type: String, default: undefined, index: { unique: true, sparse: true } },
    nftTxHash: { type: String, default: null }
});
const Student = mongoose.models.Student || mongoose.model('Student', StudentSchema);

app.post('/api/generate-dummy', async (req, res) => {
    try {
        // Connect to DB if not connected
        if (mongoose.connection.readyState === 0) {
            let uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/evoting';
            // Force IPv4 if using localhost to avoid Node 18+ ::1 issues
            uri = uri.replace('localhost', '127.0.0.1');

            await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        }

        // Generate a random 4-digit number to avoid collisions
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const studentId = `2250${randomNum}`;
        const name = `Dummy User ${randomNum}`;
        const password = `password${randomNum}`;

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const newStudent = new Student({
            studentId,
            name,
            password: hashedPassword,
            claimedByNormalized: undefined,
            active: true
        });

        await newStudent.save();

        res.json({
            success: true,
            studentId,
            password,
            name
        });
    } catch (err) {
        console.error("Error generating dummy account:", err);
        let errorMsg = err.message;
        if (err.message.includes('ECONNREFUSED')) {
            errorMsg = 'Koneksi ke Database MongoDB gagal. Pastikan MongoDB sedang berjalan (port 27017).';
        }
        res.status(500).json({ success: false, error: errorMsg });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`✅ Dummy Generator running on port ${PORT}`);
    console.log(`👉 Buka http://localhost:${PORT} di browser Anda`);
    console.log(`🗄️  MongoDB URI: ${process.env.MONGO_URI || 'not set'}`);
});
