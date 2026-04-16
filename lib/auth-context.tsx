'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  date_joined: string
}

interface AuthContextType {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string, firstName?: string, lastName?: string) => Promise<void>
  logout: () => void
  updateUser: (user: User) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken')
    const storedUser = localStorage.getItem('user')
    
    if (storedToken && storedUser) {
      setAccessToken(storedToken)
      setUser(JSON.parse(storedUser))
    }
    
    setIsLoading(false)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/token/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        throw new Error('Invalid credentials')
      }

      const data = await response.json()
      setAccessToken(data.access)
      localStorage.setItem('accessToken', data.access)
      
      if (data.refresh) {
        localStorage.setItem('refreshToken', data.refresh)
      }

      // Fetch user profile
      const userResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/users/me/`, {
        headers: {
          'Authorization': `Bearer ${data.access}`,
        },
      })

      if (userResponse.ok) {
        const userData = await userResponse.json()
        setUser(userData)
        localStorage.setItem('user', JSON.stringify(userData))
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(async (
    username: string,
    email: string,
    password: string,
    firstName = '',
    lastName = ''
  ) => {
    try {
      setIsLoading(true)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/users/register/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username,
            email,
            password,
            first_name: firstName,
            last_name: lastName,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(Object.values(error)[0] as string)
      }

      // Auto-login after registration
      await login(username, password)
    } finally {
      setIsLoading(false)
    }
  }, [login])

  const logout = useCallback(() => {
    setUser(null)
    setAccessToken(null)
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
  }, [])

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser)
    localStorage.setItem('user', JSON.stringify(updatedUser))
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!accessToken,
        isLoading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
