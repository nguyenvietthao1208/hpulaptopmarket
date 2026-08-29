// ============================================================
// Đăng ký / Đăng nhập (Email-Password + Google) / Đăng xuất.
// ============================================================
import { auth } from './firebase-init.js';
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  GoogleAuthProvider, signInWithPopup, updateProfile,
  fetchSignInMethodsForEmail, linkWithCredential, EmailAuthProvider,
  reauthenticateWithCredential, updatePassword, sendPasswordResetEmail,
  deleteUser
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { appDomain } from './firebase-config.js';
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from './firebase-init.js';
import { toast, mapAuthError } from './helpers.js';
import { closeModalsAndRefresh, openAuth, showNotification } from './modals.js';
import { fetchWhere } from './firestore-helpers.js';
import { sendPasswordResetCodeEmail } from './email.js';
import { nav } from './router.js';

function getResetSession(){
  try {
    const raw = sessionStorage.getItem('hpu_reset_session');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveResetSession(payload){
  sessionStorage.setItem('hpu_reset_session', JSON.stringify(payload));
}

function clearResetSession(){
  sessionStorage.removeItem('hpu_reset_session');
}

function generateResetCode(){
  return String(Math.floor(1000 + Math.random() * 9000));
}

async function submitRegister(e){
  e.preventDefault();
  const f = new FormData(e.target);
  const name=f.get('name').trim(), email=f.get('email').trim().toLowerCase(), phone=f.get('phone').trim(), password=f.get('password');
  try{
    const methods = await fetchSignInMethodsForEmail(auth, email);
    if (methods.length > 0) {
      if (methods.includes('google.com')) {
        toast('Email này đã được đăng ký bằng Google. Vui lòng dùng nút Đăng nhập bằng Google.', 'error');
        return false;
      }
      toast('Email này đã tồn tại. Vui lòng đăng nhập bằng tài khoản email/password.', 'error');
      return false;
    }

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName:name });
    await setDoc(doc(db,'users',cred.user.uid), { name, email, phone, role:'user', cart:[], dealsCompleted:0, ratingSum:0, ratingCount:0, createdAt: serverTimestamp() });
    toast('Đăng ký thành công, chào mừng '+name+'!','success');
    await closeModalsAndRefresh();
  }catch(err){ toast(mapAuthError(err),'error'); }
  return false;
}

async function submitLogin(e){
  e.preventDefault();
  const f=new FormData(e.target);
  const email=f.get('email').trim().toLowerCase(), password=f.get('password');
  try{
    await signInWithEmailAndPassword(auth, email, password);
    toast('Đăng nhập thành công!','success');
    await closeModalsAndRefresh();
  }catch(err){ toast(mapAuthError(err),'error'); }
  return false;
}

async function submitForgotPassword(e){
  e.preventDefault();
  const f = new FormData(e.target);
  const email = (f.get('email') || '').trim().toLowerCase();
  if(!email){ toast('Vui lòng nhập email.', 'error'); return false; }

  try{
    const users = await fetchWhere('users', 'email', '==', email);
    if(!users.length){
      toast('Email này không tồn tại trong hệ thống.', 'error');
      return false;
    }

    const code = generateResetCode();
    const mode = (auth.currentUser && auth.currentUser.email && auth.currentUser.email.toLowerCase() === email) ? 'logged-in' : 'guest';
    saveResetSession({ email, code, expiresAt: Date.now() + 5 * 60 * 1000, mode });

    const result = await sendPasswordResetCodeEmail({
      to_email: email,
      to_name: users[0].name || 'Người dùng',
      code,
      expires_in: '5 phút'
    });

    if(result.sent){
      toast('Mã xác thực 4 chữ số đã được gửi tới email của bạn.', 'success');
    }else if(result.skipped){
      toast('EmailJS chưa được cấu hình. Mã xác thực đã được tạo trong phiên này. Hãy cấu hình EmailJS để gửi qua email thật.', 'error');
    }else{
      toast('Không thể gửi email xác thực, vui lòng thử lại.', 'error');
      return false;
    }

    openAuth('forgot-verify');
  }catch(err){
    toast('Lỗi khi gửi mã xác thực: ' + (err && err.message ? err.message : err), 'error');
  }
  return false;
}

async function forgotCurrentPassword(){
  if(!auth.currentUser || !auth.currentUser.email){
    toast('Bạn chưa đăng nhập vào tài khoản nào.', 'error');
    return false;
  }

  try{
    const email = auth.currentUser.email.toLowerCase();
    const code = generateResetCode();
    saveResetSession({ email, code, expiresAt: Date.now() + 5 * 60 * 1000, mode: 'logged-in' });

    const result = await sendPasswordResetCodeEmail({
      to_email: email,
      to_name: auth.currentUser.displayName || 'Người dùng',
      code,
      expires_in: '5 phút'
    });

    if(result.sent){
      toast('Mã xác thực đã được gửi tới email của bạn.', 'success');
      openAuth('forgot-verify');
      return true;
    }
    if(result.skipped){
      toast('EmailJS chưa được cấu hình. Mã xác thực đã được lưu trong phiên hiện tại.', 'error');
      openAuth('forgot-verify');
      return true;
    }
    toast('Không thể gửi mã xác thực, vui lòng thử lại.', 'error');
    return false;
  }catch(err){
    toast('Lỗi khi gửi mã xác thực: ' + (err && err.message ? err.message : err), 'error');
    return false;
  }
}

