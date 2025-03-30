const express = require('express');
const axios = require('axios');
const app = express();

const API_KEY = '991b7e8bec1c4a6480969e62c151e50c';

// JSON 파싱을 위한 미들웨어
app.use(express.json());
// HTML 파일을 제공할 수 있게 설정
app.use(express.static(__dirname));

// 뉴스 API 데이터 가져오는 라우터 (기본 9개 가져오기)
app.get('/news', async (req, res) => {
    try {
      // 한국 뉴스 API 엔드포인트로 변경
      const response = await axios.get('https://api-v2.deepsearch.com/v1/articles', {
        headers: {
          'Authorization': `Bearer ${API_KEY}`
        },
        params: {
          language: 'ko', // 한국어 기사만 필터링
          publisher: '조선일보,중앙일보,연합뉴스,MBC,SBS,한국일보,경향신문,동아일보', // 더 많은 언론사 추가
          order: 'published_at',
          sort: 'desc',
          limit: 9, // 정확히 9개 요청
          fields: 'title,content,published_at,url,image_url,thumbnail,publisher'
        }
      });
      
      // 응답이 없거나 기사가 부족한 경우 추가 요청
      let newsArticles = response.data.data || [];
      
      // 9개 미만인 경우 다른 언론사나 기간으로 추가 요청
      if (newsArticles.length < 9) {
        console.log(`첫 번째 요청에서 ${newsArticles.length}개의 기사만 받음, 추가 기사 요청 중...`);
        
        // 다른 언론사 추가 요청
        const additionalResponse = await axios.get('https://api-v2.deepsearch.com/v1/articles', {
          headers: {
            'Authorization': `Bearer ${API_KEY}`
          },
          params: {
            language: 'ko',
            publisher: 'KBS,YTN,JTBC,TV조선,채널A,매일경제,한겨레,국민일보', // 다른 언론사 목록
            order: 'published_at',
            sort: 'desc',
            limit: 9 - newsArticles.length, // 필요한 만큼만 요청
            fields: 'title,content,published_at,url,image_url,thumbnail,publisher'
          }
        });
        
        const additionalArticles = additionalResponse.data.data || [];
        newsArticles = [...newsArticles, ...additionalArticles].slice(0, 9); // 정확히 9개로 제한
      }
      
      // 이미지 URL이 없는 기사에 기본 이미지 설정
      const newsWithImages = newsArticles.map(article => {
        if (!article.image_url && !article.thumbnail) {
          article.image_url = '/default-news-image.jpg'; // 기본 이미지 경로
        } else if (article.thumbnail && !article.image_url) {
          article.image_url = article.thumbnail;
        }
        return article;
      });
      
      console.log(`✅ 총 뉴스 개수: ${newsWithImages.length}`);
      
      // 결과 반환
      res.json({
        status: 'success',
        count: newsWithImages.length,
        data: newsWithImages
      });
    } catch (error) {
      console.error('❌ API 호출 오류:', error.response ? error.response.data : error.message);
      res.status(500).json({ error: error.message, data: [] });
    }
});
  
app.listen(3000, () => {
  console.log('서버가 http://localhost:3000에서 실행 중입니다.');
});