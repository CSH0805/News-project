const express = require('express');
const axios = require('axios');
const app = express();

const API_KEY = '991b7e8bec1c4a6480969e62c151e50c';

app.use(express.json());
app.use(express.static(__dirname));

app.get('/news', async (req, res) => {
    try {
        let articles = [];
        let page = 1;

        while (articles.length < 9 && page <= 5) {  // 페이지 요청을 늘려 충분히 필터링
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
                article.publisher !== 'N뉴스' &&  // ✔ N뉴스 매체 제외
                /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(article.title)  // ✔ 제목에 한글이 포함된 뉴스만 허용
            );

            articles.push(...fetchedArticles);
            page++;
        }

        articles = articles.slice(0, 9);

        console.log('✅ 필터링된 최종 뉴스 개수:', articles.length);

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
