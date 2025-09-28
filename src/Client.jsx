import { createRoot } from "react-dom/client";
import {
    createRouter,
    createRoute,
    createRootRoute,
    RouterProvider,
} from "@tanstack/react-router";
import Home from "./Home";
import AICodeGenerator from "./CodeMaker";
import Layout from "./Layout";
import About from "./About";
import NotFoundRoute from "./NotFound";
import User from "./User"
import SignIn from "./SignIn";
import { CartContext } from "./contexts";
import ProtectedRoute from "./ProtectedRoute";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";

// Define routes
const rootRoute = createRootRoute({
    component: Layout,
    notFoundComponent: NotFoundRoute
});

const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: Home,
});

const protectedRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: "protected",
    component: ProtectedRoute,
});

const generateCodeRoute = createRoute({
    getParentRoute: () => protectedRoute,
    path: "/generate-code",
    component: AICodeGenerator,
});

const forgotPasswordRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/user/forgot-password",
    component: ForgotPassword,
});


const resetPasswordRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/reset-password",
    component: ResetPassword,
});



const aboutRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/about",
    component: About,
});

const registerUserRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/register",
    component: User,
});

const signinUserRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/sign-in",
    component: SignIn,
});

// Update route tree - forgot password is now a direct child of root
const routeTree = rootRoute.addChildren([
    homeRoute,
    protectedRoute.addChildren([generateCodeRoute]), // Only generate-code remains protected
    aboutRoute,
    registerUserRoute,
    signinUserRoute,
    forgotPasswordRoute, // Now a direct child of root route
    resetPasswordRoute,
]);

// Create router
const router = createRouter({
    routeTree,
    defaultPreload: "intent",
});

function App() {
    return (
        <CartContext>
            <RouterProvider router={router} />
        </CartContext>
    );
}

const root = createRoot(document.getElementById("root"));
root.render(<App />);
