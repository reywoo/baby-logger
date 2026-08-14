import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Shield, X, AlertCircle, CheckCircle, RefreshCw, ArrowLeft, ShieldAlert, KeyRound, LogOut, Globe, Sparkles } from 'lucide-react';
import ReywooLogo from './ReywooLogo';
import LanguageToggle from './LanguageToggle';

export default function AdminAccountManager({ currentUser, getAuthHeaders, onClose, onLogout, isStandalonePage = true, lang = 'zh', setLang }) {
  const [accounts, setAccounts] = useState([]);
  const [googleAccountsCount, setGoogleAccountsCount] = useState(0);
  const [maxGoogleAccounts, setMaxGoogleAccounts] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Add Account form states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Change Password states
  const [passwordModalAccount, setPasswordModalAccount] = useState(null);
  const [targetPassword, setTargetPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const isZh = lang === 'zh';
  const isAdmin = currentUser?.role === 'admin';

  const fetchAccounts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/accounts', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setAccounts(data.accounts || []);
        if (data.googleAccountsCount !== undefined) {
          setGoogleAccountsCount(data.googleAccountsCount);
        } else {
          const gCount = (data.accounts || []).filter(a => a.authProvider === 'google' || a.auth_provider === 'google' || a.google_id || a.googleId).length;
          setGoogleAccountsCount(gCount);
        }
        if (data.maxGoogleAccounts) {
          setMaxGoogleAccounts(data.maxGoogleAccounts);
        }
      } else {
        setError(data.error || 'Failed to load accounts');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAccounts();
    }
  }, [isAdmin]);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) return;

    setIsSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword.trim(),
          role: newRole,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(isZh ? `成功创建账号 "${newUsername}"` : `Account "${newUsername}" created successfully`);
        setNewUsername('');
        setNewPassword('');
        setNewRole('user');
        setIsAddModalOpen(false);
        fetchAccounts();
      } else {
        setError(data.error || 'Failed to create account');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChangePassword = (account) => {
    setPasswordModalAccount(account);
    setTargetPassword('');
    setError('');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwordModalAccount || !targetPassword.trim()) return;

    setIsChangingPassword(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/admin/accounts/${passwordModalAccount.id}/password`, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          password: targetPassword.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(
          isZh
            ? `已成功修改账号 "${passwordModalAccount.username || passwordModalAccount.displayName || 'User'}" 的密码`
            : `Password for "${passwordModalAccount.username || passwordModalAccount.displayName || 'User'}" changed successfully`
        );
        setPasswordModalAccount(null);
        setTargetPassword('');
      } else {
        setError(data.error || 'Failed to change password');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async (accountToDelete) => {
    const confirmMsg = isZh
      ? `确定要删除账号 "${accountToDelete.username || accountToDelete.email}" 吗？`
      : `Are you sure you want to delete account "${accountToDelete.username || accountToDelete.email}"?`;

    if (!window.confirm(confirmMsg)) return;

    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/admin/accounts/${accountToDelete.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(isZh ? '账号已成功删除' : 'Account deleted successfully');
        fetchAccounts();
      } else {
        setError(data.error || 'Failed to delete account');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // If user is not admin
  if (!isAdmin) {
    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '2rem 1.5rem', textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
            color: 'var(--danger)',
          }}>
            <ShieldAlert size={32} />
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
            {isZh ? '无权访问此页面 Access Denied' : 'Admin Access Required'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            {isZh ? '只有管理员账号才能访问后台管理页面。' : 'Only accounts with Administrator privileges can access the administration portal.'}
          </p>

          {onLogout && (
            <button
              onClick={onLogout}
              className="glass-button"
              style={{ width: '100%', justifyContent: 'center', background: 'var(--danger)', padding: '0.75rem' }}
            >
              <LogOut size={18} />
              <span>{isZh ? '退出登录 Logout' : 'Logout'}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const contentUI = (
    <div style={{ display: 'flex', flexDirection: 'column', height: isStandalonePage ? 'auto' : '100%' }}>
      {/* Top Admin Page Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.1rem 1.4rem',
        borderBottom: '1px solid var(--card-border)',
        background: 'rgba(30, 41, 59, 0.65)',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ReywooLogo size={34} showText={false} />
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Shield size={20} style={{ color: 'var(--primary-accent)' }} />
              {isZh ? '管理员控制中心 (Admin Center)' : 'Admin Control Center'}
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              {isZh ? `已登录为系统管理员 (${currentUser?.username || 'admin'})` : `Signed in as System Administrator (${currentUser?.username || 'admin'})`}
            </p>
          </div>
        </div>

        {/* Right Header Controls: Language Toggle & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {setLang && <LanguageToggle lang={lang} setLang={setLang} />}

          {onLogout && (
            <button
              onClick={onLogout}
              className="glass-button"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                borderColor: 'rgba(239, 68, 68, 0.35)',
                color: 'var(--danger)',
                padding: '0.4rem 0.8rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
              title={isZh ? '退出管理员登录' : 'Logout'}
            >
              <LogOut size={15} />
              <span>{isZh ? '退出登录' : 'Logout'}</span>
            </button>
          )}

          {onClose && !isStandalonePage && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.4rem',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Quota & Overview Stats Card */}
      <div style={{
        padding: '1.25rem 1.5rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '0.85rem',
        borderBottom: '1px solid var(--card-border)',
        background: 'rgba(15, 23, 42, 0.25)',
      }}>
        {/* Total Accounts */}
        <div className="glass-panel" style={{ padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255, 255, 255, 0.03)' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              {isZh ? '总账号数' : 'Total Accounts'}
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {accounts.length}
            </div>
          </div>
        </div>

        {/* Google OAuth Quota */}
        <div className="glass-panel" style={{ padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255, 255, 255, 0.03)' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Globe size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              {isZh ? 'Google 账号配额' : 'Google Quota'}
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: googleAccountsCount >= maxGoogleAccounts ? 'var(--danger)' : 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>{googleAccountsCount} / {maxGoogleAccounts}</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.1rem 0.4rem', borderRadius: '8px', background: googleAccountsCount >= maxGoogleAccounts ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)' }}>
                {googleAccountsCount >= maxGoogleAccounts ? (isZh ? '已满' : 'Full') : (isZh ? '可用' : 'Active')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            {isZh ? '系统用户列表' : 'System Accounts'}
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
            {isZh ? '管理普通密码账号及亲友 Google 账号权限。' : 'Manage password accounts and friends & family Google accounts.'}
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="glass-button"
          style={{
            background: 'var(--primary-accent)',
            borderColor: 'var(--primary-accent)',
            padding: '0.6rem 1.1rem',
            fontSize: '0.88rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <UserPlus size={16} />
          <span>{isZh ? '➕ 新建密码账号' : 'Add New Account'}</span>
        </button>
      </div>

      {/* Alerts */}
      <div style={{ padding: '0 1.5rem' }}>
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--danger)',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '0.75rem',
            padding: '0.65rem 1rem',
            fontSize: '0.85rem',
            marginBottom: '1rem',
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--success)',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '0.75rem',
            padding: '0.65rem 1rem',
            fontSize: '0.85rem',
            marginBottom: '1rem',
          }}>
            <CheckCircle size={18} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Accounts List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.5rem 1.5rem 1.5rem' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <RefreshCw size={24} className="spin" style={{ color: 'var(--primary-accent)' }} />
          </div>
        ) : accounts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            {isZh ? '暂无账号数据' : 'No accounts found'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {accounts.map((acc) => {
              const isSelf = acc.id === currentUser?.id;
              const isAccAdmin = acc.role === 'admin';
              const isGoogle = acc.authProvider === 'google' || acc.auth_provider === 'google';

              return (
                <div
                  key={acc.id}
                  className="glass-panel"
                  style={{
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: isSelf ? 'rgba(99, 102, 241, 0.12)' : 'rgba(15, 23, 42, 0.4)',
                    borderColor: isSelf ? 'rgba(99, 102, 241, 0.35)' : 'var(--card-border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: isAccAdmin ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: '1rem',
                      overflow: 'hidden',
                    }}>
                      {acc.avatarUrl ? (
                        <img src={acc.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        (acc.username || acc.email || 'U').slice(0, 2).toUpperCase()
                      )}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          {acc.username || acc.email || 'Account'}
                        </span>
                        {isSelf && (
                          <span style={{ fontSize: '0.65rem', background: 'var(--primary-accent)', color: '#fff', padding: '0.1rem 0.45rem', borderRadius: '10px', fontWeight: 700 }}>
                            {isZh ? '当前账号 You' : 'You'}
                          </span>
                        )}
                        {isAccAdmin && (
                          <span style={{ fontSize: '0.65rem', background: 'rgba(236, 72, 153, 0.2)', color: '#ec4899', border: '1px solid rgba(236, 72, 153, 0.3)', padding: '0.1rem 0.45rem', borderRadius: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Shield size={10} />
                            Admin
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
                        <span>Provider: {isGoogle ? '🌐 Google OAuth' : '🔑 Password'}</span>
                        {acc.createdAt && <span>Created: {new Date(acc.createdAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {!isGoogle && (
                      <button
                        onClick={() => handleOpenChangePassword(acc)}
                        className="glass-button"
                        style={{
                          background: 'rgba(99, 102, 241, 0.15)',
                          borderColor: 'rgba(99, 102, 241, 0.35)',
                          color: 'var(--primary-accent)',
                          padding: '0.45rem 0.8rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                        title={isZh ? '修改此账号密码' : 'Change account password'}
                      >
                        <KeyRound size={14} />
                        <span>{isZh ? '修改密码' : 'Password'}</span>
                      </button>
                    )}

                    {!isSelf && (
                      <button
                        onClick={() => handleDeleteAccount(acc)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: 'var(--danger)',
                          padding: '0.45rem 0.8rem',
                          borderRadius: '0.5rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.2s ease',
                        }}
                        title={isZh ? '删除此账号' : 'Remove this account'}
                      >
                        <Trash2 size={14} />
                        <span>{isZh ? '删除' : 'Remove'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Change Password Modal Overlay */}
      {passwordModalAccount && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          zIndex: 1100,
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--primary-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <KeyRound size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  {isZh ? '🔑 修改用户密码' : 'Change Password'}
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  {isZh
                    ? `正在为账号 "${passwordModalAccount.username || passwordModalAccount.displayName || 'User'}" 设置新密码`
                    : `Set new password for "${passwordModalAccount.username || passwordModalAccount.displayName || 'User'}"`}
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  {isZh ? '新密码 (最少 6 个字符)' : 'New Password (min 6 characters)'}
                </label>
                <input
                  type="password"
                  value={targetPassword}
                  onChange={(e) => setTargetPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field"
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setPasswordModalAccount(null);
                    setTargetPassword('');
                  }}
                  className="glass-button"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {isZh ? '取消' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword || targetPassword.trim().length < 6}
                  className="glass-button"
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    background: 'var(--primary-accent)',
                    borderColor: 'var(--primary-accent)',
                    fontWeight: 700,
                  }}
                >
                  {isChangingPassword ? (isZh ? '修改中...' : 'Saving...') : (isZh ? '确认修改' : 'Update Password')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Account Modal Overlay */}
      {isAddModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          zIndex: 1100,
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.25rem' }}>
              {isZh ? '➕ 手动新建账号' : 'Add New Account'}
            </h3>

            <form onSubmit={handleCreateAccount} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  {isZh ? '用户名 Username (最少 3 字符)' : 'Username'}
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. nanny"
                  className="input-field"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  {isZh ? '密码 Password (最少 6 字符)' : 'Password'}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  {isZh ? '角色权限 Role' : 'Role'}
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="input-field"
                >
                  <option value="user">{isZh ? '普通用户 User' : 'Standard User'}</option>
                  <option value="admin">{isZh ? '管理员 Admin (允许管理账号)' : 'Administrator'}</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="glass-button"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {isZh ? '取消' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newUsername.trim() || !newPassword.trim()}
                  className="glass-button"
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    background: 'var(--primary-accent)',
                    borderColor: 'var(--primary-accent)',
                    fontWeight: 700,
                  }}
                >
                  {isSubmitting ? (isZh ? '创建中...' : 'Creating...') : (isZh ? '确认添加' : 'Create Account')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  if (isStandalonePage) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          {contentUI}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      }}>
        {contentUI}
      </div>
    </div>
  );
}
