document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('signup-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
  
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
  
      const username = usernameInput.value.trim();
      const password = passwordInput.value;
      const confirmPassword = confirmPasswordInput.value;
  
      if (!username || !password || !confirmPassword) {
        alert('모든 입력란을 채워주세요.');
        return;
      }
  
      if (password !== confirmPassword) {
        alert('비밀번호가 일치하지 않습니다.');
        return;
      }
  
      try {
        const res = await fetch('http://localhost:3000/signup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer mySecretToken123' // 실제 인증이 필요 없다면 이 줄은 지워도 됨
            },
            body: JSON.stringify({ title: username, password })
          });
          
  
        const result = await res.json();
        alert(result.message || result.error);
      } catch (error) {
        console.error('회원가입 요청 중 오류:', error);
        alert('회원가입 요청에 실패했습니다.');
      }
    });
  });
  