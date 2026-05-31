import { create } from 'zustand'

const useAuthStore = create((set) => ({
  token: localStorage.getItem('lu_token') || null,
  user: JSON.parse(localStorage.getItem('lu_user') || 'null'),

  login(token, user) {
    localStorage.setItem('lu_token', token)
    localStorage.setItem('lu_user', JSON.stringify(user))
    set({ token, user })
  },
  logout() {
    localStorage.removeItem('lu_token')
    localStorage.removeItem('lu_user')
    set({ token: null, user: null })
  },
  setUser(user) {
    localStorage.setItem('lu_user', JSON.stringify(user))
    set({ user })
  }
}))

export default useAuthStore
