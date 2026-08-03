import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Link, useLocation, useNavigate } from "react-router-dom";

import logo from "../../assets/logo.png";
import * as auth from "../../api/auth";
import { extractErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import "./Login.css";

function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        rememberMe: false,
    });

    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    function handleInputChange(event) {
        const { name, value, type, checked } = event.target;

        setFormData((currentFormData) => ({
            ...currentFormData,
            [name]: type === "checkbox" ? checked : value,
        }));

        if (errorMessage) {
            setErrorMessage("");
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();

        setErrorMessage("");

        const email = formData.email.trim();

        if (!email || !formData.password) {
            setErrorMessage("Please enter your email address and password.");
            return;
        }

        setIsSubmitting(true);

        try {
            const { token, employee } = await auth.login(email, formData.password);
            login(token, employee);

            const from = location.state?.from;
            navigate(from?.pathname || "/admin", { replace: true, state: from?.state });
        } catch (error) {
            setErrorMessage(extractErrorMessage(error, "Unable to sign in. Please try again."));
        } finally {
            setIsSubmitting(false);
        }
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

                    <form className="login-form" onSubmit={handleSubmit} noValidate>
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
                                disabled={isSubmitting}
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
                                    disabled={isSubmitting}
                                    required
                                />

                                <button
                                    className="password-toggle-button"
                                    type="button"
                                    onClick={() =>
                                        setShowPassword((currentValue) => !currentValue)
                                    }
                                    aria-label={
                                        showPassword ? "Hide password" : "Show password"
                                    }
                                    title={showPassword ? "Hide password" : "Show password"}
                                    disabled={isSubmitting}
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
                                    disabled={isSubmitting}
                                />

                                <span>Remember me</span>
                            </label>
                        </div>

                        {errorMessage && (
                            <p className="login-error-message" role="alert">
                                {errorMessage}
                            </p>
                        )}

                        <button
                            className="sign-in-button"
                            type="submit"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Signing in..." : "Sign In"}
                        </button>

                    </form>
                </div>
            </section>
        </main>
    );
}

export default Login;