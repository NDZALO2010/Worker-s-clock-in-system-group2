import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Link } from "react-router-dom";

import logo from "../../assets/logo.png";
import "./Login.css";

function Login() {
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
            const loginData = {
                email,
                password: formData.password,
                rememberMe: formData.rememberMe,
            };

            /*
              Backend integration will be added here later.
      
              Example:
      
              const response = await axios.post(
                "https://backend-address/api/auth/login",
                loginData
              );
      
              After a successful login:
              1. Read the token or user data from response.data.
              2. Store it using the agreed authentication approach.
              3. Navigate to the correct dashboard.
            */

            console.log("Login data ready for backend:", loginData);

            
        } catch (error) {
            console.error("Login failed:", error);
            setErrorMessage("Unable to sign in. Please try again.");
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

                            <Link to="/forgot-password">Forgot Password</Link>
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

                        <p className="create-account-text">
                            New here? <Link to="/register">Create an account</Link>
                        </p>
                    </form>
                </div>
            </section>
        </main>
    );
}

export default Login;