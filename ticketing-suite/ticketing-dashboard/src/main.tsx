import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { NotificationProvider } from './lib/notifications'
import { I18nProvider } from './lib/i18n'
import App from './views/App'
import Dashboard from './views/Dashboard'
import TicketView from './views/TicketView'
import Login from './views/Login'
import HealthDashboard from './views/HealthDashboard'
import UserProfile from './views/UserProfile'
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
    <I18nProvider>
      <NotificationProvider>
        <RouterProvider router={router} />
      </NotificationProvider>
    </I18nProvider>
  </React.StrictMode>
)