async function submitForgotPasswordVerify(e){
  e.preventDefault();
  const f = new FormData(e.target);
  const otpInputs = Array.from(document.querySelectorAll('input[data-otp-index]'));
  const code = otpInputs.map(input => (input.value || '').trim()).join('');
  const newPassword = (f.get('newPassword') || '').trim();
  const confirmPassword = (f.get('confirmPassword') || '').trim();
  const resetSession = getResetSession();

  if(!resetSession){
    toast('Phiên xác thực không hợp lệ. Vui lòng gửi lại mã mới.', 'error');
    openAuth('forgot');
    return false;
  }

  if(Date.now() > resetSession.expiresAt){
    toast('Mã xác thực đã hết hạn. Vui lòng gửi lại mã mới.', 'error');
    clearResetSession();
    openAuth('forgot');
    return false;
  }

  if(!/^[0-9]{4}$/.test(code) || String(resetSession.code) !== String(code)){
    toast('Mã xác thực không đúng. Vui lòng nhập đủ 4 chữ số.', 'error');
    return false;
  }

  const isCurrentUserMatch = auth.currentUser && auth.currentUser.email && auth.currentUser.email.toLowerCase() === resetSession.email;
  const isLoggedInReset = resetSession.mode === 'logged-in' || isCurrentUserMatch;

  if(isLoggedInReset){
    // Logged-in user: change password directly
    if(!newPassword || newPassword.length < 6){
      toast('Mật khẩu mới phải có ít nhất 6 ký tự.', 'error');
      return false;
    }
    if(newPassword !== confirmPassword){
      toast('Mật khẩu mới và nhập lại mật khẩu mới không khớp.', 'error');
      return false;
    }

    try{
      const hasPasswordProvider = (auth.currentUser.providerData || []).some(p => p.providerId === 'password');
      if(!hasPasswordProvider){
        toast('Tài khoản hiện đang dùng Google. Hãy đăng nhập bằng email/password trước khi đổi mật khẩu.', 'error');
        return false;
      }

      await updatePassword(auth.currentUser, newPassword);
      clearResetSession();
      toast('Mật khẩu đã được đổi thành công.', 'success');
      await closeModalsAndRefresh();
      return false;
    }catch(err){
      toast(mapAuthError(err), 'error');
      return false;
    }
  }

  // Guest user: code verified, show notification and send reset email
  try{
    const actionCodeSettings = {
      url: `${appDomain}/#login?resetSuccess=true`,
      handleCodeInApp: false
    };
    await sendPasswordResetEmail(auth, resetSession.email, actionCodeSettings);
    clearResetSession();
    showNotification('Mã xác thực đúng!\n\nEmail đặt lại mật khẩu đã được gửi đến hộp thư của bạn.\n\nVui lòng kiểm tra email và click vào link để tạo mật khẩu mới.');
    setTimeout(() => {
      closeModalsAndRefresh();
    }, 3000);
  }catch(err){
    toast(mapAuthError(err), 'error');
  }

  return false;
}

async function submitForgotPasswordVerifyOldFlow(e){
  return submitForgotPasswordVerify(e);
}

async function signInGoogle(){
  try{
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const providerEmail = result.user?.email?.trim().toLowerCase();
    if (providerEmail) {
      const methods = await fetchSignInMethodsForEmail(auth, providerEmail);
      if (methods.length > 0 && !methods.includes('google.com')) {
        const password = window.prompt('Email này đã được đăng ký bằng tài khoản email/password. Vui lòng nhập mật khẩu để liên kết Google với tài khoản hiện có:');
        if (!password) {
          await auth.signOut?.();
          toast('Chưa nhập mật khẩu, liên kết Google bị hủy.', 'error');
          return;
        }
        try {
          const existingUser = await signInWithEmailAndPassword(auth, providerEmail, password);
          const credential = GoogleAuthProvider.credentialFromResult(result);
          await linkWithCredential(existingUser.user, credential);
          toast('Liên kết Google thành công!','success');
          await closeModalsAndRefresh();
          return;
        } catch (linkErr) {
          console.error('Liên kết Google thất bại:', linkErr);
          toast(mapAuthError(linkErr),'error');
          return;
        }
      }
    }

    toast('Đăng nhập Google thành công!','success');
    await closeModalsAndRefresh();
  }catch(err){
    if (err?.code === 'auth/account-exists-with-different-credential') {
      const email = err?.customData?.email || err?.email;
      if (email) {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods.includes('password')) {
          const password = window.prompt('Email này đã có tài khoản email/password. Nhập mật khẩu để kết nối Google với tài khoản hiện có:');
          if (!password) {
            toast('Bạn chưa nhập mật khẩu để liên kết tài khoản.', 'error');
            return;
          }
          try {
            const loginUser = await signInWithEmailAndPassword(auth, email, password);
            const credential = GoogleAuthProvider.credentialFromError(err);
            if (!credential) {
              toast('Không lấy được thông tin đăng nhập Google để liên kết.', 'error');
              return;
            }
            await linkWithCredential(loginUser.user, credential);
            toast('Liên kết tài khoản Google thành công!','success');
            await closeModalsAndRefresh();
            return;
          } catch (linkErr) {
            console.error('Liên kết tài khoản Google thất bại:', linkErr);
            toast(mapAuthError(linkErr), 'error');
            return;
          }
        }
      }
    }
    toast(mapAuthError(err),'error');
  }
}

