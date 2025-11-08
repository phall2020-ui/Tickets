import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { NotificationProvider } from './lib/notifications'
import { I18nProvider } from './lib/i18n'
import { theme } from './theme'
import App from './views/App'
import Dashboard from './views/Dashboard'
import TicketView from './views/TicketView'
import Login from './views/Login'
import HealthDashboard from './views/HealthDashboard'
import UserProfile from './views/UserProfile'

// Create a React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})
const router = createBrowserRouter([
  { path: '/login', element: <Login/> },
  { path:'/', element:<App/>, children:[
    { index:true, element:<Dashboard/> },
    { path:'/tickets/:id', element:<TicketView/> },
    { path:'/health', element:<HealthDashboard/> },
    { path:'/profile', element:<UserProfile/> }
  ]}
])
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <I18nProvider>
          <NotificationProvider>
            <RouterProvider router={router} />
          </NotificationProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
