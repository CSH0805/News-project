document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
  
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
  
      const username = usernameInput.value.trim();
      const password = passwordInput.value;
  
      if (!username || !password) {
        alert('아이디와 비밀번호를 모두 입력해주세요.');
        return;
      }
  
      try {
        const res = await fetch('http://localhost:3000/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ title: username, password })
        });
  
        const result = await res.json();
  
        if (res.ok) {
          alert(result.message || '로그인 성공!');
          localStorage.setItem('token', result.token);             // ✅ 토큰 저장
          localStorage.setItem('userTitle', username);             // ✅ 사용자 ID 저장
          window.location.href = '/index.html';                    // ✅ 로그인 후 이동할 페이지
        } else {
          alert(result.error || '로그인 실패');
        }
      } catch (error) {
        console.error('로그인 요청 중 오류:', error);
        alert('서버와 연결 중 오류가 발생했습니다.');
      }
    });
  });
  