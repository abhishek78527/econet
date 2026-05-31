import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
export default function Layout() {
  return (
    <div style={{minHeight:'100vh',background:'var(--surface)'}}>
      <Navbar/>
      <div style={{paddingTop:'var(--nav-h)'}}>
        <Outlet/>
      </div>
    </div>
  )
}
