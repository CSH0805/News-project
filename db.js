// 뉴스 API (인증 적용)
app.get('/news', authenticateToken, async (req, res) => {
    // 기존 뉴스 API 코드 유지
});

// 회원가입 API (인증 적용)
app.post('/signup', authenticateToken, (req, res) => {
    const { title, password } = req.body;

    if (!title || !password) {
        return res.status(400).json({ error: 'ID(title)와 password를 입력해주세요.' });
    }

    const db = new sqlite3.Database('./database.db');

    const query = `INSERT INTO users (title, password) VALUES (?, ?)`;
    db.run(query, [title, password], function(err) {
        db.close();

        if (err) {
            console.error("❌ 회원가입 중 에러:", err.message);
            return res.status(500).json({ error: err.message });
        }

        console.log("✅ 회원가입 성공, 새 사용자 ID:", this.lastID);
        res.json({ message: "회원가입 성공", userId: this.lastID });
    });
});
