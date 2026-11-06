import React, { useState } from 'react'
import { signIn, signUp } from './store.js'

export default function Login() {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [modo, setModo] = useState('entrar')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault(); setBusy(true); setMsg(null)
    try {
      if (modo === 'entrar') await signIn(email, pw)
      else { await signUp(email, pw); try { await signIn(email, pw) } catch { setMsg('Cuenta creada. Ya puedes entrar.') } }
    } catch (err) {
      const m = err.message || ''
      setMsg(/database error|invitaci/i.test(m) ? 'Este correo no tiene invitación. Pide a quien te recomendó la app que te invite con este correo.' : /invalid login/i.test(m) ? 'Correo o contraseña incorrectos.' : m)
    } finally { setBusy(false) }
  }
  return (
    <div className="login">
      <div className="login-card">
        <div className="login-cross" aria-hidden="true">✠</div>
        <h1>Sagrada Biblia</h1>
        <p className="sub">Biblia de Navarra · Vulgata · Santos Padres</p>
        <form onSubmit={submit}>
          <label>Correo<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label>
          <label>Contraseña<input type="password" value={pw} onChange={e => setPw(e.target.value)} required minLength={6} autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} /></label>
          <button className="btn primary" disabled={busy}>{modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}</button>
        </form>
        {msg && <p className="msg">{msg}</p>}
        <button className="link" onClick={() => setModo(modo === 'entrar' ? 'crear' : 'entrar')}>
          {modo === 'entrar' ? '¿Primera vez? Crear cuenta' : 'Ya tengo cuenta'}
        </button>
      </div>
    </div>
  )
}
