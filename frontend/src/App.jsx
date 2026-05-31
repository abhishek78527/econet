import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import useAuthStore from './store/authStore'

import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import FeedPage from './pages/FeedPage'
import BlogsPage from './pages/BlogsPage'
import BlogDetailPage from './pages/BlogDetailPage'
import CreateBlogPage from './pages/CreateBlogPage'
import ChatPage from './pages/ChatPage'
import ProfilePage from './pages/ProfilePage'
import UserProfilePage from './pages/UserProfilePage'
import DirectMessagePage from './pages/DirectMessagePage'
import SearchPage from './pages/SearchPage'
import MarketPage from './pages/MarketPage'
import MarketplacePage from './pages/MarketplacePage'
import ProductDetailPage from './pages/ProductDetailPage'
import CartPage from './pages/CartPage'
import SellProductPage from './pages/SellProductPage'
import StoreProfilePage from './pages/StoreProfilePage'
import OrdersPage from './pages/OrdersPage'
import NotFoundPage from './pages/NotFoundPage'

function Private({ children }) {
  const token = useAuthStore(s => s.token)
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        duration: 4000,
        style: { background: 'rgba(13,21,53,.97)', color: '#fff', border: '1px solid rgba(99,102,241,.3)', backdropFilter: 'blur(20px)' }
      }} />
      <Routes>
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<Private><Layout /></Private>}>
          <Route index                           element={<FeedPage />} />
          <Route path="blogs"                    element={<BlogsPage />} />
          <Route path="blogs/new"                element={<CreateBlogPage />} />
          <Route path="blogs/:id"                element={<BlogDetailPage />} />
          <Route path="chat"                     element={<ChatPage />} />
          <Route path="chat/dm/:userId"          element={<DirectMessagePage />} />
          <Route path="profile"                  element={<ProfilePage />} />
          <Route path="u/:username"              element={<UserProfilePage />} />
          <Route path="search"                   element={<SearchPage />} />
          <Route path="market"                   element={<MarketPage />} />
          <Route path="marketplace"              element={<MarketplacePage />} />
          <Route path="marketplace/product/:id"  element={<ProductDetailPage />} />
          <Route path="marketplace/cart"         element={<CartPage />} />
          <Route path="marketplace/sell"         element={<SellProductPage />} />
          <Route path="marketplace/store/:id"    element={<StoreProfilePage />} />
          <Route path="marketplace/orders"       element={<OrdersPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
