import { useCart } from "./Contexts";

// About Component
export default function About() {

    return (
        <div className="home">
            <header className="hero">
                <h1 className="title">About Codegen AI</h1>
                <p className="subtitle">Learn more about our AI-powered code generation platform</p>
            </header>
            <section className="features">
                <div className="feature-card">
                    <h2>🤖 AI-Powered</h2>
                    <p>Built with advanced AI models to understand your requirements and generate high-quality code.</p>
                </div>
                <div className="feature-card">
                    <h2>🚀 Fast & Reliable</h2>
                    <p>Generate production-ready code in seconds with our optimized AI pipeline.</p>
                </div>
                <div className="feature-card">
                    <h2>🌐 Open Source</h2>
                    <p>Built with love for the developer community. Contribute and help us improve!</p>
                </div>
            </section>
        </div>
    );
};

