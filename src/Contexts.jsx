import { Navigate } from "@tanstack/react-router";
import { createContext, use, useState, useEffect } from "react"

const Context = createContext({
    user: {},
    setUser: () => { },
    loginUser: () => { },
    isLoading: true,
    logoutUser: () => { },
})

export const CartContext = ({ children }) => {
    const [user, setUser] = useState({})
    const [isLoading, setIsLoading] = useState(true)

    // Check if user is authenticated on app load
    useEffect(() => {
        // get the user info from the httpCookie using jwt
        const checkAuthStatus = async () => {
            try {
                const response = await fetch("/api/users/me", {
                    credentials: "include",
                })

                if (!response.ok) { return }

                if (response.ok) {
                    const userData = await response.json()
                    if (userData.user) {
                        setUser(userData.user)
                    }
                }
            } catch (error) {
                console.error("Error checking auth status:", error)
            } finally {
                setIsLoading(false)
            }
        }

        checkAuthStatus()
    }, [])

    const loginUser = async (email, password) => {
        const response = await fetch("/api/users/authenticate", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        })
        if (!response.ok) {
            throw new Error("Network response was not ok")
        }
        return response.json()
    }

    const logoutUser = async () => {
        try {
            await fetch("/api/users/logout", {
                method: "POST",
                credentials: "include",
            })
            setUser({})
        } catch (error) {
            console.error("Logout error:", error)
        }
    }

    const value = {
        user,
        loginUser,
        logoutUser,
        setUser,
        isLoading
    }

    return (
        <Context.Provider value={value}>{children}</Context.Provider>
    )
}

export const useCart = () => use(Context)
