import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Leaf,LogOut} from 'lucide-react';
import Home from '../app/page';
import InstallRegistration from '../components/pwa-registration';
import '../app/globals.css';
function App(){const [auth,A]=useState<boolean|null>(null),[password,P]=useState(''),[error,E]=useState(''),[busy,B]=useState(false);useEffect(()=>{fetch('/api/session').then(r=>r.json()).then((j:any)=>A(j.authenticated)).catch(()=>{E('Не удалось связаться с сервером');A(false)})},[]);
async function login(e:React.FormEvent){e.preventDefault();B(true);E('');try{const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});const j=await r.json() as any;if(!r.ok)throw Error(j.error||'Не удалось войти');P('');A(true)}catch(e:any){E(e.message)}finally{B(false)}}
if(auth===null)return <main className="loading"><Leaf/><p>Открываем FoodTrack…</p></main>;
if(!auth)return <main className="loading first-run"><section className="card"><div className="brand"><span><Leaf size={25}/></span>FoodTrack</div><h1>Твоя личная фитнес-база</h1><p>Войди с паролем владельца этого сервера.</p>{error&&<div className="error" role="alert">{error}</div>}<form onSubmit={login}><label className="field">Пароль<input type="password" required autoComplete="current-password" value={password} onChange={e=>P(e.target.value)}/></label><button className="full" disabled={busy}>{busy?'Входим…':'Войти'}</button></form></section></main>;
return <><InstallRegistration/><Home/><button className="selfhost-logout secondary" title="Выйти из личного дневника" onClick={async()=>{await fetch('/api/logout',{method:'POST'});A(false)}}><LogOut size={15}/><span>Выйти</span></button></>}
createRoot(document.getElementById('root')!).render(<App/>);
