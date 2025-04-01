const express = require('express');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const bcrypt = require('bcrypt'); // bcrypt 모듈 추가
require('dotenv').config(); // 추가!
const jwt = require('jsonwebtoken'); // 추가
const cors = require('cors'); // ✅ 추가
  // ✅ 모든 도메인에서 오는 요청 허용
  app.use(cors());

const API_KEY = process.env.API_KEY;         // .env 파일에서 읽기
const AUTH_TOKEN = process.env.AUTH_TOKEN;    // .env 파일에서 읽기
const JWT_SECRET = process.env.JWT_SECRET;




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
// ✅ 인증 없이 누구나 회원가입 가능
app.post('/signup', async (req, res) => {
    const { title, password } = req.body;
  
    if (!title || !password) {
      return res.status(400).json({ error: 'ID(title)와 password를 입력해주세요.' });
    }
  
    const hashedPassword = await bcrypt.hash(password, 10);
  
    const db = new sqlite3.Database('./database.db');
    const query = `INSERT INTO users (title, password) VALUES (?, ?)`;
  
    db.run(query, [title, hashedPassword], function (err) {
      db.close();
  
      if (err) {
        console.error("❌ 회원가입 중 에러:", err.message);
        return res.status(500).json({ error: err.message });
      }
  
      console.log("✅ 회원가입 성공, 새 사용자 ID:", this.lastID);
      res.json({ message: "회원가입 성공", userId: this.lastID });
    });
  });
  
  

app.post('/login', (req, res) => {
    const { title, password } = req.body;

    if (!title || !password) {
        return res.status(400).json({ error: 'ID(title)와 password를 입력해주세요.' });
    }

    const db = new sqlite3.Database('./database.db');

    const query = `SELECT * FROM users WHERE title = ?`;
    db.get(query, [title], async (err, user) => {
        db.close();

        if (err) {
            console.error("❌ 로그인 중 DB 에러:", err.message);
            return res.status(500).json({ error: err.message });
        }

        if (!user) {
            return res.status(401).json({ error: '등록되지 않은 사용자입니다.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
        }

        const token = jwt.sign(
            { id: user.id, title: user.title },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            message: '로그인 성공!',
            token: token
        });
    });
});


const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: '토큰이 없습니다.' });
  
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded; // 사용자 정보 요청에 저장
      next();
    } catch (err) {
      return res.status(403).json({ error: '유효하지 않은 토큰입니다.' });
    }
  };
  
  // 게시글 작성 API
  app.post('/articles', authenticateJWT, (req, res) => {
    const { title, content } = req.body;
    const userId = req.user.id;
  
    if (!title || !content) {
      return res.status(400).json({ error: '제목과 내용을 모두 입력해주세요.' });
    }
  
    const db = new sqlite3.Database('./database.db');
  
    const query = `INSERT INTO articles (title, content, user_id) VALUES (?, ?, ?)`;
    db.run(query, [title, content, userId], function (err) {
      db.close();
  
      if (err) {
        console.error("❌ 게시글 저장 오류:", err.message);
        return res.status(500).json({ error: err.message });
      }
  
      res.json({
        message: '게시글이 작성되었습니다.',
        articleId: this.lastID
      });
    });
  });


  // 게시글 삭제 API (작성자만 삭제 가능)
app.delete('/articles/:id', authenticateJWT, (req, res) => {
    const articleId = req.params.id;        // 삭제하려는 게시글 ID
    const userId = req.user.id;             // JWT 토큰에서 추출한 로그인한 사용자 ID
  
    const db = new sqlite3.Database('./database.db');
  
    // 1. 해당 게시글이 존재하는지 확인
    db.get(`SELECT * FROM articles WHERE id = ?`, [articleId], (err, article) => {
      if (err) {
        db.close();
        return res.status(500).json({ error: '데이터베이스 오류입니다.' });
      }
  
      if (!article) {
        db.close();
        return res.status(404).json({ error: '해당 게시글을 찾을 수 없습니다.' });
      }
  
      // 2. 로그인한 사용자가 게시글의 작성자인지 확인
      if (article.user_id !== userId) {
        db.close();
        return res.status(403).json({ error: '본인이 작성한 게시글만 삭제할 수 있습니다.' });
      }
  
      // 3. 삭제 실행
      db.run(`DELETE FROM articles WHERE id = ?`, [articleId], function (deleteErr) {
        db.close();
  
        if (deleteErr) {
          return res.status(500).json({ error: '게시글 삭제 중 오류가 발생했습니다.' });
        }
  
        res.json({ message: '게시글이 성공적으로 삭제되었습니다.' });
      });
    });
  });
  

  // 댓글 작성 API
app.post('/articles/:id/comments', authenticateJWT, (req, res) => {
    const articleId = req.params.id;
    const userId = req.user.id;
    const { content } = req.body;
  
    if (!content) {
      return res.status(400).json({ error: '댓글 내용을 입력해주세요.' });
    }
  
    const db = new sqlite3.Database('./database.db');
  
    // 먼저 게시글이 존재하는지 확인
    db.get(`SELECT * FROM articles WHERE id = ?`, [articleId], (err, article) => {
      if (err) {
        db.close();
        return res.status(500).json({ error: 'DB 오류입니다.' });
      }
  
      if (!article) {
        db.close();
        return res.status(404).json({ error: '해당 게시글이 존재하지 않습니다.' });
      }
  
      // 댓글 저장
      const insertQuery = `INSERT INTO comments (article_id, user_id, content) VALUES (?, ?, ?)`;
      db.run(insertQuery, [articleId, userId, content], function (insertErr) {
        db.close();
  
        if (insertErr) {
          return res.status(500).json({ error: '댓글 저장 중 오류가 발생했습니다.' });
        }
  
        res.json({ message: '댓글이 작성되었습니다.', commentId: this.lastID });
      });
    });
  });
  

  // 댓글 삭제 API
app.delete('/comments/:id', authenticateJWT, (req, res) => {
    const commentId = req.params.id;
    const userId = req.user.id;
  
    const db = new sqlite3.Database('./database.db');
  
    // 1. 댓글이 존재하는지 확인
    db.get(`SELECT * FROM comments WHERE id = ?`, [commentId], (err, comment) => {
      if (err) {
        db.close();
        return res.status(500).json({ error: 'DB 오류입니다.' });
      }
  
      if (!comment) {
        db.close();
        return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
      }
  
      // 2. 작성자인지 확인
      if (comment.user_id !== userId) {
        db.close();
        return res.status(403).json({ error: '본인이 작성한 댓글만 삭제할 수 있습니다.' });
      }
  
      // 3. 삭제
      db.run(`DELETE FROM comments WHERE id = ?`, [commentId], function (deleteErr) {
        db.close();
  
        if (deleteErr) {
          return res.status(500).json({ error: '댓글 삭제 중 오류가 발생했습니다.' });
        }
  
        res.json({ message: '댓글이 삭제되었습니다.' });
      });
    });
  });
  

  
  // ✅ 모든 도메인에서 오는 요청 허용
  app.use(cors());
  
  app.use(express.json());
  app.use(express.static(__dirname));
  

// 서버 실행
app.listen(3000, () => {
    console.log('서버가 http://localhost:3000에서 실행 중입니다.');
});