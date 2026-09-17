import { Outlet, createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router'
import { NotFoundPage } from '../routes/NotFound'
import { getCurrentUserId } from '../lib/auth-session'
import { AppShell } from '../components/layout/AppShell'
import { DashboardPage } from '../routes/dashboard'
import { CreatePage } from '../routes/dashboard/create'
import { DetailPage } from '../routes/dashboard/detail'
import { FormPage } from '../routes/form'
import { HomePage } from '../routes/index'
import { LoginPage } from '../routes/login'
import { ProfilePage } from '../routes/profile'
import { CheckoutPage } from '../routes/validation/checkout'
import { ValidationPage } from '../routes/validation'
import { LandingPage } from '../routes/landing'

const rootRoute = createRootRoute({
  component: () => <AppShell><Outlet /></AppShell>,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'login',
  component: LoginPage,
})

const formRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'form',
  component: FormPage,
  beforeLoad: requireLogin,
})

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'profile',
  component: ProfilePage,
  beforeLoad: requireLogin,
})

const validationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'validation',
  component: ValidationPage,
  beforeLoad: requireLogin,
})

const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'validation/checkout',
  component: CheckoutPage,
  beforeLoad: requireLogin,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'dashboard',
  component: DashboardPage,
  beforeLoad: requireLogin,
})

const createParticipantRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'dashboard/create',
  component: CreatePage,
  beforeLoad: requireLogin,
})

const detailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'dashboard/detail/$idRegistrasi',
  component: DetailPage,
  beforeLoad: requireLogin,
})

const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'landing/',
  component: LandingPage,
})

function requireLogin() {
  if (!getCurrentUserId()) {
    throw redirect({ to: '/login' })
  }
}

const routeTree = rootRoute.addChildren([indexRoute, loginRoute, formRoute, profileRoute, validationRoute, checkoutRoute, dashboardRoute, createParticipantRoute, detailRoute, landingRoute])

export const router = createRouter({ 
  routeTree,
  defaultNotFoundComponent: NotFoundPage,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}