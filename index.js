const express = require('express');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const bcrypt = require('bcrypt'); // bcrypt 모듈 추가
require('dotenv').config(); // 추가!

const API_KEY = process.env.API_KEY;         // .env 파일에서 읽기
const AUTH_TOKEN = process.env.AUTH_TOKEN;    // .env 파일에서 읽기

app.use(express.json());
app.use(express.static(__dirname));

// 인증 미들웨어
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization 헤더가 없습니다.' });
  }

  const token = authHeader.split(' ')[1];

  if (token !== AUTH_TOKEN) {
    return res.status(403).json({ error: '유효하지 않은 인증 토큰입니다.' });
  }

  next();
};

// 뉴스 API (공개)
app.get('/news', async (req, res) => {
    try {
        let articles = [];
        let page = 1;

        while (articles.length < 9 && page <= 5) {
            const response = await axios.get('https://api-v2.deepsearch.com/v1/articles', {
                headers: { 'Authorization': `Bearer ${API_KEY}` },
                params: {
                    order: 'published_at',
                    sort: 'desc',
                    limit: 20,
                    fields: 'title,published_at,content_url,image_url,thumbnail_url,publisher',
                    page: page
                }
            });

            const fetchedArticles = response.data.data.filter(article =>
                (article.image_url || article.thumbnail_url) &&
                article.content_url &&
                article.publisher !== 'N뉴스' &&
                /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(article.title)
            );

            articles.push(...fetchedArticles);
            page++;
        }

        articles = articles.slice(0, 9);

        res.json({
            status: 'success',
            count: articles.length,
            data: articles
        });
    } catch (error) {
        console.error('❌ API 호출 오류:', error.message);
        res.status(500).json({ error: error.message, data: [] });
    }
});

// 회원가입 API (인증 필요)
app.post('/signup', authenticateToken, async (req, res) => {
    const { title, password } = req.body;

    if (!title || !password) {
        return res.status(400).json({ error: 'ID(title)와 password를 입력해주세요.' });
    }

    // bcrypt로 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10); // 숫자 10은 해싱 반복 횟수 (권장)

    const db = new sqlite3.Database('./database.db');

    const query = `INSERT INTO users (title, password) VALUES (?, ?)`;
    db.run(query, [title, hashedPassword], function(err) {
        db.close();

        if (err) {
            console.error("❌ 회원가입 중 에러:", err.message);
            return res.status(500).json({ error: err.message });
        }

        console.log("✅ 회원가입 성공, 새 사용자 ID:", this.lastID);
        res.json({ message: "회원가입 성공", userId: this.lastID });
    });
});

// 서버 실행
app.listen(3000, () => {
    console.log('서버가 http://localhost:3000에서 실행 중입니다.');
});
