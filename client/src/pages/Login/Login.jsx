import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

import logo from "../../assets/logo.png";
import "./Login.css";

function Login() {
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        rememberMe: false,
    });

    const [showPassword, setShowPassword] = useState(false);

    function handleInputChange(event) {
        const { name, value, type, checked } = event.target;

        setFormData((currentFormData) => ({
            ...currentFormData,
            [name]: type === "checkbox" ? checked : value,
        }));
    }

    function handleSubmit(event) {
        event.preventDefault();

        console.log("Login submitted:", {
            email: formData.email,
            password: formData.password,
            rememberMe: formData.rememberMe,
        });
    }

    function handleCreateAccount(event) {
        event.preventDefault();
        console.log("Create account selected");
    }

    function handleForgotPassword(event) {
        event.preventDefault();
        console.log("Forgot password selected");
    }

    return (
        <main className="login-page">
            <section className="login-brand-section">
                <img
                    className="login-logo"
                    src={logo}
                    alt="Clock It - Authenticate, Secure, Trust"
                />
            </section>

            <section className="login-form-section">
                <div className="login-form-container">
                    <header className="login-header">
                        <h1>Welcome back</h1>
                    </header>

                    <form className="login-form" onSubmit={handleSubmit}>
                        <div className="login-form-group">
                            <label htmlFor="email">Email</label>

                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="Enter your email"
                                autoComplete="email"
                                required
                            />
                        </div>

                        <div className="login-form-group">
                            <label htmlFor="password">Password</label>

                            <div className="password-input-wrapper">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    placeholder="Enter your password"
                                    autoComplete="current-password"
                                    required
                                />

                                <button
                                    className="password-toggle-button"
                                    type="button"
                                    onClick={() => setShowPassword((currentValue) => !currentValue)}
                                    aria-label={
                                        showPassword ? "Hide password" : "Show password"
                                    }
                                    title={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                        </div>

                        <div className="login-options">
                            <label className="remember-me">
                                <input
                                    name="rememberMe"
                                    type="checkbox"
                                    checked={formData.rememberMe}
                                    onChange={handleInputChange}
                                />

                                <span>Remember me</span>
                            </label>

                            <a href="/forgot-password" onClick={handleForgotPassword}>
                                Forgot Password
                            </a>
                        </div>

                        <>
                            <button className="sign-in-button" type="submit">
                                Sign In
                            </button>

                            <p className="create-account-text">
                                New here?{" "}
                                <a href="/register" onClick={handleCreateAccount}>
                                    Create an account
                                </a>
                            </p>
                        </>
                    </form>
                </div>
            </section>
        </main>
    );
}

export default Login;