async function logout(){
  await signOut(auth);
  toast('Đã đăng xuất.');
  await nav('home');
}

// ====== XÓA TÀI KHOẢN ======
// Bước 1: Xác nhận mật khẩu → gửi mã xác nhận 4 chữ số qua EmailJS
async function submitDeleteAccountStep1(e){
  e.preventDefault();
  if(!auth.currentUser || !auth.currentUser.email){
    toast('Bạn chưa đăng nhập.', 'error');
    return false;
  }
  const f = new FormData(e.target);
  const password = (f.get('password') || '').trim();
  if(!password){ toast('Vui lòng nhập mật khẩu.', 'error'); return false; }

  try{
    // Xác nhận mật khẩu trước khi cho phép xóa
    const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
    await reauthenticateWithCredential(auth.currentUser, credential);

    // Tạo mã xác nhận 4 chữ số
    const code = String(Math.floor(1000 + Math.random() * 9000));
    sessionStorage.setItem('hpu_delete_account_code', code);
    sessionStorage.setItem('hpu_delete_account_email', auth.currentUser.email);

    // Gửi mã xác nhận qua EmailJS
    const result = await sendDeleteAccountCodeEmail({
      to_email: auth.currentUser.email,
      to_name: auth.currentUser.displayName || auth.currentUser.name || 'Người dùng',
      code: code,
      expires_in: '5 phút'
    });

    if(result.sent){
      // Chuyển sang bước 2: nhập mã xác nhận
      if(typeof window !== 'undefined' && window.setDeleteAccountStep){
        window.setDeleteAccountStep(1);
      }
      toast('Mã xác nhận đã được gửi đến email của bạn.', 'success');
    }else if(result.skipped){
      toast('EmailJS chưa được cấu hình. Vui lòng liên hệ admin để xóa tài khoản.', 'error');
    }else{
      toast('Không thể gửi email xác nhận, vui lòng thử lại.', 'error');
    }
  }catch(err){
    toast(mapAuthError(err), 'error');
  }
  return false;
}

// Bước 2: Xác nhận mã → xóa tài khoản vĩnh viễn
async function submitDeleteAccountStep2(e){
  e.preventDefault();
  if(!auth.currentUser){ toast('Bạn chưa đăng nhập.', 'error'); return false; }

  // Đọc mã từ 4 ô input
  const otpInputs = Array.from(document.querySelectorAll('input[data-delete-otp-index]'));
  const code = otpInputs.map(input => (input.value || '').trim()).join('');

  const savedCode = sessionStorage.getItem('hpu_delete_account_code');
  const savedEmail = sessionStorage.getItem('hpu_delete_account_email');

  if(!savedCode || !savedEmail){
    toast('Phiên xác nhận đã hết hạn. Vui lòng thử lại.', 'error');
    if(typeof window !== 'undefined' && window.setDeleteAccountStep) window.setDeleteAccountStep(0);
    return false;
  }

  if(auth.currentUser.email !== savedEmail){
    toast('Tài khoản không khớp với phiên xác nhận.', 'error');
    return false;
  }

  if(!/^[0-9]{4}$/.test(code) || code !== savedCode){
    toast('Mã xác nhận không đúng. Vui lòng kiểm tra lại.', 'error');
    return false;
  }

  try{
    const uid = auth.currentUser.uid;

    // Xóa dữ liệu người dùng trong Firestore
    await deleteDoc(doc(db, 'users', uid));

    // Xóa tài khoản Firebase Authentication
    await deleteUser(auth.currentUser);

    // Dọn dẹp session
    sessionStorage.removeItem('hpu_delete_account_code');
    sessionStorage.removeItem('hpu_delete_account_email');

    toast('Tài khoản đã được xóa vĩnh viễn.', 'success');
    await nav('home');
  }catch(err){
    if(err.code === 'auth/requires-recent-login'){
      toast('Cần xác nhận lại mật khẩu. Vui lòng đăng nhập lại rồi thử lại.', 'error');
    }else{
      toast(mapAuthError(err), 'error');
    }
  }
  return false;
}

export { submitRegister, submitLogin, submitForgotPassword, submitForgotPasswordVerify, forgotCurrentPassword, signInGoogle, logout, submitDeleteAccountStep1, submitDeleteAccountStep2 };
