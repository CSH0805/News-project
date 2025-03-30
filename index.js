const express = require('express');
const axios = require('axios');
const app = express();

const API_KEY = '991b7e8bec1c4a6480969e62c151e50c';

app.use(express.json());
app.use(express.static(__dirname));

app.get('/news', async (req, res) => {
    try {
      const response = await axios.get('https://api-v2.deepsearch.com/v1/articles', {
        headers: {
          'Authorization': `Bearer ${API_KEY}`
        },
        params: {
          order: 'published_at',
          sort: 'desc',
          limit: 10, // 기본값으로 10개 요청
          fields: 'title,published_at,url,image_url,thumbnail,publisher'
        }
      });
  
      let articles = response.data.data || [];
  
      console.log('🚩 실제 API 응답 데이터:', articles);
  
      res.json({
        status: 'success',
        count: articles.length,
        data: articles
      });
    } catch (error) {
      console.error('❌ API 호출 오류:', error.response ? error.response.data : error.message);
      res.status(500).json({ error: error.message, data: [] });
    }
  });
  
  

app.listen(3000, () => {
  console.log('서버가 http://localhost:3000에서 실행 중입니다.');
});
