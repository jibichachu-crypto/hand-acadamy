/* HAND IN HAND ACADEMY - Settings JS */
(function(){
  'use strict';

  function getUserData(){
    try{
      const data = localStorage.getItem('hih_user');
      if(!data) return null;
      return JSON.parse(data);
    }catch(e){ return null; }
  }

  let user = getUserData();
  if(!user){
    const welcome = document.querySelector('.welcome');
    if(welcome){
      welcome.innerHTML = '<h2>Please Login First 🔒</h2><p>No user data found. Redirecting to login...</p>';
    }
    setTimeout(function(){ window.location.href = 'login.html'; }, 1500);
    return;
  }

  // Password form
  const pwdForm = document.getElementById('passwordForm');
  const currentPwd = document.getElementById('currentPwd');
  const newPwd = document.getElementById('newPwd');
  const confirmNewPwd = document.getElementById('confirmNewPwd');
  const pwdMessage = document.getElementById('pwdMessage');

  function showErr(id, text){
    const el = document.getElementById(id);
    if(el){ el.textContent = text; el.classList.add('show'); }
  }
  function clearPwdErrors(){
    document.querySelectorAll('#passwordForm .model-error').forEach(function(el){ el.textContent=''; el.classList.remove('show'); });
  }

  if(pwdForm){
    pwdForm.addEventListener('submit', function(e){
      e.preventDefault();
      clearPwdErrors();
      let valid = true;

      const curVal = currentPwd.value;
      const newVal = newPwd.value;
      const confVal = confirmNewPwd.value;

      if(!curVal){ showErr('currentPwd-error','Current password required'); valid=false; }
      if(!newVal){ showErr('newPwd-error','New password required'); valid=false; }
      else if(newVal.length < 8){ showErr('newPwd-error','Min 8 characters'); valid=false; }
      else if(!/[A-Z]/.test(newVal) || !/[0-9]/.test(newVal)){ showErr('newPwd-error','1 uppercase + 1 number required'); valid=false; }

      if(!confVal){ showErr('confirmNewPwd-error','Confirm password required'); valid=false; }
      else if(newVal !== confVal){ showErr('confirmNewPwd-error','Passwords do not match'); valid=false; }

      if(!valid) return;

      // Simulate password update
      if(pwdMessage){
        pwdMessage.textContent = '✅ Password updated successfully!';
        pwdMessage.className = 'model-message success show';
        pwdForm.reset();
        setTimeout(function(){ pwdMessage.classList.remove('show'); }, 3000);
      }
    });
  }

  // Notifications toggles
  ['emailNotif','smsNotif','courseReminder'].forEach(function(id){
    const el = document.getElementById(id);
    if(!el) return;
    // Load saved state
    try{
      const saved = localStorage.getItem('hih_' + id);
      if(saved !== null) el.checked = saved === 'true';
    }catch(e){}
    el.addEventListener('change', function(){
      try{ localStorage.setItem('hih_' + id, this.checked); }catch(e){}
      const notifMsg = document.getElementById('notifMessage');
      if(notifMsg){
        notifMsg.textContent = '✅ ' + id + ' ' + (this.checked ? 'enabled' : 'disabled');
        notifMsg.style.display = 'block';
        notifMsg.className = 'model-message success show';
        setTimeout(function(){ notifMsg.style.display='none'; }, 2000);
      }
    });
  });

  // Danger zone
  const deleteBtn = document.getElementById('deleteAccountBtn');
  const clearBtn = document.getElementById('clearDataBtn');
  const dangerMsg = document.getElementById('dangerMessage');

  if(clearBtn){
    clearBtn.addEventListener('click', function(){
      if(confirm('Clear all applications and local data? This cannot be undone.')){
        try{
          localStorage.removeItem('hih_applications');
          localStorage.removeItem('hih_selected_class');
          localStorage.removeItem('hih_selected_foundation');
          localStorage.removeItem('hih_bio');
        }catch(e){}
        if(dangerMsg){
          dangerMsg.textContent = '✅ All local data cleared';
          dangerMsg.className = 'model-message success show';
          setTimeout(function(){ dangerMsg.classList.remove('show'); }, 3000);
        }
      }
    });
  }

  if(deleteBtn){
    deleteBtn.addEventListener('click', function(){
      if(confirm('⚠️ PERMANENTLY DELETE ACCOUNT? This will delete all your data and logout. Are you sure?')){
        if(confirm('Last confirmation - Delete account permanently?')){
          try{
            localStorage.clear();
          }catch(e){}
          alert('Account deleted successfully');
          window.location.href = 'index.html';
        }
      }
    });
  }

  // Info
  try{
    const lastLoginEl = document.getElementById('lastLogin');
    const memberSinceEl = document.getElementById('memberSince');
    const storageUsedEl = document.getElementById('storageUsed');

    if(lastLoginEl) lastLoginEl.textContent = new Date().toLocaleDateString();
    if(memberSinceEl && user.at){
      memberSinceEl.textContent = new Date(user.at).getFullYear();
    }
    if(storageUsedEl){
      let total = 0;
      for(let key in localStorage){
        if(localStorage.hasOwnProperty(key)){
          total += localStorage[key].length;
        }
      }
      storageUsedEl.textContent = (total/1024).toFixed(2) + ' KB';
    }
  }catch(e){}

})();
