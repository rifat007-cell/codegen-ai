export default function NotFoundRoute() {
    return (
        <div className="home">
            <header className="hero">
                <h1 className="title">404 - Page Not Found</h1>
                <p className="subtitle">The page you're looking for doesn't exist.</p>
                <button
                    className="cta-btn"
                    onClick={() => (window.location.href = "/")}
                >
                    Go Home
                </button>
            </header>
        </div>
    )
}
